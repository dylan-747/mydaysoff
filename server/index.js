import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import db from "./db.js";
import { getCuratedEvents } from "./adapters/aggregateEvents.js";

const app = express();
const port = Number(process.env.PORT || 8787);
const adminToken = process.env.ADMIN_TOKEN || "dev-admin-token";
const refreshMs = Number(process.env.INGEST_REFRESH_MS || 15 * 60 * 1000);
const stripeTrialDays = Number(process.env.STRIPE_TRIAL_DAYS || 30);
const linkCheckIntervalMs = Number(process.env.LINK_CHECK_INTERVAL_MS || 3 * 60 * 60 * 1000);
const linkCheckMaxPerRun = Number(process.env.LINK_CHECK_MAX_PER_RUN || 40);
const linkCheckStaleHours = Number(process.env.LINK_CHECK_STALE_HOURS || 24);

let lastLinkCheckAt = 0;
let qualityMonitorRunning = false;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

function asList(input) {
  if (Array.isArray(input)) return input.map((item) => String(item).trim()).filter(Boolean);
  if (typeof input === "string") {
    return input
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function asTagList(input) {
  return Array.from(
    new Set(
      asList(input)
        .map((item) => item.toLowerCase())
        .filter(Boolean),
    ),
  );
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasRealUrl(url) {
  const value = String(url || "").trim();
  return /^https?:\/\//i.test(value) && value !== "#";
}

function qualityScoreLite(event) {
  let score = 0;
  const trust = String(event?.source_trust || "");
  if (trust === "official") score += 40;
  else if (trust === "trusted-partner") score += 28;
  else if (trust === "community") score += 16;
  else score += 8;

  const verification = String(event?.verification_status || "");
  if (verification === "ticketmaster-listing") score += 22;
  else if (verification === "feed-listing") score += 20;
  else if (verification === "community-submitted") score += 12;
  else score += 6;

  if (Number.isFinite(Number(event?.lat)) && Number.isFinite(Number(event?.lng))) score += 10;
  if (String(event?.venue || "").trim()) score += 8;
  if (String(event?.time || "").trim()) score += 5;
  if (hasRealUrl(event?.source_event_url || event?.url)) score += 12;
  score += Math.min(15, Math.max(0, Number(event?.likes || event?.popularity || 0)));
  return score;
}

function publicSourceLabel(source, trust) {
  const raw = String(source || "").toLowerCase().trim();
  if (!raw) return String(trust || "trusted-partner").toLowerCase();
  if (raw.includes("curated-api-seed") || raw === "seed") return "community-curated";
  if (raw.includes("openactive")) return "openactive";
  if (raw === "ticketmaster") return "ticketmaster";
  if (raw.includes("nhs")) return "nhs";
  if (raw.includes("civic")) return "local-civic";
  if (raw.includes("community-partner")) return "community-partner";
  return raw.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function summarizeEvent(input) {
  const name = cleanText(input.name || "event");
  const city = cleanText(input.city || "");
  const start = cleanText(input.start_date || "");
  const end = cleanText(input.end_date || "");
  const time = cleanText(input.time || "");
  const category = asTagList(input.category)[0] || "";
  const indoor = cleanText(input.indoor || "");
  const cost = cleanText(input.cost || "");
  const accessibility = asTagList(input.accessibility);
  const audience = asTagList(input.audience);
  const bookingRequired = Boolean(input.planning?.booking_required);

  const costPrefix =
    cost === "free" ? "Free" : cost === "donation" ? "Donation-based" : cost === "paid" ? "Paid" : "Local";
  const typeWord = category ? `${category} event` : "community event";
  const settingWord = indoor === "indoor" ? "indoor" : indoor === "outdoor" ? "outdoor" : indoor === "mixed" ? "mixed" : "";
  const placeWord = city || "your area";

  const base = [costPrefix, settingWord, typeWord, `in ${placeWord}`].filter(Boolean).join(" ");

  const datePhrase = start ? (end && end !== start ? `${start} to ${end}` : start) : "";
  const timePhrase = time ? (datePhrase ? `${datePhrase} at ${time}` : time) : datePhrase;
  const whenPart = timePhrase ? ` on ${timePhrase}` : "";

  const detailParts = [];
  const audienceLabel = audience.includes("all-ages") ? "all ages" : audience[0];
  if (audienceLabel) detailParts.push(audienceLabel);
  if (bookingRequired) detailParts.push("booking required");
  if (accessibility.length) detailParts.push(accessibility[0]);

  let summary = `${base}${whenPart}`;
  if (detailParts.length) summary += ` · ${detailParts.join(" · ")}`;
  summary = `${summary}.`.replace(/\s+/g, " ").trim();

  // Fall back to title only when structured fields are too sparse.
  if (summary.length < 24) {
    summary = `${name} in ${placeWord}${whenPart}.`;
  }

  if (summary.length > 145) {
    const hard = summary.slice(0, 145);
    const cut = hard.lastIndexOf(" ");
    summary = `${(cut > 70 ? hard.slice(0, cut) : hard).trim().replace(/[.,;:!?-]+$/, "")}.`;
  }
  return summary;
}

function withEventDefaults(input) {
  const category = asTagList(input.category);
  const accessibility = asTagList(input.accessibility);
  const audience = asTagList(input.audience);

  return {
    ...input,
    category: category.length ? category : ["community"],
    accessibility: accessibility.length ? accessibility : ["check venue"],
    audience: audience.length ? audience : ["all-ages"],
    indoor: cleanText(input.indoor || "mixed").toLowerCase() || "mixed",
    activity_level: cleanText(input.activity_level || "medium").toLowerCase() || "medium",
    vibe: cleanText(input.vibe || "social").toLowerCase() || "social",
    planning: {
      booking_required: Boolean(input.planning?.booking_required),
      public_transport: cleanText(input.planning?.public_transport || "check source"),
      bring_with_you: cleanText(input.planning?.bring_with_you || "check listing details"),
    },
  };
}

function toEventRow(input) {
  const normalized = withEventDefaults(input);
  return {
    id: normalized.id,
    name: normalized.name,
    start_date: normalized.start_date,
    end_date: normalized.end_date || normalized.start_date,
    time: normalized.time || "",
    category_json: JSON.stringify(normalized.category),
    cost: normalized.cost || "free",
    venue: normalized.venue || "",
    city: normalized.city || "Edinburgh",
    url: normalized.url || "#",
    what3words: normalized.what3words || "",
    summary: summarizeEvent(normalized),
    accessibility_json: JSON.stringify(normalized.accessibility),
    audience_json: JSON.stringify(normalized.audience),
    indoor: normalized.indoor,
    activity_level: normalized.activity_level,
    vibe: normalized.vibe,
    planning_json: JSON.stringify(normalized.planning || {}),
    source_trust: normalized.source_trust || "trusted-partner",
    source_event_id: normalized.source_event_id || "",
    source_event_url: normalized.source_event_url || normalized.url || "",
    source_feed_url: normalized.source_feed_url || "",
    verification_status: normalized.verification_status || "community-submitted",
    evidence_json: JSON.stringify(normalized.evidence || {}),
    first_seen_at: normalized.first_seen_at || new Date().toISOString(),
    last_seen_at: normalized.last_seen_at || new Date().toISOString(),
    lat: Number(normalized.lat ?? 55.9533),
    lng: Number(normalized.lng ?? -3.1883),
    status: normalized.status || "pending",
    source: normalized.source || "user",
  };
}

function formatEvent(row) {
  const event = withEventDefaults({
    id: row.id,
    name: row.name,
    start_date: row.start_date,
    end_date: row.end_date,
    time: row.time,
    category: JSON.parse(row.category_json || "[]"),
    cost: row.cost,
    venue: row.venue,
    city: row.city,
    url: row.url,
    what3words: row.what3words,
    summary: row.summary || "",
    accessibility: JSON.parse(row.accessibility_json || "[]"),
    audience: JSON.parse(row.audience_json || "[]"),
    indoor: row.indoor || "",
    activity_level: row.activity_level || "",
    vibe: row.vibe || "",
    planning: JSON.parse(row.planning_json || "{}"),
    source_trust: row.source_trust || "trusted-partner",
    source_event_id: row.source_event_id || "",
    source_event_url: row.source_event_url || row.url || "",
    source_feed_url: row.source_feed_url || "",
    verification_status: row.verification_status || "community-submitted",
    evidence: JSON.parse(row.evidence_json || "{}"),
    first_seen_at: row.first_seen_at || "",
    last_seen_at: row.last_seen_at || "",
    lat: Number(row.lat),
    lng: Number(row.lng),
    likes: Number(row.votes || 0),
    status: row.status,
    source: publicSourceLabel(row.source, row.source_trust),
  });
  event.summary = summarizeEvent(event);
  return event;
}

const insertEvent = db.prepare(`
  INSERT INTO events (
    id, name, start_date, end_date, time, category_json, cost, venue,
    city, url, what3words, summary, accessibility_json, audience_json, indoor,
    activity_level, vibe, planning_json, source_trust, source_event_id, source_event_url,
    source_feed_url, verification_status, evidence_json, first_seen_at, last_seen_at,
    lat, lng, status, source
  ) VALUES (
    @id, @name, @start_date, @end_date, @time, @category_json, @cost, @venue,
    @city, @url, @what3words, @summary, @accessibility_json, @audience_json, @indoor,
    @activity_level, @vibe, @planning_json, @source_trust, @source_event_id, @source_event_url,
    @source_feed_url, @verification_status, @evidence_json, @first_seen_at, @last_seen_at,
    @lat, @lng, @status, @source
  )
  ON CONFLICT(id) DO UPDATE SET
    name=excluded.name,
    start_date=excluded.start_date,
    end_date=excluded.end_date,
    time=excluded.time,
    category_json=excluded.category_json,
    cost=excluded.cost,
    venue=excluded.venue,
    city=excluded.city,
    url=excluded.url,
    what3words=excluded.what3words,
    summary=excluded.summary,
    accessibility_json=excluded.accessibility_json,
    audience_json=excluded.audience_json,
    indoor=excluded.indoor,
    activity_level=excluded.activity_level,
    vibe=excluded.vibe,
    planning_json=excluded.planning_json,
    source_trust=excluded.source_trust,
    source_event_id=excluded.source_event_id,
    source_event_url=excluded.source_event_url,
    source_feed_url=excluded.source_feed_url,
    verification_status=excluded.verification_status,
    evidence_json=excluded.evidence_json,
    first_seen_at=COALESCE(events.first_seen_at, excluded.first_seen_at),
    last_seen_at=excluded.last_seen_at,
    lat=excluded.lat,
    lng=excluded.lng,
    source=excluded.source
`);

const ensureVoteRow = db.prepare(`
  INSERT INTO votes (event_id, count) VALUES (?, 0)
  ON CONFLICT(event_id) DO NOTHING
`);

const ensureVoteRowWithPopularity = db.prepare(`
  INSERT INTO votes (event_id, count) VALUES (?, ?)
  ON CONFLICT(event_id) DO NOTHING
`);

const upsertLinkCheck = db.prepare(`
  INSERT INTO event_link_checks (event_id, checked_at, status_code, ok, final_url, error)
  VALUES (@event_id, @checked_at, @status_code, @ok, @final_url, @error)
  ON CONFLICT(event_id) DO UPDATE SET
    checked_at = excluded.checked_at,
    status_code = excluded.status_code,
    ok = excluded.ok,
    final_url = excluded.final_url,
    error = excluded.error
`);

const insertSourceHealthSnapshot = db.prepare(`
  INSERT OR REPLACE INTO source_health_snapshots (
    source_id, observed_at, event_count, avg_quality, dead_link_rate, sample_size
  ) VALUES (
    @source_id, @observed_at, @event_count, @avg_quality, @dead_link_rate, @sample_size
  )
`);

const upsertNewsletterSubscriber = db.prepare(`
  INSERT INTO newsletter_subscribers (email, city, interests_json, source, status, updated_at)
  VALUES (@email, @city, @interests_json, @source, 'active', CURRENT_TIMESTAMP)
  ON CONFLICT(email) DO UPDATE SET
    city = excluded.city,
    interests_json = excluded.interests_json,
    source = excluded.source,
    status = 'active',
    updated_at = CURRENT_TIMESTAMP
`);

const unsubscribeNewsletterSubscriber = db.prepare(`
  UPDATE newsletter_subscribers
  SET status = 'unsubscribed', updated_at = CURRENT_TIMESTAMP
  WHERE email = ?
`);

async function ingestCuratedEvents() {
  const incoming = await getCuratedEvents();
  if (!incoming.length) {
    return 0;
  }

  const tx = db.transaction((items) => {
    db.prepare("DELETE FROM votes WHERE event_id IN (SELECT id FROM events WHERE source != 'user')").run();
    db.prepare("DELETE FROM events WHERE source != 'user'").run();
    for (const item of items) {
      const row = toEventRow({ ...item, status: "approved" });
      insertEvent.run(row);
      ensureVoteRowWithPopularity.run(row.id, Number(item.popularity ?? 0));
    }
  });
  tx(incoming);
  queueQualityMonitor();
  return incoming.length;
}

async function fetchUrlStatus(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);
  try {
    let response;
    try {
      response = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "mydaysoff-linkcheck/1.0" },
      });
    } catch {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "mydaysoff-linkcheck/1.0", Range: "bytes=0-0" },
      });
    }
    return {
      ok: response.ok,
      statusCode: Number(response.status || 0),
      finalUrl: response.url || url,
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: 0,
      finalUrl: url,
      error: String(error?.name || error?.message || "fetch_failed"),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runQualityMonitor({ force = false } = {}) {
  if (qualityMonitorRunning) return;
  qualityMonitorRunning = true;
  try {
    const now = Date.now();
    if (!force && now - lastLinkCheckAt < linkCheckIntervalMs) return;
    lastLinkCheckAt = now;

    const staleThresholdIso = new Date(Date.now() - linkCheckStaleHours * 60 * 60 * 1000).toISOString();
    const candidates = db
      .prepare(
        `
      SELECT e.id, e.source, e.source_trust, e.verification_status, e.venue, e.time, e.city, e.lat, e.lng,
             e.url, e.source_event_url, e.start_date, COALESCE(v.count, 0) AS likes,
             lc.checked_at AS link_checked_at
      FROM events e
      LEFT JOIN votes v ON v.event_id = e.id
      LEFT JOIN event_link_checks lc ON lc.event_id = e.id
      WHERE e.status = 'approved'
        AND e.source != 'user'
        AND e.start_date >= date('now')
        AND (
          lc.checked_at IS NULL OR lc.checked_at < @stale_threshold
        )
      ORDER BY e.start_date ASC, likes DESC
      LIMIT @limit
      `,
      )
      .all({ stale_threshold: staleThresholdIso, limit: linkCheckMaxPerRun });

    const checkedAt = new Date().toISOString();
    const sourceStats = new Map();
    for (const event of candidates) {
      const url = event.source_event_url || event.url;
      const linkResult = hasRealUrl(url)
        ? await fetchUrlStatus(url)
        : { ok: false, statusCode: 0, finalUrl: "", error: "missing_or_invalid_url" };

      upsertLinkCheck.run({
        event_id: event.id,
        checked_at: checkedAt,
        status_code: linkResult.statusCode,
        ok: linkResult.ok ? 1 : 0,
        final_url: linkResult.finalUrl,
        error: linkResult.error,
      });

      const sourceId = String(event.source || "unknown");
      const prev = sourceStats.get(sourceId) || { count: 0, dead: 0, qualityTotal: 0 };
      prev.count += 1;
      prev.dead += linkResult.ok ? 0 : 1;
      prev.qualityTotal += qualityScoreLite(event);
      sourceStats.set(sourceId, prev);
    }

    for (const [sourceId, stats] of sourceStats.entries()) {
      insertSourceHealthSnapshot.run({
        source_id: sourceId,
        observed_at: checkedAt,
        event_count: stats.count,
        avg_quality: Number((stats.qualityTotal / Math.max(1, stats.count)).toFixed(2)),
        dead_link_rate: Number((stats.dead / Math.max(1, stats.count)).toFixed(3)),
        sample_size: stats.count,
      });
    }
  } finally {
    qualityMonitorRunning = false;
  }
}

function queueQualityMonitor(force = false) {
  runQualityMonitor({ force }).catch((error) => {
    console.error("Quality monitor failed", error);
  });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "mydaysoff-api" });
});

