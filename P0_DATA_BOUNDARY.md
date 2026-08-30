# P0 Data Boundary Hardening

Status: **ACCESS AUTHENTICATION NOT YET ACTIVE IN PRODUCTION**

Current `main` has already removed the two business seed files from Workers Static Assets and now serves them from private R2 through `/api/data/*`. Those routes are still in `public-test` mode, so the data remains browser-readable without authentication.

This document records the remaining P0 security boundary work. Do not describe the runtime as Access-protected until the Cloudflare Zero Trust application, Worker variables, JWT validation, and browser acceptance are all complete.

## Current architecture

```text
Browser
  -> Worker /api/data/*
  -> private R2 objects

Workers Static Assets
  -> HTML / CSS / JS application code only
```

## Target architecture

```text
Browser
  -> Cloudflare Access
  -> Worker /api/data/*
  -> Cf-Access-Jwt-Assertion validation
  -> private R2 objects

Public/minimal
  -> Workers Static Assets
  -> GET /api/health (capability/readiness only)
```

## Required Cloudflare configuration

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
8. `/api/health` exposes only non-sensitive readiness/capability state.
9. Dashboard / Analytics / Finance calculations match the current baseline.
10. `AMAZON_API_MODE=disabled` remains unchanged.

## Repository exposure

The GitHub repository is currently public and historical commits contain business-shaped data files. Changing only the latest tree does not remove historical exposure; repository privacy/history remediation is a separate P0 operation.
