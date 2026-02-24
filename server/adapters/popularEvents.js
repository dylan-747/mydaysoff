function addDays(baseDate, days) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function seededId(date, city, title) {
  return `api_seed_${date}_${city.toLowerCase().replace(/\s+/g, "_")}_${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

function pick(list, seed) {
  return list[seed % list.length];
}

function dayName(dateYmd) {
  const day = new Date(dateYmd).getDay();
  return day; // 0 Sun ... 6 Sat
}

function isWeekend(day) {
  return day === 0 || day === 6;
}

function allowOnDay(template, day) {
  if (!template.days || !template.days.length) return true;
  return template.days.includes(day);
}

function cityProfiles() {
  return [
    {
      city: "Edinburgh",
      lat: 55.9533,
      lng: -3.1883,
      sourceUrl: "https://www.edinburgh.gov.uk/events",
      venues: ["Leith Arches", "Stockbridge", "Summerhall", "Portobello Promenade"],
      festivals: ["Old Town Lights Weekend", "Edinburgh Makers Festival", "Arthur's Seat Sunrise Sessions"],
    },
    {
      city: "Glasgow",
      lat: 55.8642,
      lng: -4.2518,
      sourceUrl: "https://www.glasgow.gov.uk/",
      venues: ["Merchant City", "Kelvingrove", "Riverside", "West End"],
      festivals: ["Clyde Street Arts Weekend", "West End Food & Craft Festival", "River City Community Fair"],
    },
    {
      city: "London",
      lat: 51.5072,
      lng: -0.1276,
      sourceUrl: "https://www.visitlondon.com/",
      venues: ["Southbank", "King's Cross", "Shoreditch", "Borough"],
      festivals: ["City Lights Weekender", "London Urban Culture Festival", "Thames Food Festival"],
    },
    {
      city: "Manchester",
      lat: 53.4808,
      lng: -2.2426,
      sourceUrl: "https://www.manchester.gov.uk/",
      venues: ["Northern Quarter", "Ancoats", "Castlefield", "MediaCity"],
      festivals: ["Manchester Social Weekender", "Canalside Food Festival", "Northern Quarter Late"],
    },
    {
      city: "Leeds",
      lat: 53.8008,
      lng: -1.5491,
      sourceUrl: "https://www.visitleeds.co.uk/",
      venues: ["Leeds Dock", "Kirkgate", "City Square", "Hyde Park"],
      festivals: ["Leeds Waterfront Festival", "Leeds Family Discovery Weekend", "Kirkgate Makers Weekender"],
    },
    {
      city: "Bristol",
      lat: 51.4545,
      lng: -2.5879,
      sourceUrl: "https://visitbristol.co.uk/",
      venues: ["Harbourside", "Clifton", "Stokes Croft", "Old Market"],
      festivals: ["Harbourside Social Festival", "Bristol Makers Weekender", "Clifton Street Food Festival"],
    },
    {
      city: "Cardiff",
      lat: 51.4816,
      lng: -3.1791,
      sourceUrl: "https://www.visitcardiff.com/",
      venues: ["Cardiff Bay", "Roath", "City Centre", "Canton"],
      festivals: ["Cardiff Bay Festival Weekend", "Roath Community Weekender", "City Food & Music Festival"],
    },
    {
      city: "Belfast",
      lat: 54.5973,
      lng: -5.9301,
      sourceUrl: "https://visitbelfast.com/",
      venues: ["Cathedral Quarter", "Titanic Quarter", "Ormeau", "Queen's Quarter"],
      festivals: ["Belfast Culture Weekend", "Titanic Quarter Food Festival", "Cathedral Quarter Lates"],
    },
    {
      city: "Newcastle",
      lat: 54.9783,
      lng: -1.6178,
      sourceUrl: "https://newcastlegateshead.com/",
      venues: ["Quayside", "Ouseburn", "Jesmond", "Grainger"],
      festivals: ["Quayside Festival Weekend", "Ouseburn Arts Weekender", "Newcastle Family Spring Fair"],
    },
    {
      city: "Liverpool",
      lat: 53.4084,
      lng: -2.9916,
      sourceUrl: "https://www.visitliverpool.com/",
      venues: ["Baltic Triangle", "Albert Dock", "Ropewalks", "Lark Lane"],
      festivals: ["Dockside Weekender", "Liverpool Makers Festival", "Baltic Food & Music Festival"],
    },
    {
      city: "Sheffield",
      lat: 53.3811,
      lng: -1.4701,
      sourceUrl: "https://www.welcometosheffield.co.uk/",
      venues: ["Kelham Island", "Peace Gardens", "Devonshire Quarter", "Sharrow"],
      festivals: ["Sheffield Spring Festival", "Kelham Community Weekender", "Peace Gardens Family Fair"],
    },
    {
      city: "Nottingham",
      lat: 52.9548,
      lng: -1.1581,
      sourceUrl: "https://www.visit-nottinghamshire.co.uk/",
      venues: ["Lace Market", "Hockley", "Canal Quarter", "Old Market Square"],
      festivals: ["Nottingham City Weekender", "Canal Quarter Festival", "Lace Market Culture Fair"],
    },
  ];
}

const templates = [
  {
    title: "Street Food Friday",
    time: "17:30",
    category: ["market", "family"],
    cost: "free",
    popularity: 13,
    days: [5],
    indoor: "outdoor",
    activity_level: "low",
    vibe: "social",
  },
  {
    title: "Saturday Makers Market",
    time: "11:00",
    category: ["market", "charity"],
    cost: "free",
    popularity: 12,
    days: [6],
    indoor: "mixed",
    activity_level: "low",
    vibe: "creative",
  },
  {
    title: "Sunday Family Discovery Trail",
    time: "12:00",
    category: ["family", "outdoors"],
    cost: "free",
    popularity: 11,
    days: [0],
    indoor: "outdoor",
    activity_level: "medium",
    vibe: "active",
  },
  {
    title: "After-Work Run Club",
    time: "18:30",
    category: ["sports", "outdoors"],
    cost: "free",
    popularity: 10,
    days: [1, 2, 3, 4],
    indoor: "outdoor",
    activity_level: "high",
    vibe: "active",
  },
  {
    title: "Wellbeing Walk & Talk",
    time: "10:30",
    category: ["wellbeing", "outdoors"],
    cost: "free",
    popularity: 10,
    days: [1, 2, 3, 4, 5, 6, 0],
    indoor: "outdoor",
    activity_level: "low",
    vibe: "supportive",
  },
  {
    title: "Community Repair Cafe",
    time: "14:00",
    category: ["charity", "wellbeing"],
    cost: "donation",
    popularity: 9,
    days: [2, 4, 6],
    indoor: "indoor",
    activity_level: "low",
    vibe: "social",
  },
  {
    title: "Late Museum Access",
    time: "19:00",
    category: ["family", "wellbeing"],
    cost: "paid",
    popularity: 10,
    days: [3, 4, 5],
    indoor: "indoor",
    activity_level: "low",
    vibe: "chill",
  },
  {
    title: "Rooftop Cinema Night",
    time: "20:15",
    category: ["music", "wellbeing"],
    cost: "paid",
    popularity: 11,
    days: [5, 6],
    indoor: "outdoor",
    activity_level: "low",
    vibe: "chill",
  },
  {
    title: "Open Studio Trail",
    time: "13:00",
    category: ["wellbeing", "charity"],
    cost: "free",
    popularity: 9,
    days: [6, 0],
    indoor: "mixed",
    activity_level: "medium",
    vibe: "creative",
  },
  {
    title: "Live Music Social",
    time: "19:30",
    category: ["music"],
    cost: "paid",
    popularity: 11,
    days: [4, 5, 6],
    indoor: "mixed",
    activity_level: "medium",
    vibe: "social",
  },
];

function festivalEvent(city, date, seed) {
  const festivalName = pick(city.festivals, seed);
  const venue = pick(city.venues, seed + 11);
  return {
    id: seededId(date, city.city, `${festivalName}_festival`),
    name: festivalName,
    start_date: date,
    end_date: date,
    time: "12:00",
    category: ["music", "market", "family"],
    cost: "free",
    venue,
    city: city.city,
    url: city.sourceUrl,
    what3words: "",
    lat: city.lat + ((seed % 7) - 3) * 0.012,
    lng: city.lng + (((seed + 4) % 7) - 3) * 0.012,
    source: "curated-api-seed",
    popularity: 16,
    accessibility: ["wheelchair", "check-source"],
    audience: ["all-ages"],
    indoor: "mixed",
    activity_level: "medium",
    vibe: "social",
    planning: {
      booking_required: false,
      public_transport: "City-centre transport links available",
      bring_with_you: "Reusable bottle and weather-ready layer",
    },
  };
}

function templateForSlot(day, seed, slot) {
  const valid = templates.filter((template) => allowOnDay(template, day));
  if (!valid.length) return templates[(seed + slot) % templates.length];
  return valid[(seed + slot * 7) % valid.length];
}

export function getPopularEventSeeds() {
  const today = new Date();
  const cities = cityProfiles();
  const events = [];

  for (let offset = 0; offset < 21; offset += 1) {
    const date = addDays(today, offset);
    const day = dayName(date);
    for (const city of cities) {
      const baseSeed = offset * 37 + city.city.length * 11;
      const slots = isWeekend(day) ? 3 : 2;
      for (let slot = 0; slot < slots; slot += 1) {
        const seed = baseSeed + slot * 17;
        const template = templateForSlot(day, seed, slot);
        const venue = pick(city.venues, seed + 3);
        const titleSuffix =
          template.category.includes("sports") || template.category.includes("outdoors")
            ? `at ${venue}`
            : `in ${venue}`;
        const title = `${template.title} ${titleSuffix}`;

        events.push({
          id: seededId(date, city.city, `${template.title}_${slot}_${venue}`),
          name: title,
          start_date: date,
          end_date: date,
          time: template.time,
          category: template.category,
          cost: template.cost,
          venue,
          city: city.city,
          url: city.sourceUrl,
          what3words: "",
          lat: city.lat + ((seed % 9) - 4) * 0.01,
          lng: city.lng + (((seed + 2) % 9) - 4) * 0.01,
          source: "curated-api-seed",
          popularity: template.popularity + Math.max(0, 8 - offset),
          accessibility: slot % 2 === 0 ? ["wheelchair"] : ["hearing-loop"],
          audience: template.category.includes("music") ? ["adults", "teens"] : ["all-ages"],
          indoor: template.indoor,
          activity_level: template.activity_level,
          vibe: template.vibe,
          planning: {
            booking_required: template.cost === "paid",
            public_transport: "Near local bus and rail links",
            bring_with_you: template.indoor === "outdoor" ? "Water and weather-ready layer" : "Optional card payment",
          },
        });
      }

      // Add a city-level weekend festival style listing every other weekend.
      if (isWeekend(day) && offset % 2 === 0) {
        events.push(festivalEvent(city, date, baseSeed + 99));
      }
    }
  }

  return events;
}
