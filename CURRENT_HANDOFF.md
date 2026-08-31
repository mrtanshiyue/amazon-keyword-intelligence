# KeywordOS — Current Authoritative Handoff

**Updated:** 2026-08-31 (Asia/Singapore)  
**Repository:** `mrtanshiyue/amazon-keyword-intelligence`

This is the single authoritative continuation checkpoint. Retired V5/V6/V7/V8/V9 notes and older #20 handoffs are historical only.

## 1. Next conversation: execute directly

Continue:

**Amazon Keyword Intelligence — #17 auth-frozen continuation**

The non-auth server persistence foundation is now **GITHUB + D1 READY**. There is no remaining non-auth persistence implementation or remote-migration gate to invent work for.

Do not restart product analysis.  
Do not redo #20.  
Do not redesign the UI.  
Do not recreate Worker / D1 / R2.  
Do not enable Amazon Ads API/OAuth/SP-API.  
Do not expose anonymous mutable Worker routes.  
Do not add speculative persistence features merely to keep development moving.

### Authentication/login verification remains frozen

The owner explicitly instructed that login/authentication verification must remain frozen until the rest of the project is complete and the owner explicitly asks to resume it.

Until that explicit instruction arrives, do **not**:

- run `/api/private/session` acceptance
- request or capture a canonical Cloudflare Access `sub`
- bootstrap `access_users`
- bootstrap `store_memberships`
- perform owner/unrelated/cross-store/role authorization acceptance
- add a public bootstrap endpoint
- replace or extend the existing Access/JWT foundation
- treat the frozen auth lane as a blocker for unrelated owner-directed product work

Preserve the existing Access configuration and fail-closed auth code.

## 2. GitHub authoritative state

Authoritative main before this final docs-only synchronization:

`9d8f5543fc60b6f2e8dac841bc888425c0cedc03`

At the start of a future conversation, read current `main` and use the latest merge commit if this final docs update has landed.

Issue state:

- **#20 — CLOSED / COMPLETED**. Do not reopen or rerun it.
- **#17 — OPEN**.
- #17 non-auth server persistence foundation: **GITHUB + D1 READY**.
- #17 remote D1 migration `0003`: **APPLIED / VERIFIED**.
- #17 authentication/login acceptance: **FROZEN BY OWNER**.
- Amazon API/OAuth/SP-API: **HARD-OFF**.

Merged non-auth work includes PRs #42, #43, #44, #45, #47, #48, #49, #50, #52, #53 and docs synchronization PR #54.

A final narrow audit after #53 found no additional clear non-auth P1/P2 persistence defect. Do not keep adding speculative validation or abstractions merely to continue coding.

## 3. Completed non-auth persistence work

### PR #42 — Versioned Dataset Persistence Foundation

- `migrations/0003_dataset_versions.sql`
- `dataset_versions`
- `dataset_current`
- immutable/versioned R2 object model
- Store/kind-scoped object key
- `If-None-Match: *`
- SHA-256 write enforcement
- D1 version metadata + current pointer promotion

### PR #43 — Server-side Import Validation

- Amazon Ads Search Term required fields
- Unified Transaction validation
- malformed CSV fail-closed
- invalid UTF-8 fail-closed
- empty import fail-closed
- raw-byte SHA-256
- authoritative fixtures: Ads 8753 rows / 45 fields; Unified 3643 rows / 32 fields

### PR #44 — Validate-first Pipeline

```text
validateImportBody()
-> persistAcceptedDataset()
```

Invalid input performs zero R2 writes and zero D1 batches.

### PR #45 — Current Dataset Restore Integrity

- D1 current/version lookup
- exact R2 object restore
- missing-object fail-closed
- size/metadata integrity

### PR #47 — Store / Kind Current Pointer Integrity

- composite `(dataset_id, store_id, kind)` binding
- Store/kind-safe current lookup
- SQLite migration acceptance `0001 -> 0002 -> 0003`
- deliberate Store-A -> Store-B pointer violation correctly rejected by FK

### PR #48 — Actual R2 Size + SHA-256 Integrity

- verify returned `R2Object.size`
- verify returned `R2Object.checksums.sha256`
- reject mismatch before D1 promotion
- repeat actual R2 size/SHA verification during restore

### PR #49 — Finance-critical Unified Fields

Require the finance/ledger fields actually used by the product rather than accepting a three-column pseudo-Unified file.

### PR #50 — CSV Row Shape Validation

Every nonblank data row must have the same field count as the header; truncated/overwide rows fail closed.

### PR #52 — Buffered Import Size Bound

`MAX_IMPORT_BYTES = 16 MiB`.

Current fixture sizes:

- Ads: `3,202,495` bytes
- Unified: `1,566,578` bytes

Do not simply raise this limit indefinitely. If real reports outgrow it, move large imports to a streaming parser.

### PR #53 — Complete R2 Custom Metadata Integrity

One shared integrity helper verifies:

- size
- stored SHA-256
- dataset id
- Store id
- kind
- source file
- row count
- custom SHA-256

The same helper runs after R2 put before D1 promotion and again during current dataset restore.

## 4. Production D1 schema v3 — applied and verified

Production D1:

```text
amazon-keyword-intelligence-db
e38981da-fbeb-412e-ac8c-936bf16adb36
```

The migration used was read directly from authoritative exact-main `9d8f5543fc60b6f2e8dac841bc888425c0cedc03`:

```text
migrations/0003_dataset_versions.sql
```

### Read-only preflight

Before migration:

