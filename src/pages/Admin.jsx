import { useState } from "react";
import { getPendingSubmissions, ingestPopular, setEventStatus } from "../lib/api.js";

export default function Admin() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("Enter admin token and load submissions.");

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

  async function importPopular() {
    try {
      const result = await ingestPopular(token);
      setMessage(`Imported ${result.imported} curated events.`);
    } catch (err) {
      setMessage(err.message || "Could not ingest events.");
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
          <button onClick={importPopular} className="rounded-xl px-4 py-2 text-sm font-semibold bg-[#ff6a3d] text-white">
            Import Popular Events
          </button>
        </div>

        <div className="text-sm text-slate-600">{message}</div>

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
      </main>
    </div>
  );
}