app.get("/api/events", (_req, res) => {
  const rows = db
    .prepare(
      `
      SELECT e.*, COALESCE(v.count, 0) AS votes
      FROM events e
      LEFT JOIN votes v ON v.event_id = e.id
      WHERE e.status = 'approved' AND e.verification_status IN ('feed-listing', 'ticketmaster-listing', 'community-submitted')
      ORDER BY e.start_date ASC, e.created_at DESC
      `,
    )
    .all();

  res.json({ events: rows.map(formatEvent) });
});

app.post("/api/events/submissions", (req, res) => {
  const payload = req.body || {};
  if (!payload.name || !payload.start_date) {
    return res.status(400).json({ error: "name and start_date are required" });
  }

  const event = toEventRow({
    ...payload,
    id: `user_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
    status: "pending",
    source: "user",
    source_trust: "community",
    verification_status: "community-submitted",
    evidence: {
      publisher: "Community submission",
      item_title: payload.name || "",
      published_at: new Date().toISOString(),
    },
  });

  if (!Number.isFinite(event.lat) || !Number.isFinite(event.lng)) {
    return res.status(400).json({ error: "lat/lng must be numbers" });
  }

  insertEvent.run(event);
  ensureVoteRow.run(event.id);
  return res.status(201).json({ ok: true, id: event.id, status: "pending" });
});

app.post("/api/events/:id/vote", (req, res) => {
  const id = req.params.id;

  const found = db.prepare("SELECT id FROM events WHERE id = ? AND status = 'approved'").get(id);
  if (!found) return res.status(404).json({ error: "event not found" });

  ensureVoteRow.run(id);
  db.prepare("UPDATE votes SET count = count + 1, updated_at = CURRENT_TIMESTAMP WHERE event_id = ?").run(id);

  const row = db.prepare("SELECT count FROM votes WHERE event_id = ?").get(id);
  return res.json({ ok: true, id, likes: Number(row.count || 0) });
});

app.post("/api/newsletter/signup", (req, res) => {
  const payload = req.body || {};
  const email = cleanText(payload.email || "").toLowerCase();
  const city = cleanText(payload.city || "");
  const interests = asTagList(payload.interests).slice(0, 6);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "valid email is required" });
  }

  upsertNewsletterSubscriber.run({
    email,
    city,
    interests_json: JSON.stringify(interests),
    source: "site-modal",
  });

  return res.status(201).json({ ok: true, email });
});

app.post("/api/newsletter/unsubscribe", (req, res) => {
  const email = cleanText(req.body?.email || "").toLowerCase();
  if (!email) return res.status(400).json({ error: "email is required" });

  unsubscribeNewsletterSubscriber.run(email);
  return res.json({ ok: true, email });
});

function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (token !== adminToken) {
    return res.status(401).json({ error: "unauthorized" });
  }
  return next();
}

function toList(input) {
  if (Array.isArray(input)) return input;
  if (typeof input === "string") {
    return input
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

app.get("/api/admin/submissions", requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `
      SELECT e.*, COALESCE(v.count, 0) AS votes
      FROM events e
      LEFT JOIN votes v ON v.event_id = e.id
      WHERE e.status = 'pending'
      ORDER BY e.created_at DESC
      `,
    )
    .all();
  res.json({ submissions: rows.map(formatEvent) });
});

app.patch("/api/admin/events/:id/status", requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!["approved", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ error: "invalid status" });
  }

  const result = db.prepare("UPDATE events SET status = ? WHERE id = ?").run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "event not found" });

  return res.json({ ok: true, id: req.params.id, status });
});

app.patch("/api/admin/events/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  const existing = db.prepare("SELECT * FROM events WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "event not found" });

  const base = formatEvent({ ...existing, votes: 0 });
  const payload = req.body || {};

  const merged = {
    ...base,
    ...payload,
    id,
    category: payload.category ? toList(payload.category) : base.category,
    accessibility: payload.accessibility ? toList(payload.accessibility) : base.accessibility,
    audience: payload.audience ? toList(payload.audience) : base.audience,
    planning: {
      ...(base.planning || {}),
      ...(payload.planning || {}),
    },
    source: base.source,
    source_trust: base.source_trust,
    source_event_id: base.source_event_id,
    source_event_url: payload.source_event_url ?? base.source_event_url,
    source_feed_url: base.source_feed_url,
    verification_status: base.verification_status,
    evidence: base.evidence,
    first_seen_at: base.first_seen_at,
    last_seen_at: new Date().toISOString(),
    status: base.status,
  };

  const row = toEventRow(merged);
  if (!Number.isFinite(row.lat) || !Number.isFinite(row.lng)) {
    return res.status(400).json({ error: "lat/lng must be numbers" });
  }

  insertEvent.run(row);
  ensureVoteRow.run(id);
  const updated = db
    .prepare(
      `
      SELECT e.*, COALESCE(v.count, 0) AS votes
      FROM events e
      LEFT JOIN votes v ON v.event_id = e.id
      WHERE e.id = ?
      `,
    )
    .get(id);

  return res.json({ ok: true, event: formatEvent(updated) });
});

app.post("/api/admin/ingest", requireAdmin, async (_req, res) => {
  const imported = await ingestCuratedEvents();
  return res.json({ ok: true, imported });
});

app.get("/api/admin/quality", requireAdmin, (_req, res) => {
  const sources = db
    .prepare(
      `
      SELECT s.source_id, s.observed_at, s.event_count, s.avg_quality, s.dead_link_rate, s.sample_size
      FROM source_health_snapshots s
      INNER JOIN (
        SELECT source_id, MAX(observed_at) AS observed_at
        FROM source_health_snapshots
        GROUP BY source_id
      ) latest
      ON latest.source_id = s.source_id AND latest.observed_at = s.observed_at
      ORDER BY s.dead_link_rate DESC, s.event_count DESC
      `,
    )
    .all();

  const deadLinks = db
    .prepare(
      `
      SELECT e.id, e.name, e.city, e.start_date, e.source, e.source_event_url, e.url,
             lc.checked_at, lc.status_code, lc.error
      FROM event_link_checks lc
      JOIN events e ON e.id = lc.event_id
      WHERE lc.ok = 0
      ORDER BY lc.checked_at DESC
      LIMIT 25
      `,
    )
    .all();

  const coverageRows = db
    .prepare(
      `
      SELECT start_date, category_json
      FROM events
      WHERE status = 'approved' AND start_date >= date('now') AND start_date <= date('now', '+14 day')
      `,
    )
    .all();

  const requiredCategories = ["family", "outdoors", "market", "sports", "music", "charity", "wellbeing"];
  const coverageByDay = new Map();
  for (const row of coverageRows) {
    const day = String(row.start_date || "");
    if (!coverageByDay.has(day)) coverageByDay.set(day, new Set());
    const parsed = JSON.parse(row.category_json || "[]");
    for (const category of parsed) {
      coverageByDay.get(day).add(String(category || "").toLowerCase());
    }
  }

  const coverage = Array.from(coverageByDay.entries())
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([day, set]) => {
      const present = requiredCategories.filter((category) => set.has(category));
      const missing = requiredCategories.filter((category) => !set.has(category));
      return {
        day,
        present_count: present.length,
        missing,
      };
    });

  return res.json({
    ok: true,
    generated_at: new Date().toISOString(),
    sources,
    dead_links: deadLinks,
    category_coverage: coverage,
  });
});

app.post("/api/geocode/what3words", async (req, res) => {
  const apiKey = process.env.WHAT3WORDS_API_KEY;
  const words = String(req.body?.words || "").trim().replace(/^\/+/, "");

  if (!words) return res.status(400).json({ error: "words are required" });
  if (!apiKey) {
    return res.status(501).json({
      error: "what3words API key not configured",
      hint: "Set WHAT3WORDS_API_KEY in your .env file",
    });
  }

  const url = new URL("https://api.what3words.com/v3/convert-to-coordinates");
  url.searchParams.set("words", words);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || !data?.coordinates) {
    return res.status(400).json({ error: "Could not resolve what3words", details: data });
  }

  return res.json({
    words: data.words,
    lat: data.coordinates.lat,
    lng: data.coordinates.lng,
    country: data.country,
  });
});

app.post("/api/stripe/checkout", async (req, res) => {
  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!secret || !priceId) {
    return res.status(501).json({
      error: "Stripe not configured",
      hint: "Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID in .env",
    });
  }

  const stripe = new Stripe(secret, { apiVersion: "2025-01-27.acacia" });
  const origin = req.body?.origin || process.env.APP_ORIGIN || "http://localhost:5173";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: stripeTrialDays,
    },
    success_url: `${origin}/#/`,
    cancel_url: `${origin}/#/`,
  });

  return res.json({ checkoutUrl: session.url });
});

app.post("/api/stripe/webhook", (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return res.status(501).json({ error: "Stripe webhook not configured" });
  }

  // Webhook signature verification and subscription-state persistence goes here.
  return res.json({ received: true });
});

app.listen(port, async () => {
  let imported = 0;
  try {
    imported = await ingestCuratedEvents();
  } catch (error) {
    console.error("Initial ingest failed", error);
  }

  setInterval(async () => {
    try {
      await ingestCuratedEvents();
    } catch (error) {
      console.error("Scheduled ingest failed", error);
    }
  }, refreshMs).unref();
  setInterval(() => {
    queueQualityMonitor(false);
  }, linkCheckIntervalMs).unref();
  queueQualityMonitor(true);

  console.log(`MyDaysOff API listening on http://localhost:${port}`);
  console.log(`Auto-ingested curated events: ${imported} (refresh every ${Math.round(refreshMs / 60000)} min)`);
});
