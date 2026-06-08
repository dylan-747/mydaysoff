import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const UK_CENTER = [54.5, -2.2];
const UK_ZOOM = 5;

// Tap-the-map location picker for event submissions. Lets people drop/drag a
// pin, search a postcode/place (free OSM Nominatim), or use their location.
export default function LocationPicker({ value, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState("");

  function setMarker(lat, lng, recenter) {
    const map = mapRef.current;
    if (!map) return;
    const ll = [lat, lng];
    if (markerRef.current) {
      markerRef.current.setLatLng(ll);
    } else {
      markerRef.current = L.marker(ll, { draggable: true }).addTo(map);
      markerRef.current.on("dragend", (e) => {
        const p = e.target.getLatLng();
        onChangeRef.current?.({ lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) });
      });
    }
    if (recenter) map.setView(ll, Math.max(map.getZoom(), 14));
  }

  function pick(lat, lng, recenter) {
    setMarker(lat, lng, recenter);
    onChangeRef.current?.({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const hasValue = value && Number.isFinite(value.lat) && Number.isFinite(value.lng);
    const map = L.map(containerRef.current, {
      center: hasValue ? [value.lat, value.lng] : UK_CENTER,
      zoom: hasValue ? 14 : UK_ZOOM,
      scrollWheelZoom: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    map.on("click", (e) => pick(e.latlng.lat, e.latlng.lng, false));
    mapRef.current = map;
    if (hasValue) setMarker(value.lat, value.lng, false);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker when location is set externally (e.g. what3words resolve).
  useEffect(() => {
    if (!mapRef.current || !value || !Number.isFinite(value.lat) || !Number.isFinite(value.lng)) return;
    const cur = markerRef.current?.getLatLng();
    if (cur && Math.abs(cur.lat - value.lat) < 1e-6 && Math.abs(cur.lng - value.lng) < 1e-6) return;
    setMarker(value.lat, value.lng, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setMsg("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" } },
      );
      const data = await res.json();
      if (!data.length) {
        setMsg("No match — try a postcode or place name, or tap the map.");
        return;
      }
      pick(Number(data[0].lat), Number(data[0].lon), true);
    } catch {
      setMsg("Search unavailable — tap the map instead.");
    } finally {
      setSearching(false);
    }
  }

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMsg("Location isn't available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => pick(pos.coords.latitude, pos.coords.longitude, true),
      () => setMsg("Couldn't get your location."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  const hasPin = value && Number.isFinite(value.lat) && Number.isFinite(value.lng);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                search();
              }
            }}
            placeholder="Search postcode or place"
            className="flex-1 rounded-xl border px-3 py-2 text-sm font-normal"
          />
          <button
            type="button"
            onClick={search}
            disabled={searching}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
          >
            {searching ? "…" : "Search"}
          </button>
        </div>
        <button type="button" onClick={useMyLocation} className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50">
          Use my location
        </button>
      </div>
      <div ref={containerRef} className="mt-2 h-64 w-full rounded-xl border border-slate-200 overflow-hidden" />
      <p className="mt-1 text-xs font-normal text-slate-500">
        Tap the map to place the event pin, or drag it to fine-tune.
        {hasPin ? ` Pin set (${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}).` : " No pin yet."}
        {msg ? ` ${msg}` : ""}
      </p>
    </div>
  );
}
