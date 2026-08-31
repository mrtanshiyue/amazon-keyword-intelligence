# KeywordOS — Current Cloudflare Native Architecture

This document describes the current architecture only. Historical V5–V9 notes and pre-#20 acceptance state are not authoritative.

## Deployment unit

KeywordOS uses one Cloudflare Worker deployment unit:

- **Workers Static Assets** — browser application assets from `dist/`
- **Worker API** — `/api/*` handled by `src/worker.js`
- **D1 (`DB`)** — deployment/source metadata, dormant membership schema, and planned versioned-dataset metadata
- **R2 (`DATA`)** — seed/test datasets and the prepared immutable import object namespace
- **Workers Builds** — GitHub `main` build/deploy trigger
- **Workers Observability** — enabled
- **Cloudflare Access** — Worker-level application already configured; further login/session acceptance frozen by owner

Production Worker: `amazon-keyword-intelligence`

Production URL: `https://amazon-keyword-intelligence.tanshiyuesir.workers.dev/`

## Build contract

`npm run check` validates Worker/security/persistence modules, browser scripts and Node tests. Current server-side modules covered include:

- `src/worker.js`
- `src/access-auth.js`
- `src/store-authorization.js`
- `src/dataset-persistence.js`
- `src/import-validation.js`
- `src/import-pipeline.js`

`npm run build` recreates `dist/` and copies only the browser application assets:

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

The following are not public Static Assets:

- seed source files
- raw/sample CSV files
- `src/`
- `migrations/`
- `wrangler.jsonc`
- repository documentation
- dependencies

## Existing data delivery

The browser continues to load Store 01 accepted test data through read-only Worker routes backed by R2:

```text
GET /api/data/seed.js
  -> R2 seed/seed-data.js

GET /api/data/unified-seed.js
  -> R2 seed/unified-seed-data.js
```

## Current Worker endpoint boundary

`src/worker.js` remains GET/HEAD-only. Other methods receive `405 Method Not Allowed`.

Existing routes include:

- `/api/health`
- `/api/data/manifest`
- `/api/data/seed.js`
- `/api/data/unified-seed.js`
- `/api/private/session` — existing fail-closed Access canary; do not run login acceptance while frozen

PRs #42–#45 intentionally did not modify `src/worker.js`.

There is no anonymous POST/PUT/PATCH/DELETE business endpoint.

## Authentication / Access state

The Production Worker already has a Worker-level Cloudflare Access application and owner-only allow policy. The Worker also has pinned Access team-domain and audience runtime values.

Repository foundations include:

- remote-JWKS Access JWT verification
- canonical-sub identity handling
- read-only `/api/private/session`
- D1 `access_users` / `store_memberships`
- per-Store authorization helpers

The owner has explicitly frozen further login/authentication verification until the rest of the project is complete and the owner asks to resume it.

While frozen, do not:

- run session acceptance
- capture canonical Access `sub`
- bootstrap membership rows
- run owner/cross-store/role authorization acceptance
- replace the existing Access/JWT foundation

Preserve the configuration as-is.

## Prepared non-auth persistence internals

### Repository migration 0003

`migrations/0003_dataset_versions.sql` defines:

- `dataset_versions` — immutable version metadata
- `dataset_current` — per-Store/per-kind current pointer
- `deployment_meta.schema_version = 3`

The Cloudflare connector currently returns tool-level `Resource not found`, so migration `0003` has not yet been applied remotely in this continuation.

### Import path

The internal server path is prepared as:

```text
raw CSV bytes
-> validateImportBody()
-> required report-shape validation
-> SHA-256 over exact bytes
-> persistAcceptedDataset()
-> R2 conditional create (If-None-Match: *)
-> D1 batch(version metadata + current pointer)
```

Invalid imports perform no R2 or D1 writes.

R2 and D1 cannot form one distributed transaction. The safe ordering intentionally writes the immutable R2 object first and only then promotes the D1 pointer transactionally. A D1 failure can leave an unreachable immutable R2 orphan but cannot point current to a failed import.

### Restore path

The internal restore primitive performs:

```text
D1 current pointer
-> version metadata
-> exact R2 object
-> byte-size check
-> dataset/store/kind/SHA metadata check
```

Missing or inconsistent objects fail closed.

These internals are not wired into the Worker runtime while authentication is frozen.

## Amazon boundary

`AMAZON_API_MODE=disabled` remains authoritative.

Production must not:

- start Amazon OAuth
- store Amazon refresh tokens/client secrets
- call Amazon Ads API or SP-API
- bind live advertisers
- run live mutation/sync jobs
- execute local staged decisions against Amazon

## Current release state

#20 is CLOSED / COMPLETED.

#17 remains OPEN. Its non-auth persistence internals may continue independently, but login/authentication acceptance remains frozen until explicitly resumed by the owner.

The next safe Cloudflare task, once connector execution is available, is applying and verifying D1 migration `0003` only. Do not insert membership rows during that step.

## Commands

```bash
npm install
npm run check
npm run build
npm run dev
npm run db:migrate
npm run deploy
```
