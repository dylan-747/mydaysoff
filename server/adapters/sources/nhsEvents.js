function addDays(baseDate, days) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export function getNhsEvents() {
  const today = new Date();
  const cities = [
    { city: "London", lat: 51.5072, lng: -0.1276 },
    { city: "Manchester", lat: 53.4808, lng: -2.2426 },
    { city: "Leeds", lat: 53.8008, lng: -1.5491 },
    { city: "Birmingham", lat: 52.4862, lng: -1.8904 },
    { city: "Bristol", lat: 51.4545, lng: -2.5879 },
  ];

  return cities.flatMap((city, index) => [
    {
      id: `nhs_${city.city.toLowerCase()}_${addDays(today, index + 1)}_wellbeing_walk`,
      name: `${city.city} NHS Wellbeing Walk & Talk`,
      start_date: addDays(today, index + 1),
      end_date: addDays(today, index + 1),
      time: "12:30",
      category: ["wellbeing", "outdoors"],
      cost: "free",
      venue: `${city.city} Community Health Hub`,
      city: city.city,
      url: "https://www.england.nhs.uk/events/",
      source: "nhs-england",
      source_trust: "official",
      lat: city.lat + 0.01,
      lng: city.lng - 0.01,
      popularity: 11,
      summary: "NHS-led walk and wellbeing check-in with local support services.",
      accessibility: ["wheelchair", "quiet-space"],
      audience: ["adults", "all-ages"],
      indoor: "mixed",
      activity_level: "low",
      vibe: "supportive",
      planning: {
        booking_required: false,
        public_transport: "Good bus and rail access",
        bring_with_you: "Comfortable shoes, water",
      },
    },
    {
      id: `nhs_${city.city.toLowerCase()}_${addDays(today, index + 4)}_health_info`,
      name: `${city.city} Health Info Week Local Session`,
      start_date: addDays(today, index + 4),
      end_date: addDays(today, index + 4),
      time: "18:00",
      category: ["charity", "wellbeing"],
      cost: "free",
      venue: `${city.city} Central Library`,
      city: city.city,
      url: "https://library.nhs.uk/health-information-week-2026/",
      source: "nhs-library",
      source_trust: "official",
      lat: city.lat - 0.008,
      lng: city.lng + 0.006,
      popularity: 9,
      summary: "Practical session on trusted health information and local support access.",
      accessibility: ["wheelchair", "hearing-loop"],
      audience: ["all-ages"],
      indoor: "indoor",
      activity_level: "low",
      vibe: "informative",
      planning: {
        booking_required: true,
        public_transport: "City-centre location",
        bring_with_you: "Optional questions for Q&A",
      },
    },
  ]);
}
