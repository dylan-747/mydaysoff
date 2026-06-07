import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [54.5, -2.2]; // UK view
const DEFAULT_ZOOM = 6;
const CLUSTER_CELL_PX = 64; // grid size for clustering overlapping pins

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

function clusterIcon(count) {
  const size = count >= 50 ? 52 : count >= 20 ? 46 : count >= 10 ? 40 : 34;
  return L.divIcon({
    className: "mdo-cluster",
    html: `<div style="width:${size}px;height:${size}px;line-height:${size}px;">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function MapView({ events = [], heatMode = false, onBoundsChange, focusEventId, selectedEventId, onEventSelect, centerOn }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const markerByIdRef = useRef({});
  const userMarkerRef = useRef(null);
  const didInitialFitRef = useRef(false);
  // keep latest props available to map-event listeners without re-binding them
  const stateRef = useRef({});
  stateRef.current = { events, heatMode, selectedEventId, onEventSelect };

  function renderMarkers() {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    const { events, heatMode, selectedEventId, onEventSelect } = stateRef.current;

    layer.clearLayers();
    markerByIdRef.current = {};

    const pts = events.filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng));
    const selected = selectedEventId ? pts.find((e) => e.id === selectedEventId) : null;
    const rest = selected ? pts.filter((e) => e.id !== selected.id) : pts;

    const addSingle = (e) => {
      const votes = Number(e.likes ?? 0);
      const isSelected = selectedEventId && e.id === selectedEventId;
      const marker = L.marker([e.lat, e.lng], {
        icon: pinFor(votes, isSelected, heatMode),
        zIndexOffset: isSelected ? 1000 : 0,
        riseOnHover: true,
      }).addTo(layer);
      marker.on("click", () => onEventSelect?.(e));
      markerByIdRef.current[e.id] = marker;
    };

    // group remaining points into grid cells (in screen space at current zoom)
    const cells = new Map();
    for (const e of rest) {
      const p = map.latLngToLayerPoint([e.lat, e.lng]);
      const key = `${Math.floor(p.x / CLUSTER_CELL_PX)}_${Math.floor(p.y / CLUSTER_CELL_PX)}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(e);
    }

    for (const group of cells.values()) {
      if (group.length === 1) {
        addSingle(group[0]);
        continue;
      }
      const lat = group.reduce((s, e) => s + e.lat, 0) / group.length;
      const lng = group.reduce((s, e) => s + e.lng, 0) / group.length;
      const cluster = L.marker([lat, lng], { icon: clusterIcon(group.length) }).addTo(layer);
      cluster.on("click", () => {
        const bounds = L.latLngBounds(group.map((e) => [e.lat, e.lng]));
        map.flyToBounds(bounds.pad(0.35), { maxZoom: 14, duration: 0.4 });
      });
    }

    // selected pin always rendered individually, on top
    if (selected) addSingle(selected);
  }

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
    const onViewChange = () => {
      emitBounds();
      renderMarkers(); // re-cluster for the new zoom/position
    };

    map.on("moveend", onViewChange);
    map.on("zoomend", onViewChange);
    emitBounds();
    renderMarkers();

    return () => {
      map.off("moveend", onViewChange);
      map.off("zoomend", onViewChange);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      markerByIdRef.current = {};
      didInitialFitRef.current = false;
    };
  }, [onBoundsChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const pts = events.filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng));
    if (pts.length && !didInitialFitRef.current) {
      const bounds = L.latLngBounds(pts.map((e) => [e.lat, e.lng]));
      map.fitBounds(bounds.pad(0.2));
      didInitialFitRef.current = true;
    } else if (!pts.length) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      didInitialFitRef.current = false;
    }
    renderMarkers();
  }, [events, heatMode, selectedEventId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !centerOn || !Number.isFinite(centerOn.lat) || !Number.isFinite(centerOn.lng)) return;

    const here = [centerOn.lat, centerOn.lng];
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(here);
    } else {
      userMarkerRef.current = L.circleMarker(here, {
        radius: 7,
        color: "#ffffff",
        weight: 3,
        fillColor: "#10b981",
        fillOpacity: 1,
      }).addTo(map);
      userMarkerRef.current.bindTooltip("You're here", { direction: "top" });
    }
    map.flyTo(here, Math.max(map.getZoom(), 12), { duration: 0.6 });
  }, [centerOn]);

  useEffect(() => {
    if (!focusEventId) return;
    const map = mapRef.current;
    const marker = markerByIdRef.current[focusEventId];
    if (!map || !marker) return;

    const latLng = marker.getLatLng();
    map.flyTo(latLng, Math.max(map.getZoom(), 11), { duration: 0.5 });
  }, [focusEventId, events, heatMode, selectedEventId]);

  return <div ref={containerRef} className="absolute inset-0 rounded-3xl" />;
}
