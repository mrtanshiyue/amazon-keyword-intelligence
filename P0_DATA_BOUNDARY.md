# Data Boundary Status

Status: **PUBLIC TEST / LOCAL PRODUCT MODE — SECURITY PHASE DEFERRED**

Issue #20 is the active product-completion gate. Issue #17 (authentication boundary + server-side mutable persistence) remains deferred until #20 receives explicit Production acceptance.

## Current data path

```text
Browser
  -> Worker /api/data/seed.js
  -> Worker /api/data/unified-seed.js
  -> R2 public-test objects

Workers Static Assets
  -> HTML / CSS / application JavaScript only
```

Seed source files and raw CSV datasets are not copied into `dist/`.

## Current contract

- Data mode: `public-test`
- Product mutable state: browser-local where implemented
- Authentication Production configuration: deferred
- Amazon Ads API / OAuth: disabled
- Amazon mutation/write execution: disabled
- `/api/data/*`: GET/HEAD-only test-data delivery
- `/api/data/manifest`: read-only runtime/data-source manifest
- `/api/health`: read-only runtime capability/readiness endpoint
- D1: deployment/source metadata plus dormant authorization schema
- R2: test dataset storage
- Workers Static Assets: application code only

## Dormant security foundation already present

The repository already contains fail-closed foundations from the deferred security phase:

- Cloudflare Access JWT verification primitives
- read-only `/api/private/session` canary
- D1 `access_users` / `store_memberships` schema migration
- read-only per-store authorization helpers

These are code foundations only. They do **not** mean Production authentication is active.

While #17 is deferred, do not:

- configure Cloudflare Access for Production
- set Production Access team/audience values to activate the canary
- bootstrap memberships
- add anonymous or authenticated mutable Worker business endpoints
- move browser imports to mutable server persistence
- enable Amazon OAuth/API

## Current acceptance gates

1. Production application renders from the R2-backed test-data routes.
2. `dist` contains no seed JS or raw CSV datasets.
3. Dashboard / Analytics / Finance calculations remain consistent with the accepted baseline.
4. Worker business surface remains GET/HEAD-only.
5. `AMAZON_API_MODE=disabled` remains unchanged.
6. UI does not imply Amazon OAuth, live sync or Amazon mutation is active.
7. #20 exact-main Cloudflare Build and cumulative Production browser acceptance pass.

## Resume condition for #17

Resume #17 only after #20 is explicitly closed as accepted. The security phase should then add authenticated server-side mutable persistence before any real/private data workflow or Amazon connectivity is enabled.
