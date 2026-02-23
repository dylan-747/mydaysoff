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
  return asList(input)
    .map((item) => item.toLowerCase())
    .filter(Boolean);
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
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

function toEventRow(input) {
  const category = asTagList(input.category);
  const accessibility = asTagList(input.accessibility);
  const audience = asTagList(input.audience);
  return {
    id: input.id,
    name: input.name,
    start_date: input.start_date,
    end_date: input.end_date || input.start_date,
    time: input.time || "",
    category_json: JSON.stringify(category),
    cost: input.cost || "free",
    venue: input.venue || "",
    city: input.city || "Edinburgh",
    url: input.url || "#",
    what3words: input.what3words || "",
    summary: summarizeEvent(input),
    accessibility_json: JSON.stringify(accessibility),
    audience_json: JSON.stringify(audience),
    indoor: cleanText(input.indoor || "").toLowerCase(),
    activity_level: cleanText(input.activity_level || "").toLowerCase(),
    vibe: cleanText(input.vibe || "").toLowerCase(),
    planning_json: JSON.stringify(input.planning || {}),
    source_trust: input.source_trust || "trusted-partner",
    source_event_id: input.source_event_id || "",
    source_event_url: input.source_event_url || input.url || "",
    source_feed_url: input.source_feed_url || "",
    verification_status: input.verification_status || "community-submitted",
    evidence_json: JSON.stringify(input.evidence || {}),
    first_seen_at: input.first_seen_at || new Date().toISOString(),
    last_seen_at: input.last_seen_at || new Date().toISOString(),
    lat: Number(input.lat ?? 55.9533),
    lng: Number(input.lng ?? -3.1883),
    status: input.status || "pending",
    source: input.source || "user",
  };
}

function formatEvent(row) {
  const event = {
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
    source: row.source,
  };
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
  return incoming.length;
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

  console.log(`MyDaysOff API listening on http://localhost:${port}`);
  console.log(`Auto-ingested curated events: ${imported} (refresh every ${Math.round(refreshMs / 60000)} min)`);
});
