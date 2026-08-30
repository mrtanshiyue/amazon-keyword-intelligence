# P0 Data Boundary Hardening

Status: **DO NOT MERGE TO PRODUCTION UNTIL CLOUDFLARE ACCESS IS CONFIGURED**

Current `main` already removed the two business seed files from Workers Static Assets and serves them from private R2 through `/api/data/*`. However, those routes are still in `public-test` mode and are therefore browser-readable without authentication.

This branch closes that remaining P0 gap by requiring a valid Cloudflare Access JWT before any business dataset or detailed data manifest can be read.

## Target architecture

```text
Browser
  -> Cloudflare Access
  -> Worker /api/data/*
  -> Cf-Access-Jwt-Assertion validation
  -> private R2 objects

Public/minimal:
  -> Workers Static Assets (HTML/CSS/app code only)
  -> GET /api/health (capability/readiness only)
```

## Changes in this branch

- keep `seed-data.js` and `unified-seed-data.js` out of `dist`
- keep runtime data in private R2
- validate `Cf-Access-Jwt-Assertion` with Cloudflare Access JWKS using `jose`
- protect `/api/data/seed.js`
- protect `/api/data/unified-seed.js`
- protect `/api/data/manifest`
- keep `/api/health` public but non-sensitive
- fail closed when Access configuration is missing
- Amazon Ads API remains disabled

## Required Cloudflare configuration before merge

Create a Cloudflare Zero Trust Access application that protects the Production hostname, then configure these Worker variables:

- `TEAM_DOMAIN`: full Access team domain, e.g. `https://<team>.cloudflareaccess.com`
- `POLICY_AUD`: Access Application Audience (AUD) tag

The hostname-level Access application is mandatory. Worker JWT validation is defense in depth, not a substitute for protecting the hostname.

## Production merge gates

1. Access application protects the Production hostname.
2. `TEAM_DOMAIN` and `POLICY_AUD` exist in the Production Worker environment.
3. Unauthenticated `/api/data/seed.js` returns 401/Access challenge and never returns dataset bytes.
4. Invalid JWT is denied.
5. Authenticated browser loads both datasets and the full app.
6. `/api/data/manifest` requires authentication.
7. `dist` contains no seed JS or raw CSV.
8. `/api/health` reports `accessConfigured=true` and `protectedDataReady=true` without exposing object names/sizes.
9. Dashboard / Analytics / Finance calculations match the current baseline.
10. `AMAZON_API_MODE=disabled` remains unchanged.

## Repository exposure remains separate

The GitHub repository is still public and historical commits contain business-shaped data files. Changing the latest tree alone does not remove historical exposure. Repository privacy/history remediation is a separate P0 operation.
