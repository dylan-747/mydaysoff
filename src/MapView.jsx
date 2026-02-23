import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DEFAULT_CENTER = [54.5, -2.2]; // UK view
const DEFAULT_ZOOM = 6;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const selectedPinIcon = new L.Icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
  className: "selected-pin-icon",
});

function heatColor(votes) {
  if (votes >= 20) return "#dc2626";
  if (votes >= 10) return "#ea580c";
  if (votes >= 5) return "#f59e0b";
  return "#2563eb";
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

      if (heatMode) {
        const color = isSelected ? "#dc2626" : heatColor(votes);
        const marker = L.circleMarker([e.lat, e.lng], {
          radius: 6 + Math.min(votes, 20) * 0.45 + (isSelected ? 2 : 0),
          color,
          fillColor: color,
          fillOpacity: isSelected ? 0.8 : 0.55,
          weight: isSelected ? 2.5 : 1.5,
        })
          .addTo(layer);
        marker.on("click", () => onEventSelect?.(e));
        markerByIdRef.current[e.id] = marker;
        return;
      }

      const marker = isSelected
        ? L.marker([e.lat, e.lng], { icon: selectedPinIcon }).addTo(layer)
        : L.marker([e.lat, e.lng]).addTo(layer);
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
  }, [focusEventId]);

  return <div ref={containerRef} className="absolute inset-0 rounded-3xl" />;
}
