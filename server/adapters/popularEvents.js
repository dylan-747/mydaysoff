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

export function getPopularEventSeeds() {
  const today = new Date();
  const cities = [
    { city: "Edinburgh", lat: 55.9533, lng: -3.1883, sourceUrl: "https://www.edinburgh.gov.uk/events", venues: ["Summerhall", "Stockbridge", "Leith Arches", "Portobello Promenade"] },
    { city: "Glasgow", lat: 55.8642, lng: -4.2518, sourceUrl: "https://www.glasgow.gov.uk/", venues: ["Riverside Museum", "West End", "Merchant City", "Kelvingrove"] },
    { city: "London", lat: 51.5072, lng: -0.1276, sourceUrl: "https://www.visitlondon.com/", venues: ["Southbank", "Shoreditch", "Borough", "King's Cross"] },
    { city: "Manchester", lat: 53.4808, lng: -2.2426, sourceUrl: "https://www.manchester.gov.uk/", venues: ["Northern Quarter", "MediaCity", "Ancoats", "Castlefield"] },
    { city: "Leeds", lat: 53.8008, lng: -1.5491, sourceUrl: "https://www.visitleeds.co.uk/", venues: ["Leeds Dock", "Kirkgate", "Hyde Park", "City Square"] },
    { city: "Bristol", lat: 51.4545, lng: -2.5879, sourceUrl: "https://visitbristol.co.uk/", venues: ["Harbourside", "Stokes Croft", "Clifton", "Old Market"] },
    { city: "Cardiff", lat: 51.4816, lng: -3.1791, sourceUrl: "https://www.visitcardiff.com/", venues: ["Cardiff Bay", "Roath", "City Centre", "Canton"] },
    { city: "Belfast", lat: 54.5973, lng: -5.9301, sourceUrl: "https://visitbelfast.com/", venues: ["Cathedral Quarter", "Titanic Quarter", "Ormeau", "Queen's Quarter"] },
    { city: "Newcastle", lat: 54.9783, lng: -1.6178, sourceUrl: "https://newcastlegateshead.com/", venues: ["Quayside", "Ouseburn", "Grainger", "Jesmond"] },
    { city: "Liverpool", lat: 53.4084, lng: -2.9916, sourceUrl: "https://www.visitliverpool.com/", venues: ["Baltic Triangle", "Albert Dock", "Ropewalks", "Lark Lane"] },
    { city: "Sheffield", lat: 53.3811, lng: -1.4701, sourceUrl: "https://www.welcometosheffield.co.uk/", venues: ["Kelham Island", "Devonshire Quarter", "Peace Gardens", "Sharrow"] },
    { city: "Nottingham", lat: 52.9548, lng: -1.1581, sourceUrl: "https://www.visit-nottinghamshire.co.uk/", venues: ["Lace Market", "Hockley", "Canal Quarter", "Old Market Square"] },
    { city: "Southampton", lat: 50.9097, lng: -1.4044, sourceUrl: "https://visitsouthampton.co.uk/", venues: ["Ocean Village", "Guildhall Square", "Bedford Place", "Old Town"] },
    { city: "Plymouth", lat: 50.3755, lng: -4.1427, sourceUrl: "https://www.visitplymouth.co.uk/", venues: ["Barbican", "Royal William Yard", "Hoe", "Devonport"] },
    { city: "Aberdeen", lat: 57.1497, lng: -2.0943, sourceUrl: "https://www.visitabdn.com/", venues: ["Union Terrace", "Footdee", "Beach Esplanade", "Castlegate"] },
  ];

  const templates = [
    { title: "Indie Makers Market", time: "10:30", category: ["market", "family"], cost: "free", popularity: 11 },
    { title: "Community Food Pop-Up", time: "12:30", category: ["market", "charity"], cost: "donation", popularity: 10 },
    { title: "Rooftop Cinema Night", time: "20:15", category: ["wellbeing", "family"], cost: "paid", popularity: 12 },
    { title: "Open Studio Trail", time: "13:00", category: ["outdoors", "wellbeing"], cost: "free", popularity: 9 },
    { title: "Poetry & Spoken Word", time: "19:30", category: ["wellbeing", "charity"], cost: "paid", popularity: 8 },
    { title: "Board Game Social", time: "18:30", category: ["family", "wellbeing"], cost: "free", popularity: 9 },
    { title: "Street Food Fridays", time: "17:30", category: ["market", "family"], cost: "free", popularity: 13 },
    { title: "Zero-Waste Repair Cafe", time: "14:00", category: ["charity", "wellbeing"], cost: "donation", popularity: 7 },
    { title: "Beginner Photography Walk", time: "11:00", category: ["outdoors", "wellbeing"], cost: "free", popularity: 8 },
    { title: "Late Museum Access", time: "19:00", category: ["family", "wellbeing"], cost: "paid", popularity: 10 },
  ];

  const events = [];
  for (let offset = 0; offset < 21; offset += 1) {
    const date = addDays(today, offset);
    for (const city of cities) {
      for (let slot = 0; slot < 3; slot += 1) {
        const seed = offset * 31 + city.city.length * 7 + slot * 13;
        const template = pick(templates, seed);
        const venue = pick(city.venues, seed + 3);
        const id = seededId(date, city.city, `${template.title}_${slot}`);
        const indoor = slot % 3 === 0 ? "outdoor" : slot % 3 === 1 ? "indoor" : "mixed";
        const level = slot % 3 === 0 ? "medium" : slot % 3 === 1 ? "low" : "high";
        const vibe = slot % 3 === 0 ? "social" : slot % 3 === 1 ? "chill" : "active";
        events.push({
          id,
          name: `${city.city} ${template.title}`,
          start_date: date,
          end_date: date,
          time: template.time,
          category: template.category,
          cost: template.cost,
          venue,
          city: city.city,
          url: city.sourceUrl,
          what3words: "",
          lat: city.lat + ((seed % 5) - 2) * 0.015,
          lng: city.lng + (((seed + 2) % 5) - 2) * 0.015,
          source: "curated-api-seed",
          popularity: template.popularity + Math.max(0, 10 - offset) + slot,
          accessibility: slot % 2 === 0 ? ["wheelchair"] : ["hearing-loop"],
          audience: slot % 2 === 0 ? ["all-ages"] : ["adults", "teens"],
          indoor,
          activity_level: level,
          vibe,
          planning: {
            booking_required: slot % 2 === 0,
            public_transport: "Near main bus/train links",
            bring_with_you: slot % 3 === 0 ? "Water and warm layer" : "Optional card payment",
          },
        });
      }
    }
  }

  return events;
}
