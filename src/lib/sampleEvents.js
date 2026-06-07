// Offline fallback for the frontend — reuses the shared curated dataset so
// there's a single source of truth for events (see shared/curatedEvents.js).
import { buildCuratedEvents } from "../../shared/curatedEvents.js";

export const buildSampleEvents = buildCuratedEvents;
export default buildSampleEvents;
