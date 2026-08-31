# KeywordOS — Amazon Keyword Intelligence

KeywordOS 是一个面向 Amazon 广告、关键词与经营分析的多 Store 工作台，运行在 Cloudflare Workers Static Assets + Worker API + D1 + R2 上。

## Current authoritative status

- Repository: `mrtanshiyue/amazon-keyword-intelligence`
- Production Worker: `amazon-keyword-intelligence`
- Production URL: `https://amazon-keyword-intelligence.tanshiyuesir.workers.dev/`
- Product completion issue #20: **CLOSED / COMPLETED**
- Security/persistence issue #17: **OPEN / ACTIVE**
- Authentication/login acceptance: **FROZEN BY OWNER until explicitly resumed**
- Amazon Ads API / OAuth / SP-API: **disabled / HARD-OFF**
- Amazon remote mutation: **disabled**
- Product main before this docs-only synchronization: `ff2a2cdc2a5cf957317c357c0df8079af2b8aab0`

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

## Browser application assets

`npm run build` publishes only the browser application assets in `dist/`:

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

Raw/sample CSVs, seed source files, Worker source, migrations, Wrangler configuration, repository documentation and dependencies are not public Static Assets.

## Runtime API boundary

The current Worker business surface remains GET/HEAD-only. Non-GET/HEAD requests are rejected with `405`.

Existing read routes include:

- `GET /api/health`
- `GET /api/data/manifest`
- `GET /api/data/seed.js`
- `GET /api/data/unified-seed.js`
- `GET /api/private/session` — existing fail-closed Access canary; login/session acceptance is currently frozen

There is no anonymous mutable business API.

## Cloudflare Access state

A Worker-level Cloudflare Access application and owner-only allow policy are already configured, and the Worker has pinned `ACCESS_TEAM_DOMAIN` / `ACCESS_POLICY_AUD` runtime values.

The owner has explicitly frozen further login/authentication verification. Until explicitly resumed, do not run session acceptance, capture canonical Access identity, bootstrap memberships, or extend the login flow.

Existing auth code/config should be preserved, not rebuilt.

## Product truth

### Global and Store workspaces

- Global pages are analytics-only and cannot write to Amazon.
- Store 01 has the accepted loaded/test dataset.
- Store 02 / Store 03 remain `No data`.
- Browser-local Store workspace metadata may be created/edited without implying an Amazon connection.
- Local `Staged` / `Approved` states never mean executed on Amazon.

### Completed local product workflows

The current product includes:

- Dashboard and Analytics
- Ad Manager drill-down
- Suggestions review and batch staging
- supported local Rules evaluation
- Action Center lifecycle and Change Log
- Cerebro, Keyword Tracker, Keyword/Negative libraries
- Conflict Guard and Protected Keywords
- Unified Transaction analytics
- Ads / Unified CSV local import and browser persistence
- Local Data Operations / Data Health
- Store workspace management
- responsive/mobile hardening
- keyboard accessibility for dynamic actions

## Non-auth server persistence foundation

The repository now contains dormant, unexposed server-side persistence internals:

- `migrations/0003_dataset_versions.sql`
  - immutable `dataset_versions`
  - per-Store/per-kind `dataset_current`
  - composite dataset/Store/kind foreign-key integrity
  - schema metadata version `3`
- `src/import-validation.js`
  - fail-closed Ads/Unified CSV validation
  - Finance-critical Unified required fields
  - consistent nonblank CSV row widths
  - exact raw-byte SHA-256
- `src/dataset-persistence.js`
  - immutable R2 create semantics
  - actual R2 size + stored SHA-256 verification
  - D1 version/current promotion
  - Store/kind-safe current lookup
  - current-object restore integrity checks
- `src/import-pipeline.js`
  - validate first, persist only after validation succeeds

Current fixture acceptance remains:

- Ads: 8753 rows / 45 fields
- Unified: 3643 rows / 32 fields

Invalid imports cannot reach R2/D1 writes; R2 integrity mismatch cannot promote the D1 current pointer.

These modules are not wired into `src/worker.js`, so they do not expose mutable runtime endpoints.

Remote D1 migration `0003` is still pending. In the latest continuation the user invoked the Cloudflare connector, but no Cloudflare executable resource was exposed in the chat runtime. Do not claim schema v3 is live until it is actually applied and verified.

## Data boundary

Current boundary:

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
