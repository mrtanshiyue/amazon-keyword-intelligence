# KeywordOS — Current Authoritative Handoff

**Updated:** 2026-08-31 (Asia/Singapore)  
**Repository:** `mrtanshiyue/amazon-keyword-intelligence`

This is the single authoritative continuation checkpoint for Amazon Keyword Intelligence / KeywordOS.

## 1. Start every future conversation this way

Do one short read-only drift check first:

1. Read the repository's current `main` SHA.
2. Treat current `main` as authoritative.
3. Read this file and Issue #17 only for continuation rules/state; do not restart analysis from old V5/V6/V7/V8/V9 handoffs.
4. If current `main` is newer than the verified product baseline below only because of documentation synchronization, do not mistake that docs-only SHA change for new product work.

Verified product baseline immediately before this handoff synchronization:

`09d3ad9353395f7a4031a2518bafebeb84a98e16`

That baseline passed:

- GitHub `check-and-build`
- Cloudflare Production Workers Build
  - Build ID: `0e3f7490-84bb-44eb-bd6f-eecfdb7ad961`
  - Version ID: `1e64a5b2-419e-4068-bb2e-3e3b521f7533`
- GitHub-only `/cloudflare status` acceptance on Issue #63

Do not pin future work to the baseline SHA when current `main` is newer. Always read current `main` first.

## 2. Permanent owner boundaries

### Authentication / Cloudflare Access acceptance is FROZEN

Until the owner explicitly resumes authentication/login verification, do **not**:

- run `/api/private/session` authentication acceptance
- request or capture canonical Cloudflare Access `sub`
- bootstrap `access_users`
- bootstrap `store_memberships`
- run intended-owner, unrelated-identity, cross-store, or role authorization acceptance
- add login UI or username/password authentication
- fabricate identity or use D1 membership writes to simulate acceptance
- replace or extend the existing Access/JWT foundation
- treat the external redirect gate as a reason to reopen authentication work

Preserve the existing fail-closed Access/JWT foundation unchanged.

### Amazon is permanently HARD-OFF unless separately authorized

Keep:

```text
AMAZON_API_MODE = disabled
```

Do not start Amazon OAuth, Amazon Ads API, SP-API, credential storage, live advertiser binding, automatic report sync, or Amazon mutation.

### No anonymous mutable Worker API

Current business surface remains GET/HEAD-only. Do not add anonymous mutable routes such as:

```text
POST /api/import
POST /api/data
PUT /api/*
PATCH /api/*
```

The prepared server persistence pipeline remains intentionally unwired to runtime while authentication is frozen.

## 3. Completed work — do not redo

`#20` is **CLOSED / COMPLETED**. Do not reopen or rerun it.

Do not redo or redesign:

- Dashboard / Analytics
- Ad Manager
- Suggestions already completed except a newly evidenced defect
- Local Data / Data Health
- Store Workspace / Store Management
- Users truth
- Amazon Connections truth
- Mobile / responsive work
- Accessibility
- existing Access/JWT foundation
- D1 migration `0003`
- Worker / D1 / R2 resource creation
- persistence architecture
- authorization architecture

Do not introduce React/Vue, a second persistence system, a second authorization system, or speculative service/repository/factory layers merely to continue coding.

## 4. Non-auth server persistence foundation — COMPLETE

The non-auth persistence foundation is:

```text
GITHUB + D1 READY
```

Completed implementation includes:

- #42 — versioned dataset persistence foundation
- #43 — server-side import validation
- #44 — validate-first pipeline
- #45 — current dataset restore integrity
- #47 — Store/kind current-pointer integrity
- #48 — actual R2 size/SHA-256 integrity
- #49 — finance-critical Unified fields
- #50 — CSV row-shape validation
- #52 — 16 MiB buffered import bound
- #53 — complete R2 custom-metadata integrity
- #54 / #55 — authoritative documentation synchronization

Core safe order remains:

```text
validateImportBody()
-> persistAcceptedDataset()
-> immutable R2 write
-> verify actual R2 integrity
-> D1 transactional version/current promotion
```

Do not invent further persistence architecture unless a concrete defect is demonstrated.

## 5. Production D1 state

Production D1:

```text
amazon-keyword-intelligence-db
e38981da-fbeb-412e-ac8c-936bf16adb36
```

Migration `0003_dataset_versions.sql` is **APPLIED / VERIFIED**.

Verified state:

