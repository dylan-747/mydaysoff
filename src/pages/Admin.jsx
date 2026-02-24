import { useState } from "react";
import { getAdminQuality, getPendingSubmissions, setEventStatus, updateAdminEvent } from "../lib/api.js";

export default function Admin() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("Enter admin token and load submissions.");
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  const [quality, setQuality] = useState(null);

  async function load() {
    try {
      const data = await getPendingSubmissions(token);
      setItems(data.submissions || []);
      setMessage(`Loaded ${data.submissions?.length || 0} pending submissions.`);
    } catch (err) {
      setMessage(err.message || "Could not load submissions.");
    }
  }

  async function updateStatus(id, status) {
    try {
      await setEventStatus(id, status, token);
      setItems((prev) => prev.filter((event) => event.id !== id));
      setMessage(`Marked ${id} as ${status}.`);
    } catch (err) {
      setMessage(err.message || "Could not update status.");
    }
  }

  async function loadQuality() {
    try {
      const data = await getAdminQuality(token);
      setQuality(data);
      setMessage("Loaded source quality report.");
    } catch (err) {
      setMessage(err.message || "Could not load quality report.");
    }
  }

  function startEdit(event) {
    setEditing(event.id);
    setDraft({
      name: event.name || "",
      summary: event.summary || "",
      start_date: event.start_date || "",
      end_date: event.end_date || "",
      time: event.time || "",
      venue: event.venue || "",
      city: event.city || "",
      url: event.url || "",
      source_event_url: event.source_event_url || "",
      what3words: event.what3words || "",
      cost: event.cost || "free",
      category: (event.category || []).join(", "),
      indoor: event.indoor || "mixed",
      activity_level: event.activity_level || "low",
      vibe: event.vibe || "chill",
      lat: String(event.lat ?? ""),
      lng: String(event.lng ?? ""),
      accessibility: (event.accessibility || []).join(", "),
      audience: (event.audience || []).join(", "),
      booking_required: Boolean(event.planning?.booking_required),
      public_transport: event.planning?.public_transport || "",
      bring_with_you: event.planning?.bring_with_you || "",
    });
  }

  function onDraftChange(event) {
    const { name, value, type, checked } = event.target;
    setDraft((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function saveEdit() {
    if (!editing || !draft) return;
    try {
      const payload = {
        ...draft,
        lat: Number(draft.lat),
        lng: Number(draft.lng),
        category: draft.category,
        accessibility: draft.accessibility,
        audience: draft.audience,
        planning: {
          booking_required: draft.booking_required,
          public_transport: draft.public_transport,
          bring_with_you: draft.bring_with_you,
        },
      };
      const result = await updateAdminEvent(editing, payload, token);
      setItems((prev) => prev.map((item) => (item.id === editing ? result.event : item)));
      setMessage(`Saved edits for ${editing}.`);
      setEditing(null);
      setDraft(null);
    } catch (err) {
      setMessage(err.message || "Could not save edits.");
    }
  }

  return (
    <div className="min-h-screen bg-[#eef6ff] text-[#14213d]">
      <header className="border-b bg-white/80 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <a href="#/" className="hover:opacity-90 transition">
            <h1 className="text-2xl font-bold">My Days Off</h1>
            <p className="text-sm text-slate-500">Admin Moderation</p>
          </a>
          <nav className="flex items-center gap-2">
            <a href="#/" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              Home
            </a>
            <a href="#/submit" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              Submit
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-end gap-3">
          <label className="text-sm font-medium flex-1">
            Admin token
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="dev-admin-token"
            />
          </label>
          <button onClick={load} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            Load Pending
          </button>
          <button onClick={loadQuality} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            Quality Report
          </button>
        </div>

        <div className="text-sm text-slate-600">{message}</div>

        {quality && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Ingest Quality Snapshot</h2>
              <span className="text-xs text-slate-500">{new Date(quality.generated_at).toLocaleString()}</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {(quality.sources || []).map((source) => (
                <div key={source.source_id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="font-semibold lowercase">{source.source_id}</div>
                  <div className="text-slate-600">
                    {source.event_count} checked • avg quality {source.avg_quality} • dead-link rate{" "}
                    {Math.round(Number(source.dead_link_rate || 0) * 100)}%
                  </div>
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-semibold">Missing categories in next 14 days</h3>
              <div className="mt-1 space-y-1 text-xs text-slate-600">
                {(quality.category_coverage || [])
                  .filter((row) => (row.missing || []).length > 0)
                  .slice(0, 12)
                  .map((row) => (
                    <div key={`cov-${row.day}`} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1">
                      {row.day}: missing {(row.missing || []).join(", ")}
                    </div>
                  ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Recent dead links</h3>
              <div className="mt-1 space-y-1 text-xs text-slate-600">
                {(quality.dead_links || []).slice(0, 10).map((item) => (
                  <div key={`dead-${item.id}`} className="rounded-lg border border-slate-200 px-2 py-1">
                    {item.start_date} • {item.city} • {item.name} • {item.status_code || item.error || "unreachable"}
                  </div>
                ))}
                {(!quality.dead_links || quality.dead_links.length === 0) && <div className="text-slate-500">No dead links in latest checks.</div>}
              </div>
            </div>
          </section>
        )}

        <div className="space-y-3">
          {items.map((event) => (
            <article key={event.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <h2 className="font-semibold">{event.name}</h2>
              <p className="text-sm text-slate-600 mt-1">
                {event.start_date} {event.time ? `- ${event.time}` : ""} - {event.venue || "No venue"}
              </p>
              <p className="text-sm text-slate-600">{event.what3words ? `///${event.what3words}` : "No what3words"}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => startEdit(event)}
                  className="rounded-xl px-3 py-2 text-sm font-semibold border border-slate-300 bg-white"
                >
                  Edit
                </button>
                <button
                  onClick={() => updateStatus(event.id, "approved")}
                  className="rounded-xl px-3 py-2 text-sm font-semibold bg-green-600 text-white"
                >
                  Approve
                </button>
                <button
                  onClick={() => updateStatus(event.id, "rejected")}
                  className="rounded-xl px-3 py-2 text-sm font-semibold bg-slate-800 text-white"
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
          {items.length === 0 && <div className="text-sm text-slate-500">No pending submissions loaded.</div>}
        </div>

        {editing && draft && (
          <div className="fixed inset-0 z-[1300] bg-slate-900/40 p-4" onClick={() => { setEditing(null); setDraft(null); }}>
            <div
              className="mx-auto mt-8 max-w-3xl rounded-3xl bg-white border border-slate-200 shadow-xl p-5 space-y-3 max-h-[86vh] overflow-auto"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Edit submission</h2>
                <button className="rounded-xl border px-3 py-1 text-sm" onClick={() => { setEditing(null); setDraft(null); }}>
                  Close
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-sm">Name<input name="name" value={draft.name} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
                <label className="text-sm">Venue<input name="venue" value={draft.venue} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              </div>
              <label className="text-sm block">Summary<textarea name="summary" value={draft.summary} onChange={onDraftChange} rows={3} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              <div className="grid md:grid-cols-3 gap-3">
                <label className="text-sm">Start<input type="date" name="start_date" value={draft.start_date} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
                <label className="text-sm">End<input type="date" name="end_date" value={draft.end_date} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
                <label className="text-sm">Time<input name="time" value={draft.time} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <label className="text-sm">City<input name="city" value={draft.city} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
                <label className="text-sm">Cost<select name="cost" value={draft.cost} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="free">free</option><option value="paid">paid</option><option value="donation">donation</option></select></label>
                <label className="text-sm">Category (comma list)<input name="category" value={draft.category} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <label className="text-sm">Indoor<select name="indoor" value={draft.indoor} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="indoor">indoor</option><option value="outdoor">outdoor</option><option value="mixed">mixed</option></select></label>
                <label className="text-sm">Activity<select name="activity_level" value={draft.activity_level} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></label>
                <label className="text-sm">Vibe<input name="vibe" value={draft.vibe} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-sm">Event URL<input name="url" value={draft.url} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
                <label className="text-sm">Source event URL<input name="source_event_url" value={draft.source_event_url} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <label className="text-sm">what3words<input name="what3words" value={draft.what3words} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
                <label className="text-sm">Lat<input name="lat" value={draft.lat} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
                <label className="text-sm">Lng<input name="lng" value={draft.lng} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-sm">Accessibility (comma list)<input name="accessibility" value={draft.accessibility} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
                <label className="text-sm">Audience (comma list)<input name="audience" value={draft.audience} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-sm">Public transport<input name="public_transport" value={draft.public_transport} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
                <label className="text-sm">Bring with you<input name="bring_with_you" value={draft.bring_with_you} onChange={onDraftChange} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              </div>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="booking_required" checked={draft.booking_required} onChange={onDraftChange} />Booking required</label>
              <div className="flex items-center gap-2">
                <button onClick={saveEdit} className="rounded-xl px-4 py-2 text-sm font-semibold bg-[#ff6a3d] text-white">Save changes</button>
                <button onClick={() => { setEditing(null); setDraft(null); }} className="rounded-xl px-4 py-2 text-sm border">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
