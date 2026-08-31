# KeywordOS — Current Authoritative Handoff

**Updated:** 2026-08-31 (Asia/Singapore)  
**Repository:** `mrtanshiyue/amazon-keyword-intelligence`

This is the single authoritative continuation checkpoint. Retired V5/V6/V7/V8/V9 notes and older #20 handoffs are historical only.

## 1. Next conversation: execute directly

Continue:

**Amazon Keyword Intelligence — #17 remote non-auth persistence finalization**

Do not restart product analysis.  
Do not redo #20.  
Do not redesign the UI.  
Do not recreate Worker / D1 / R2.  
Do not enable Amazon Ads API/OAuth/SP-API.  
Do not expose anonymous mutable Worker routes.

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
- treat the frozen auth lane as a blocker for independent non-auth work

Preserve the existing Access configuration and fail-closed auth code.

## 2. GitHub authoritative state

Authoritative product main before this docs-only synchronization:

`568b21c64f413eafbf4fa7e0d2db4c5d20561fb1`

At the start of a future conversation, read current `main` and use the latest merge commit if this docs update has landed.

Issue state:

- **#20 — CLOSED / COMPLETED**. Do not reopen or rerun it.
- **#17 — OPEN**.
- #17 non-auth code foundation: **READY**.
- #17 remote D1 migration `0003`: **PENDING**.
- #17 authentication/login acceptance: **FROZEN BY OWNER**.
- Amazon API/OAuth/SP-API: **HARD-OFF**.

There are no open PRs after PR #53 merged.

## 3. Completed non-auth persistence work

Merged work:

- PR #42 — versioned dataset persistence foundation
- PR #43 — server-side import validation
- PR #44 — validate-first import persistence pipeline
- PR #45 — current dataset restore integrity
- PR #47 — Store/kind current-pointer integrity
- PR #48 — actual R2 object size/SHA-256 integrity
- PR #49 — Finance-critical Unified required fields
- PR #50 — CSV row-shape validation
- PR #52 — bounded buffered import size
- PR #53 — complete R2 custom-metadata integrity

A final narrow audit after #53 found no additional clear non-auth P1/P2 persistence defect. Do not keep adding speculative validation or abstractions merely to continue coding.

## 4. D1 schema prepared in repository

`migrations/0003_dataset_versions.sql` defines:

- `dataset_versions` — immutable dataset version metadata
- `dataset_current` — per-Store/per-kind current pointer
- composite `(dataset_id, store_id, kind)` integrity binding
- Store/kind/version lookup indexes
- `deployment_meta.schema_version = 3`

PR #47 validated `0001 -> 0002 -> 0003` with SQLite and proved a Store-A current pointer cannot reference a Store-B dataset version.

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

The 16 MiB limit is over 5x the current largest fixture and exists because the current parser buffers bytes/text/rows in memory. Raise it only after moving large imports to a streaming parser.

## 6. Persistence and restore integrity prepared

`src/import-pipeline.js` remains minimal:

```text
validateImportBody()
-> persistAcceptedDataset()
```

Invalid input performs zero R2 writes and zero D1 batches.

`src/dataset-persistence.js` enforces:

- Store/kind-scoped immutable R2 keys
- `If-None-Match: *` create-only writes
- SHA-256 supplied to R2 `put()`
- verification of returned R2 size
- verification of returned R2 stored SHA-256
- verification of all R2 custom metadata:
  - dataset id
  - Store id
  - kind
  - source file
  - row count
  - custom SHA-256
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

`src/worker.js` has not been wired to the new persistence pipeline.

The Worker business surface remains GET/HEAD-only. Non-GET/HEAD requests remain `405 Method Not Allowed`.

Existing read routes include:

- `/api/health`
- `/api/data/manifest`
- `/api/data/seed.js`
- `/api/data/unified-seed.js`
- `/api/private/session` — existing fail-closed canary; do not run auth acceptance while frozen

There is no anonymous mutable business API.

## 8. Existing Cloudflare Access state — preserve only

Known Production Access configuration from the last successful Cloudflare read:

- Access app: `amazon-keyword-intelligence production access`
- app id: `de10640f-a231-4829-ad2b-164362756666`
- audience: `96cb83b4c8dbc5a40fa7ab4a6104f546e05035814943bd7d5b76cf251095eb64`
- team domain: `https://tanshiyuesir.cloudflareaccess.com`
- owner-only policy for `tanshiyuesir@gmail.com`
- `ACCESS_TEAM_DOMAIN` configured
- `ACCESS_POLICY_AUD` configured
- `AMAZON_API_MODE=disabled`

Migration `0002_access_memberships.sql` was applied previously.

Last verified auth table counts:

```text
access_users = 0
store_memberships = 0
```

Keep those tables unbootstrapped while authentication is frozen.

## 9. Only remaining non-auth external gate: remote D1 0003

In the latest conversation the user explicitly invoked the Cloudflare connector, but the chat runtime exposed no executable Cloudflare resource. This is connector/tool availability, not an authentication gate and not evidence of a Cloudflare runtime failure.

Therefore `migrations/0003_dataset_versions.sql` has **not yet been applied or verified remotely** in this continuation.

When Cloudflare execution becomes available, do exactly:

1. read current D1 state
2. apply authoritative exact-main `0003_dataset_versions.sql`
3. verify `dataset_versions` exists and is empty
4. verify `dataset_current` exists and is empty
5. verify `deployment_meta.schema_version = 3`
6. verify `access_users = 0`
7. verify `store_memberships = 0`

Do **not** insert any user/membership rows during this step.

After these checks pass, the non-auth persistence foundation is remotely finalized. Do not wire runtime Store read/write routes while authentication remains frozen.

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
