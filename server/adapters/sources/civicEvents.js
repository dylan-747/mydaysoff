function addDays(baseDate, days) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

const templates = [
  { title: "Open Data Community Lab", category: ["charity", "wellbeing"], indoor: "indoor", level: "low", vibe: "creative" },
  { title: "Neighbourhood Repair Cafe", category: ["charity", "market"], indoor: "mixed", level: "low", vibe: "social" },
  { title: "Community Street Food & Makers", category: ["market", "family"], indoor: "outdoor", level: "medium", vibe: "social" },
  { title: "Family Discovery Trail", category: ["family", "outdoors"], indoor: "outdoor", level: "medium", vibe: "active" },
  { title: "City Museum Late", category: ["family", "wellbeing"], indoor: "indoor", level: "low", vibe: "chill" },
  { title: "Beginner Creative Writing Circle", category: ["wellbeing"], indoor: "indoor", level: "low", vibe: "creative" },
];

export function getCivicEvents() {
  const today = new Date();
  const cities = [
    { city: "Edinburgh", lat: 55.9533, lng: -3.1883, url: "https://www.edinburgh.gov.uk/events" },
    { city: "Glasgow", lat: 55.8642, lng: -4.2518, url: "https://www.glasgow.gov.uk/" },
    { city: "Cardiff", lat: 51.4816, lng: -3.1791, url: "https://www.visitcardiff.com/" },
    { city: "Liverpool", lat: 53.4084, lng: -2.9916, url: "https://www.visitliverpool.com/" },
    { city: "Newcastle", lat: 54.9783, lng: -1.6178, url: "https://newcastlegateshead.com/" },
  ];

  const events = [];
  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    for (const [index, city] of cities.entries()) {
      const t = templates[(dayOffset + index) % templates.length];
      events.push({
        id: `civic_${city.city.toLowerCase()}_${addDays(today, dayOffset)}_${t.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        name: `${city.city} ${t.title}`,
        start_date: addDays(today, dayOffset),
        end_date: addDays(today, dayOffset),
        time: dayOffset % 2 === 0 ? "11:00" : "18:30",
        category: t.category,
        cost: dayOffset % 3 === 0 ? "free" : dayOffset % 3 === 1 ? "donation" : "paid",
        venue: `${city.city} Civic Hub`,
        city: city.city,
        url: city.url,
        source: "civic-trusted",
        source_trust: "official",
        lat: city.lat + ((dayOffset % 5) - 2) * 0.012,
        lng: city.lng + (((dayOffset + 2) % 5) - 2) * 0.012,
        popularity: 8 + ((13 - dayOffset) % 6),
        summary: "Local city-supported event with practical info and community focus.",
        accessibility: ["wheelchair", dayOffset % 2 ? "hearing-loop" : "quiet-space"],
        audience: dayOffset % 3 ? ["all-ages"] : ["adults", "teens"],
        indoor: t.indoor,
        activity_level: t.level,
        vibe: t.vibe,
        planning: {
          booking_required: dayOffset % 4 === 0,
          public_transport: "Central links available",
          bring_with_you: dayOffset % 2 === 0 ? "Reusable bottle" : "Warm layer",
        },
      });
    }
  }

  return events;
}
