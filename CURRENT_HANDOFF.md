# KeywordOS — Current Authoritative Handoff

**Updated:** 2026-09-01 (Asia/Singapore)  
**Repository:** `mrtanshiyue/amazon-keyword-intelligence`

This is the single authoritative continuation checkpoint for Amazon Keyword Intelligence / KeywordOS.

## 1. Start every future conversation this way

Do one short read-only drift check first:

1. Read the repository's current `main` SHA.
2. Treat current `main` as authoritative.
3. Read this file plus Issue #17 for continuation rules/state; do not restart from historical V5/V6/V7/V8/V9 handoffs.
4. If current `main` is newer only because of docs synchronization, keep the verified product baseline below as the last product-code checkpoint.

Verified product baseline immediately before this documentation synchronization:

`22517172eca251703d028d081fb7c9466d9404be` — PR #79

Acceptance on that exact product baseline:

- GitHub `check-and-build`: **PASS**
- Cloudflare Production Workers Build: **PASS**
  - Build ID: `c78fafaa-84d1-4a00-b917-0228783ac247`
  - Version ID: `4a3b6f0e-4782-4336-b2ea-9ec71c7ea0e7`
- GitHub-only `/cloudflare status` acceptance on Issue #63: **PASS**
  - latest accepted run: `33454956950`

Do not pin future work to this SHA when current `main` is newer. Always read current `main` first.

## 2. Permanent owner boundaries

### Authentication / Cloudflare Access acceptance is FROZEN

Until the owner explicitly resumes authentication/login verification, do **not**:

- run `/api/private/session` authentication acceptance
- request/capture canonical Cloudflare Access `sub`
- bootstrap `access_users`
- bootstrap `store_memberships`
- run intended-owner, unrelated-identity, cross-store, or role authorization acceptance
- add login UI or username/password authentication
- fabricate identity or use D1 membership writes to simulate acceptance
- replace or extend the existing Access/JWT foundation
- reopen auth merely because anonymous runtime smoke reaches the external redirect gate

Preserve the existing fail-closed Access/JWT foundation unchanged.

### Amazon remains HARD-OFF unless separately authorized

Keep:

```text
AMAZON_API_MODE = disabled
```

Do not start Amazon OAuth, Amazon Ads API, SP-API, credential storage, live advertiser binding, automatic report sync, Amazon listing publishing, campaign mutation, bid mutation, or budget mutation.

### No anonymous mutable Worker API

Current business surface remains GET/HEAD-only. Do not add anonymous mutable routes such as:

```text
POST /api/import
POST /api/data
PUT /api/*
PATCH /api/*
```

The prepared server persistence pipeline remains intentionally unwired to runtime while authentication is frozen.

## 3. Major completed areas — do not redo

`#20` is **CLOSED / COMPLETED**. Do not reopen or rerun it.

Do not restart or redesign completed foundations without new evidence:

- Dashboard / Analytics
- Ad Manager
- Suggestions except a newly evidenced defect
- Local Data / Data Health
- Store Workspace / Store Management
- Users truth
- Amazon Connections truth
- mobile/responsive baseline
- accessibility baseline
- suite navigation / suite homes / URL page history
- first-class Listing preparation workspace
- existing Access/JWT foundation
- D1 migration `0003`
- Worker / D1 / R2 resource creation
- persistence architecture
- authorization architecture

Do not introduce React/Vue, a second persistence system, a second authorization system, a new routing framework, or speculative service/repository/factory layers merely to continue coding.

## 4. Non-auth server persistence foundation — COMPLETE

Status:

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

## 6. Product integrity and workspace UX completed while auth is frozen

Merged hardening / UX work:

