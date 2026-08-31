# Data Boundary Status

Status: **PRODUCT COMPLETE / SECURITY PERSISTENCE INTERNALS IN PROGRESS / LOGIN ACCEPTANCE FROZEN**

Issue #20 is CLOSED / COMPLETED. Issue #17 remains OPEN, but the owner has explicitly frozen login/authentication verification until the rest of the project is complete and the owner asks to resume it.

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
- Cloudflare Access: Worker-level Production configuration exists
- Login/session acceptance: frozen by owner
- D1 memberships: schema present, intentionally unbootstrapped
- Amazon Ads API / OAuth: disabled / HARD-OFF
- Amazon mutation/write execution: disabled
- `/api/data/*`: GET/HEAD-only data delivery
- `/api/data/manifest`: read-only runtime/data-source manifest
- `/api/health`: read-only runtime capability/readiness endpoint
- `/api/private/session`: existing fail-closed canary; do not run acceptance while frozen
- Workers Static Assets: application assets only

## Existing authentication foundation — preserve but do not continue

The repository and Production configuration already contain:

- Worker-level Cloudflare Access application
- owner-only Access allow policy
- pinned Access team domain and audience
- Access JWT signature / issuer / audience verification
- canonical identity `sub` handling
- read-only `/api/private/session`
- D1 `access_users` / `store_memberships` schema
- per-Store authorization helpers

Last verified membership counts before the owner freeze:

```text
access_users = 0
store_memberships = 0
```

While login/authentication is frozen, do not:

- request a real Access `sub`
- bootstrap users or memberships
- run intended-owner authorization acceptance
- run unrelated/cross-store/role acceptance
- add a public bootstrap path
- replace or extend the login system

## Prepared non-auth server persistence boundary

The repository now contains internal persistence primitives, but they are deliberately not wired into `src/worker.js`.

### Validate before write

`src/import-validation.js` validates accepted Ads/Unified CSV structure, rejects malformed/invalid UTF-8 input and calculates SHA-256 over exact raw bytes.

`src/import-pipeline.js` enforces:

```text
validate
-> persist
```

Invalid imports cause zero R2 writes and zero D1 batches in tests.

### Immutable storage

`src/dataset-persistence.js` prepares:

- Store/kind-scoped immutable R2 object keys
- `If-None-Match: *` create-only writes
- R2 SHA-256 checksum enforcement
- D1 version metadata + current-pointer promotion in one D1 batch

### Restore integrity

Current-dataset restore checks:

- D1 current/version metadata
- exact R2 object presence
- R2 object byte size
- dataset id
- Store id
- dataset kind
- SHA-256 metadata

Mismatch or missing data fails closed.

### D1 migration state

Repository migration `0003_dataset_versions.sql` defines:

- `dataset_versions`
- `dataset_current`
- schema metadata version `3`

Remote migration `0003` is **not yet verified/applied in this continuation** because the Cloudflare connector currently returns tool-level `Resource not found` on execution attempts.

Do not fabricate remote migration evidence.

## Runtime safety rule while auth is frozen

Internal persistence code may be completed and tested, but it must not be exposed through an anonymous Worker POST/PUT/PATCH/DELETE route.

If a runtime task requires deciding which authenticated identity may read or mutate a Store, stop at the internal-helper boundary until the owner explicitly resumes authentication.

Do not use D1 direct writes or guessed identities to simulate authenticated acceptance.

## Current acceptance gates

The non-auth persistence foundation is acceptable only while all of these remain true:

1. Worker public business surface remains GET/HEAD-only.
2. Invalid imports cannot reach R2/D1 writes.
3. Accepted objects use immutable/versioned R2 keys.
4. D1 current pointers are updated only after validation and successful object creation.
5. Restore fails closed for missing or inconsistent R2 objects.
6. Membership tables remain unbootstrapped during the auth freeze.
7. `AMAZON_API_MODE=disabled` remains unchanged.
8. No UI state implies live Amazon execution.

## Authentication resume condition

Resume login/authentication verification **only** when the owner explicitly asks for it.

At that future point, continue from the existing foundation rather than rebuilding it: real Access session -> canonical `sub` -> exact intended-owner `store-a` membership -> authorization acceptance -> protected runtime persistence routes.
