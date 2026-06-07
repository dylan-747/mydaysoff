import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [54.5, -2.2]; // UK view
const DEFAULT_ZOOM = 6;

function heatColor(votes) {
  if (votes >= 20) return "#dc2626";
  if (votes >= 10) return "#ea580c";
  if (votes >= 5) return "#f59e0b";
  return "#2563eb";
}

function pinSvg(fill, scale = 1) {
  const w = Math.round(26 * scale);
  const h = Math.round(34 * scale);
  return `<svg width="${w}" height="${h}" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 0C5.82 0 0 5.82 0 13c0 9.2 13 21 13 21s13-11.8 13-21C26 5.82 20.18 0 13 0z" fill="${fill}" stroke="#ffffff" stroke-width="2"/>
    <circle cx="13" cy="13" r="4.6" fill="#ffffff"/>
  </svg>`;
}

function pinFor(votes, isSelected, heatMode) {
  const fill = isSelected ? "#ff6a3d" : heatMode ? heatColor(votes) : "#2563eb";
  const scale = isSelected ? 1.3 : 1;
  const w = Math.round(26 * scale);
  const h = Math.round(34 * scale);
  return L.divIcon({
    className: "mdo-pin",
    html: pinSvg(fill, scale),
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 4],
  });
}

export default function MapView({ events = [], heatMode = false, onBoundsChange, focusEventId, selectedEventId, onEventSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const markerByIdRef = useRef({});
  const didInitialFitRef = useRef(false);

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

    const emitBounds = () => {
      const bounds = map.getBounds();
      onBoundsChange?.({
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast(),
      });
    };

    map.on("moveend", emitBounds);
    map.on("zoomend", emitBounds);
    emitBounds();

    return () => {
      map.off("moveend", emitBounds);
      map.off("zoomend", emitBounds);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      markerByIdRef.current = {};
      didInitialFitRef.current = false;
    };
  }, [onBoundsChange]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markerByIdRef.current = {};
    const pts = events.filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng));
    pts.forEach((e) => {
      const votes = Number(e.likes ?? 0);
      const isSelected = selectedEventId && e.id === selectedEventId;

      const marker = L.marker([e.lat, e.lng], {
        icon: pinFor(votes, isSelected, heatMode),
        zIndexOffset: isSelected ? 1000 : 0,
        riseOnHover: true,
      }).addTo(layer);
      marker.on("click", () => onEventSelect?.(e));
      markerByIdRef.current[e.id] = marker;
    });

    if (pts.length && !didInitialFitRef.current) {
      const bounds = L.latLngBounds(pts.map(e => [e.lat, e.lng]));
      map.fitBounds(bounds.pad(0.2));
      didInitialFitRef.current = true;
    } else if (!pts.length) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      didInitialFitRef.current = false;
    }
  }, [events, heatMode, selectedEventId]);

  useEffect(() => {
    if (!focusEventId) return;
    const map = mapRef.current;
    const marker = markerByIdRef.current[focusEventId];
    if (!map || !marker) return;

    const latLng = marker.getLatLng();
    map.flyTo(latLng, Math.max(map.getZoom(), 9), { duration: 0.5 });
  }, [focusEventId, events, heatMode, selectedEventId]);

  return <div ref={containerRef} className="absolute inset-0 rounded-3xl" />;
}
