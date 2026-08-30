# Data Boundary Status

Status: **PUBLIC TEST MODE — AUTHENTICATION DEFERRED BY OWNER**

The current project is intentionally operating with test data. Authentication, Cloudflare Access, JWT validation, repository privacy remediation, and real Amazon OAuth/API authorization are **not current release blockers** and should not be implemented until the owner explicitly reactivates that work.

Current `main` has already removed the two large seed datasets from Workers Static Assets. The browser now loads them through read-only Worker routes backed by R2:

```text
Browser
  -> Worker /api/data/seed.js
  -> Worker /api/data/unified-seed.js
  -> R2 test-data objects

Workers Static Assets
  -> HTML / CSS / application JavaScript only
```

## Current contract

- Data mode: `public-test`
- Authentication: deferred
- Amazon Ads API: disabled
- Amazon mutation/write execution: disabled
- `/api/data/*`: read-only test-data delivery
- `/api/data/manifest`: read-only runtime/data-source manifest
- `/api/health`: runtime capability/readiness endpoint
- D1: deployment/source metadata
- R2: test dataset storage
- Workers Static Assets: application code only; seed datasets are not copied into `dist`

## Current acceptance gates

1. Production application continues to render from the R2-backed test-data routes.
2. `dist` contains no seed JS or raw CSV datasets.
3. Dashboard / Analytics / Finance calculations remain consistent with the accepted baseline.
4. `/api/data/*` remains GET/HEAD-only.
5. `AMAZON_API_MODE=disabled` remains unchanged.
6. UI must not imply that Amazon OAuth, live sync, or Amazon mutation is active.

## Deferred security phase

Only when real/private data or real Amazon account connectivity is required, reopen the security phase and evaluate:

- Cloudflare Access for the Production hostname
- Worker-side Access JWT validation as defense in depth
- authenticated application sessions / user authorization
- repository privacy and historical-data remediation where appropriate
- real Amazon Ads OAuth callback, token storage/refresh, advertiser/profile authorization, and scoped backend APIs

Do not enable any of these implicitly. They require an explicit owner decision and a separate production acceptance cycle.
