# KeywordOS — Amazon Keyword Intelligence

KeywordOS 是一个面向 Amazon 广告、关键词与经营分析的多 Store 工作台，运行在 Cloudflare Workers Static Assets + Worker API + D1 + R2 上。

## Current authoritative status

- Repository: `mrtanshiyue/amazon-keyword-intelligence`
- Production Worker: `amazon-keyword-intelligence`
- Production URL: `https://amazon-keyword-intelligence.tanshiyuesir.workers.dev/`
- Product completion issue #20: **CLOSED / COMPLETED**
- Security/persistence issue #17: **OPEN**
- Non-auth server persistence code foundation: **READY**
- Remote D1 migration `0003`: **PENDING**
- Authentication/login acceptance: **FROZEN BY OWNER until explicitly resumed**
- Amazon Ads API / OAuth / SP-API: **disabled / HARD-OFF**
- Amazon remote mutation: **disabled**
- Product main before this docs-only synchronization: `568b21c64f413eafbf4fa7e0d2db4c5d20561fb1`

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

## Product truth

- Global pages are analytics-only and cannot write to Amazon.
- Store 01 has the accepted loaded/test dataset.
- Store 02 / Store 03 remain `No data`.
- Browser-local Store workspace metadata may be created/edited without implying an Amazon connection.
- Local `Staged` / `Approved` states never mean executed on Amazon.

Completed product workflows include Dashboard/Analytics, Ad Manager, Suggestions, supported local Rules, Action Center/Change Log, Cerebro, Keyword Tracker, Keyword/Negative libraries, Conflict Guard, Protected Keywords, Unified Transaction analytics, browser-local Ads/Unified imports, Local Data Operations, Store management, mobile hardening, and keyboard accessibility.

## Non-auth server persistence foundation

The code-side foundation is ready and intentionally unexposed.

### D1 schema in repository

`migrations/0003_dataset_versions.sql` defines:

- immutable `dataset_versions`
- per-Store/per-kind `dataset_current`
- composite dataset/Store/kind foreign-key integrity
- schema metadata version `3`

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

A final narrow audit after PR #53 found no additional clear non-auth P1/P2 persistence defect. Further speculative validation/abstraction is intentionally omitted.

## Only remaining non-auth external gate

Remote D1 migration `0003` is still pending.

In the latest continuation the user explicitly invoked the Cloudflare connector, but no executable Cloudflare resource was exposed in the chat runtime. Do not claim schema v3 is live until it is actually applied and verified.

When Cloudflare execution becomes available, the required sequence is:

1. read current D1 state
2. apply exact-main `0003_dataset_versions.sql`
3. verify `dataset_versions` exists and is empty
4. verify `dataset_current` exists and is empty
5. verify `deployment_meta.schema_version = 3`
6. verify `access_users = 0`
7. verify `store_memberships = 0`

Do not insert memberships during that operation.

## Browser application assets

`npm run build` publishes only browser application assets in `dist/`. Raw/sample CSVs, seed source files, Worker source, migrations, Wrangler configuration, repository documentation and dependencies are not public Static Assets.

## Data boundary

- Cloudflare Access configuration: present; login acceptance frozen
- D1 membership tables: present but intentionally unbootstrapped
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