```text
dataset_versions = absent
dataset_current = absent
deployment_meta.schema_version = 1
access_users = 0
store_memberships = 0
```

### Migration

Exact-main `0003_dataset_versions.sql` was applied successfully to Production D1.

### Postflight

Verified after migration:

```text
dataset_versions exists, count = 0
dataset_current exists, count = 0
idx_dataset_versions_store_kind_imported exists
idx_dataset_current_dataset exists
deployment_meta.schema_version = 3
access_users = 0
store_memberships = 0
```

No `access_users` or `store_memberships` rows were inserted. No owner bootstrap or identity acceptance occurred.

The non-auth persistence foundation is therefore:

```text
GITHUB + D1 READY
```

## 5. Import validation prepared

`src/import-validation.js` currently enforces:

- supported kinds: Ads Search Term / Unified Transaction
- required Ads report fields
- Finance-critical Unified fields
- malformed CSV rejection
- invalid UTF-8 rejection
- empty input rejection
- exact row-width consistency for nonblank rows
- exact raw-byte SHA-256
- `MAX_IMPORT_BYTES = 16 MiB`

Current authoritative fixture sizes:

- Ads: `3,202,495` bytes — 8753 rows / 45 fields
- Unified: `1,566,578` bytes — 3643 rows / 32 fields

## 6. Persistence and restore integrity prepared

`src/import-pipeline.js` remains minimal:

```text
validateImportBody()
-> persistAcceptedDataset()
```

`src/dataset-persistence.js` enforces:

- Store/kind-scoped immutable R2 keys
- `If-None-Match: *` create-only writes
- SHA-256 supplied to R2 `put()`
- returned R2 size verification
- returned R2 stored SHA-256 verification
- complete R2 custom metadata verification
- D1 `batch()` version/current promotion only after R2 integrity passes
- current metadata lookup joined on dataset + Store + kind
- the same R2 integrity checks again on restore

Safe order:

```text
validate
-> immutable R2 write
-> verify actual R2 object metadata
-> D1 transactional version/current promotion
```

A D1 failure may leave an unreachable immutable R2 orphan, but cannot promote a broken current pointer.

## 7. Current Worker runtime boundary

`src/worker.js` has not been wired to the persistence pipeline.

The Worker business surface remains GET/HEAD-only. Non-GET/HEAD requests remain `405 Method Not Allowed`.

Existing read routes include:

- `/api/health`
- `/api/data/manifest`
- `/api/data/seed.js`
- `/api/data/unified-seed.js`
- `/api/private/session` — existing fail-closed canary; do not run auth acceptance while frozen

There is no anonymous mutable business API.

Do not add `POST /api/import`, `POST /api/data`, `PUT /api/*`, `PATCH /api/*`, or any other public mutable business route while authentication remains frozen.

## 8. Existing Cloudflare Access state — preserve only

Known Production Access configuration from the last successful read:

- Access app: `amazon-keyword-intelligence production access`
- app id: `de10640f-a231-4829-ad2b-164362756666`
- audience: `96cb83b4c8dbc5a40fa7ab4a6104f546e05035814943bd7d5b76cf251095eb64`
- team domain: `https://tanshiyuesir.cloudflareaccess.com`
- owner-only policy for `tanshiyuesir@gmail.com`
- `ACCESS_TEAM_DOMAIN` configured
- `ACCESS_POLICY_AUD` configured
- `AMAZON_API_MODE=disabled`

Migration `0002_access_memberships.sql` was applied previously.

Current verified auth table counts after the D1 v3 migration remain:

```text
access_users = 0
store_memberships = 0
```

Keep those tables unbootstrapped while authentication is frozen.

## 9. Non-auth phase stop condition reached

The previous non-auth continuation required:

```text
docs-only GitHub synchronization merged
+
remote D1 0003 applied and verified
```

Both conditions are now satisfied.

Therefore:

- do not invent new persistence work
- do not wire protected runtime Store read/write routes yet
- do not start authentication acceptance
- wait for the owner's next explicit product task, or an explicit instruction to resume authentication

This does **not** mean #17 is complete. #17 remains OPEN because its authentication/authorization lane is intentionally frozen.

## 10. Completed product state — do not redo

#20 Production cumulative acceptance is complete. Existing product work already includes:

- Dashboard / Analytics
- Ad Manager local drill-down
- Suggestions local review/staging
- supported local Rules evaluation
- Action Center / Change Log
- Cerebro / Keyword Tracker / Keyword and Negative libraries
- Conflict Guard / Protected Keywords
- Unified Transaction analytics
- Ads and Unified CSV browser-local import/persistence
- Local Data Operations / Data Health
- Store workspace management
- mobile/responsive hardening
- keyboard accessibility hardening

Store truth:

- Store 01 has the accepted loaded/test dataset
- Store 02 / Store 03 remain `No data`
- custom Store workspaces are browser-local metadata only
- local `Staged` / `Approved` never means executed on Amazon

## 11. Permanent Amazon boundary

Keep:

```text
AMAZON_API_MODE = disabled
```

Do not start Amazon OAuth, call Amazon Ads API/SP-API, store Amazon credentials, bind live advertisers, or execute staged local actions against Amazon.

## 12. Authentication resume condition

Authentication/login verification resumes **only** after the owner explicitly asks for it.

At that future point, continue from the existing foundation rather than rebuilding it:

- real `/api/private/session`
- canonical Access `sub`
- exact intended-owner bootstrap for `store-a`
- authorization acceptance
- only then wire protected runtime persistence routes

Until then, leave this lane frozen and keep #17 open.
