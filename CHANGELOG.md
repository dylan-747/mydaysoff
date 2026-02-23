# Changelog

All notable changes to this project are tracked here.

## [Unreleased]

### Added
- Initial release tracking with semantic-style beta versions.

### Changed
- Pricing CTA updated to "Start free month (£1/mo after)".

### Fixed
- About page restored to original beta copy while keeping admin navigation hidden from public nav.
- Mobile Safari header behavior improved by disabling sticky header on small screens.

### Known Issues
- iOS Safari can briefly blank/freeze while map and events refresh; content usually returns after a short wait.
- Loading states are minimal; add explicit loading indicators/skeletons for map and event list.

## [beta-1.0] - 2026-02-23

### Added
- Map-first event discovery with day strip, filters, and heat sorting.
- Event submission flow with moderation queue.
- Admin moderation tools (approve/reject/edit).
- Trusted-source ingestion pipeline and proof metadata fields.
- what3words lookup endpoint and submit support.
- Stripe checkout endpoint scaffold for supporter subscription flow.

### Changed
- About page established with original "A calmer way to choose your day" baseline.

### Fixed
- Multiple deployment and dependency issues resolved during beta stabilization.

---

Versioning guide:
- `beta-1.0.x` for fixes and polish.
- `beta-1.x.0` for feature releases.
