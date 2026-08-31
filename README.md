# KeywordOS — Amazon Keyword Intelligence

KeywordOS 是一个面向 Amazon 广告、关键词与经营分析的多 Store 工作台。当前产品运行在 Cloudflare Workers Static Assets + Worker API + D1 + R2 上。

## Current authoritative status

- Repository: `mrtanshiyue/amazon-keyword-intelligence`
- Production Worker: `amazon-keyword-intelligence`
- Production URL: `https://amazon-keyword-intelligence.tanshiyuesir.workers.dev/`
- Product completion issue: **#20 OPEN**
- Security/authentication issue: **#17 DEFERRED**
- Amazon Ads API / OAuth: **disabled**
- Amazon remote mutation: **disabled**
- Current product baseline before this docs-only cleanup: `78d69cde0d49578ca7a7a3c690e9b17e490ee5d1`

Do not close #20 or resume #17 until the current exact-main Cloudflare Workers Build is verified successful and cumulative Production browser acceptance passes.

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
│                    └────► R2 test datasets   │
└──────────────────────────────────────────────┘
```

### Browser application assets

`npm run build` currently copies these 12 application assets into `dist/`:

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

Seed datasets are **not** copied into `dist/`. The browser loads them through read-only Worker routes backed by R2:

- `GET /api/data/seed.js`
- `GET /api/data/unified-seed.js`

Raw CSV files, seed source files, Worker source, migrations, Wrangler configuration, documentation and dependencies are not public Static Assets.

## Runtime API

The Worker is GET/HEAD only. Non-GET/HEAD requests are rejected with `405`.

- `GET /api/health` — D1/R2/runtime capability state
- `GET /api/data/manifest` — deployment/data-source metadata and R2 object state
- `GET /api/data/seed.js` — Store 01 advertising test dataset from R2
- `GET /api/data/unified-seed.js` — Store 01 Unified Transaction test dataset from R2
- `GET /api/private/session` — dormant fail-closed authenticated read-only canary; usable only after the deferred Access configuration exists

There is no anonymous mutable business API.

## Product truth

### Global

Global pages are analytics-only. They cannot write to Amazon. Cross-store numbers are shown only for Stores with real loaded datasets.

### Store workspaces

- Store 01 has the current imported/test dataset.
- Store 02 / Store 03 remain `No data` until a real store-scoped data path exists.
- Browser-local Store workspace metadata may be created/edited without implying an Amazon connection.
- Amazon connection, advertiser binding, live sync and remote execution remain disabled/deferred.

### Local product workflows

The current local/browser product includes:

- Dashboard and Analytics
- Ad Manager drill-down
- Suggestions review and batch staging
- Rules evaluation for supported local rule types
- Action Center lifecycle and Change Log
- Cerebro, Keyword Tracker and Keyword/Negative libraries
- Conflict Guard and Protected Keywords
- Unified Transaction analytics
- Ads / Unified CSV local import and browser persistence
- Local Data Operations / Data Health
- Store workspace management
- responsive/mobile hardening
- keyboard reachability for dynamic actions

A local `Approved`/`Staged` state never means executed on Amazon.

## Data boundary

Current mode is public-test/local-product mode:

- Authentication configuration: deferred
- Cloudflare Access production policy: not enabled
- Amazon Ads OAuth/API: disabled
- Amazon mutation: disabled
- D1: deployment/source metadata plus dormant membership schema
- R2: test dataset objects
- browser: intended local mutable workspace state

See [`P0_DATA_BOUNDARY.md`](./P0_DATA_BOUNDARY.md) for the current boundary contract.

## Development

```bash
npm install
npm run check
npm run build
npm run dev
```

Manual production deployment, when intentionally needed:

```bash
npm run check
npm run build
npm run deploy
```

D1 migrations:

```bash
npm run db:migrate
```

Normal Production flow is GitHub `main` → Cloudflare Workers Builds → Wrangler deploy.

## Repository documentation

Keep only current operating documentation in the root:

- `README.md` — current product/runtime truth
- `CURRENT_HANDOFF.md` — authoritative continuation checkpoint
- `CLOUDFLARE_ARCHITECTURE.md` — current deployment architecture
- `P0_DATA_BOUNDARY.md` — current security/data boundary

Historical V5/V6/V7/V8/V9 implementation notes have been retired because they no longer represent authoritative product state.
