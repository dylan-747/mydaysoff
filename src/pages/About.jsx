import { useEffect, useMemo, useState } from "react";
import { getEvents, signupNewsletter } from "../lib/api.js";

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
  const [email, setEmail] = useState("");
  const [newsStatus, setNewsStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getEvents();
        if (active) setEvents(data.events || []);
      } catch {
        if (active) setEvents([]);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const cities = new Set(events.map((e) => (e.city || "").trim()).filter(Boolean));
    return {
      total: events.length,
      cities: cities.size,
      weekly: events.filter((e) => isThisWeek(e.start_date)).length,
      verified: events.filter((e) => isVerified(e.verification_status)).length,
    };
  }, [events]);

  async function joinNewsletter(event) {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value || !value.includes("@")) {
      setNewsStatus("Please add a valid email.");
      return;
    }
    setBusy(true);
    try {
      await signupNewsletter({ email: value, city: "", interests: [] });
      setNewsStatus("Joined — you're on the weekly local picks list.");
      setEmail("");
    } catch (err) {
      setNewsStatus(err.message || "Could not save right now. Try again.");
    } finally {
      setBusy(false);
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
              <p className="text-xs text-slate-500 -mt-0.5">Discover what&apos;s on near you</p>
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
          <h2 className="text-2xl font-bold">Find the local things worth your day off.</h2>
          <p className="mt-3 text-slate-700 leading-relaxed">
            My Days Off is a map of genuinely local things to do — markets, gigs, days out, community happenings,
            weekly staples like parkrun, and free places like museums and parks. No trawling Facebook groups or
            ticketing sites. It&apos;s free to browse, and anyone can add an event.
          </p>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
            <p className="text-xs text-slate-500">Things on this week</p>
            <p className="text-2xl font-bold mt-1">{stats.weekly}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
            <p className="text-xs text-slate-500">Towns &amp; cities</p>
            <p className="text-2xl font-bold mt-1">{stats.cities}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
            <p className="text-xs text-slate-500">Verified listings</p>
            <p className="text-2xl font-bold mt-1">{stats.verified}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
            <p className="text-xs text-slate-500">Things to do</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
        </section>

        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-xl font-semibold">How to use it</h3>
          <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/40">
              <p className="font-semibold">1 · Pick a day</p>
              <p className="mt-1 text-slate-600">Scroll the date strip to today or any day ahead.</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/40">
              <p className="font-semibold">2 · Find your area</p>
              <p className="mt-1 text-slate-600">Tap “Near me”, or pan and zoom — the list follows the map.</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/40">
              <p className="font-semibold">3 · Open &amp; go</p>
              <p className="mt-1 text-slate-600">Check the source link, save a fire vote, head out.</p>
            </div>
          </div>
          <a href="#/" className="mt-4 inline-block rounded-xl px-3 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50">
            Open the map
          </a>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">What&apos;s on it</h3>
            <p className="mt-2 text-sm text-slate-700">
              Markets, gigs, family days, festivals and community happenings — plus dependable weekly staples
              (parkruns, library storytimes) and always-free places like museums, galleries and parks.
            </p>
          </article>
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">Always something on</h3>
            <p className="mt-2 text-sm text-slate-700">
              Recurring staples and evergreen free places mean there&apos;s usually something good near you, even on a
              quiet day. Filter by date, area, category and cost; fire votes surface what people love.
            </p>
          </article>
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">Add your event — free</h3>
            <p className="mt-2 text-sm text-slate-700">
              Anyone can submit a local event. Listings with a working link publish automatically within minutes;
              spam is filtered out. Source links are always shown so anyone can check the details.
            </p>
          </article>
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">Why it exists</h3>
            <p className="mt-2 text-sm text-slate-700">
              Most of us have limited free time and too much scattered information. My Days Off cuts the planning
              friction so your days off are easier to actually enjoy.
            </p>
          </article>
        </section>

        <section className="rounded-3xl bg-[#14213d] text-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Get weekly local picks</h3>
          <p className="mt-2 text-sm text-white/90">
            A short, free email each week with the best local things near you. No spam, unsubscribe any time.
          </p>
          <form onSubmit={joinNewsletter} className="mt-4 flex flex-col sm:flex-row gap-2 sm:max-w-md">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 rounded-xl px-3 py-2 text-sm text-[#14213d]"
              required
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl px-4 py-2 text-sm font-semibold bg-[#ff6a3d] text-white shadow-sm hover:brightness-95 disabled:opacity-60 whitespace-nowrap"
            >
              {busy ? "Joining…" : "Join the list"}
            </button>
          </form>
          {newsStatus && <p className="mt-2 text-sm text-white/90">{newsStatus}</p>}
          <p className="mt-3 text-xs text-white/70">
            Prefer to add something?{" "}
            <a href="#/submit" className="underline">
              Submit an event
            </a>{" "}
            — it&apos;s free.
          </p>
        </section>
      </main>
    </div>
  );
}
