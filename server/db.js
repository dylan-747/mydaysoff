import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "data");
const dbPath = path.join(dataDir, "mydaysoff.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    time TEXT,
    category_json TEXT NOT NULL,
    cost TEXT NOT NULL,
    venue TEXT,
    city TEXT,
    url TEXT,
    what3words TEXT,
    summary TEXT,
    accessibility_json TEXT NOT NULL DEFAULT '[]',
    audience_json TEXT NOT NULL DEFAULT '[]',
    indoor TEXT,
    activity_level TEXT,
    vibe TEXT,
    planning_json TEXT NOT NULL DEFAULT '{}',
    source_trust TEXT NOT NULL DEFAULT 'trusted-partner',
    source_event_id TEXT,
    source_event_url TEXT,
    source_feed_url TEXT,
    verification_status TEXT NOT NULL DEFAULT 'community-submitted',
    evidence_json TEXT NOT NULL DEFAULT '{}',
    first_seen_at TEXT,
    last_seen_at TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved',
    source TEXT NOT NULL DEFAULT 'seed',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS votes (
    event_id TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(event_id) REFERENCES events(id)
  );

  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    city TEXT,
    interests_json TEXT NOT NULL DEFAULT '[]',
    source TEXT NOT NULL DEFAULT 'site-modal',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS source_health_snapshots (
    source_id TEXT NOT NULL,
    observed_at TEXT NOT NULL,
    event_count INTEGER NOT NULL DEFAULT 0,
    avg_quality REAL NOT NULL DEFAULT 0,
    dead_link_rate REAL NOT NULL DEFAULT 0,
    sample_size INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(source_id, observed_at)
  );

  CREATE TABLE IF NOT EXISTS event_link_checks (
    event_id TEXT PRIMARY KEY,
    checked_at TEXT NOT NULL,
    status_code INTEGER,
    ok INTEGER NOT NULL DEFAULT 0,
    final_url TEXT,
    error TEXT
  );
`);

function ensureColumn(tableName, columnName, columnType) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
  }
}

ensureColumn("events", "summary", "TEXT");
ensureColumn("events", "accessibility_json", "TEXT NOT NULL DEFAULT '[]'");
ensureColumn("events", "audience_json", "TEXT NOT NULL DEFAULT '[]'");
ensureColumn("events", "indoor", "TEXT");
ensureColumn("events", "activity_level", "TEXT");
ensureColumn("events", "vibe", "TEXT");
ensureColumn("events", "planning_json", "TEXT NOT NULL DEFAULT '{}'");
ensureColumn("events", "source_trust", "TEXT NOT NULL DEFAULT 'trusted-partner'");
ensureColumn("events", "source_event_id", "TEXT");
ensureColumn("events", "source_event_url", "TEXT");
ensureColumn("events", "source_feed_url", "TEXT");
ensureColumn("events", "verification_status", "TEXT NOT NULL DEFAULT 'community-submitted'");
ensureColumn("events", "evidence_json", "TEXT NOT NULL DEFAULT '{}'");
ensureColumn("events", "first_seen_at", "TEXT");
ensureColumn("events", "last_seen_at", "TEXT");

function addDays(baseDate, days) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function seedIfNeeded() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM events").get().count;
  if (count > 0) return;

  const today = new Date();
  const seedEvents = [
    {
      id: "seed_princes_street_market",
      name: "Princes Street Weekend Market",
      start_date: addDays(today, 1),
      end_date: addDays(today, 1),
      time: "10:00-17:00",
      category_json: JSON.stringify(["market", "family"]),
      cost: "free",
      venue: "Princes Street Gardens",
      city: "Edinburgh",
      url: "https://www.edinburgh.gov.uk/events",
      what3words: "filled.count.soap",
      lat: 55.9514,
      lng: -3.1982,
      status: "approved",
      source: "seed",
    },
    {
      id: "seed_meadows_run",
      name: "Community 5K in The Meadows",
      start_date: addDays(today, 2),
      end_date: addDays(today, 2),
      time: "09:30",
      category_json: JSON.stringify(["sports", "outdoors"]),
      cost: "donation",
      venue: "The Meadows",
      city: "Edinburgh",
      url: "https://www.parkrun.org.uk/",
      what3words: "stows.ages.take",
      lat: 55.9412,
      lng: -3.1932,
      status: "approved",
      source: "seed",
    },
    {
      id: "seed_live_music_leith",
      name: "Live Local Sessions in Leith",
      start_date: addDays(today, 3),
      end_date: addDays(today, 3),
      time: "19:00",
      category_json: JSON.stringify(["music"]),
      cost: "paid",
      venue: "Leith Theatre",
      city: "Edinburgh",
      url: "https://www.whatsoninedinburgh.co.uk/",
      what3words: "older.birds.nails",
      lat: 55.9752,
      lng: -3.1764,
      status: "approved",
      source: "seed",
    },
    {
      id: "seed_scotland_glasgow_walk",
      name: "Glasgow Riverside Walk Club",
      start_date: addDays(today, 4),
      end_date: addDays(today, 4),
      time: "12:00",
      category_json: JSON.stringify(["outdoors", "wellbeing"]),
      cost: "free",
      venue: "Riverside Museum",
      city: "Glasgow",
      url: "https://www.glasgow.gov.uk/",
      what3words: "state.ramp.spice",
      lat: 55.8653,
      lng: -4.3052,
      status: "approved",
      source: "seed",
    },
    {
      id: "seed_london_market_day",
      name: "London Street Market Day",
      start_date: addDays(today, 5),
      end_date: addDays(today, 5),
      time: "10:00-16:00",
      category_json: JSON.stringify(["market", "family"]),
      cost: "free",
      venue: "Southbank",
      city: "London",
      url: "https://www.visitlondon.com/",
      what3words: "jars.light.party",
      lat: 51.5078,
      lng: -0.1157,
      status: "approved",
      source: "seed",
    },
    {
      id: "seed_leeds_canal_walk",
      name: "Leeds Canal Discovery Walk",
      start_date: addDays(today, 6),
      end_date: addDays(today, 6),
      time: "14:00",
      category_json: JSON.stringify(["outdoors", "wellbeing"]),
      cost: "free",
      venue: "Leeds Dock",
      city: "Leeds",
      url: "https://www.visitleeds.co.uk/",
      what3words: "water.clap.roofs",
      lat: 53.792,
      lng: -1.5311,
      status: "approved",
      source: "seed",
    },
    {
      id: "seed_cardiff_lates",
      name: "Cardiff Museum Lates",
      start_date: addDays(today, 7),
      end_date: addDays(today, 7),
      time: "18:00",
      category_json: JSON.stringify(["music", "family"]),
      cost: "paid",
      venue: "National Museum Cardiff",
      city: "Cardiff",
      url: "https://www.visitcardiff.com/",
      what3words: "drift.clubs.corn",
      lat: 51.4853,
      lng: -3.1786,
      status: "approved",
      source: "seed",
    },
    {
      id: "seed_belfast_weekender",
      name: "Belfast City Weekender",
      start_date: addDays(today, 8),
      end_date: addDays(today, 8),
      time: "12:30",
      category_json: JSON.stringify(["market", "music"]),
      cost: "free",
      venue: "Cathedral Quarter",
      city: "Belfast",
      url: "https://visitbelfast.com/",
      what3words: "planet.corner.roof",
      lat: 54.6028,
      lng: -5.9277,
      status: "approved",
      source: "seed",
    },
  ];

  const insertEvent = db.prepare(`
    INSERT INTO events (
      id, name, start_date, end_date, time, category_json, cost, venue,
      city, url, what3words, lat, lng, status, source
    ) VALUES (
      @id, @name, @start_date, @end_date, @time, @category_json, @cost, @venue,
      @city, @url, @what3words, @lat, @lng, @status, @source
    )
  `);

  const insertVote = db.prepare(`
    INSERT INTO votes (event_id, count) VALUES (@event_id, @count)
    ON CONFLICT(event_id) DO NOTHING
  `);

  const tx = db.transaction((events) => {
    for (const event of events) {
      insertEvent.run(event);
      insertVote.run({ event_id: event.id, count: 0 });
    }
  });

  tx(seedEvents);
}

seedIfNeeded();

export default db;
