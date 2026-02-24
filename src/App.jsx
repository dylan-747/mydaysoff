import React, { useEffect, useMemo, useState } from "react";
import MapView from "./MapView.jsx";
import { getEvents, signupNewsletter, voteEvent } from "./lib/api.js";
const todayYmd = new Date().toISOString().slice(0, 10);
const fallbackEvents = [
  {
    id: "fallback_today_meetup",
    name: "Community Coffee & Events Swap",
    start_date: todayYmd,
    end_date: todayYmd,
    time: "17:30",
    category: ["family", "wellbeing"],
    cost: "free",
    venue: "The Meadows",
    city: "Edinburgh",
    url: "#",
    what3words: "stows.ages.take",
    lat: 55.9412,
    lng: -3.1932,
    likes: 6,
    source_trust: "sample",
    verification_status: "unverified",
    source_event_url: "",
    source_feed_url: "",
  },
  {
    id: "fallback_glasgow_market",
    name: "Glasgow Riverside Street Food",
    start_date: todayYmd,
    end_date: todayYmd,
    time: "13:00",
    category: ["market", "family"],
    cost: "free",
    venue: "Riverside Museum",
    city: "Glasgow",
    url: "#",
    what3words: "state.ramp.spice",
    lat: 55.8653,
    lng: -4.3052,
    likes: 9,
    source_trust: "sample",
    verification_status: "unverified",
    source_event_url: "",
    source_feed_url: "",
  },
  {
    id: "fallback_london_late",
    name: "Southbank Late Open Arts",
    start_date: todayYmd,
    end_date: todayYmd,
    time: "19:30",
    category: ["music"],
    cost: "paid",
    venue: "Southbank Centre",
    city: "London",
    url: "#",
    what3words: "cafe.robot.daring",
    lat: 51.5058,
    lng: -0.1169,
    likes: 12,
    source_trust: "sample",
    verification_status: "unverified",
    source_event_url: "",
    source_feed_url: "",
  },
];

const IconPin = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M12 21c-4.97-6.58-6-8.5-6-11a6 6 0 1 1 12 0c0 2.5-1.03 4.42-6 11z" />
    <circle cx="12" cy="10" r="2" />
  </svg>
);

const IconFlame = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M8 14c0-4 4-6 4-10 2 2 6 5 6 9a6 6 0 1 1-12 0c0-.34.03-.67.09-1" />
  </svg>
);

const IconFilter = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M3 6h18M6 12h12M10 18h4" />
  </svg>
);

const IconCalendar = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const IconExternal = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <path d="M15 3h6v6" />
    <path d="M10 14L21 3" />
  </svg>
);

const IconChevronLeft = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M15 18l-6-6 6-6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconChevronRight = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M9 18l6-6-6-6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "family", label: "Family" },
  { value: "outdoors", label: "Outdoors" },
  { value: "market", label: "Market" },
  { value: "sports", label: "Sports" },
  { value: "music", label: "Music" },
  { value: "charity", label: "Charity" },
  { value: "wellbeing", label: "Wellbeing" },
];

