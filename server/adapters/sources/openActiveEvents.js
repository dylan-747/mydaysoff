import fs from "node:fs";
import path from "node:path";

const configPath = path.resolve(process.cwd(), "server/sources/openactive.json");
const MAX_PAGES_PER_SOURCE = 3;
const MAX_ITEMS_PER_SOURCE = 300;
const MAX_FEEDS_PER_SOURCE = 8;
const MAX_DISCOVERY_DEPTH = 3;

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slug(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseJsonConfig() {
  if (!fs.existsSync(configPath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseEnvConfig() {
  const raw = clean(process.env.OPENACTIVE_FEEDS || "");
  if (!raw) return [];
  return raw
    .split(",")
    .map((value, idx) => value.trim())
    .filter(Boolean)
    .map((url, idx) => ({
      id: `openactive_env_${idx + 1}`,
      name: `OpenActive Feed ${idx + 1}`,
      url,
      trust: "trusted-partner",
    }));
}

function loadSources() {
  const envSources = parseEnvConfig();
  if (envSources.length) return envSources;
  return parseJsonConfig();
}

function cityFromText(text) {
  const known = [
    "London",
    "Manchester",
    "Leeds",
    "Bristol",
    "Liverpool",
    "Glasgow",
    "Edinburgh",
    "Cardiff",
    "Belfast",
    "Newcastle",
    "Birmingham",
    "Sheffield",
    "Nottingham",
    "Leicester",
    "Coventry",
    "Southampton",
    "Plymouth",
    "Aberdeen",
  ];
  const lower = clean(text).toLowerCase();
  return known.find((city) => lower.includes(city.toLowerCase())) || "";
}

function roughCoords(city) {
  const map = {
    London: [51.5072, -0.1276],
    Manchester: [53.4808, -2.2426],
    Leeds: [53.8008, -1.5491],
    Bristol: [51.4545, -2.5879],
    Liverpool: [53.4084, -2.9916],
    Glasgow: [55.8642, -4.2518],
    Edinburgh: [55.9533, -3.1883],
    Cardiff: [51.4816, -3.1791],
    Belfast: [54.5973, -5.9301],
    Newcastle: [54.9783, -1.6178],
    Birmingham: [52.4862, -1.8904],
    Sheffield: [53.3811, -1.4701],
    Nottingham: [52.9548, -1.1581],
    Leicester: [52.6369, -1.1398],
    Coventry: [52.4068, -1.5197],
    Southampton: [50.9097, -1.4044],
    Plymouth: [50.3755, -4.1427],
    Aberdeen: [57.1497, -2.0943],
  };
  return map[city] || [54.5, -2.2];
}

function extractRecords(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  const typeValue = clean(payload?.["@type"] || payload?.type || "").toLowerCase();
  if (typeValue.includes("datacatalog")) return [];
  if (Array.isArray(payload?.items)) {
    return payload.items.map((item) => item?.data || item).filter(Boolean);
  }
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.["@graph"])) return payload["@graph"];
  if (payload?.id || payload?.identifier || payload?.name) return [payload];
  return [];
}

function absoluteUrl(candidate, baseUrl) {
  const value = clean(candidate);
  if (!value) return "";
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function extractJsonLikeLinksFromHtml(html, baseUrl) {
  const links = new Set();
  const source = String(html || "");
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  let match = hrefRegex.exec(source);
  while (match) {
    const href = match[1];
    const lower = href.toLowerCase();
    if (lower.includes("json") || lower.includes("openactive")) {
      const url = absoluteUrl(href, baseUrl);
      if (url) links.add(url);
    }
    match = hrefRegex.exec(source);
  }

  // Some OpenActive catalog pages embed feed URLs in JSON-LD/script text rather than href links.
  const absoluteRegex = /https?:\/\/[^\s"'<>]+/gi;
  let absolute = absoluteRegex.exec(source);
  while (absolute) {
    const candidate = absolute[0].replace(/[),.;]+$/, "");
    const lower = candidate.toLowerCase();
    if (lower.includes("openactive") || lower.includes(".json") || lower.includes("datacatalog")) {
      const url = absoluteUrl(candidate, baseUrl);
      if (url) links.add(url);
    }
    absolute = absoluteRegex.exec(source);
  }

  const relativeRegex = /["'](\/[^"']*(openactive|json|datacatalog)[^"']*)["']/gi;
  let relative = relativeRegex.exec(source);
  while (relative) {
    const url = absoluteUrl(relative[1], baseUrl);
    if (url) links.add(url);
    relative = relativeRegex.exec(source);
  }
  return Array.from(links);
}

async function readOpenActiveResponse(response, requestUrl) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const text = await response.text();
  if (contentType.includes("json") || contentType.includes("ld+json")) {
    try {
      return { payload: JSON.parse(text), discovered: [] };
    } catch {
      return { payload: null, discovered: [] };
    }
  }
  // Some providers return HTML catalog pages at /OpenActive/.
  return {
    payload: null,
    discovered: extractJsonLikeLinksFromHtml(text, requestUrl),
  };
}

function extractDiscoveryUrls(payload, baseUrl) {
  const urls = new Set();
  const add = (value) => {
    const url = absoluteUrl(value, baseUrl);
    if (url) urls.add(url);
  };

  if (!payload) return [];

  for (const item of asArray(payload?.dataset)) {
    if (typeof item === "string") add(item);
    else if (typeof item === "object") {
      add(item?.url);
      add(item?.contentUrl);
      add(item?.id);
      for (const dist of asArray(item?.distribution)) {
        if (typeof dist === "string") add(dist);
        else {
          add(dist?.contentUrl);
          add(dist?.url);
          add(dist?.id);
        }
      }
    }
  }

  for (const item of asArray(payload?.hasPart)) {
    if (typeof item === "string") add(item);
    else if (typeof item === "object") {
      add(item?.url);
      add(item?.id);
      add(item?.contentUrl);
    }
  }

  for (const dist of asArray(payload?.distribution)) {
    if (typeof dist === "string") add(dist);
    else {
      add(dist?.contentUrl);
      add(dist?.url);
      add(dist?.id);
    }
  }

  return Array.from(urls);
}

function categoryFromText(source, text) {
  const lower = clean(text).toLowerCase();
  if (lower.includes("run") || lower.includes("cycling") || lower.includes("football") || lower.includes("sport")) return ["sports", "outdoors"];
  if (lower.includes("walk") || lower.includes("hike") || lower.includes("outdoor")) return ["outdoors", "wellbeing"];
  if (lower.includes("dance") || lower.includes("music")) return ["music", "wellbeing"];
  if (lower.includes("market") || lower.includes("food")) return ["market", "family"];
  if (lower.includes("family") || lower.includes("kids") || lower.includes("children")) return ["family"];
  if (lower.includes("health") || lower.includes("wellbeing") || lower.includes("mindfulness") || lower.includes("yoga")) return ["wellbeing"];
  if (lower.includes("charity") || lower.includes("community")) return ["charity", "wellbeing"];
  return source.categoryHint?.length ? source.categoryHint : ["wellbeing"];
}

function getName(input) {
  if (typeof input?.name === "string") return clean(input.name);
  if (typeof input?.name?.en === "string") return clean(input.name.en);
  if (Array.isArray(input?.name)) return clean(input.name[0]);
  return "";
}

function extractCost(input) {
  const offers = asArray(input?.offers);
  if (!offers.length) {
    if (input?.isAccessibleForFree === true) return "free";
    return "paid";
  }
  const hasFree = offers.some((offer) => Number(offer?.price) <= 0 || String(offer?.price || "").toLowerCase() === "0");
  if (hasFree || input?.isAccessibleForFree === true) return "free";
  const hasDonation = offers.some((offer) => clean(offer?.name).toLowerCase().includes("donation"));
  if (hasDonation) return "donation";
  return "paid";
}

function extractAccessibility(input) {
  const tags = new Set();
  const supports = asArray(input?.accessibilitySupport).map((value) => clean(value).toLowerCase());
  const text = clean(`${input?.description || ""} ${supports.join(" ")}`).toLowerCase();
  if (supports.some((value) => value.includes("wheelchair")) || text.includes("wheelchair")) tags.add("wheelchair");
  if (supports.some((value) => value.includes("hearing")) || text.includes("hearing loop")) tags.add("hearing-loop");
  if (text.includes("quiet")) tags.add("quiet-space");
  if (!tags.size) tags.add("check-source");
  return Array.from(tags);
}

function extractAudience(input) {
  const text = clean(`${input?.activity?.prefLabel || ""} ${input?.description || ""} ${input?.ageRange || ""}`).toLowerCase();
  if (text.includes("all ages")) return ["all-ages"];
  if (text.includes("adult")) return ["adults"];
  if (text.includes("teen")) return ["teens"];
  if (text.includes("child") || text.includes("family")) return ["all-ages"];
  return ["all-ages"];
}

function extractLocation(input, source) {
  const place = input?.location || input?.superEvent?.location || {};
  const venue = clean(place?.name || place?.address?.streetAddress || source.name || "OpenActive listing");
  const city =
    clean(place?.address?.addressLocality || place?.address?.addressRegion || source.city || "") ||
    cityFromText(`${venue} ${clean(input?.description || "")}`) ||
    "UK";

  const lat = Number(place?.geo?.latitude ?? place?.latitude ?? source.lat);
  const lng = Number(place?.geo?.longitude ?? place?.longitude ?? source.lng);
  const [fallbackLat, fallbackLng] = roughCoords(city);
  return {
    venue,
    city,
    lat: Number.isFinite(lat) ? lat : fallbackLat,
    lng: Number.isFinite(lng) ? lng : fallbackLng,
  };
}

function normalizeRecord(source, record, index) {
  const name = getName(record) || "OpenActive activity";
  const startRaw = record?.startDate || record?.startDateTime || record?.scheduledStartTime;
  const endRaw = record?.endDate || record?.endDateTime || startRaw;
  const start = startRaw ? new Date(startRaw) : null;
  const end = endRaw ? new Date(endRaw) : start;
  if (!start || Number.isNaN(start.valueOf())) return null;

  const url = clean(record?.url || record?.sameAs || record?.identifier || source.url || "");
  const description = clean(record?.description || "");
  const activityLabel = clean(record?.activity?.prefLabel || record?.activity?.name || record?.activity || "");
  const location = extractLocation(record, source);
  const categories = categoryFromText(source, `${name} ${activityLabel} ${description}`);
  const text = `${name} ${activityLabel} ${description}`.toLowerCase();
  const indoor = text.includes("outdoor") ? "outdoor" : text.includes("indoor") ? "indoor" : "mixed";
  const activityLevel = text.includes("beginner") || text.includes("gentle") ? "low" : text.includes("intense") ? "high" : "medium";
  const bookingRequired = text.includes("book") || text.includes("ticket") || extractCost(record) === "paid";
  const popularity = 8 + (categories.includes("sports") ? 2 : 0) + (categories.includes("family") ? 1 : 0);

  const recordId = clean(String(record?.id || record?.identifier || `${source.id}_${index}`));
  const idTail = recordId ? slug(recordId).slice(0, 52) : `${index}`;
  return {
    id: `openactive_${source.id}_${idTail || index}`,
    source_event_id: recordId || `${source.id}_${index}`,
    source_feed_url: source.url,
    source_event_url: url || source.url,
    name,
    start_date: start.toISOString().slice(0, 10),
    end_date: end && !Number.isNaN(end.valueOf()) ? end.toISOString().slice(0, 10) : start.toISOString().slice(0, 10),
    time: start.toISOString().slice(11, 16),
    category: categories,
    cost: extractCost(record),
    venue: location.venue,
    city: location.city,
    url: url || source.url,
    summary: description.slice(0, 220),
    accessibility: extractAccessibility(record),
    audience: extractAudience(record),
    indoor,
    activity_level: activityLevel,
    vibe: categories.includes("sports") || categories.includes("outdoors") ? "active" : "supportive",
    planning: {
      booking_required: bookingRequired,
      public_transport: "Check source listing for local transport and access details",
      bring_with_you: categories.includes("outdoors") ? "Comfortable shoes and water" : "Any booking confirmation if required",
    },
    source: `openactive-${source.id}`,
    source_trust: source.trust || "trusted-partner",
    verification_status: "feed-listing",
    evidence: {
      publisher: source.name || "OpenActive provider",
      item_title: name,
      published_at: null,
    },
    last_seen_at: new Date().toISOString(),
    lat: location.lat,
    lng: location.lng,
    popularity,
  };
}

async function fetchSourceEvents(source) {
  const headers = { "User-Agent": "mydaysoff-openactive/1.0", Accept: "application/json" };
  const all = [];
  const visited = new Set();

  async function fetchFromFeedUrl(feedUrl, feedIndex, depth = 0) {
    const firstUrl = absoluteUrl(feedUrl, source.url);
    if (!firstUrl || visited.has(firstUrl) || all.length >= MAX_ITEMS_PER_SOURCE) return;
    visited.add(firstUrl);

    let url = feedUrl;
    for (let page = 0; page < MAX_PAGES_PER_SOURCE && all.length < MAX_ITEMS_PER_SOURCE; page += 1) {
      if (!url || all.length >= MAX_ITEMS_PER_SOURCE) break;
      const response = await fetch(url, { headers });
      if (!response.ok) break;
      const { payload, discovered } = await readOpenActiveResponse(response, url);
      if (!payload && discovered.length && depth < MAX_DISCOVERY_DEPTH) {
        let discoveredIndex = 0;
        for (const discoveredUrl of discovered.slice(0, MAX_FEEDS_PER_SOURCE)) {
          if (all.length >= MAX_ITEMS_PER_SOURCE) break;
          await fetchFromFeedUrl(discoveredUrl, feedIndex + discoveredIndex + 1, depth + 1);
          discoveredIndex += 1;
        }
        break;
      }
      const records = extractRecords(payload);
      if (records.length) {
        const normalized = records
          .map((record, idx) => normalizeRecord(source, record, feedIndex * 10000 + page * 1000 + idx))
          .filter(Boolean);
        all.push(...normalized);
      } else if (page === 0 && depth < MAX_DISCOVERY_DEPTH) {
        // Some endpoints are catalogs that point to actual data feeds.
        const discovered = extractDiscoveryUrls(payload, url);
        let discoveredIndex = 0;
        for (const discoveredUrl of discovered.slice(0, MAX_FEEDS_PER_SOURCE)) {
          if (all.length >= MAX_ITEMS_PER_SOURCE) break;
          await fetchFromFeedUrl(discoveredUrl, feedIndex + discoveredIndex + 1, depth + 1);
          discoveredIndex += 1;
        }
      }

      const next = absoluteUrl(payload?.next, url);
      if (!next || next === url) break;
      url = next;
    }
  }

  const entryResponse = await fetch(source.url, { headers });
  if (!entryResponse.ok) return [];
  const entryRead = await readOpenActiveResponse(entryResponse, source.url);
  const entryPayload = entryRead.payload;
  if (!entryPayload && entryRead.discovered.length) {
    let discoveredIndex = 0;
    for (const discoveredUrl of entryRead.discovered.slice(0, MAX_FEEDS_PER_SOURCE)) {
      if (all.length >= MAX_ITEMS_PER_SOURCE) break;
      await fetchFromFeedUrl(discoveredUrl, discoveredIndex + 1, 1);
      discoveredIndex += 1;
    }
    return all.slice(0, MAX_ITEMS_PER_SOURCE);
  }
  if (!entryPayload) return [];

  const directRecords = extractRecords(entryPayload);
  if (directRecords.length) {
    const normalized = directRecords.map((record, idx) => normalizeRecord(source, record, idx)).filter(Boolean);
    all.push(...normalized);
  }

  const discovered = extractDiscoveryUrls(entryPayload, source.url);
  if (!directRecords.length && !discovered.length) {
    // Some providers expose feed pages directly at source.url with a next chain.
    await fetchFromFeedUrl(source.url, 0);
    return all.slice(0, MAX_ITEMS_PER_SOURCE);
  }

  let feedIndex = 0;
  for (const feedUrl of discovered.slice(0, MAX_FEEDS_PER_SOURCE)) {
    if (all.length >= MAX_ITEMS_PER_SOURCE) break;
    await fetchFromFeedUrl(feedUrl, feedIndex);
    feedIndex += 1;
  }

  return all.slice(0, MAX_ITEMS_PER_SOURCE);
}

export async function getOpenActiveEvents() {
  const sources = loadSources().filter((source) => clean(source?.url));
  if (!sources.length) return [];
  const tasks = sources.map(async (source) => {
    try {
      return await fetchSourceEvents(source);
    } catch {
      return [];
    }
  });
  const results = await Promise.all(tasks);
  return results.flat();
}