- #56 — shell productivity controls: sidebar collapse, global page search, page help, notification truth
- #57 — minimal repository CI
- #58 — local workspace resilience + synthetic Budget/hourly/default-schedule truth cleanup
- #59 — Amazon Ads import value integrity
- #60 — Unified Transaction value integrity
- #61 — loaded-data recency awareness
- #62 — Bid Suggestions source truth: real positive imported Target Bid only
- #65 — backup restore value integrity for normalized Ads/Unified rows
- #68 — Cloudflare architecture/data-boundary docs synchronized to verified D1 v3 and GitHub-only Ops truth
- #69 — persisted IndexedDB dataset startup integrity, including strict numeric non-negative Ads `bid`
- #70 — backup localStorage top-level shape validation
- #71 — live localStorage preflight repair before `app.js` initialization
- #72 — legacy-disabled top suite toolbar restored to real navigation
- #73 — truthful suite workspace launchers + horizontally usable mobile suite navigation below 900px
- #74 — lightweight `#page=...` URL history and browser Back/Forward using the existing navigation path
- #75 — async startup page-hash restore race fixed
- #76 — Listing promoted to a first-class `#page=listing-workspace` preparation page; session-only Title/Bullets/Search Terms drafts; no Amazon publishing
- #77 — Listing evidence-source truth: prefers only schema-v1 persisted Ads rows that pass the existing integrity guard; otherwise visibly labeled bundled fallback
- #78 — Listing/sidebar startup race fixed so valid non-Listing hash routes survive async startup
- #79 — Products / Keywords / Marketing / Operations / Analytics promoted from modal launchers to stable first-class main-workspace suite homes; suite homes participate in existing hash/history routing; Listing remains its dedicated first-class page

### Current top-level suite behavior

The six suite entries are now real first-class navigation surfaces:

- **Products** — first-class suite home, links only to existing truthful product/store workspace capabilities
- **Keywords** — first-class suite home, links to existing keyword intelligence workspaces
- **Listing** — first-class preparation workspace using validated Ads evidence where available; draft-only, no publishing
- **Marketing** — first-class suite home for existing advertising workflows
- **Operations** — first-class suite home for existing data/finance operating workflows
- **Analytics** — first-class suite home for existing analytics surfaces

The suite bar remains available on narrower screens through horizontal navigation instead of being hidden.

## 7. GitHub-only Cloudflare operations

Basic Cloudflare observability does not require a standalone ChatGPT Cloudflare connector.

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

Latest accepted exact-main run on the product baseline: `33454956950` — **SUCCESS**.

The workflow emits PASS/FAIL only and must not print token values, account IDs, resource IDs/names, database contents, bucket contents, or application data.

This path is **read-only observability**. Do not silently extend it into:

- Cloudflare Access identity/session acceptance
- Access app/policy writes
- deployment mutation
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
- Listing draft text is session-only and never means it was published to Amazon

## 9. Runtime boundary

`src/worker.js` is still not wired to the prepared persistence pipeline.

Existing read-only routes include:

- `/api/health`
- `/api/data/manifest`
- `/api/data/seed.js`
- `/api/data/unified-seed.js`
- `/api/private/session` — existing fail-closed canary; do not run auth acceptance while frozen

Anonymous runtime smoke may reach the external redirect gate before product HTML/static assets. Do not pursue identity/authentication through that gate while the owner freeze remains active.

## 10. Current execution rule

Continue only **evidenced P1/P2 product defects or operator-usability regressions** that can be completed truthfully from existing imported/local data without authentication, Amazon API access, or anonymous mutable server routes.

Good audit targets:

- data correctness and source lineage
- restore/import integrity
- local-state consistency and recovery
- suite home / sidebar / URL-history consistency
- Listing evidence and draft-state truth
- mobile/operator usability regressions
- regression coverage around already-supported local workflows
- hardcoded performance/money/state values only when not already neutralized by truth layers

The suite/Listing optimization phase through #79 is complete. Do not keep changing those surfaces without a demonstrated usability or correctness defect.

If a targeted audit finds no real P1/P2 defect, state that the current product-hardening surface is clean and stop. Do not manufacture work.

## 11. Known repository administration gap

Current `main` branch protection is **not enabled** at the repository level. The available ChatGPT GitHub connector can read this state but does not currently expose the required branch-protection write operation. Do not claim protection has been configured unless it is actually enabled through a supported repository-admin path.

This is an administration gap, not a product-runtime blocker.

## 12. Authentication resume condition

`#17` remains **OPEN** only because authentication/authorization acceptance is intentionally frozen.

Authentication resumes only after the owner explicitly asks for it. At that future point continue from the existing foundation rather than rebuilding it:

```text
Cloudflare Access external configuration gate
-> /api/private/session identity acceptance
-> canonical intended-owner Access sub
-> exact Store 01 owner bootstrap
-> authorization acceptance
-> only then authenticated server-side persistence wiring
```

Until then, leave the authentication lane frozen and continue only legitimate non-auth product work.
