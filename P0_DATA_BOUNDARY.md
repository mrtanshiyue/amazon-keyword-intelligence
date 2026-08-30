# P0 Data Boundary Hardening

Status: **DO NOT MERGE TO PRODUCTION UNTIL CLOUDFLARE ACCESS IS CONFIGURED**

This branch removes business seed data from Workers Static Assets and serves it only from private R2 through authenticated Worker routes.

## Why

The current production build publishes `seed-data.js` and `unified-seed-data.js` as browser-readable static assets. That is convenient for a prototype, but it is not an acceptable long-term boundary for business advertising and transaction data.

## Target architecture

```text
Browser
  -> Cloudflare Access
  -> Worker /api/data/*
  -> Access JWT validation
  -> private R2 objects

Public/minimal:
  -> Workers Static Assets (HTML/CSS/app code only)
  -> GET /api/health (no raw dataset contents)
```

## Changes in this branch

- `seed-data.js` and `unified-seed-data.js` are removed from `dist`.
- `index.html` loads `/api/data/seed.js` and `/api/data/unified-seed.js` instead of public static files.
- `/api/data/*` validates the Cloudflare Access JWT from `Cf-Access-Jwt-Assertion` using the Access JWKS endpoint and the official `jose` package.
- `/api/data/manifest` is protected by the same Access check.
- `/api/health` remains non-sensitive and reports only readiness/capability state.
- R2 becomes the runtime source for the two seed objects; the Worker no longer depends on static assets to reconstruct R2.

## Required Cloudflare configuration before merge

Create a Cloudflare Zero Trust Access application that protects the production hostname, then configure these Worker variables:

- `TEAM_DOMAIN`: the Access team domain, for example `https://<team>.cloudflareaccess.com`
- `POLICY_AUD`: the Access Application Audience (AUD) tag

Do not treat either variable as a substitute for the Access application itself. The hostname must actually be protected by Access.

## Production merge gates

All gates are mandatory:

1. Access application protects the production hostname.
2. `TEAM_DOMAIN` and `POLICY_AUD` are configured on the Worker.
3. Unauthenticated request to `/api/data/seed.js` is denied.
4. Authenticated browser can load the app and both datasets.
5. `dist` contains no seed JS or raw CSV files.
6. `/api/health` returns healthy with `protectedDataReady=true` and `accessConfigured=true`.
7. Existing dashboard/analytics/finance calculations match the current production baseline.
8. Amazon API remains disabled.

## Separate repository exposure work

The GitHub repository is currently public and historical commits contain data files. Making the repository private and removing sensitive historical blobs is a separate P0 operation. Deleting files only from the latest tree is insufficient because Git history remains retrievable.