```text
dataset_versions exists, count = 0
dataset_current exists, count = 0
idx_dataset_versions_store_kind_imported exists
idx_dataset_current_dataset exists
deployment_meta.schema_version = 3
access_users = 0
store_memberships = 0
```

No owner/member bootstrap has occurred. Keep `access_users` and `store_memberships` empty while authentication is frozen.

## 6. Product hardening completed while auth is frozen

Merged work:

- #56 — shell productivity controls: sidebar collapse, global page search, current-page help, notification truth
- #57 — minimal repository CI: Node 22, `npm ci`, `npm run check`, `npm run build`
- #58 — local workspace resilience: versioned browser backup/restore, Unified import entry, synthetic Budget/hourly/default-schedule surfaces neutralized
- #59 — Amazon Ads import value integrity: malformed/negative required metrics and invalid dates rejected
- #60 — Unified Transaction value integrity: malformed nonblank finance values and invalid dates rejected while legitimate signed finance values remain supported
- #61 — loaded-data recency awareness: exact dataset age and readiness scoped to loaded period
- #62 — Bid Suggestions source truth: recommendations require a real positive imported Target Bid; no fabricated `$0.65` / `$0.60` current bid
- #65 — local backup restore value integrity: normalized Ads/Unified rows are validated before IndexedDB writes, closing the backup path around #59/#60 guards while preserving legitimate signed finance values

A targeted truth audit after #62 found the existing Budget, Dayparting, Users, Amazon Connections and Store Workspace truth layers already prevent legacy synthetic surfaces from being represented as real data. Do not reopen those areas without new evidence.

## 7. GitHub-only Cloudflare operations

The project no longer depends on a ChatGPT Cloudflare connector for basic read-only Cloudflare status checks.

Permanent channel:

- Issue #63 — `Cloudflare GitHub Ops — read-only status channel`
- PR #64 — `.github/workflows/cloudflare-readonly-ops.yml`
- exact owner command on Issue #63: `/cloudflare status`

Accepted probes:

- configured GitHub secrets present
- Cloudflare API token verify
- Workers Scripts read
- D1 databases read
- R2 buckets read

The workflow emits PASS/FAIL only and must not print token values, account IDs, resource IDs/names, database contents, bucket contents, or application data.

This path is **read-only observability**. Do not silently extend it into:

- Cloudflare Access identity/session acceptance
- Access app/policy writes
- deployments
- D1/R2 mutation
- Amazon API work

Use GitHub for project operations unless the owner explicitly changes this instruction.

## 8. Store / local data truth

Accepted loaded/test data:

```text
Store 01
Ads Search Term rows: 8,753
Unified Transaction rows: 3,643
```

Store truth:

- Store 01 has the accepted imported/test dataset
- Store 02 and Store 03 have no real data and must not display fabricated metrics
- custom Store workspace metadata is browser-local only
- local `Staged` / `Approved` states never mean an action was executed on Amazon

## 9. Runtime boundary

`src/worker.js` is still not wired to the prepared persistence pipeline.

Existing read-only routes include:

- `/api/health`
- `/api/data/manifest`
- `/api/data/seed.js`
- `/api/data/unified-seed.js`
- `/api/private/session` — existing fail-closed canary; do not run auth acceptance while frozen

Anonymous runtime smoke has previously reached an external redirect gate before KeywordOS product HTML/static assets. Do not pursue identity/authentication through that gate while the owner freeze remains active.

## 10. Current execution rule

Continue only **real P1/P2 product defects** that can be demonstrated from existing imported/local data and fixed without authentication, Amazon API access, or anonymous mutable server routes.

Good audit targets when continued product hardening is requested:

- data correctness and source lineage
- restore/import integrity
- local state consistency and recovery
- operator usability regressions
- regression coverage around already-supported local workflows
- hardcoded performance/money/state values only when not already neutralized by truth layers

If a targeted audit finds no real P1/P2 defect, state that the current product-hardening surface is clean and stop. Do not manufacture work.

## 11. Authentication resume condition

`#17` remains **OPEN** only because authentication/authorization acceptance is intentionally frozen.

Authentication resumes only after the owner explicitly asks for it. At that future point, continue from the existing foundation rather than rebuilding it:

```text
Cloudflare Access external configuration gate
-> /api/private/session identity acceptance
-> canonical intended-owner Access sub
-> exact Store 01 owner bootstrap
-> authorization acceptance
-> only then authenticated server-side persistence wiring
```

Until then, leave the authentication lane frozen and continue only legitimate non-auth product work.