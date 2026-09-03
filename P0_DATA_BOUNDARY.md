# Data Boundary Status

Status: **PRODUCT COMPLETE / NON-AUTH PERSISTENCE FOUNDATION READY / TEST LOGIN BYPASS ACTIVE**

Issue #20 is CLOSED / COMPLETED. Issue #17 remains OPEN because production authentication acceptance is deferred; owner override on 2026-09-03 intentionally disables email login for the current test phase until the owner explicitly asks to restore it.

At the start of any continuation, read the current GitHub `main` first and use `CURRENT_HANDOFF.md` as the continuation checkpoint.

## Current runtime data path

```text
Browser
  -> GET/HEAD Worker routes
  -> R2 accepted seed/test objects

Workers Static Assets
  -> HTML / CSS / application JavaScript only
```

The Worker still exposes no mutable business route.

## Current contract

- Product mutable state: browser-local where implemented
- Cloudflare Access: Worker-level Production application and original owner allow policy retained; `Bypass / Everyone` active for testing
- Login/session enforcement: disabled by owner until an explicit restoration request
- D1 memberships: schema present, intentionally unbootstrapped
- Production D1 dataset schema: version 3 applied and verified
- Server persistence code: prepared internally but not wired to mutable runtime routes
- Amazon Ads API / OAuth / SP-API: disabled / HARD-OFF
- Amazon mutation/write execution: disabled
- `/api/data/*`: GET/HEAD-only data delivery
- `/api/data/manifest`: read-only runtime/data-source manifest
- `/api/health`: read-only runtime capability/readiness endpoint
- `/api/private/session`: defaults to `disabled-test`; the fail-closed Access/JWT path is reactivated only by explicit `AUTH_MODE=cloudflare-access`
- Workers Static Assets: application assets only

## Existing authentication foundation — preserve while test bypass is active

The repository and Production configuration already contain:

- Worker-level Cloudflare Access application
- owner-only Access allow policy (retained beneath the temporary test bypass)
- pinned Access team domain and audience
- Access JWT signature / issuer / audience verification
- canonical identity `sub` handling
- read-only `/api/private/session`
- D1 `access_users` / `store_memberships` schema
- per-Store authorization helpers

Current verified membership counts remain:

```text
access_users = 0
store_memberships = 0
```

While the owner-authorized test bypass is active, do not remove the bypass or re-enable login unless the owner explicitly asks. Also do not:

- request or capture a real Access `sub`
- bootstrap users or memberships
- run intended-owner authorization acceptance
- run unrelated/cross-store/role acceptance
- add a public bootstrap path
- replace or extend the login system
- fabricate identity or use D1 direct writes to simulate authentication

## Non-auth server persistence boundary — prepared and verified

The repository contains internal persistence primitives, deliberately not wired into `src/worker.js` as mutable public routes.

### Validate before write

`src/import-validation.js` validates accepted Ads/Unified CSV structure and value integrity, rejects malformed/invalid UTF-8 input, enforces row shape and the buffered import-size bound, and calculates SHA-256 over exact raw bytes.

`src/import-pipeline.js` enforces:

```text
validate
-> persist
```

Invalid imports cause zero R2 writes and zero D1 batches in tests.

### Immutable storage

`src/dataset-persistence.js` enforces:

- Store/kind-scoped immutable R2 object keys
- `If-None-Match: *` create-only writes
- R2 SHA-256 checksum enforcement
- actual R2 size/checksum verification
- complete custom-metadata verification
- D1 version metadata + current-pointer promotion in one D1 batch after R2 integrity succeeds

### Restore integrity

Current-dataset restore checks:

- D1 current/version metadata
- exact R2 object presence
- actual R2 byte size and checksum
- dataset id
- Store id
- dataset kind
- source file
- row count
- custom SHA-256 metadata

Mismatch or missing data fails closed.

### Production D1 migration state

Repository migration `0003_dataset_versions.sql` defines:

- `dataset_versions`
- `dataset_current`
- schema metadata version `3`

Production migration `0003` is **APPLIED / VERIFIED**.

Verified Production state:

```text
dataset_versions exists, count = 0
dataset_current exists, count = 0
idx_dataset_versions_store_kind_imported exists
idx_dataset_current_dataset exists
deployment_meta.schema_version = 3
access_users = 0
store_memberships = 0
```

No membership rows were inserted during migration acceptance.

## Browser-local data integrity

Store 01 accepted loaded/test baseline:

- Amazon Ads Search Term: 8,753 rows
- Unified Transaction: 3,643 rows

Store 02 and Store 03 remain no-data and must not display fabricated business metrics.

Browser-local integrity guards include:

- Ads malformed/negative core metrics and invalid dates rejected
- Unified malformed nonblank finance values and invalid dates rejected while legitimate signed finance values remain supported
- Bid Suggestions require a real positive imported Target Bid rather than synthetic current-bid defaults
- backup restore validates normalized Ads/Unified rows before IndexedDB writes, so corrupted backups cannot bypass the import guards
- data recency surfaces report the loaded period truthfully rather than implying live/current Amazon sync

Local `Staged` / `Approved` states never mean executed on Amazon.

## GitHub-only Cloudflare read-only operations

Issue #63 / PR #64 provide an owner-only status path that does not require a standalone Cloudflare connector.

Exact owner command:

```text
/cloudflare status
```

The workflow checks:

- configured repository secrets
- Cloudflare token verify
- Workers Scripts read
- D1 databases read
- R2 buckets read

It outputs PASS/FAIL only and must not print token values, account IDs, resource IDs/names, or application data.

This is observability only. It does not perform deployment mutation, D1/R2 mutation, Cloudflare Access identity/session acceptance, Access policy/app writes, or Amazon operations.

## Runtime safety rule while auth is frozen

The prepared persistence code must not be exposed through an anonymous Worker POST/PUT/PATCH/DELETE route.

If a runtime task requires deciding which authenticated identity may read or mutate a Store, stop at the internal-helper boundary until the owner explicitly resumes authentication.

Do not use D1 direct writes or guessed identities to simulate authenticated acceptance.

## Current acceptance gates

The current boundary remains acceptable only while all of these remain true:

1. Worker public business surface remains GET/HEAD-only.
2. Invalid imports cannot reach R2/D1 writes.
3. Accepted objects use immutable/versioned R2 keys.
4. R2 object integrity is verified before D1 current-pointer promotion.
5. Restore fails closed for missing or inconsistent R2 objects.
6. Browser backup restore cannot bypass normalized Ads/Unified value integrity.
7. Membership tables remain unbootstrapped during the auth freeze.
8. `AMAZON_API_MODE=disabled` remains unchanged.
9. No UI state implies live Amazon execution.

## Authentication resume condition

Resume login/authentication verification **only** when the owner explicitly asks for it.

At that future point, continue from the existing foundation rather than rebuilding it:

```text
real Access session
-> canonical sub
-> exact intended-owner Store 01 membership bootstrap
-> authorization acceptance
-> protected runtime persistence routes
```

Until then, #17 remains OPEN and authentication remains frozen.