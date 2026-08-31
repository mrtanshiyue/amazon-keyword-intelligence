# KeywordOS — Current Cloudflare Native Architecture

This document describes the current production architecture only. Historical migration baselines and retired V5–V9 implementation notes are intentionally omitted.

## Deployment unit

KeywordOS uses one Cloudflare Worker deployment unit:

- **Workers Static Assets** — browser application assets from `dist/`
- **Worker API** — `/api/*` is handled by `src/worker.js`
- **D1 (`DB`)** — deployment/source metadata and dormant authorization schema
- **R2 (`DATA`)** — private public-test dataset objects
- **Workers Builds** — GitHub `main` build/deploy trigger
- **Workers Observability** — enabled

Production Worker: `amazon-keyword-intelligence`

Production URL: `https://amazon-keyword-intelligence.tanshiyuesir.workers.dev/`

## Build contract

`npm run check` validates:

- `src/worker.js`
- `src/access-auth.js`
- `src/store-authorization.js`
- `runtime-capabilities.js`
- `ui-actions.js`
- `suggestions-actions.js`

`npm run build` recreates `dist/` and copies exactly these 12 browser assets:

```text
index.html
styles.css
h10-ui.css
runtime-capabilities.css
ui-hardening.css
runtime-capabilities.js
ui-actions.js
suggestions-actions.js
i18n.js
app.js
report-adapter.js
unified-report-adapter.js
```

The following are not part of public Static Assets:

- `seed-data.js`
- `unified-seed-data.js`
- raw/sample CSV files
- `src/`
- `migrations/`
- `wrangler.jsonc`
- repository documentation
- dependencies

## Data delivery

The browser loads Store 01 test data through Worker routes backed by R2:

```text
GET /api/data/seed.js
  -> R2 seed/seed-data.js

GET /api/data/unified-seed.js
  -> R2 seed/unified-seed-data.js
```

This keeps the current browser calculation model compatible without exposing the large seed source files as Static Assets.

## Read-only Worker endpoints

The Worker currently accepts only GET/HEAD. Other methods receive `405 Method Not Allowed`.

- `/api/health` — D1/R2/runtime capability state
- `/api/data/manifest` — deployment metadata, data-source metadata and R2 presence
- `/api/data/seed.js` — advertising test dataset
- `/api/data/unified-seed.js` — Unified Transaction test dataset
- `/api/private/session` — dormant fail-closed authenticated read-only canary

There is no anonymous POST/PUT/PATCH/DELETE business endpoint.

## Authentication foundation

The repository contains dormant authentication/authorization primitives:

- Cloudflare Access JWT verification helpers
- read-only `/api/private/session`
- D1 `access_users` / `store_memberships` schema
- per-store read authorization helpers

These primitives are intentionally **not activated in Production** while #17 is deferred. No Cloudflare Access Production configuration, membership bootstrap or mutable authenticated business API should be introduced until #20 is formally accepted and #17 is explicitly resumed.

## Amazon boundary

`AMAZON_API_MODE=disabled` is authoritative.

Current Production does not:

- start Amazon OAuth
- store refresh tokens or client secrets
- bind live advertisers
- run live sync jobs
- mutate Amazon Ads state

The UI may stage browser-local decisions, but staged/approved does not mean executed remotely.

## Current release gate

Product issue #20 remains open until both are true:

1. the latest authoritative `main` is verified as the exact Cloudflare Workers Build/deployment source and the build succeeds;
2. cumulative Production browser acceptance passes across desktop, narrow/mobile, data persistence, major product workflows, truth states and keyboard interaction.

Only after #20 is formally accepted should #17 resume.

## Commands

```bash
npm install
npm run check
npm run build
npm run dev
npm run db:migrate
npm run deploy
```
