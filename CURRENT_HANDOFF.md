# KeywordOS — Current Authoritative Handoff

**Updated:** 2026-08-31 (Asia/Singapore)  
**Repository:** `mrtanshiyue/amazon-keyword-intelligence`

This is the single authoritative continuation checkpoint. Retired V5/V6/V7/V8/V9 notes and older #20 handoffs are historical only.

## 1. Next conversation: execute directly

Continue:

**Amazon Keyword Intelligence — #17 non-auth server persistence finalization**

Do not restart product analysis.  
Do not redo #20.  
Do not redesign the UI.  
Do not recreate Worker / D1 / R2.  
Do not enable Amazon Ads API/OAuth/SP-API.  
Do not expose anonymous mutable Worker routes.

### Owner override — authentication/login verification is frozen

The owner explicitly instructed that login/authentication verification must remain frozen until the rest of the project is complete and the owner explicitly asks to resume it.

Until that explicit instruction arrives, do **not**:

- run `/api/private/session` acceptance
- request or capture a canonical Cloudflare Access `sub`
- bootstrap `access_users`
- bootstrap `store_memberships`
- perform owner/unrelated/cross-store/role authorization acceptance
- add a public bootstrap endpoint
- modify or replace the existing Access/JWT foundation merely to continue other work
- treat the frozen auth lane as a blocker for independent non-auth work

Preserve the existing Access configuration and fail-closed auth code without extending the login flow.

## 2. GitHub authoritative state

Authoritative product main before this docs-only synchronization:

`ff2a2cdc2a5cf957317c357c0df8079af2b8aab0`

At the start of a future conversation, read current `main` and use the latest merge commit if this docs update has landed.

Issue state:

- **#20 — CLOSED / COMPLETED**. Do not reopen or rerun it.
- **#17 — OPEN / ACTIVE**, but its authentication/login acceptance lane is explicitly **FROZEN BY OWNER**.
- Amazon API/OAuth/SP-API remains **HARD-OFF**.

Recent non-auth #17 merges:

- PR #42 — versioned dataset persistence foundation
- PR #43 — server-side import validation
- PR #44 — validate-first import persistence pipeline
- PR #45 — current dataset restore integrity checks
- PR #47 — Store/kind current-pointer integrity
- PR #48 — actual R2 object size/SHA-256 integrity
- PR #49 — Finance-critical Unified required fields
- PR #50 — CSV row-shape validation

## 3. Completed product state — do not redo

#20 Production cumulative acceptance is complete.

The existing product already includes:

- Dashboard / Analytics
- Ad Manager local drill-down
- Suggestions local review/staging
- Rules local evaluation where supported
- Action Center / Change Log
- Cerebro / Keyword Tracker / Keyword and Negative libraries
- Conflict Guard / Protected Keywords
- Unified Transaction analytics
- Ads and Unified CSV browser-local import/persistence
- Local Data Operations / Data Health
- Store workspace management
- mobile/responsive hardening
- keyboard accessibility hardening

Store truth remains:

- Store 01 has the accepted loaded/test dataset
- Store 02 / Store 03 remain `No data`
- custom Store workspaces are browser-local metadata only
- local `Staged` / `Approved` does not mean executed on Amazon

## 4. Current Cloudflare / security state

Production Worker:

`amazon-keyword-intelligence`

Production URL:

`https://amazon-keyword-intelligence.tanshiyuesir.workers.dev/`

Architecture:

- Workers Static Assets
- Worker API
- D1 `DB`
- R2 `DATA`
- GitHub `main` -> Cloudflare Workers Builds -> Wrangler deploy

### Existing Access configuration — preserve, do not continue acceptance

A Worker-level Cloudflare Access application already exists for the Production Worker.

Known configuration from the last successful Cloudflare read:

- Access app: `amazon-keyword-intelligence production access`
- app id: `de10640f-a231-4829-ad2b-164362756666`
- audience: `96cb83b4c8dbc5a40fa7ab4a6104f546e05035814943bd7d5b76cf251095eb64`
- team domain: `https://tanshiyuesir.cloudflareaccess.com`
- policy: owner-only allow for `tanshiyuesir@gmail.com`
- `ACCESS_TEAM_DOMAIN` and `ACCESS_POLICY_AUD` are configured
- `AMAZON_API_MODE=disabled`

The Access/JWT foundation remains fail-closed. Do not perform login/session acceptance while the owner freeze is active.

### Membership state

Migration `0002_access_memberships.sql` was applied previously.

Last verified counts before the auth freeze:

```text
access_users = 0
store_memberships = 0
```

Keep them unbootstrapped while authentication is frozen.

## 5. Current Worker runtime boundary

