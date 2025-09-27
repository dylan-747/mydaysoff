import React, { useMemo, useState } from "react";
import MapView from "./MapView.jsx";

// Inline SVG icons (no extra deps)
const IconPin = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M12 21c-4.97-6.58-6-8.5-6-11a6 6 0 1 1 12 0c0 2.5-1.03 4.42-6 11z"/>
    <circle cx="12" cy="10" r="2"/>
  </svg>
);
const IconFlame = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M8 14c0-4 4-6 4-10 2 2 6 5 6 9a6 6 0 1 1-12 0c0-.34.03-.67.09-1"/>
  </svg>
);
const IconFilter = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M3 6h18M6 12h12M10 18h4"/>
  </svg>
);
const IconCalendar = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>
);
const IconExternal = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <path d="M15 3h6v6"/><path d="M10 14L21 3"/>
  </svg>
);
const IconPlus = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);

// Mock data
const seedEvents = [
  { id:"evt_edin_xmas", name:"Edinburgh Christmas Market", start_date:"2025-11-16", end_date:"2026-01-04", time:"10:00–22:00", category:["family","market"], cost:"paid", venue:"Princes Street Gardens", lat:55.951, lng:-3.197, url:"#", likes:12, city:"Edinburgh" },
  { id:"evt_kiltwalk", name:"Edinburgh Kiltwalk", start_date:"2025-09-28", end_date:"2025-09-28", time:"09:00", category:["charity","outdoors"], cost:"donation", venue:"Various city routes", lat:55.95, lng:-3.19, url:"#", likes:5, city:"Edinburgh" },
  { id:"evt_meadows_music", name:"Music in The Meadows", start_date:"2025-09-29", end_date:"2025-09-29", time:"18:30", category:["music","outdoors"], cost:"free", venue:"The Meadows Bandstand", lat:55.941, lng:-3.1905, url:"#", likes:7, city:"Edinburgh" },
  { id:"evt_porty_market", name:"Portobello Community Market", start_date:"2025-10-01", end_date:"2025-10-01", time:"09:00–14:00", category:["market","family"], cost:"free", venue:"Brighton Park, Portobello", lat:55.953, lng:-3.105, url:"#", likes:3, city:"Edinburgh" },
  { id:"evt_arthurs_sea_dip", name:"Sunrise Sea Dip", start_date:"2025-09-30", end_date:"2025-09-30", time:"06:30", category:["outdoors","wellbeing"], cost:"free", venue:"Portobello Beach", lat:55.9535, lng:-3.098, url:"#", likes:2, city:"Edinburgh" },
];

const CATEGORIES = [
  { value: "", label: "All" }, { value: "family", label: "Family" }, { value: "outdoors", label: "Outdoors" },
  { value: "market", label: "Market" }, { value: "sports", label: "Sports" },
  { value: "music", label: "Music" }, { value: "charity", label: "Charity" }, { value: "wellbeing", label: "Wellbeing" },
];
const COSTS = [
  { value: "", label: "All" }, { value: "free", label: "Free" }, { value: "paid", label: "Paid" }, { value: "donation", label: "Donation" },
];

function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function ymd(d){ return d.toISOString().slice(0,10); }
function within(d,s,e){ const x=new Date(ymd(d)), S=new Date(s), E=new Date(e||s); return x>=S && x<=E; }

