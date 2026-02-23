const TICKETMASTER_ENDPOINT = "https://app.ticketmaster.com/discovery/v2/events.json";

function pickCategory(classifications = []) {
  const segment = classifications[0]?.segment?.name?.toLowerCase() || "";
  const genre = classifications[0]?.genre?.name?.toLowerCase() || "";

  if (segment.includes("arts") || genre.includes("museum")) return ["wellbeing", "family"];
  if (segment.includes("music")) return ["music"];
  if (segment.includes("sports")) return ["sports", "outdoors"];
  if (genre.includes("food")) return ["market", "family"];
  return ["wellbeing"];
}

function toEvent(item) {
  const venue = item?._embedded?.venues?.[0];
  const city = venue?.city?.name || "Unknown";
  const lat = Number(venue?.location?.latitude);
  const lng = Number(venue?.location?.longitude);
  const date = item?.dates?.start?.localDate;

  if (!date || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    id: `tm_${item.id}`,
    name: item.name || "Ticketmaster Event",
    start_date: date,
    end_date: date,
    time: item?.dates?.start?.localTime || "",
    category: pickCategory(item.classifications),
    cost: "paid",
    venue: venue?.name || "",
    city,
    url: item.url || "https://www.ticketmaster.co.uk/",
    source: "ticketmaster",
    source_trust: "trusted-partner",
    source_event_url: item.url || "https://www.ticketmaster.co.uk/",
    source_feed_url: "https://app.ticketmaster.com/discovery/v2/events.json",
    source_event_id: item.id || "",
    lat,
    lng,
    popularity: Math.max(6, Number(item?.promoter?.id ? 10 : 8)),
    summary: item?.info || item?.pleaseNote || "Popular live event from Ticketmaster listings.",
    accessibility: ["wheelchair"],
    audience: ["adults", "teens"],
    indoor: "mixed",
    activity_level: "medium",
    vibe: "social",
    planning: {
      booking_required: true,
      public_transport: "Check venue transit options",
      bring_with_you: "Ticket confirmation",
    },
    verification_status: "ticketmaster-listing",
    evidence: {
      publisher: "Ticketmaster Discovery API",
      item_title: item.name || "",
      published_at: item?.dates?.start?.dateTBD ? null : date,
    },
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  };
}

export async function getTicketmasterEvents() {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) return [];

  const url = new URL(TICKETMASTER_ENDPOINT);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("countryCode", "GB");
  url.searchParams.set("size", "120");
  url.searchParams.set("sort", "date,asc");

  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    const events = data?._embedded?.events || [];
    return events.map(toEvent).filter(Boolean);
  } catch {
    return [];
  }
}
