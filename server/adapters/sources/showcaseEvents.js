// Server curated showcase source — reuses the shared curated dataset so there's
// a single source of truth for events (see shared/curatedEvents.js).
//
// Always included by the aggregator as a trusted baseline so the map stays alive
// even when live feeds (Ticketmaster / OpenActive / RSS) are thin or empty.
import { buildCuratedEvents } from "../../../shared/curatedEvents.js";

export const getShowcaseEvents = buildCuratedEvents;
export default getShowcaseEvents;
