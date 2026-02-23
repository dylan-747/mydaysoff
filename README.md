# My Days Off

Community-led events map for "what's hottest today" with:
- upvote-only fire ranking
- user event submissions (moderated)
- admin approval/rejection workflow
- automatic ingestion from curated trusted-source adapters
- automated feed registry ingestion (RSS/Atom/ICS) with proof metadata
- what3words lookup hook
- Stripe subscription checkout hook

## Local Run

1. Install deps

```bash
npm install
```

2. Copy env template

```bash
cp .env.example .env
```

3. Start frontend + API together

```bash
npm run dev:all
```

Frontend: `http://localhost:5173`
API: `http://localhost:8787`

## Key Routes

- Home: `#/`
- Submit event: `#/submit`
- About: `#/about`
- Admin moderation: `#/admin`

## Admin Token

Default token is `dev-admin-token` unless `ADMIN_TOKEN` is set in `.env`.

## Feels Alive By Default

- On API startup, curated UK-wide events are auto-imported.
- Auto-refresh runs every 15 minutes (`INGEST_REFRESH_MS` to tune).
- Frontend auto-refreshes event feed every 60 seconds.
- Admin import still exists for manual force-refresh, but is optional now.
- If `TICKETMASTER_API_KEY` is set, Ticketmaster UK events are merged into the feed.
- `server/sources/registry.json` controls trusted feed sources (NHS/council/partners).
- Each event stores proof fields (source listing URL, feed URL, verification status, last seen).

## API Endpoints

- `GET /api/events` (approved events)
- `POST /api/events/submissions` (creates pending event)
- `POST /api/events/:id/vote` (fire/upvote)
- `GET /api/admin/submissions` (admin)
- `PATCH /api/admin/events/:id/status` (admin approve/reject)
- `POST /api/admin/ingest` (admin import curated source events)
- `POST /api/geocode/what3words` (needs `WHAT3WORDS_API_KEY`)
- `POST /api/stripe/checkout` (needs Stripe env keys, includes trial support)

## Notes

- Votes are fire-only and cumulative.
- Submissions stay hidden until approved.
- what3words and Stripe are env-key gated and ready to wire.
- Stripe checkout creates a subscription with `STRIPE_TRIAL_DAYS` free (default `30`), then bills your `STRIPE_PRICE_ID`.
