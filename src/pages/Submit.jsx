import { useState } from "react";
import { resolveWhat3Words, submitEvent } from "../lib/api.js";

const CATEGORIES = ["family", "outdoors", "market", "sports", "music", "charity", "wellbeing"];
const COSTS = ["free", "paid", "donation"];
const ACCESSIBILITY = ["wheelchair", "hearing-loop", "quiet-space", "toilets", "step-free"];
const AUDIENCE = ["all-ages", "teens", "adults", "families"];

export default function Submit() {
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    name: "",
    summary: "",
    start_date: "",
    end_date: "",
    time: "",
    category: "family",
    cost: "free",
    venue: "",
    city: "Edinburgh",
    url: "",
    what3words: "",
    lat: "",
    lng: "",
    indoor: "mixed",
    activity_level: "low",
    vibe: "chill",
    accessibility: ["wheelchair"],
    audience: ["all-ages"],
    booking_required: false,
    public_transport: "",
    bring_with_you: "",
  });

  function onChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function toggleListField(field, value) {
    setForm((prev) => {
      const current = new Set(prev[field]);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      return { ...prev, [field]: Array.from(current) };
    });
  }

  async function onResolveWords() {
    try {
      setStatus("Resolving what3words...");
      const result = await resolveWhat3Words(form.what3words);
      setForm((prev) => ({
        ...prev,
        what3words: result.words || prev.what3words,
        lat: String(result.lat),
        lng: String(result.lng),
      }));
      setStatus("Location filled from what3words.");
    } catch (err) {
      setStatus(err.message || "Could not resolve what3words.");
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.start_date) {
      setStatus("Please add at least an event name and start date.");
      return;
    }

    const lat = form.lat === "" ? null : Number(form.lat);
    const lng = form.lng === "" ? null : Number(form.lng);
    if ((lat !== null && !Number.isFinite(lat)) || (lng !== null && !Number.isFinite(lng))) {
      setStatus("Latitude and longitude must be valid numbers.");
      return;
    }

    try {
      await submitEvent({
        name: form.name.trim(),
        summary: form.summary.trim(),
        start_date: form.start_date,
        end_date: form.end_date || form.start_date,
        time: form.time.trim(),
        category: [form.category],
        cost: form.cost,
        venue: form.venue.trim(),
        city: form.city.trim() || "Edinburgh",
        url: form.url.trim() || "#",
        what3words: form.what3words.trim().replace(/^\/{0,3}/, ""),
        lat: lat ?? 55.9533,
        lng: lng ?? -3.1883,
        indoor: form.indoor,
        activity_level: form.activity_level,
        vibe: form.vibe,
        accessibility: form.accessibility,
        audience: form.audience,
        planning: {
          booking_required: form.booking_required,
          public_transport: form.public_transport.trim(),
          bring_with_you: form.bring_with_you.trim(),
        },
      });

      setStatus("Thanks. Your event is submitted for review and will go live once approved.");
      setForm({
        name: "",
        summary: "",
        start_date: "",
        end_date: "",
        time: "",
        category: "family",
        cost: "free",
        venue: "",
        city: "Edinburgh",
        url: "",
        what3words: "",
        lat: "",
        lng: "",
        indoor: "mixed",
        activity_level: "low",
        vibe: "chill",
        accessibility: ["wheelchair"],
        audience: ["all-ages"],
        booking_required: false,
        public_transport: "",
        bring_with_you: "",
      });
    } catch (err) {
      setStatus(err.message || "Could not submit event.");
    }
  }

  return (
    <div className="min-h-screen bg-[#eef6ff] text-[#14213d]">
      <header className="border-b bg-white/80 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <a href="#/" className="hover:opacity-90 transition">
            <h1 className="text-2xl font-bold">My Days Off</h1>
            <p className="text-sm text-slate-500">Submit an Event</p>
          </a>
          <nav className="flex items-center gap-2">
            <a href="#/" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">Home</a>
            <a href="#/about" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">About</a>
            <a href="#/admin" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">Admin</a>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-6">
        <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm font-medium">Event name
              <input name="name" value={form.name} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>
            <label className="text-sm font-medium">Venue
              <input name="venue" value={form.venue} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>
          </div>

          <label className="text-sm font-medium block">Why should people go?
            <textarea name="summary" value={form.summary} onChange={onChange} rows={3} placeholder="Short plain-English summary" className="mt-1 w-full rounded-xl border px-3 py-2" />
          </label>

          <div className="grid md:grid-cols-3 gap-4">
            <label className="text-sm font-medium">Start date
              <input type="date" name="start_date" value={form.start_date} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>
            <label className="text-sm font-medium">End date
              <input type="date" name="end_date" value={form.end_date} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>
            <label className="text-sm font-medium">Time
              <input name="time" value={form.time} onChange={onChange} placeholder="18:30" className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <label className="text-sm font-medium">Category
              <select name="category" value={form.category} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
                {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Cost
              <select name="cost" value={form.cost} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
                {COSTS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">City
              <input name="city" value={form.city} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <label className="text-sm font-medium">🏠🌳 Space
              <select name="indoor" value={form.indoor} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>
            <label className="text-sm font-medium">🏃 Activity level
              <select name="activity_level" value={form.activity_level} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="text-sm font-medium">✨ Vibe
              <select name="vibe" value={form.vibe} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2">
                <option value="chill">Chill</option>
                <option value="creative">Creative</option>
                <option value="social">Social</option>
                <option value="active">Active</option>
                <option value="supportive">Supportive</option>
              </select>
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <fieldset className="text-sm font-medium border rounded-xl p-3">
              <legend className="px-1">♿ Accessibility</legend>
              <div className="flex flex-wrap gap-2">
                {ACCESSIBILITY.map((tag) => (
                  <label key={tag} className="inline-flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={form.accessibility.includes(tag)} onChange={() => toggleListField("accessibility", tag)} />
                    {tag}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="text-sm font-medium border rounded-xl p-3">
              <legend className="px-1">👨‍👩‍👧 Audience</legend>
              <div className="flex flex-wrap gap-2">
                {AUDIENCE.map((tag) => (
                  <label key={tag} className="inline-flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={form.audience.includes(tag)} onChange={() => toggleListField("audience", tag)} />
                    {tag}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm font-medium">🚆 Public transport notes
              <input name="public_transport" value={form.public_transport} onChange={onChange} placeholder="Closest train/bus" className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>
            <label className="text-sm font-medium">🎒 Bring with you
              <input name="bring_with_you" value={form.bring_with_you} onChange={onChange} placeholder="ID, water, etc" className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="booking_required" checked={form.booking_required} onChange={onChange} />
            Booking required
          </label>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm font-medium">What3words (optional)
              <div className="mt-1 flex gap-2">
                <input name="what3words" value={form.what3words} onChange={onChange} placeholder="filled.count.soap" className="w-full rounded-xl border px-3 py-2" />
                <button type="button" onClick={onResolveWords} className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50">Resolve</button>
              </div>
            </label>
            <label className="text-sm font-medium">Event URL (optional)
              <input name="url" value={form.url} onChange={onChange} placeholder="https://..." className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm font-medium">Latitude (optional)
              <input name="lat" value={form.lat} onChange={onChange} placeholder="55.9533" className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>
            <label className="text-sm font-medium">Longitude (optional)
              <input name="lng" value={form.lng} onChange={onChange} placeholder="-3.1883" className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className="rounded-xl px-4 py-2 text-sm font-semibold bg-[#ff6a3d] text-white">Submit Event</button>
            {status && <p className="text-sm text-slate-600">{status}</p>}
          </div>
        </form>
      </main>
    </div>
  );
}
