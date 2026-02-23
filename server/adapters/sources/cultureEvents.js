function addDays(baseDate, days) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

const concepts = [
  { title: "Indie Film Meetup", category: ["wellbeing", "family"], vibe: "chill" },
  { title: "Poetry Open Mic", category: ["wellbeing"], vibe: "creative" },
  { title: "Local Food Stories", category: ["market", "family"], vibe: "social" },
  { title: "Creative Coding Club", category: ["wellbeing", "charity"], vibe: "creative" },
  { title: "Sunset Community Picnic", category: ["family", "outdoors"], vibe: "social" },
  { title: "Beginner Board Game Social", category: ["family", "wellbeing"], vibe: "chill" },
];

export function getCultureEvents() {
  const today = new Date();
  const places = [
    { city: "London", lat: 51.5072, lng: -0.1276 },
    { city: "Bristol", lat: 51.4545, lng: -2.5879 },
    { city: "Leeds", lat: 53.8008, lng: -1.5491 },
    { city: "Manchester", lat: 53.4808, lng: -2.2426 },
    { city: "Belfast", lat: 54.5973, lng: -5.9301 },
  ];

  return places.flatMap((place, cityIndex) =>
    concepts.map((concept, i) => {
      const dateOffset = cityIndex + i + 1;
      return {
        id: `culture_${place.city.toLowerCase()}_${addDays(today, dateOffset)}_${concept.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        name: `${place.city} ${concept.title}`,
        start_date: addDays(today, dateOffset),
        end_date: addDays(today, dateOffset),
        time: i % 2 ? "19:15" : "17:45",
        category: concept.category,
        cost: i % 3 ? "free" : "paid",
        venue: `${place.city} Community Space`,
        city: place.city,
        url: "https://www.eventbrite.co.uk/",
        source: "community-partner",
        source_trust: "trusted-partner",
        lat: place.lat + ((i % 4) - 1.5) * 0.01,
        lng: place.lng + (((i + 1) % 4) - 1.5) * 0.01,
        popularity: 7 + (5 - Math.min(i, 5)),
        summary: "Friendly local gathering with clear practical details and low confusion planning.",
        accessibility: ["wheelchair"],
        audience: i % 2 ? ["adults", "teens"] : ["all-ages"],
        indoor: i % 3 ? "indoor" : "mixed",
        activity_level: i % 2 ? "low" : "medium",
        vibe: concept.vibe,
        planning: {
          booking_required: i % 4 === 0,
          public_transport: "Near central bus/train",
          bring_with_you: "Optional notebook",
        },
      };
    }),
  );
}
