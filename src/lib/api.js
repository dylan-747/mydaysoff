const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

async function request(path, options = {}) {
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: mergedHeaders,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export function getEvents() {
  return request("/api/events");
}

export function submitEvent(payload) {
  return request("/api/events/submissions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function voteEvent(eventId) {
  return request(`/api/events/${eventId}/vote`, {
    method: "POST",
  });
}

export function resolveWhat3Words(words) {
  return request("/api/geocode/what3words", {
    method: "POST",
    body: JSON.stringify({ words }),
  });
}

export function createCheckout(origin) {
  return request("/api/stripe/checkout", {
    method: "POST",
    body: JSON.stringify({ origin }),
  });
}

export function getPendingSubmissions(adminToken) {
  return request("/api/admin/submissions", {
    headers: { "x-admin-token": adminToken },
  });
}

export function setEventStatus(id, status, adminToken) {
  return request(`/api/admin/events/${id}/status`, {
    method: "PATCH",
    headers: { "x-admin-token": adminToken },
    body: JSON.stringify({ status }),
  });
}

export function ingestPopular(adminToken) {
  return request("/api/admin/ingest", {
    method: "POST",
    headers: { "x-admin-token": adminToken },
  });
}

export { API_BASE };
