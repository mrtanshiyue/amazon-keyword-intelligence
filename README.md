# KeywordOS — Amazon Keyword Intelligence

KeywordOS 是一个面向 Amazon 广告、关键词与经营分析的多 Store 工作台，运行在 Cloudflare Workers Static Assets + Worker API + D1 + R2 上。

## Current authoritative status

- Repository: `mrtanshiyue/amazon-keyword-intelligence`
- Production Worker: `amazon-keyword-intelligence`
- Production URL: `https://amazon-keyword-intelligence.tanshiyuesir.workers.dev/`
- Product completion issue #20: **CLOSED / COMPLETED**
- Security/persistence issue #17: **OPEN**
- Non-auth server persistence foundation: **GITHUB + D1 READY**
- Remote D1 migration `0003`: **APPLIED / VERIFIED**
- Authentication/login acceptance: **FROZEN BY OWNER until explicitly resumed**
- Amazon Ads API / OAuth / SP-API: **disabled / HARD-OFF**
- Amazon remote mutation: **disabled**
- GitHub-only Cloudflare read-only operations: **ACTIVE via Issue #63**

At the start of future work, read the repository's current `main`; do not rely on an exact SHA embedded in documentation. The last verified product baseline before the current docs-only synchronization series is `09d3ad9353395f7a4031a2518bafebeb84a98e16` (PR #65).

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
- `GET /api/private/session` — existing fail-closed Access canary; login/session acceptance is currently frozen

There is no anonymous mutable business API. The prepared server persistence modules are not wired into `src/worker.js`.

## Cloudflare Access state

A Worker-level Cloudflare Access application and owner-only allow policy already exist, with pinned `ACCESS_TEAM_DOMAIN` / `ACCESS_POLICY_AUD` runtime values.

The owner has explicitly frozen further login/authentication verification. Until explicitly resumed, do not run session acceptance, capture canonical Access identity, bootstrap memberships, or extend the login flow.

Existing auth code/config should be preserved, not rebuilt.

## GitHub-only Cloudflare operations

Basic Cloudflare observability no longer depends on a ChatGPT Cloudflare connector.

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

Completed product workflows include Dashboard/Analytics, Ad Manager, Suggestions, supported local Rules, Action Center/Change Log, Cerebro, Keyword Tracker, Keyword/Negative libraries, Conflict Guard, Protected Keywords, Unified Transaction analytics, browser-local Ads/Unified imports, Local Data Operations, Store management, mobile hardening, and keyboard accessibility.

Recent product-integrity hardening includes:

- #59 Ads import value validation
- #60 Unified Transaction value validation
- #61 loaded-data recency awareness
- #62 Bid Suggestions source truth
- #65 backup restore row validation before IndexedDB writes

Backup restore now rejects malformed normalized Ads/Unified rows, impossible dates, stringified numeric values, and negative Ads core metrics while preserving legitimate signed finance values.

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
- Finance-critical Unified fields
- malformed CSV / invalid UTF-8 / empty input rejection
- consistent nonblank CSV row widths
- exact raw-byte SHA-256
- a 16 MiB buffered-import limit

Current accepted fixtures remain:

- Ads: 3,202,495 bytes — 8753 rows / 45 fields
- Unified: 1,566,578 bytes — 3643 rows / 32 fields

The 16 MiB limit is over 5x the current largest fixture. It should only be raised after large imports use a streaming parser.

### R2 + D1 persistence integrity

`src/dataset-persistence.js` enforces:

- immutable Store/kind-scoped R2 keys
- create-only R2 writes
- actual R2 object size and stored SHA-256 verification
- complete R2 custom metadata consistency for dataset id, Store id, kind, source file, row count, and custom SHA
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

On 2026-08-31, `migrations/0003_dataset_versions.sql` was applied to Production D1 `amazon-keyword-intelligence-db` (`e38981da-fbeb-412e-ac8c-936bf16adb36`).

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
- product mutable state: browser-local where implemented
- Amazon Ads OAuth/API/SP-API: disabled
- Amazon mutation: disabled

See [`P0_DATA_BOUNDARY.md`](./P0_DATA_BOUNDARY.md).

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
