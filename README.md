# Nairobi Property & Development Intelligence — MVP

A data-refinery-style tool that turns scattered Nairobi property listing
data into simple, queryable market signals: price trends, comparables, and
oversupply flags — starting with Kilimani and Kileleshwa apartments.

## Why this exists / what it is not

This is a v1 built for portfolio and validation purposes, using **public
asking-price listing data only** — not confirmed transaction prices, not
scraped contact details, not ground-truth from calling agents. Every API
response includes a note to that effect. Real market intelligence for
Nairobi property would layer in confirmed sale/rent prices, agent
interviews, and benchmarking against existing research (HassConsult,
Cytonn) — that's the planned v2, not this repo.

## Architecture

```
packages/
  db/        SQL schema + migration runner
  scraper/   Pulls listings from a source (mock fixture by default)
             and writes them to raw_observations (append-only, never edited)
  matcher/   Groups raw_observations into "entities" (best-guess real units)
             using tiered confidence — see below
  api/       Express API serving trends / compare / oversupply endpoints
```

### Why raw observations and entities are separate tables

Listings get re-posted across sites and over time. If we deduped naively at
scrape time (e.g. by neighborhood + size + bedrooms), we'd risk silently
merging genuinely different apartments, and we'd lose the price history
needed to compute trends or "days on market" at all.

Instead:
- `raw_observations` is **append-only** — every scrape is a new row, nothing
  is ever overwritten. This is what makes time-series trends possible.
- `entities` + `entity_observations` is a **derived** layer built by the
  matcher. If the matching logic improves later, we rebuild this layer from
  the untouched raw data — no re-scraping needed, no risk of losing history
  to an early dedup mistake.

### Matching confidence tiers

| Tier | Rule | Action |
|---|---|---|
| **High** | Same normalized building name + same hashed phone number | Auto-merge into existing entity |
| **Medium** | Same normalized building name + bedrooms + price within 5% + within 30 days | Flagged in `review_queue`, **not** auto-merged |
| **Low** | Nothing matches | New entity created |

During the pilot, treat `review_queue` as a spreadsheet: export it weekly
and eyeball the medium-confidence pairs by hand rather than trusting the
algorithm blindly — with only two neighborhoods, this is a small enough
list to check manually.

## Setup

```bash
cp .env.example .env
docker compose up -d          # starts local Postgres
npm install
npm run db:migrate            # applies schema.sql

npm run scraper:run           # loads fixtures/sample-listings.json (mock source)
npm run matcher:run           # groups raw_observations into entities
npm run api:dev               # http://localhost:4000
```

## Example queries

```bash
curl "http://localhost:4000/trends?neighborhood=kilimani&bedrooms=2"
curl "http://localhost:4000/compare?neighborhood=kilimani&bedrooms=1&price=56000"
curl "http://localhost:4000/oversupply?neighborhood=kilimani&bedrooms=1"
```

## Swapping in real data

The scraper is source-pluggable (`ListingSource` interface in
`packages/scraper/src/sources/types.ts`). `mock.ts` reads from
`fixtures/sample-listings.json` so the whole pipeline runs without any
network access. `buyrentkenya.ts` is a stub with the intended shape
(axios + cheerio) and notes on what to check (robots.txt, ToS, rate
limiting, never persisting raw phone numbers) before pointing it at a
real site. Flip `SCRAPER_SOURCE=buyrentkenya` in `.env` once it's
implemented.

## Known limitations (v1, by design)

- Asking prices only — no confirmed transaction data.
- Two neighborhoods, apartments only.
- Medium-confidence entity matches require manual review; nothing here
  fully automates deduplication yet.
- Oversupply signal is a simple period-over-period count, not a
  statistical model — appropriate given small sample sizes, not meant to
  be authoritative.
- No auth/rate-limiting on the API — fine for a local pilot, not for a
  public deployment.

## Next steps (v2 research phase)

- Ground-truth a sample of listings by calling agents directly.
- Benchmark output against HassConsult / Cytonn published indices.
- Expand neighborhoods once the pipeline and matcher are validated.
- Revisit Kenya's Data Protection Act implications before any
  automated collection of agent/owner contact details at scale.
