import fs from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import ical from "node-ical";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
const registryPath = path.resolve(process.cwd(), "server/sources/registry.json");

function loadRegistry() {
  if (!fs.existsSync(registryPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(registryPath, "utf8"));
  } catch {
    return [];
  }
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractCityFromText(text = "") {
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
  ];
  const hit = known.find((city) => text.toLowerCase().includes(city.toLowerCase()));
  return hit || "UK";
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
    UK: [54.5, -2.2],
  };
  return map[city] || map.UK;
}

function normalizeFromRss(source, item, index) {
  const title = item.title || item["dc:title"] || "Untitled event";
  const link = item.link || item.guid || source.url;
  const description = String(item.description || item["content:encoded"] || "").replace(/<[^>]*>/g, " ").trim();
  const pub = item.pubDate ? new Date(item.pubDate) : null;
  const city = extractCityFromText(`${title} ${description}`);
  const [lat, lng] = roughCoords(city);
  const date = pub && !Number.isNaN(pub.valueOf()) ? pub.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  return {
    id: `feed_${source.id}_${Buffer.from(String(link)).toString("base64").slice(0, 16)}_${index}`,
    source_event_id: String(item.guid || link || `${source.id}_${index}`),
    source_feed_url: source.url,
    source_event_url: link,
    name: title,
    start_date: date,
    end_date: date,
    time: "",
    category: source.categoryHint || ["wellbeing"],
    cost: "free",
    venue: city === "UK" ? source.name : `${city} (from source listing)`,
    city,
    url: link,
    summary: description.slice(0, 220),
    accessibility: ["check-source"],
    audience: ["all-ages"],
    indoor: "mixed",
    activity_level: "low",
    vibe: "informative",
    planning: {
      booking_required: false,
      public_transport: "See source listing",
      bring_with_you: "Check source listing",
    },
    source: source.id,
    source_trust: source.trust || "trusted-partner",
    verification_status: "feed-listing",
    evidence: {
      publisher: source.name,
      published_at: item.pubDate || null,
      item_title: title,
    },
    last_seen_at: new Date().toISOString(),
    lat,
    lng,
    popularity: 7,
  };
}

async function fetchRssOrAtom(source) {
  const response = await fetch(source.url, { headers: { "User-Agent": "mydaysoff-bot/1.0" } });
  if (!response.ok) return [];

  const xml = await response.text();
  const parsed = parser.parse(xml);
  const channelItems = toArray(parsed?.rss?.channel?.item);
  const atomEntries = toArray(parsed?.feed?.entry);

  if (channelItems.length) {
    return channelItems.map((item, idx) => normalizeFromRss(source, item, idx));
  }

  if (atomEntries.length) {
    const fakeRssItems = atomEntries.map((entry) => ({
      title: entry.title?.["#text"] || entry.title,
      link: entry.link?.href || entry.link,
      description: entry.summary?.["#text"] || entry.summary || entry.content?.["#text"] || entry.content,
      pubDate: entry.updated || entry.published,
      guid: entry.id,
    }));
    return fakeRssItems.map((item, idx) => normalizeFromRss(source, item, idx));
  }

  return [];
}

async function fetchIcs(source) {
  const response = await fetch(source.url, { headers: { "User-Agent": "mydaysoff-bot/1.0" } });
  if (!response.ok) return [];
  const content = await response.text();
  const calendar = ical.sync.parseICS(content);
  const events = Object.values(calendar).filter((item) => item.type === "VEVENT");

  return events.map((item, idx) => {
    const city = extractCityFromText(`${item.location || ""} ${item.summary || ""}`);
    const [lat, lng] = roughCoords(city);
    const start = item.start ? new Date(item.start) : new Date();
    const end = item.end ? new Date(item.end) : start;

    return {
      id: `feed_${source.id}_${item.uid || idx}`,
      source_event_id: String(item.uid || `${source.id}_${idx}`),
      source_feed_url: source.url,
      source_event_url: source.url,
      name: item.summary || "Calendar event",
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      time: start.toISOString().slice(11, 16),
      category: source.categoryHint || ["wellbeing"],
      cost: "free",
      venue: item.location || city,
      city,
      url: source.url,
      summary: String(item.description || "").slice(0, 220),
      accessibility: ["check-source"],
      audience: ["all-ages"],
      indoor: "mixed",
      activity_level: "low",
      vibe: "informative",
      planning: {
        booking_required: false,
        public_transport: "See source listing",
        bring_with_you: "Check source listing",
      },
      source: source.id,
      source_trust: source.trust || "trusted-partner",
      verification_status: "feed-listing",
      evidence: {
        publisher: source.name,
        published_at: null,
        item_title: item.summary || "Calendar event",
      },
      last_seen_at: new Date().toISOString(),
      lat,
      lng,
      popularity: 7,
    };
  });
}

export async function getFeedRegistryEvents() {
  const registry = loadRegistry();
  const tasks = registry.map(async (source) => {
    try {
      if (source.type === "ics") return await fetchIcs(source);
      return await fetchRssOrAtom(source);
    } catch {
      return [];
    }
  });

  const results = await Promise.all(tasks);
  return results.flat();
}