`src/worker.js` was not wired to the new server persistence pipeline by PRs #42–#50.

The Worker business surface remains GET/HEAD-only. Non-GET/HEAD requests remain `405 Method Not Allowed`.

Existing read routes include:

- `/api/health`
- `/api/data/manifest`
- `/api/data/seed.js`
- `/api/data/unified-seed.js`
- `/api/private/session` — existing fail-closed canary; **do not run auth acceptance while frozen**

There is no anonymous mutable business API.

## 6. Non-auth server persistence foundation now merged

### D1 migration in repository

`migrations/0003_dataset_versions.sql` defines:

- `dataset_versions` — immutable dataset version metadata
- `dataset_current` — per-Store/per-kind current pointer
- composite `(dataset_id, store_id, kind)` integrity binding
- indexes for Store/kind/version lookup
- `deployment_meta.schema_version = 3`

PR #47 verified the migration sequence with SQLite and proved a Store-A current pointer cannot reference a Store-B dataset version.

### Persistence primitive

`src/dataset-persistence.js` provides:

- strict dataset descriptor validation
- Store/kind-scoped immutable R2 keys
- R2 conditional create using `If-None-Match: *`
- SHA-256 checksum enforcement on `put()`
- verification of returned R2 object `size`
- verification of returned R2 `checksums.sha256`
- D1 `batch()` promotion of version metadata + current pointer
- current metadata lookup joined on dataset + Store + kind
- current R2 object restore with actual size/SHA-256 and custom metadata consistency checks

Safe failure order is:

```text
validate
-> immutable R2 write
-> verify actual R2 size + SHA-256
-> D1 transactional version/current promotion
```

A D1 failure may leave an unreachable immutable R2 orphan, but cannot promote a broken current pointer. An R2 size/checksum mismatch is rejected before any D1 batch.

### Import validation

`src/import-validation.js` provides fail-closed validation for:

- Amazon Ads Search Term CSV
- Amazon Unified Transaction CSV
- required Ads fields
- Finance-critical Unified fields
- malformed CSV
- invalid UTF-8
- empty imports
- inconsistent nonblank CSV row widths
- exact raw-byte SHA-256

Real fixture acceptance is covered by tests:

- Ads: 8753 rows / 45 fields
- Unified: 3643 rows / 32 fields

Incomplete pseudo-Unified files and truncated Ads/Unified rows fail closed.

### Validate-first pipeline

`src/import-pipeline.js` composes only existing primitives:

```text
validateImportBody()
-> persistAcceptedDataset()
```

Tests prove invalid input performs zero R2 writes and zero D1 batches.

None of these modules are wired into a public Worker mutation route.

## 7. Current Cloudflare blocker — remote migration only

In the latest continuation the user explicitly invoked the Cloudflare connector, but the chat runtime did not expose a Cloudflare executable resource through the connector layer.

This is a connector/tool-availability condition, not a login/authentication gate and not evidence of a Cloudflare runtime failure.

Because Cloudflare execution was unavailable, `migrations/0003_dataset_versions.sql` has **not yet been applied or verified remotely** in this continuation.

Do not claim remote schema v3 until it is actually applied and verified.

When Cloudflare execution becomes available, the next safe non-auth Cloudflare action is:

1. read current D1 state
2. apply the authoritative exact-main `0003_dataset_versions.sql`
3. verify `dataset_versions` exists and is empty
4. verify `dataset_current` exists and is empty
5. verify `deployment_meta.schema_version = 3`
6. verify `access_users = 0`
7. verify `store_memberships = 0`

Do **not** insert any user/membership rows during this step.

## 8. What remains before auth is resumed

Continue only work that does not require a user identity or authorization acceptance.

The core internal server import/persistence/restore invariants are now prepared and tested. Runtime write/read wiring must not create an anonymous mutable endpoint. If a remaining task requires deciding who may read/write a Store, stop that task at the internal helper boundary until the owner explicitly resumes authentication.

Do not use D1 direct writes or fabricated identities to simulate browser acceptance.

## 9. Permanent Amazon boundary

Keep:

```text
AMAZON_API_MODE = disabled
```

Do not:

- start Amazon OAuth
- call Amazon Ads API
- call SP-API
- store Amazon credentials
- bind live advertisers
- execute staged local actions against Amazon

## 10. Resume condition for authentication

Authentication/login verification resumes **only** after the owner explicitly asks for it.

At that future point, continue from the existing foundation rather than rebuilding it:

- real `/api/private/session`
- canonical Access `sub`
- exact intended-owner bootstrap for `store-a`
- authorization acceptance
- only then wire protected runtime persistence routes

Until then, leave this lane frozen and keep #17 open.
