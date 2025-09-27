import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [55.9533, -3.1883]; // Edinburgh
const DEFAULT_ZOOM = 12;

export default function MapView({ events = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layer;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const pts = events.filter(e => Number.isFinite(e.lat) && Number.isFinite(e.lng));
    pts.forEach(e => {
      L.marker([e.lat, e.lng]).bindPopup(
        `<strong>${e.name}</strong><br>${e.venue || ""}${e.time ? `<br>${e.time}` : ""}`
      ).addTo(layer);
    });

    if (pts.length) {
      const bounds = L.latLngBounds(pts.map(e => [e.lat, e.lng]));
      map.fitBounds(bounds.pad(0.2));
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [events]);

  return <div ref={containerRef} className="absolute inset-0 rounded-3xl" />;
}
