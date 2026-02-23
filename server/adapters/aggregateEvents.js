import { getNhsEvents } from "./sources/nhsEvents.js";
import { getCivicEvents } from "./sources/civicEvents.js";
import { getCultureEvents } from "./sources/cultureEvents.js";
import { getTicketmasterEvents } from "./sources/ticketmasterEvents.js";
import { getFeedRegistryEvents } from "./sources/feedRegistryEvents.js";

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dedupeEvents(events) {
  const map = new Map();
  for (const event of events) {
    const key = `${event.city}|${event.start_date}|${normalizeName(event.name)}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, event);
      continue;
    }

    map.set(key, {
      ...existing,
      popularity: Math.max(Number(existing.popularity || 0), Number(event.popularity || 0)),
      category: Array.from(new Set([...(existing.category || []), ...(event.category || [])])),
      accessibility: Array.from(new Set([...(existing.accessibility || []), ...(event.accessibility || [])])),
      source: `${existing.source},${event.source}`,
      source_trust: existing.source_trust === "official" || event.source_trust === "official" ? "official" : "trusted-partner",
    });
  }
  return Array.from(map.values());
}

export async function getCuratedEvents() {
  const [ticketmaster, feedRegistry] = await Promise.all([getTicketmasterEvents(), getFeedRegistryEvents()]);
  const includeSample = process.env.DEV_ALLOW_SAMPLE_EVENTS === "true";
  const sample = [...getNhsEvents(), ...getCivicEvents(), ...getCultureEvents()];
  const mergedReal = [...feedRegistry, ...ticketmaster];
  const merged = mergedReal.length > 0 ? [...mergedReal, ...(includeSample ? sample : [])] : sample;
  return dedupeEvents(merged);
}
