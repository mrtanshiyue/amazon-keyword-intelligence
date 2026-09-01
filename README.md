# KeywordOS — Amazon Keyword Intelligence

KeywordOS 是一个面向 Amazon 广告、关键词、Listing 准备和经营分析的多 Store 工作台，运行在 Cloudflare Workers Static Assets + Worker API + D1 + R2 上。

## Current authoritative status

- Repository: `mrtanshiyue/amazon-keyword-intelligence`
- Production Worker: `amazon-keyword-intelligence`
- Production URL: `https://amazon-keyword-intelligence.tanshiyuesir.workers.dev/`
- Product completion issue #20: **CLOSED / COMPLETED**
- Security/persistence issue #17: **OPEN** only because authentication acceptance remains intentionally frozen
- Non-auth server persistence foundation: **GITHUB + D1 READY**
- Production D1 migration `0003`: **APPLIED / VERIFIED**
- Authentication/login acceptance: **FROZEN BY OWNER until explicitly resumed**
- Amazon Ads API / OAuth / SP-API: **disabled / HARD-OFF**
- Amazon remote mutation and Listing publishing: **disabled**
- GitHub-only Cloudflare read-only operations: **ACTIVE via Issue #63**

At the start of future work, always read the repository's current `main`; do not rely on a permanently embedded SHA in documentation.

Latest verified product baseline before this documentation synchronization:

`22517172eca251703d028d081fb7c9466d9404be` — PR #79

Acceptance on that product baseline:

- GitHub `check-and-build`: **PASS**
- Cloudflare Workers Build: **PASS**
  - Build ID: `c78fafaa-84d1-4a00-b917-0228783ac247`
  - Version ID: `4a3b6f0e-4782-4336-b2ea-9ec71c7ea0e7`
- GitHub-only `/cloudflare status`: **PASS**
  - run `33454956950`

The authoritative continuation instructions are in [`CURRENT_HANDOFF.md`](./CURRENT_HANDOFF.md).

## Runtime architecture

```text
GitHub main
    │
    ▼
Cloudflare Workers Builds
    │
    ▼
┌──────────────────────────────────────────────┐
│ amazon-keyword-intelligence Worker          │
│                                              │
│ Static Assets ───────────────► KeywordOS UI │
│ /api/* ─────► Worker API                    │
│                    │                         │
│                    ├────► D1 metadata        │
│                    └────► R2 datasets        │
└──────────────────────────────────────────────┘
```

## Runtime API boundary

The current Worker business surface remains GET/HEAD-only. Non-GET/HEAD requests are rejected with `405`.

Existing read routes include:

- `GET /api/health`
- `GET /api/data/manifest`
- `GET /api/data/seed.js`
- `GET /api/data/unified-seed.js`
- `GET /api/private/session` — existing fail-closed Access canary; login/session acceptance is frozen

There is no anonymous mutable business API. The prepared server persistence modules are not wired into `src/worker.js`.

## Cloudflare Access state

A Worker-level Cloudflare Access application and owner-only allow policy already exist, with pinned `ACCESS_TEAM_DOMAIN` / `ACCESS_POLICY_AUD` runtime values.

Further login/authentication verification is intentionally frozen. Until explicitly resumed, do not run session acceptance, capture canonical Access identity, bootstrap memberships, or extend the login flow.

Existing auth code/config should be preserved, not rebuilt.

## GitHub-only Cloudflare operations

Basic Cloudflare observability does not require a standalone ChatGPT Cloudflare connector.

Issue #63 accepts the exact owner command:

```text
/cloudflare status
```

The permanent GitHub Actions workflow verifies, read-only:

- configured Cloudflare repository secrets
- API token validity
- Workers Scripts access
- D1 database access
- R2 bucket access

It emits PASS/FAIL only. It must not be silently expanded into Access identity/session acceptance, Access app/policy writes, deployment mutation, D1/R2 mutation, or Amazon API work.

## Product truth

- Global pages are analytics-only and cannot write to Amazon.
- Store 01 has the accepted loaded/test dataset: Ads Search Term `8,753` rows; Unified Transaction `3,643` rows.
- Store 02 / Store 03 remain `No data`.
- Browser-local Store workspace metadata may be created/edited without implying an Amazon connection.
- Local `Staged` / `Approved` states never mean executed on Amazon.
- Listing drafts are preparation-only and never mean published to Amazon.

Completed product workflows include Dashboard/Analytics, Ad Manager, Suggestions, supported local Rules, Action Center/Change Log, Cerebro, Keyword Tracker, Keyword/Negative libraries, Conflict Guard, Protected Keywords, Unified Transaction analytics, browser-local Ads/Unified imports, Local Data Operations, Store management, responsive/mobile hardening, keyboard accessibility, URL page history, suite workspace homes, and first-class Listing preparation.

## Recent product hardening and suite UX phase

Recent merged work:

- #59 — Ads import value validation
- #60 — Unified Transaction value validation
- #61 — loaded-data recency awareness
- #62 — Bid Suggestions source truth
- #65 — backup restore row validation before IndexedDB writes
- #69 — persisted dataset startup integrity, including strict Ads bid lineage
- #70 — backup localStorage shape integrity
- #71 — live localStorage preflight repair before application initialization
- #72 — restore the previously disabled top suite navigation
- #73 — truthful suite launchers + mobile horizontal suite navigation
- #74 — lightweight `#page=...` URL history and Back/Forward
- #75 — startup hash restore race fix
- #76 — first-class Listing Workspace page with session-only Title/Bullets/Search Terms preparation
- #77 — Listing prefers only validated browser-persisted Ads evidence; otherwise visibly labeled bundled fallback
- #78 — Listing/sidebar async startup race fix
- #79 — Products / Keywords / Marketing / Operations / Analytics promoted to stable first-class main-workspace suite homes

