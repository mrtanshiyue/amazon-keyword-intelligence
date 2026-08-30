# P0 Data Boundary Hardening

Status: **CODE READY ON THIS BRANCH — DO NOT MERGE UNTIL CLOUDFLARE ACCESS IS CONFIGURED**

Current `main` has already removed the two business seed files from Workers Static Assets and serves them from private R2 through `/api/data/*`, but those routes remain in `public-test` mode.

This branch adds Worker-side Cloudflare Access JWT verification. It must stay out of Production until the hostname-level Access application and required Worker variables are configured, otherwise the application will fail closed and the datasets will not load.

## Target architecture

```text
Browser
  -> Cloudflare Access
  -> Worker /api/data/*
  -> Cf-Access-Jwt-Assertion validation
  -> private R2 objects

Public/minimal
  -> Workers Static Assets (application code only)
  -> GET /api/health (capability/readiness only)
```

## Branch implementation

- validates `Cf-Access-Jwt-Assertion` with Cloudflare Access JWKS via `jose`
- protects `/api/data/seed.js`
- protects `/api/data/unified-seed.js`
- protects `/api/data/manifest`
- fails closed when Access configuration is missing
- keeps `/api/health` public and non-sensitive
- reports `protectedDataReady`, `accessConfigured`, and `dataMode=access-protected`
- preserves R2 as the runtime data source
- preserves `AMAZON_API_MODE=disabled`

## Required Cloudflare configuration before merge

Create a Cloudflare Zero Trust Access application that protects the Production hostname, then configure:

- `TEAM_DOMAIN`: full Access team domain, e.g. `https://<team>.cloudflareaccess.com`
- `POLICY_AUD`: Access Application Audience (AUD) tag

Worker-side JWT verification is defense in depth and is not a substitute for the hostname-level Access application.

## Production acceptance gates

1. Access application protects the Production hostname.
2. `TEAM_DOMAIN` and `POLICY_AUD` are configured in Production.
3. Unauthenticated `/api/data/seed.js` never returns dataset bytes.
4. Invalid JWT is denied.
5. Authenticated browser loads both datasets and the full application.
6. `/api/data/manifest` requires authentication.
7. `dist` contains no seed JS or raw CSV.
8. `/api/health` returns `accessConfigured=true` and `protectedDataReady=true` without exposing object names/sizes.
9. Dashboard / Analytics / Finance calculations match the current baseline.
10. `AMAZON_API_MODE=disabled` remains unchanged.

## Repository exposure remains separate

The GitHub repository is currently public and historical commits contain business-shaped data files. Changing only the latest tree does not remove historical exposure; repository privacy/history remediation is a separate P0 operation.
