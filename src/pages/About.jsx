import { useEffect, useMemo, useState } from "react";
import { createCheckout, getEvents } from "../lib/api.js";

function isVerified(status) {
  return status === "feed-listing" || status === "ticketmaster-listing";
}

function isThisWeek(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const start = new Date(today.toISOString().slice(0, 10));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

export default function About() {
  const [events, setEvents] = useState([]);
  const [tour, setTour] = useState({ day: false, map: false, open: false });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await getEvents();
        if (!active) return;
        setEvents(data.events || []);
      } catch {
        if (!active) return;
        setEvents([]);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const cities = new Set(events.map((e) => (e.city || "").trim()).filter(Boolean));
    const weekly = events.filter((e) => isThisWeek(e.start_date)).length;
    const verified = events.filter((e) => isVerified(e.verification_status)).length;
    return {
      total: events.length,
      cities: cities.size,
      weekly,
      verified,
    };
  }, [events]);

  const tourComplete = Object.values(tour).every(Boolean);

  async function handleStartTrial() {
    try {
      const data = await createCheckout(window.location.origin);
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch {
      // Keep About page calm: no inline error banner here.
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#f9fbff_100%)] text-[#14213d]">
      <header className="border-b bg-white/85 backdrop-blur px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <a href="#/" className="flex items-center gap-3 rounded-xl px-1 py-1 hover:bg-slate-100 transition">
            <div className="w-10 h-10 rounded-xl bg-[#ff6a3d]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#ff6a3d]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 21c-4.97-6.58-6-8.5-6-11a6 6 0 1 1 12 0c0 2.5-1.03 4.42-6 11z" />
                <circle cx="12" cy="10" r="2" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">My Days Off</h1>
              <p className="text-xs text-slate-500 -mt-0.5">Community powered</p>
            </div>
          </a>
          <nav className="flex items-center gap-2">
            <a href="#/" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">Home</a>
            <a href="#/submit" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">Submit</a>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <h2 className="text-2xl font-bold">Community powered events.</h2>
          <p className="mt-3 text-slate-700 leading-relaxed">
            My Days Off is a map-based event browser for UK events. It combines curated source data and moderated
            community submissions so you can see what is happening by date and location.
          </p>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
            <p className="text-xs text-slate-500">Events this week</p>
            <p className="text-2xl font-bold mt-1">{stats.weekly}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
            <p className="text-xs text-slate-500">Cities active</p>
            <p className="text-2xl font-bold mt-1">{stats.cities}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
            <p className="text-xs text-slate-500">Verified listings</p>
            <p className="text-2xl font-bold mt-1">{stats.verified}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
            <p className="text-xs text-slate-500">Total events</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
        </section>

        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-xl font-semibold">Try it in 20 seconds</h3>
            <a href="#/" className="rounded-xl px-3 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50">
              Open map
            </a>
          </div>
          <p className="mt-2 text-sm text-slate-600">Complete these once and you have the full product flow.</p>

          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <label className="rounded-xl border border-slate-200 p-3 bg-slate-50/40 text-sm flex items-center gap-2">
              <input type="checkbox" checked={tour.day} onChange={() => setTour((t) => ({ ...t, day: !t.day }))} />
              Pick a day
            </label>
            <label className="rounded-xl border border-slate-200 p-3 bg-slate-50/40 text-sm flex items-center gap-2">
              <input type="checkbox" checked={tour.map} onChange={() => setTour((t) => ({ ...t, map: !t.map }))} />
              Move map to your city
            </label>
            <label className="rounded-xl border border-slate-200 p-3 bg-slate-50/40 text-sm flex items-center gap-2">
              <input type="checkbox" checked={tour.open} onChange={() => setTour((t) => ({ ...t, open: !t.open }))} />
              Open an event and tap fire
            </label>
          </div>

          <p className="mt-3 text-sm text-slate-700">Status: {tourComplete ? "Complete" : "In progress"}</p>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">What this is</h3>
            <p className="mt-2 text-sm text-slate-700">
              A map-first event browser focused on practical decision-making. It is designed to help people quickly
              answer: what is on, where it is, and whether it fits their day.
            </p>
          </article>
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">How it works</h3>
            <p className="mt-2 text-sm text-slate-700">
              Events are filtered by date, map area, category, and cost. Fire votes provide positive ranking signal,
              and the map and list stay in sync as you move across locations.
            </p>
          </article>
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">Trust and quality</h3>
            <p className="mt-2 text-sm text-slate-700">
              Data comes from trusted feeds where available plus user submissions. User submissions are held for
              moderation before approval, and source links are shown to support verification.
            </p>
          </article>
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">Why it exists</h3>
            <p className="mt-2 text-sm text-slate-700">
              Most people have limited time and too much fragmented information. This service exists to reduce planning
              friction and make time off easier to use well.
            </p>
          </article>
        </section>

        <section className="rounded-3xl bg-[#14213d] text-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Become a local insider</h3>
          <p className="mt-2 text-sm text-white/90">
            First month free. Then £1/month. Supports feed quality, moderation, and ongoing improvements.
          </p>
          <p className="mt-2 text-xs text-white/75">
            Live now: {stats.weekly} events this week across {stats.cities} cities.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleStartTrial}
              className="rounded-xl px-3 py-2 text-sm font-semibold bg-[#ff6a3d] text-white shadow-sm hover:brightness-95"
            >
              Become a local insider
            </button>
            <a href="#/" className="rounded-xl px-3 py-2 text-sm font-semibold border border-white/30 hover:bg-white/10">
              Explore events
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