### Current suite navigation

All six top-level suite entries are now usable first-class surfaces:

- **Products** — suite home for existing product/store workspace capabilities
- **Keywords** — suite home for existing keyword intelligence capabilities
- **Listing** — dedicated first-class preparation page; no Amazon publishing
- **Marketing** — suite home for advertising workflows
- **Operations** — suite home for supported data/finance operating workflows
- **Analytics** — suite home for analytics surfaces

The suite bar is no longer hidden below 900px; it remains horizontally navigable on narrower layouts.

Suite homes and Listing participate in the existing lightweight `#page=...` URL/history behavior, so reload and browser Back/Forward reuse the real application navigation path without a routing framework.

## Listing data and draft boundary

Listing is not a fake Amazon editor. It is a local preparation workspace:

- keyword candidates come from Amazon Ads search-term evidence already available to KeywordOS
- if a schema-v1 browser-persisted Ads dataset exists and passes the existing persisted-dataset guard, Listing prefers that evidence
- otherwise Listing fails closed to the bundled dataset and labels the evidence source
- Title / Bullets / Search Terms draft text is session-only
- no synthetic search-volume/ranking data is invented
- no Amazon credentials, API calls, listing writes, or publishing are performed

## Non-auth server persistence foundation

The code-side foundation is ready and intentionally unexposed.

### D1 schema

`migrations/0003_dataset_versions.sql` defines:

- immutable `dataset_versions`
- per-Store/per-kind `dataset_current`
- composite dataset/Store/kind foreign-key integrity
- schema metadata version `3`

The migration is applied to Production D1 and verified remotely.

### Import validation

`src/import-validation.js` enforces:

- Ads and Unified supported report shapes
- required Ads fields
- finance-critical Unified fields
- malformed CSV / invalid UTF-8 / empty input rejection
- consistent nonblank CSV row widths
- exact raw-byte SHA-256
- a 16 MiB buffered-import limit

Current accepted fixtures remain:

- Ads: 3,202,495 bytes — 8,753 rows / 45 fields
- Unified: 1,566,578 bytes — 3,643 rows / 32 fields

The 16 MiB limit should only be raised after large imports use a streaming parser.

### R2 + D1 persistence integrity

`src/dataset-persistence.js` enforces:

- immutable Store/kind-scoped R2 keys
- create-only R2 writes
- actual R2 object size and stored SHA-256 verification
- complete R2 custom metadata consistency
- D1 version/current promotion only after R2 integrity succeeds
- Store/kind-safe current lookup
- the same object integrity checks on restore

`src/import-pipeline.js` remains simply:

```text
validateImportBody()
-> persistAcceptedDataset()
```

Invalid imports perform zero R2/D1 writes; R2 integrity mismatch cannot promote the D1 current pointer.

Do not add speculative persistence validation or abstractions without a concrete defect.

## Remote D1 migration verification

Production D1: `amazon-keyword-intelligence-db` (`e38981da-fbeb-412e-ac8c-936bf16adb36`).

Verified state:

- `dataset_versions` exists and `count = 0`
- `dataset_current` exists and `count = 0`
- `idx_dataset_versions_store_kind_imported` exists
- `idx_dataset_current_dataset` exists
- `deployment_meta.schema_version = 3`
- `access_users = 0`
- `store_memberships = 0`

No membership rows were inserted. The non-auth server persistence foundation is therefore **GITHUB + D1 READY**.

Protected runtime Store read/write wiring remains deferred while authentication is frozen.

## Browser application assets

`npm run build` publishes only browser application assets in `dist/`. Raw/sample CSVs, seed source files, Worker source, migrations, Wrangler configuration, repository documentation and dependencies are not public Static Assets.

## Data boundary

- Cloudflare Access configuration: present; login acceptance frozen
- D1 membership tables: present but intentionally unbootstrapped
- D1 dataset schema: version 3 live and empty
- server persistence code: prepared internally but not exposed through Worker mutation routes
- product mutable state: browser-local/session-local where implemented
- Amazon Ads OAuth/API/SP-API: disabled
- Amazon mutation and Listing publishing: disabled

See [`P0_DATA_BOUNDARY.md`](./P0_DATA_BOUNDARY.md).

## Known repository administration gap

`main` branch protection is currently not enabled. This is a repository-administration gap, not a product-runtime blocker. Do not claim branch protection is configured until it is actually enabled through a supported repository-admin path.

## Development

```bash
npm install
npm run check
npm run build
npm run dev
```

D1 migrations:

```bash
npm run db:migrate
```

Manual production deployment, when intentionally needed:

```bash
npm run check
npm run build
npm run deploy
```

Normal Production flow remains GitHub `main` -> Cloudflare Workers Builds -> Wrangler deploy.

## Repository documentation

Current root documentation:

- `README.md` — current product/runtime truth
- `CURRENT_HANDOFF.md` — authoritative continuation checkpoint
- `CLOUDFLARE_ARCHITECTURE.md` — current deployment architecture
- `P0_DATA_BOUNDARY.md` — current security/data boundary

Historical V5/V6/V7/V8/V9 implementation notes are retired and are not authoritative.