export default function MyDaysOff(){
  const today = useMemo(()=>new Date(),[]);
  const [rangeDays] = useState(14);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [category, setCategory] = useState("");
  const [cost, setCost] = useState("");
  const [heat, setHeat] = useState(false);
  const [events, setEvents] = useState(seedEvents);

  const days = useMemo(()=>Array.from({length:rangeDays+1},(_,i)=>addDays(today,i)),[today,rangeDays]);
  const selectedDate = days[selectedIndex];

  const filtered = useMemo(()=>{
    let list = events.filter(e=>{
      const matchDate = within(selectedDate, e.start_date, e.end_date);
      const matchCat = !category || (e.category||[]).includes(category);
      const matchCost = !cost || e.cost === cost;
      return matchDate && matchCat && matchCost;
    });
    if (heat) list = [...list].sort((a,b)=> (b.likes??0)-(a.likes??0));
    return list;
  },[events,selectedDate,category,cost,heat]);

  function toggleLike(id){
    setEvents(prev => prev.map(e => e.id===id ? { ...e, likes:(e.likes||0)+1 } : e));
  }

  return (
    <div className="min-h-screen bg-[#eef6ff] text-[#14213d]">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff6a3d]/10 flex items-center justify-center">
              <IconPin className="w-5 h-5 text-[#ff6a3d]" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">My Days Off</h1>
              <p className="text-xs text-slate-500 -mt-0.5">Discover what’s on near you</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <a href="#" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold bg-[#ff6a3d] text-white shadow-sm transition hover:brightness-95">
              <IconPlus className="w-4 h-4" /> Submit Event
            </a>
            <a href="#" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold bg-slate-200 text-slate-900 transition hover:bg-slate-300">
              Sign up £1/mo
            </a>
          </nav>
        </div>

        {/* Filters */}
        <div className="mx-auto max-w-7xl px-4 pb-3 grid md:grid-cols-4 gap-2">
          <div className="flex items-center gap-2">
            <IconCalendar className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium">Date:</span>
            <span className="text-sm text-slate-600">{selectedDate.toDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconFilter className="w-4 h-4 text-slate-500" />
            <select className="w-full md:w-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm" value={category} onChange={(e)=>setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select className="w-full md:w-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm" value={cost} onChange={(e)=>setCost(e.target.value)}>
              {COSTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <label className="inline-flex items-center gap-2 text-sm select-none">
              <input type="checkbox" className="rounded" checked={heat} onChange={(e)=>setHeat(e.target.checked)} />
              Sort by <IconFlame className="w-4 h-4 text-orange-500" />
            </label>
          </div>
          <div className="md:col-span-2 overflow-x-auto">
            <div className="flex gap-2 pb-1">
              {days.map((d, i) => {
                const isToday = i === 0;
                const labelTop = isToday ? "Today" : d.toLocaleDateString(undefined, { weekday: "short" });
                const labelBottom = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                const active = i === selectedIndex;
                return (
                  <button
                    key={i}
                    onClick={()=>setSelectedIndex(i)}
                    className={[
                      "min-w-[74px] rounded-2xl border px-3 py-2 text-xs text-center shadow-sm transition",
                      active ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white hover:bg-slate-50"
                    ].join(" ")}
                  >
                    <div className="font-semibold">{labelTop}</div>
                    <div className="text-slate-500">{labelBottom}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <main className="mx-auto max-w-7xl px-4 py-4 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        {/* Map */}
        <section className="relative rounded-3xl bg-white border border-slate-200 shadow-sm min-h-[340px] lg:min-h-[560px]">
          <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-xl bg-white/90 border border-slate-200 px-3 py-1 text-xs shadow-sm z-[1000]">
            <IconPin className="w-4 h-4 text-[#ff6a3d]" />
            <span>{filtered.length} pin{filtered.length === 1 ? "" : "s"} for {selectedDate.toLocaleDateString()}</span>
          </div>
          <div className="absolute inset-0">
            <MapView events={filtered} />
          </div>
        </section>

        {/* Event list */}
        <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm p-3 lg:p-4 max-h-[70vh] overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold tracking-wide">Events</h2>
            <span className="text-xs text-slate-500">{filtered.length} shown</span>
          </div>
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="text-sm text-slate-500 p-3 border border-dashed rounded-xl">
                No events for this day. Try changing the filters or date.
              </div>
            ) : (
              filtered.map(e=>(
                <div key={e.id} className="grid grid-cols-[1fr_auto] gap-3 items-start p-3 rounded-2xl border border-slate-200 hover:shadow-sm transition">
                  <div>
                    <h3 className="font-semibold leading-tight">{e.name}</h3>
                    <div className="mt-1 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 mr-2">
                        <IconCalendar className="w-3 h-3" />
                        {e.end_date && e.end_date !== e.start_date ? `${e.start_date} → ${e.end_date}` : e.start_date}
                      </span>
                      {e.time && <span className="mr-2">• {e.time}</span>}
                      {e.venue && <span className="mr-2">• {e.venue}</span>}
                      <span className="font-medium">• {e.cost === "free" ? "Free" : e.cost === "donation" ? "Donation" : "Paid"}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-[10px] rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5">{e.city}</span>
                      {(e.category||[]).map(c => <span key={c} className="text-[10px] rounded-full bg-slate-100 text-slate-700 px-2 py-0.5">{c}</span>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>toggleLike(e.id)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm hover:bg-orange-50 transition" aria-label="Like">
                      <IconFlame className="w-4 h-4 text-orange-500" />
                      <span className="tabular-nums">{e.likes || 0}</span>
                    </button>
                    <a href={e.url} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm hover:bg-slate-50 transition">
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
        <div className="mx-auto max-w-7xl text-xs text-slate-500">© My Days Off • Edinburgh first • Scotland next</div>
      </footer>
    </div>
  );
}
