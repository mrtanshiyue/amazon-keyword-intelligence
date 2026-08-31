# KeywordOS — Current Authoritative Handoff

**Updated:** 2026-08-31 (Asia/Singapore)  
**Repository:** `mrtanshiyue/amazon-keyword-intelligence`

This is the single authoritative handoff for the next conversation. Do not use retired V5/V6/V7/V8/V9 notes as current product state.

## 1. Next conversation: execute directly

Continue:

**KeywordOS #20 Full Product Completion — exact-main Cloudflare Build + Production Cumulative Acceptance Finalization**

Do not restart product analysis.  
Do not redesign the UI.  
Do not redo Local Data Operations, Store Workspace, Control Completion, Shell Truth, Mobile Hardening or Keyboard Accessibility.  
Do not resume authentication/server-side persistence yet.  
Do not enable Amazon Ads API/OAuth.  
Do not add Worker mutation endpoints.  
Do not fabricate Cloudflare Build or Production-browser evidence.

The only remaining product lane is:

> Verify the latest authoritative `main` is the exact Cloudflare Workers Build/deployment source, confirm the Build succeeds, run cumulative Production browser acceptance, then close #20 only if every acceptance gate passes. After #20 is formally accepted, resume #17.

## 2. GitHub authoritative state

Product baseline immediately before this docs-only cleanup:

`78d69cde0d49578ca7a7a3c690e9b17e490ee5d1`

That baseline already contains all product work through:

- PR #29 — Local Data Operations
- PR #30 — Store Workspace / Store Management
- PR #31 — Control Completion
- PR #32 — Shell Truth Completion
- PR #33 — Mobile Hardening Final
- PR #34 — Keyboard Accessibility Final

This documentation cleanup branch is intentionally docs-only. At the start of the next conversation, read current `main` and treat the merge commit of this cleanup PR as authoritative if it has landed.

Expected repository state after cleanup:

- #20: OPEN until final Production acceptance
- #17: OPEN but explicitly DEFERRED
- Amazon API mode: disabled
- no open product PRs other than this docs-cleanup PR while it is being finalized

## 3. Completed product state — do not redo

### Local data / persistence

- Ads CSV local import is real.
- Unified Transaction local import is real.
- intended browser workspace persistence is implemented.
- Local Data Operations validates current browser datasets; it does not fake live Amazon sync.

### Store truth

- Store 01 has the real loaded/test dataset.
- Store 02 / Store 03 remain `No data`.
- local Store workspace metadata can be created/edited without claiming Amazon connection.
- Amazon connection/advertiser/live-sync semantics are explicitly disabled/deferred.

### Advertising workflows

- Ad Manager / Analytics local drill-down and bulk Open behavior are completed.
- Suggestions local search/select/batch staging is completed.
- Action Center local search/status lifecycle is completed.
- supported local structured rules stage decisions locally.
- Dayparting hourly execution remains dependency-disabled; local schedule drafts are truthful.

### Finance

- Unified Finance tabs, filters, pagination, exports and drill-downs are implemented from imported data.
- unsupported Settlement drawer behavior is not presented as a working action.

### UI truth / mobile / accessibility

- shell copy reflects local/browser capability, not fake live connectivity.
- mobile/narrow layout hardening is merged.
- dynamic entity/toggle actions are keyboard reachable with Enter/Space.
- table checkbox labeling and toast live-region support are merged.

## 4. Cloudflare / Production

Production Worker:

`amazon-keyword-intelligence`

Production URL:

`https://amazon-keyword-intelligence.tanshiyuesir.workers.dev/`

Architecture:

- Workers Static Assets
- Worker read-only API
- D1 metadata
- R2 public-test datasets
- GitHub `main` → Cloudflare Workers Builds → Wrangler deploy

`npm run build` currently publishes 12 browser application assets and does **not** publish seed-data source files or raw CSVs.

Current Worker business surface is GET/HEAD-only. `AMAZON_API_MODE=disabled` must remain unchanged.

### Previous blocker

The last session could discover the Cloudflare connector but execution calls intermittently returned `Resource not found`. This was treated as a connector/tool failure, **not** as a Cloudflare Build failure.

Do not assume Build success from historical runs. Read the latest Build for the current exact `main`.

## 5. Final #20 acceptance sequence

Execute in this order:

1. **Read-only drift check once**
   - current GitHub `main`
   - #20 still OPEN
   - #17 still DEFERRED
   - no unexpected open product PR

2. **Cloudflare exact-main verification**
   - locate latest Workers Build for `amazon-keyword-intelligence`
   - confirm its commit SHA equals current GitHub `main`
   - confirm build command/check/build/deploy outcome is successful
   - do not manually deploy an older SHA

3. **Production runtime/basic API acceptance**
   - Production root renders
   - `/api/health` works
   - `/api/data/manifest` works
   - data seed routes work
   - Amazon API mode remains disabled
   - no mutable Worker business API is exposed

4. **Production cumulative browser acceptance**
   Cover at minimum:
   - Global read-only boundary
   - Store 01 workspace
   - Store 02/03 No-data truth
   - Dashboard
   - Ad Manager
   - Analytics
   - Suggestions
   - Rules & Automation
   - Action Center / Change Log
   - Cerebro / Tracker / Keyword Library / Negative Library / Conflict Guard
   - Unified Finance
   - Ads/Unified import + reload persistence where browser testing safely permits
   - Local Data Operations / Data Health
   - Store management truth
   - desktop viewport
   - narrow/mobile viewport
   - keyboard focus/activation for dynamic actions
   - no false Connected / Live / Sync / Executed semantics

5. **Closure rule**
   - If any confirmed product defect remains, fix only that root cause through a narrow PR and repeat exact-main acceptance.
   - If all gates pass, record evidence on #20 and close #20 as completed.
   - Only then resume #17.

## 6. #17 security phase — frozen until #20 closes

Issue #17 already contains dormant fail-closed foundations:

- Access JWT verification helpers
- read-only `/api/private/session`
- D1 membership schema
- read-only per-store authorization helpers

While #17 is deferred, do not:

- configure Production Cloudflare Access
- bootstrap memberships
- add mutable server-side import endpoints
- create anonymous Worker writes
- enable Amazon OAuth/API

## 7. Documentation policy after this cleanup

Root documentation intended to remain authoritative:

- `README.md`
- `CURRENT_HANDOFF.md`
- `CLOUDFLARE_ARCHITECTURE.md`
- `P0_DATA_BOUNDARY.md`

Retired V5/V6/V7/V8/V9 stage documents are deliberately removed because they contained historical implementation assumptions and stale acceptance claims.
