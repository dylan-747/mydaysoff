import { getNhsEvents } from "./sources/nhsEvents.js";
import { getCivicEvents } from "./sources/civicEvents.js";
import { getCultureEvents } from "./sources/cultureEvents.js";
import { getTicketmasterEvents } from "./sources/ticketmasterEvents.js";
import { getFeedRegistryEvents } from "./sources/feedRegistryEvents.js";
import { getOpenActiveEvents } from "./sources/openActiveEvents.js";
import { getPopularEventSeeds } from "./popularEvents.js";

const DEFAULT_MIN_WEEKLY_EVENTS = 220;

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeCity(city) {
  return String(city || "uk")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeVenue(venue) {
  return String(venue || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasGoodUrl(url) {
  const value = String(url || "").trim();
  return /^https?:\/\//i.test(value) && value !== "#";
}

function daysUntil(dateStr) {
  const raw = String(dateStr || "");
  if (!raw) return 365;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(raw);
  day.setHours(0, 0, 0, 0);
  if (Number.isNaN(day.valueOf())) return 365;
  return Math.round((day.valueOf() - today.valueOf()) / (24 * 60 * 60 * 1000));
}

function trustScore(event) {
  const trust = String(event?.source_trust || "");
  if (trust === "official") return 40;
  if (trust === "trusted-partner") return 28;
  if (trust === "community") return 16;
  return 8;
}

function verificationScore(event) {
  const status = String(event?.verification_status || "");
  if (status === "ticketmaster-listing") return 22;
  if (status === "feed-listing") return 20;
  if (status === "community-submitted") return 12;
  return 6;
}

function completenessScore(event) {
  let score = 0;
  if (Number.isFinite(Number(event?.lat)) && Number.isFinite(Number(event?.lng))) score += 12;
  if (String(event?.venue || "").trim()) score += 8;
  if (String(event?.time || "").trim()) score += 5;
  if (hasGoodUrl(event?.source_event_url || event?.url)) score += 12;
  if (String(event?.city || "").trim()) score += 3;
  const summaryLen = String(event?.summary || "").trim().length;
  if (summaryLen >= 40) score += 4;
  return score;
}

function freshnessScore(event) {
  const delta = daysUntil(event?.start_date);
  if (delta < 0) return -20;
  if (delta <= 2) return 16;
  if (delta <= 7) return 12;
  if (delta <= 14) return 8;
  if (delta <= 30) return 5;
  return 2;
}

function qualityScore(event) {
  const popularity = Math.max(0, Number(event?.popularity || 0));
  return trustScore(event) + verificationScore(event) + completenessScore(event) + freshnessScore(event) + Math.min(popularity, 20);
}

function mergeEvents(existing, event) {
  return {
    ...existing,
    ...event,
    popularity: Math.max(Number(existing.popularity || 0), Number(event.popularity || 0)),
    category: Array.from(new Set([...(existing.category || []), ...(event.category || [])])),
    accessibility: Array.from(new Set([...(existing.accessibility || []), ...(event.accessibility || [])])),
    audience: Array.from(new Set([...(existing.audience || []), ...(event.audience || [])])),
    source_trust: trustScore(event) > trustScore(existing) ? event.source_trust : existing.source_trust,
    verification_status:
      verificationScore(event) > verificationScore(existing) ? event.verification_status : existing.verification_status,
  };
}

function dedupeEvents(events) {
  const map = new Map();
  for (const event of events) {
    const key = `${normalizeCity(event.city)}|${String(event.start_date || "")}|${normalizeName(event.name)}|${normalizeVenue(event.venue)}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, event);
      continue;
    }

    const winner = qualityScore(event) > qualityScore(existing) ? event : existing;
    map.set(key, mergeEvents(winner, winner === event ? existing : event));
  }
  return Array.from(map.values());
}

function selectBalanced(events, { maxTotal = 380, perDayLimit = 44, perDayCityLimit = 5, perDayCategoryLimit = 10 } = {}) {
  const sorted = [...events].sort((a, b) => qualityScore(b) - qualityScore(a));
  const selected = [];
  const dayCounts = new Map();
  const dayCityCounts = new Map();
  const dayCategoryCounts = new Map();

  for (const event of sorted) {
    if (selected.length >= maxTotal) break;
    const day = String(event.start_date || "");
    const city = normalizeCity(event.city);
    const categories = Array.isArray(event.category) && event.category.length ? event.category : ["community"];

    const dayCount = dayCounts.get(day) || 0;
    if (dayCount >= perDayLimit) continue;

    const dayCityKey = `${day}|${city}`;
    const cityCount = dayCityCounts.get(dayCityKey) || 0;
    if (cityCount >= perDayCityLimit) continue;

    let blockedByCategory = false;
    for (const category of categories) {
      const dayCategoryKey = `${day}|${String(category || "community").toLowerCase()}`;
      const categoryCount = dayCategoryCounts.get(dayCategoryKey) || 0;
      if (categoryCount >= perDayCategoryLimit) {
        blockedByCategory = true;
        break;
      }
    }
    if (blockedByCategory) continue;

    selected.push(event);
    dayCounts.set(day, dayCount + 1);
    dayCityCounts.set(dayCityKey, cityCount + 1);
    for (const category of categories) {
      const dayCategoryKey = `${day}|${String(category || "community").toLowerCase()}`;
      dayCategoryCounts.set(dayCategoryKey, (dayCategoryCounts.get(dayCategoryKey) || 0) + 1);
    }
  }

  return selected.length ? selected : sorted.slice(0, maxTotal);
}

function isWithinNextDays(dateStr, days = 6) {
  const raw = String(dateStr || "");
  if (!raw) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  const value = new Date(raw);
  value.setHours(0, 0, 0, 0);
  if (Number.isNaN(value.valueOf())) return false;
  return value >= start && value <= end;
}

function ensureWeeklyMinimum(selected, pool, { minWeekly = DEFAULT_MIN_WEEKLY_EVENTS, windowDays = 6 } = {}) {
  if (minWeekly <= 0) return selected;
  const selectedIds = new Set(selected.map((event) => event.id));
  let weeklyCount = selected.filter((event) => isWithinNextDays(event.start_date, windowDays)).length;
  if (weeklyCount >= minWeekly) return selected;

  const additions = [...pool]
    .filter((event) => !selectedIds.has(event.id))
    .filter((event) => isWithinNextDays(event.start_date, windowDays))
    .sort((a, b) => qualityScore(b) - qualityScore(a));

  const next = [...selected];
  for (const event of additions) {
    if (weeklyCount >= minWeekly) break;
    next.push(event);
    selectedIds.add(event.id);
    weeklyCount += 1;
  }
  return next;
}

function ensureCategoryCoverage(
  selected,
  pool,
  { requiredCategories = [], perDayLimit = 44, perDayCityLimit = 5, perDayCategoryLimit = 10 } = {},
) {
  if (!requiredCategories.length || !selected.length) return selected;

  const selectedById = new Map(selected.map((event) => [event.id, event]));
  const byDay = new Map();
  for (const event of selected) {
    const day = String(event.start_date || "");
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(event);
  }

  const poolByDay = new Map();
  for (const event of pool) {
    const day = String(event.start_date || "");
    if (!poolByDay.has(day)) poolByDay.set(day, []);
    poolByDay.get(day).push(event);
  }

  for (const [day, daySelected] of byDay.entries()) {
    const dayPool = poolByDay.get(day) || [];
    if (!dayPool.length) continue;

    for (const category of requiredCategories) {
      const hasCategory = daySelected.some((event) => (event.category || []).map((c) => String(c).toLowerCase()).includes(category));
      if (hasCategory) continue;

      const candidates = dayPool
        .filter((event) => !selectedById.has(event.id))
        .filter((event) => (event.category || []).map((c) => String(c).toLowerCase()).includes(category))
        .sort((a, b) => qualityScore(b) - qualityScore(a));
      if (!candidates.length) continue;

      const candidate = candidates[0];
      const cityKey = normalizeCity(candidate.city);
      const dayCityCount = daySelected.filter((event) => normalizeCity(event.city) === cityKey).length;
      const dayCategoryCount = daySelected.filter((event) =>
        (event.category || []).map((c) => String(c).toLowerCase()).includes(category),
      ).length;

      if (daySelected.length < perDayLimit && dayCityCount < perDayCityLimit && dayCategoryCount < perDayCategoryLimit) {
        daySelected.push(candidate);
        selectedById.set(candidate.id, candidate);
        continue;
      }

      const replaceIdx = daySelected
        .map((event, idx) => ({ event, idx }))
        .filter(({ event }) => !(event.category || []).map((c) => String(c).toLowerCase()).includes(category))
        .sort((a, b) => qualityScore(a.event) - qualityScore(b.event))[0]?.idx;
      if (replaceIdx === undefined) continue;

      selectedById.delete(daySelected[replaceIdx].id);
      daySelected[replaceIdx] = candidate;
      selectedById.set(candidate.id, candidate);
    }
  }

  return Array.from(selectedById.values());
}

export async function getCuratedEvents() {
  const [ticketmaster, feedRegistry, openActive] = await Promise.all([
    getTicketmasterEvents(),
    getFeedRegistryEvents(),
    getOpenActiveEvents(),
  ]);
  const includeSample = process.env.DEV_ALLOW_SAMPLE_EVENTS === "true";
  const liveOnly = process.env.LIVE_EVENTS_ONLY !== "false";
  const minWeeklyEvents = Number(process.env.MIN_WEEKLY_EVENTS || DEFAULT_MIN_WEEKLY_EVENTS);
  const mergedReal = dedupeEvents([...feedRegistry, ...ticketmaster, ...openActive]);

  if (liveOnly) {
    const liveBalanced = selectBalanced(mergedReal, {
      maxTotal: 420,
      perDayLimit: 64,
      perDayCityLimit: 10,
      perDayCategoryLimit: 14,
    });
    return liveBalanced.sort((a, b) => {
      const dateCmp = String(a.start_date || "").localeCompare(String(b.start_date || ""));
      if (dateCmp !== 0) return dateCmp;
      return qualityScore(b) - qualityScore(a);
    });
  }

  const staticSample = [...getNhsEvents(), ...getCivicEvents(), ...getCultureEvents()];
  const popularSeeds = getPopularEventSeeds();

  // Use static trusted sample first; only blend large synthetic seed pools when real data is sparse.
  const useStaticSample = includeSample || mergedReal.length < 160;
  const usePopularSeeds = includeSample || mergedReal.length < 80;
  const baseSeedCap = mergedReal.length < 50 ? 90 : 45;
  const seedCap = Math.max(baseSeedCap, Math.ceil(minWeeklyEvents * 1.4));
  const blended = [
    ...mergedReal,
    ...(useStaticSample ? staticSample : []),
    ...(usePopularSeeds ? popularSeeds.slice(0, seedCap) : []),
  ];

  const deduped = dedupeEvents(blended);
  const balanceOptions = {
    maxTotal: mergedReal.length > 0 ? 420 : 320,
    perDayLimit: mergedReal.length > 0 ? 54 : 38,
    perDayCityLimit: mergedReal.length > 0 ? 6 : 4,
    perDayCategoryLimit: 10,
  };
  const balanced = selectBalanced(deduped, balanceOptions);
  const covered = ensureCategoryCoverage(balanced, deduped, {
    ...balanceOptions,
    requiredCategories: ["family", "outdoors", "market", "sports", "music", "charity", "wellbeing"],
  });
  const weeklyGuaranteed = ensureWeeklyMinimum(covered, deduped, {
    minWeekly: minWeeklyEvents,
    windowDays: 6,
  });

  return weeklyGuaranteed.sort((a, b) => {
    const dateCmp = String(a.start_date || "").localeCompare(String(b.start_date || ""));
    if (dateCmp !== 0) return dateCmp;
    return qualityScore(b) - qualityScore(a);
  });
}
