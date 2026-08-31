# KeywordOS — Current Cloudflare Native Architecture

This document describes the current architecture only. Historical V5–V9 notes and pre-#20 acceptance state are not authoritative.

At the start of any continuation, read the current GitHub `main` first. Do not treat a historical SHA in older notes as authoritative.

## Deployment unit

KeywordOS uses one Cloudflare Worker deployment unit:

- **Workers Static Assets** — browser application assets from `dist/`
- **Worker API** — `/api/*` handled by `src/worker.js`
- **D1 (`DB`)** — deployment metadata, dormant membership schema, and versioned-dataset metadata
- **R2 (`DATA`)** — accepted seed/test datasets and the prepared immutable import-object namespace
- **Workers Builds** — GitHub `main` build/deploy integration
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

`npm run build` recreates `dist/` and publishes browser application assets only. Raw/sample CSVs, `src/`, migrations, Wrangler configuration, repository documentation and dependencies are not public Static Assets.

## Existing data delivery

The browser continues to load the accepted Store 01 test dataset through read-only Worker routes backed by R2:

```text
GET /api/data/seed.js
  -> R2 seed/seed-data.js

GET /api/data/unified-seed.js
  -> R2 seed/unified-seed-data.js
```

Accepted Store 01 baseline:

- Amazon Ads Search Term: 8,753 rows
- Unified Transaction: 3,643 rows

Store 02 and Store 03 have no real loaded dataset and must not display fabricated metrics.

## Current Worker endpoint boundary

`src/worker.js` remains GET/HEAD-only. Other methods receive `405 Method Not Allowed`.

Existing routes include:

- `/api/health`
- `/api/data/manifest`
- `/api/data/seed.js`
- `/api/data/unified-seed.js`
- `/api/private/session` — existing fail-closed Access canary; do not run login acceptance while frozen

There is no anonymous POST/PUT/PATCH/DELETE business endpoint. The prepared persistence pipeline is intentionally not wired to a mutable runtime route while authentication is frozen.

## Authentication / Access state

The Production Worker already has a Worker-level Cloudflare Access application and owner-only allow policy. The Worker also has pinned Access team-domain and audience runtime values.

Repository foundations include:

- remote-JWKS Access JWT verification
- canonical-sub identity handling
- read-only `/api/private/session`
- D1 `access_users` / `store_memberships`
- per-Store authorization helpers

The owner has explicitly frozen further login/authentication verification until explicitly resumed.

While frozen, do not:

- run `/api/private/session` authentication acceptance
- capture canonical Access `sub`
- bootstrap `access_users`
- bootstrap `store_memberships`
- run owner/unrelated/cross-store/role authorization acceptance
- replace or extend the existing Access/JWT foundation
- fabricate identity or use D1 writes to simulate authenticated acceptance

Preserve the configuration and fail-closed foundation as-is.

## Production D1 schema v3

Repository migration `migrations/0003_dataset_versions.sql` defines:

- `dataset_versions` — immutable version metadata
- `dataset_current` — per-Store/per-kind current pointer
- `deployment_meta.schema_version = 3`

Migration `0003` has already been applied and verified in Production D1.

Verified Production state:

```text
dataset_versions exists, count = 0
dataset_current exists, count = 0
idx_dataset_versions_store_kind_imported exists
idx_dataset_current_dataset exists
deployment_meta.schema_version = 3
access_users = 0
store_memberships = 0
```

No membership rows were inserted during migration acceptance.

## Prepared non-auth persistence internals

### Import path

The internal server path is prepared as:

```text
raw CSV bytes
-> validateImportBody()
-> required report-shape and value validation
-> SHA-256 over exact bytes
-> persistAcceptedDataset()
-> R2 conditional create (If-None-Match: *)
-> verify actual R2 object integrity
-> D1 batch(version metadata + current pointer)
```

Invalid imports perform no R2 or D1 writes.

R2 and D1 cannot form one distributed transaction. The safe ordering intentionally writes the immutable R2 object first, verifies it, and only then promotes the D1 pointer transactionally. A D1 failure can leave an unreachable immutable R2 orphan but cannot promote a broken current pointer.

### Restore path

The internal restore primitive performs:

```text
D1 current pointer
-> version metadata
-> exact R2 object
-> byte-size and checksum verification
-> dataset/store/kind/source/row-count metadata verification
```

Missing or inconsistent objects fail closed.

These server persistence internals remain unexposed through mutable Worker routes while authentication is frozen.

## Browser-local integrity

Browser-local Ads and Unified imports validate report values before persistence. Browser backup restore also validates normalized persisted rows before writing IndexedDB, so a corrupted or manually edited backup cannot bypass the Ads/Unified import-value guards.

Local `Staged` / `Approved` states never mean an action was executed on Amazon.

## GitHub-only Cloudflare read-only operations

PR #64 / Issue #63 provide a permanent owner-only read-only status path through GitHub.

Exact owner comment on Issue #63:

```text
/cloudflare status
```

The workflow verifies, without printing secret values or resource identifiers:

- configured repository secrets are available
- Cloudflare token verify succeeds
- Workers Scripts read succeeds
- D1 databases read succeeds
- R2 buckets read succeeds

This path is observability only. It does not perform deployment mutation, D1/R2 mutation, Cloudflare Access identity/session acceptance, Access policy/app writes, or Amazon operations.

A standalone Cloudflare connector is not required for this status path.

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

- #20 — CLOSED / COMPLETED
- #17 — OPEN
- non-auth server persistence foundation — GITHUB + D1 READY
- Production D1 migration `0003` — APPLIED / VERIFIED
- authentication/login acceptance — FROZEN BY OWNER
- Amazon APIs — HARD-OFF

Do not invent another persistence layer or authentication system. Continue only evidenced product P1/P2 work that can be completed from existing imported/local data until the owner explicitly resumes authentication.

## Commands

```bash
npm install
npm run check
npm run build
npm run dev
npm run db:migrate
npm run deploy
```

Normal Production delivery remains GitHub `main` -> Cloudflare Workers Builds.