const COSTS = [
  { value: "", label: "All" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
  { value: "donation", label: "Donation" },
];

const NEWSLETTER_INTERESTS = ["family", "outdoors", "market", "sports", "music", "charity", "wellbeing"];

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

function within(d, s, e) {
  const x = new Date(ymd(d));
  const S = new Date(s);
  const E = new Date(e || s);
  return x >= S && x <= E;
}

function inBounds(event, bounds) {
  if (!bounds) return true;
  if (!Number.isFinite(event.lat) || !Number.isFinite(event.lng)) return false;
  return event.lat >= bounds.south && event.lat <= bounds.north && event.lng >= bounds.west && event.lng <= bounds.east;
}

function hasCoords(event) {
  return Number.isFinite(event?.lat) && Number.isFinite(event?.lng);
}

function distanceSq(a, b) {
  if (!hasCoords(a) || !hasCoords(b)) return Number.POSITIVE_INFINITY;
  const dLat = Number(a.lat) - Number(b.lat);
  const dLng = Number(a.lng) - Number(b.lng);
  return dLat * dLat + dLng * dLng;
}

function formatIndoor(indoor) {
  if (indoor === "indoor") return "🏠 indoor";
  if (indoor === "outdoor") return "🌳 outdoor";
  if (indoor === "mixed") return "🏠🌳 mixed";
  return "";
}

function formatLevel(level) {
  if (!level) return "";
  if (level === "low") return "🧘 low effort";
  if (level === "medium") return "🚶 medium effort";
  if (level === "high") return "🏃 high effort";
  return level;
}

function formatAudience(audience) {
  if (!audience?.length) return "";
  if (audience.includes("all-ages")) return "👨‍👩‍👧‍👦 all ages";
  return `🧑 good for ${audience.join(", ")}`;
}

function verificationLabel(status) {
  if (status === "feed-listing" || status === "ticketmaster-listing") return "Verified listing";
  if (status === "community-submitted") return "Community listing";
  return "Unverified";
}

export default function App() {
  const today = useMemo(() => new Date(), []);
  const [rangeDays] = useState(14);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [category, setCategory] = useState("");
  const [cost, setCost] = useState("");
  const [heat, setHeat] = useState(false);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [mapBounds, setMapBounds] = useState(null);
  const [focusedEventId, setFocusedEventId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [navOrderIds, setNavOrderIds] = useState([]);
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState("");
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [newsletterForm, setNewsletterForm] = useState({
    email: "",
    city: "",
    interests: [],
  });

  const days = useMemo(
    () => Array.from({ length: rangeDays + 1 }, (_, i) => addDays(today, i)),
    [today, rangeDays],
  );

  const selectedDate = days[selectedIndex];

  async function loadEvents() {
    try {
      const data = await getEvents();
      setEvents(data.events || []);
      setError("");
    } catch (err) {
      setEvents(fallbackEvents);
      setError("Live API unavailable right now. Showing sample events only (unverified). Run npm run dev:all for live data.");
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadEvents();
    }, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const dayFiltered = useMemo(() => {
    let list = events.filter((e) => {
      const matchDate = within(selectedDate, e.start_date, e.end_date);
      const matchCat = !category || (e.category || []).includes(category);
      const matchCost = !cost || e.cost === cost;
      return matchDate && matchCat && matchCost;
    });

    if (heat) list = [...list].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    return list;
  }, [events, selectedDate, category, cost, heat]);

  const visibleEvents = useMemo(() => dayFiltered.filter((event) => inBounds(event, mapBounds)), [dayFiltered, mapBounds]);
  const listEvents = visibleEvents.length > 0 ? visibleEvents : dayFiltered;
  const navigationEvents = useMemo(() => {
    return [...dayFiltered]
      .filter((event) => hasCoords(event))
      .sort((a, b) => {
        const timeCmp = String(a.time || "").localeCompare(String(b.time || ""));
        if (timeCmp !== 0) return timeCmp;
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
  }, [dayFiltered]);
  const selectedNavIndex = useMemo(
    () => (selectedEvent ? navOrderIds.findIndex((id) => id === selectedEvent.id) : -1),
    [navOrderIds, selectedEvent],
  );
  const canNavigate = selectedNavIndex >= 0 && navOrderIds.length > 1;
  const mapEvents = useMemo(() => {
    if (!selectedEvent) return dayFiltered;
    const inDayFiltered = dayFiltered.some((event) => event.id === selectedEvent.id);
    return inDayFiltered ? dayFiltered : [...dayFiltered, selectedEvent];
  }, [dayFiltered, selectedEvent]);

  useEffect(() => {
    if (!selectedEvent) return;
    const match = dayFiltered.find((event) => event.id === selectedEvent.id);
    if (match) {
      if (match !== selectedEvent) setSelectedEvent(match);
      return;
    }
    setSelectedEvent(null);
    setFocusedEventId(null);
    setNavOrderIds([]);
  }, [dayFiltered, selectedEvent]);

  useEffect(() => {
    setNavOrderIds((prev) => {
      if (!prev.length) return prev;
      const allowed = new Set(navigationEvents.map((event) => event.id));
      const next = prev.filter((id) => allowed.has(id));
      if (next.length === prev.length) return prev;
      return next;
    });
  }, [navigationEvents]);

  async function toggleLike(id) {
    try {
      const result = await voteEvent(id);
      setEvents((prev) => prev.map((event) => (event.id === id ? { ...event, likes: result.likes } : event)));
      setSelectedEvent((prev) => (prev && prev.id === id ? { ...prev, likes: result.likes } : prev));
    } catch (err) {
      setError(err.message || "Could not save vote");
    }
  }

  function buildNearestOrder(anchorEvent) {
    const byId = new Map(navigationEvents.map((event) => [event.id, event]));
    const sorted = [...navigationEvents].sort((a, b) => {
      const distCmp = distanceSq(a, anchorEvent) - distanceSq(b, anchorEvent);
      if (distCmp !== 0) return distCmp;
      const dateCmp = String(a.start_date || "").localeCompare(String(b.start_date || ""));
      if (dateCmp !== 0) return dateCmp;
      const timeCmp = String(a.time || "").localeCompare(String(b.time || ""));
      if (timeCmp !== 0) return timeCmp;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    const ids = sorted.map((event) => event.id).filter((id) => byId.has(id));
    setNavOrderIds(ids);
    return ids;
  }

  function selectEvent(event, { rebuildNav = true } = {}) {
    if (!event) return;
    setSelectedEvent(event);
    setFocusedEventId(event.id);
    if (rebuildNav) {
      buildNearestOrder(event);
    }
  }

  function openNewsletter() {
    setNewsletterStatus("");
    setNewsletterOpen(true);
  }

  function toggleInterest(interest) {
    setNewsletterForm((prev) => {
      const current = new Set(prev.interests);
      if (current.has(interest)) current.delete(interest);
      else current.add(interest);
      return { ...prev, interests: Array.from(current) };
    });
  }

  async function submitNewsletter(event) {
    event.preventDefault();
    const email = newsletterForm.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setNewsletterStatus("Please add a valid email.");
      return;
    }

    setNewsletterBusy(true);
    try {
      await signupNewsletter({
        email,
        city: newsletterForm.city.trim(),
        interests: newsletterForm.interests,
      });
      setNewsletterStatus("Joined. You’re on the weekly local picks list.");
      setNewsletterForm({ email: "", city: "", interests: [] });
    } catch (err) {
      setNewsletterStatus(err.message || "Could not save right now. Try again.");
    } finally {
      setNewsletterBusy(false);
    }
  }

  function moveSelectedEvent(step) {
    if (!selectedEvent) return;

    const orderIds =
      navOrderIds.length > 1 && selectedNavIndex >= 0
        ? navOrderIds
        : buildNearestOrder(selectedEvent);

    if (!orderIds.length || orderIds.length < 2) return;
    const currentIndex = orderIds.findIndex((id) => id === selectedEvent.id);
    const nextIndex = (currentIndex + step + orderIds.length) % orderIds.length;
    const nextId = orderIds[nextIndex];
    const nextEvent = dayFiltered.find((event) => event.id === nextId);
    if (!nextEvent) return;
    selectEvent(nextEvent, { rebuildNav: false });
  }

  return (
    <div className="min-h-screen bg-[#eef6ff] text-[#14213d]">
      <header className="relative z-20">
        <div className="md:sticky md:top-0 md:z-30 bg-white/85 backdrop-blur border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="#/" className="flex items-center gap-3 rounded-xl px-1 py-1 hover:bg-slate-100 transition">
                <div className="w-10 h-10 rounded-xl bg-[#ff6a3d]/10 flex items-center justify-center">
                  <IconPin className="w-5 h-5 text-[#ff6a3d]" />
                </div>
                <div>
                  <h1 className="text-lg font-bold leading-tight">My Days Off</h1>
                  <p className="text-xs text-slate-500 -mt-0.5">Discover what&apos;s on near you</p>
                </div>
              </a>
            </div>
            <nav className="flex items-center gap-1 sm:gap-2">
              <a href="#/about" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                About
              </a>
              <a href="#/submit" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                Submit
              </a>
              <button
                onClick={openNewsletter}
                className="shrink-0 rounded-xl px-2 py-1.5 text-xs font-semibold bg-[#ff6a3d] text-white shadow-sm transition hover:brightness-95 whitespace-nowrap sm:px-3 sm:py-2 sm:text-sm"
                title="Join weekly local picks"
              >
                <span className="sm:hidden">Picks</span>
                <span className="hidden sm:inline">Get weekly local picks</span>
              </button>
          </nav>
        </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-3 space-y-2 border-b border-slate-200 bg-white/70">
          <div className="flex flex-wrap items-center gap-2">
            <IconCalendar className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium">Date:</span>
            <span className="text-sm text-slate-600">{selectedDate.toDateString()}</span>
            <IconFilter className="w-4 h-4 text-slate-500" />
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            >
              {COSTS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm select-none">
              <input type="checkbox" className="rounded" checked={heat} onChange={(e) => setHeat(e.target.checked)} />
              Sort by <IconFlame className="w-4 h-4 text-orange-500" />
            </label>
          </div>
          <div className="overflow-x-auto overscroll-x-contain touch-pan-x" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="flex gap-2 pb-1 min-w-max">
              {days.map((d, i) => {
                const isToday = i === 0;
                const labelTop = isToday ? "Today" : d.toLocaleDateString(undefined, { weekday: "short" });
                const labelBottom = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                const active = i === selectedIndex;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedIndex(i)}
                    className={[
                      "min-w-[74px] rounded-2xl border px-3 py-2 text-xs text-center shadow-sm transition",
                      active ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="font-semibold">{labelTop}</div>
                    <div className="text-slate-500">{labelBottom}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Map-first mode: pan or zoom to any city and the sidebar follows. Feed auto-refreshes every minute.
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto max-w-7xl px-4 pt-3">
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-4 space-y-4">
        <section className="relative rounded-3xl bg-white border border-slate-200 shadow-sm min-h-[360px] lg:min-h-[62vh]">
          <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-xl bg-white/90 border border-slate-200 px-3 py-1 text-xs shadow-sm z-[1000]">
            <IconPin className="w-4 h-4 text-[#ff6a3d]" />
            <span>
              {listEvents.length} pin{listEvents.length === 1 ? "" : "s"} for {selectedDate.toLocaleDateString()}
            </span>
          </div>
          <div className="absolute inset-0">
            <MapView
              events={mapEvents}
              heatMode={heat}
              onBoundsChange={setMapBounds}
              focusEventId={focusedEventId}
              selectedEventId={selectedEvent?.id || null}
              onEventSelect={(event) => selectEvent(event, { rebuildNav: true })}
            />
          </div>
        </section>

        {selectedEvent && (
          <section className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ff6a3d] via-[#ff8c6b] to-[#ff6a3d]" />
            <div className="flex items-start justify-between gap-3">
              <button
                onClick={() => moveSelectedEvent(-1)}
                disabled={!canNavigate}
                aria-label="Previous event"
                className="mt-0.5 h-11 w-11 shrink-0 rounded-full border border-slate-200 bg-slate-50 text-slate-700 shadow-sm hover:bg-slate-100 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <IconChevronLeft className="mx-auto h-5 w-5" />
              </button>

              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold">{selectedEvent.name}</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {selectedEvent.start_date}
                  {selectedEvent.time ? ` • ${selectedEvent.time}` : ""}
                  {selectedEvent.venue ? ` • ${selectedEvent.venue}` : ""}
                </p>
              </div>

              <button
                onClick={() => moveSelectedEvent(1)}
                disabled={!canNavigate}
                aria-label="Next event"
                className="mt-0.5 h-11 w-11 shrink-0 rounded-full border border-slate-200 bg-slate-50 text-slate-700 shadow-sm hover:bg-slate-100 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <IconChevronRight className="mx-auto h-5 w-5" />
              </button>

              <button
                className="h-9 w-9 shrink-0 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                onClick={() => setSelectedEvent(null)}
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            {selectedEvent.summary && <p className="mt-3 text-sm text-slate-700">{selectedEvent.summary}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              {(selectedEvent.category?.length ? selectedEvent.category : ["community"]).map((c) => (
                <span key={`inline-cat-${selectedEvent.id}-${c}`} className="text-xs rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 lowercase">
                  {c}
                </span>
              ))}
              {formatIndoor(selectedEvent.indoor) && (
                <span className="text-xs rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 lowercase">{formatIndoor(selectedEvent.indoor)}</span>
              )}
              {formatLevel(selectedEvent.activity_level) && (
                <span className="text-xs rounded-full bg-amber-50 text-amber-700 px-2.5 py-1 lowercase">{formatLevel(selectedEvent.activity_level)}</span>
              )}
              <span className="text-xs rounded-full bg-fuchsia-50 text-fuchsia-700 px-2.5 py-1 lowercase">✨ {selectedEvent.vibe || "social"}</span>
              {selectedEvent.source_trust && (
                <span className="text-xs rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 lowercase">source: {selectedEvent.source_trust}</span>
              )}
              <span className="text-xs rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 lowercase">
                🔎 {verificationLabel(selectedEvent.verification_status)}
              </span>
              {(selectedEvent.accessibility?.length ? selectedEvent.accessibility : ["check venue"]).map((tag) => (
                <span key={`inline-${selectedEvent.id}-${tag}`} className="text-xs rounded-full bg-lime-50 text-lime-700 px-2.5 py-1 lowercase">
                  ♿ {tag}
                </span>
              ))}
              <span className="text-xs rounded-full bg-sky-50 text-sky-700 px-2.5 py-1 lowercase">
                {formatAudience(selectedEvent.audience?.length ? selectedEvent.audience : ["all-ages"])}
              </span>
            </div>

            <div className="mt-4 text-sm text-slate-700 space-y-1">
              {selectedEvent.planning?.public_transport && <p>🚆 {selectedEvent.planning.public_transport}</p>}
              {selectedEvent.planning?.bring_with_you && <p>🎒 {selectedEvent.planning.bring_with_you}</p>}
              {typeof selectedEvent.planning?.booking_required === "boolean" && (
                <p>{selectedEvent.planning.booking_required ? "🧾 Booking required" : "✅ Walk-ins welcome"}</p>
              )}
              {selectedEvent.what3words && <p>📍 ///{selectedEvent.what3words}</p>}
              {selectedEvent.source_event_url && (
                <p>
                  🧷 Source listing:{" "}
                  <a className="underline" href={selectedEvent.source_event_url} target="_blank" rel="noopener noreferrer">
                    open
                  </a>
                </p>
              )}
              {selectedEvent.source_feed_url && <p>📰 Feed: {selectedEvent.source_feed_url}</p>}
              {selectedEvent.last_seen_at && <p>🕒 Last checked: {new Date(selectedEvent.last_seen_at).toLocaleString()}</p>}
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={() => toggleLike(selectedEvent.id)}
                aria-label="Add fire vote"
                className="inline-flex items-center gap-1 rounded-full border border-[#ff6a3d]/30 bg-[#ff6a3d]/12 px-3 py-2 text-sm font-semibold text-[#ff6a3d] hover:bg-[#ff6a3d]/20"
              >
                <IconFlame className="w-4 h-4 text-[#ff6a3d]" />
                <span className="tabular-nums">{selectedEvent.likes || 0}</span>
              </button>
              <a
                href={selectedEvent.source_event_url || selectedEvent.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
              >
                <IconExternal className="w-4 h-4" /> Details
              </a>
            </div>
          </section>
        )}

        <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm p-3 lg:p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold tracking-wide">Events</h2>
            <span className="text-xs text-slate-500">{listEvents.length} shown</span>
          </div>
          <div className="space-y-2">
            {visibleEvents.length === 0 && dayFiltered.length > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Map view is very tight; showing all events for this day.
              </div>
            )}
            {listEvents.length === 0 ? (
              <div className="text-sm text-slate-500 p-3 border border-dashed rounded-xl">No events for this day.</div>
            ) : (
              listEvents.map((e) => (
                <div
                  key={e.id}
                  onClick={() => selectEvent(e, { rebuildNav: true })}
                  className="grid grid-cols-[1fr_auto] gap-3 items-start p-3 rounded-2xl border border-slate-200 hover:shadow-sm transition"
                >
                  <div>
                    <h3 className="font-semibold leading-tight">{e.name}</h3>
                    <div className="mt-1 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 mr-2">
                        <IconCalendar className="w-3 h-3" />
                        {e.end_date && e.end_date !== e.start_date ? `${e.start_date} -> ${e.end_date}` : e.start_date}
                      </span>
                      {e.time && <span className="mr-2">- {e.time}</span>}
                      {e.venue && <span className="mr-2">- {e.venue}</span>}
                      {e.what3words && <span className="mr-2">- ///{e.what3words}</span>}
                    </div>
                    {e.summary && <p className="mt-1 text-xs text-slate-600">{e.summary}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-[10px] rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 lowercase">{e.city}</span>
                      {(e.category?.length ? e.category : ["community"]).map((c) => (
                        <span key={c} className="text-[10px] rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 lowercase">
                          {c}
                        </span>
                      ))}
                      {formatIndoor(e.indoor) && (
                        <span className="text-[10px] rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 lowercase">{formatIndoor(e.indoor)}</span>
                      )}
                      {formatLevel(e.activity_level) && (
                        <span className="text-[10px] rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 lowercase">{formatLevel(e.activity_level)}</span>
                      )}
                      <span className="text-[10px] rounded-full bg-fuchsia-50 text-fuchsia-700 px-2 py-0.5 lowercase">✨ {e.vibe || "social"}</span>
                      <span className="text-[10px] rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 lowercase">
                        🔎 {verificationLabel(e.verification_status)}
                      </span>
                      <span className="text-[10px] rounded-full bg-violet-50 text-violet-700 px-2 py-0.5 lowercase">source: {e.source_trust || "trusted-partner"}</span>
                      <span className="text-[10px] rounded-full bg-sky-50 text-sky-700 px-2 py-0.5 lowercase">
                        {formatAudience(e.audience?.length ? e.audience : ["all-ages"])}
                      </span>
                      {(e.accessibility?.length ? e.accessibility : ["check venue"]).slice(0, 2).map((tag) => (
                        <span key={`${e.id}-${tag}`} className="text-[10px] rounded-full bg-lime-50 text-lime-700 px-2 py-0.5 lowercase">
                          ♿ {tag}
                        </span>
                      ))}
                    </div>
                    {(e.planning?.public_transport || e.planning?.bring_with_you) && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        {e.planning?.public_transport ? `🚆 ${e.planning.public_transport}` : ""}
                        {e.planning?.public_transport && e.planning?.bring_with_you ? " • " : ""}
                        {e.planning?.bring_with_you ? `🎒 ${e.planning.bring_with_you}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleLike(e.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm hover:bg-orange-50 transition"
                      aria-label="Like"
                    >
                      <IconFlame className="w-4 h-4 text-orange-500" />
                      <span className="tabular-nums">{e.likes || 0}</span>
                    </button>
                    <a
                      onClick={(event) => event.stopPropagation()}
                      href={e.source_event_url || e.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm hover:bg-slate-50 transition"
                    >
                      <IconExternal className="w-4 h-4" /> More
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </main>

      <footer className="px-4 py-6">
        <div className="mx-auto max-w-7xl text-xs text-slate-500 flex items-center gap-2">
          <span>© My Days Off - Community powered</span>
          <span>•</span>
          <a href="#/privacy" className="underline">
            Privacy
          </a>
        </div>
      </footer>

      {newsletterOpen && (
        <div className="fixed inset-0 z-[1400] bg-slate-900/35 p-4" onClick={() => setNewsletterOpen(false)}>
          <div
            className="mx-auto mt-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">Weekly local picks</h3>
                <p className="mt-1 text-sm text-slate-600">A short weekly roundup based on your city and interests.</p>
              </div>
              <button
                onClick={() => setNewsletterOpen(false)}
                className="h-8 w-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form className="mt-4 space-y-3" onSubmit={submitNewsletter}>
              <label className="block text-sm">
                Email
                <input
                  type="email"
                  value={newsletterForm.email}
                  onChange={(event) => setNewsletterForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  required
                />
              </label>

              <label className="block text-sm">
                City (optional)
                <input
                  value={newsletterForm.city}
                  onChange={(event) => setNewsletterForm((prev) => ({ ...prev, city: event.target.value }))}
                  placeholder="Glasgow"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>

              <div>
                <p className="text-sm">Interests (optional)</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {NEWSLETTER_INTERESTS.map((interest) => {
                    const active = newsletterForm.interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`rounded-full border px-2.5 py-1 text-xs lowercase ${
                          active ? "border-[#ff6a3d] bg-[#ff6a3d]/12 text-[#ff6a3d]" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={newsletterBusy}
                className="w-full rounded-xl bg-[#ff6a3d] px-3 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {newsletterBusy ? "Joining..." : "Join list"}
              </button>

              <p className="text-xs text-slate-500">
                One concise email per week. Unsubscribe any time. Read our{" "}
                <a href="#/privacy" className="underline">
                  Privacy Policy
                </a>
                .
              </p>
              {newsletterStatus && <p className="text-sm text-slate-700">{newsletterStatus}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
