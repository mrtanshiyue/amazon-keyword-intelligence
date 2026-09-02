# KeywordOS — Amazon Keyword Intelligence

KeywordOS 是一个面向 Amazon 广告、关键词、Listing 准备和经营分析的多 Store 工作台，运行在 Cloudflare Workers Static Assets + Worker API + D1 + R2 上。

> **README 同步规则（强制）**：从 `fa135d5` 起，每次推送功能代码时，必须在同一个提交或同一批推送中同步更新本 README 的“当前已完成能力”和“产品路线图”。已经通过测试并进入代码的项目改为 `[x]`；仍是界面、实验、依赖外部数据或尚未完成的项目必须保留为 `[ ]`，不得提前宣称完成。

## Current authoritative status

- Repository: `mrtanshiyue/amazon-keyword-intelligence`
- Production Worker: `amazon-keyword-intelligence`
- Production URL: `https://amazon-keyword-intelligence.tanshiyuesir.workers.dev/`
- Product completion issue #20: **CLOSED / COMPLETED**
- Security/persistence issue #17: **OPEN** only because authentication acceptance remains intentionally frozen
- Non-auth server persistence foundation: **GITHUB + D1 READY**
- Production D1 migration `0003`: **APPLIED / VERIFIED**
- Authentication/login acceptance: **FROZEN BY OWNER until explicitly resumed**
- Amazon Ads API / OAuth / SP-API: **disabled / HARD-OFF**
- Amazon remote mutation and Listing publishing: **disabled**
- GitHub-only Cloudflare read-only operations: **ACTIVE via Issue #63**

At the start of future work, always read the repository's current `main`; do not rely on a permanently embedded SHA in documentation.

Current repository feature baseline at this documentation update is the repository's current `main`; feature work is no longer pinned to the historical `fa135d5` checkpoint.

Verification rule for every new completed task:

- GitHub `check-and-build` must pass `npm run check` and `npm run build`.
- Cloudflare Workers Build must pass for the production rollout.
- Read the latest commit checks for exact run/build/version IDs rather than treating a historical SHA as a permanent acceptance baseline.

The authoritative continuation instructions are in [`CURRENT_HANDOFF.md`](./CURRENT_HANDOFF.md).

## Runtime architecture

```text
GitHub main
    │
    ▼
Cloudflare Workers Builds
    │
    ▼
┌──────────────────────────────────────────────┐
│ amazon-keyword-intelligence Worker          │
│                                              │
│ Static Assets ───────────────► KeywordOS UI │
│ /api/* ─────► Worker API                    │
│                    │                         │
│                    ├────► D1 metadata        │
│                    └────► R2 datasets        │
└──────────────────────────────────────────────┘
```

## Runtime API boundary

The current Worker business surface remains GET/HEAD-only. Non-GET/HEAD requests are rejected with `405`.

Existing read routes include:

- `GET /api/health`
- `GET /api/data/manifest`
- `GET /api/data/seed.js`
- `GET /api/data/unified-seed.js`
- `GET /api/private/session` — existing fail-closed Access canary; login/session acceptance is frozen

There is no anonymous mutable business API. The prepared server persistence modules are not wired into `src/worker.js`.

## Cloudflare Access state

A Worker-level Cloudflare Access application and owner-only allow policy already exist, with pinned `ACCESS_TEAM_DOMAIN` / `ACCESS_POLICY_AUD` runtime values.

Further login/authentication verification is intentionally frozen. Until explicitly resumed, do not run session acceptance, capture canonical Access identity, bootstrap memberships, or extend the login flow.

Existing auth code/config should be preserved, not rebuilt.

## GitHub-only Cloudflare operations

Basic Cloudflare observability does not require a standalone ChatGPT Cloudflare connector.

Issue #63 accepts the exact owner command:

```text
/cloudflare status
```

The permanent GitHub Actions workflow verifies, read-only:

- configured Cloudflare repository secrets
- API token validity
- Workers Scripts access
- D1 database access
- R2 bucket access

It emits PASS/FAIL only. It must not be silently expanded into Access identity/session acceptance, Access app/policy writes, deployment mutation, D1/R2 mutation, or Amazon API work.

## Product truth

- Global pages are analytics-only and cannot write to Amazon.
- Store 01 has the accepted loaded/test dataset: Ads Search Term `8,753` rows; Unified Transaction `3,643` rows.
- Store 02 / Store 03 remain `No data`.
- Browser-local Store workspace metadata may be created/edited without implying an Amazon connection.
- Local `Staged` / `Approved` states never mean executed on Amazon.
- Listing drafts are preparation-only and never mean published to Amazon.

Completed product workflows include Dashboard/Analytics, Ad Manager, Suggestions, supported local Rules, Action Center/Change Log, Keyword Research, Keyword Tracker, Keyword/Negative libraries, Conflict Guard, Protected Keywords, Unified Transaction analytics, browser-local Ads/Unified imports, Local Data Operations, Store management, responsive/mobile hardening, keyboard accessibility, URL page history, suite workspace homes, suite-aligned Growth navigation taxonomy, first-class Listing preparation, CSV-first Search Query Funnel, Product 360, Action Outcomes, Rank & Index Tracker, Listing Optimizer 2.0, Inventory Risk, deterministic Anomaly Center, imported competitor snapshot trends/seasonality evidence, storefront/new-listing snapshot comparisons, imported competitor Ads Insights, imported market structure/opportunity screening, and local purchase-order planning CSV export.

## Product roadmap

This roadmap is the authoritative feature scope requested by the owner. It is deliberately broader than the currently completed product. Implementation remains evidence-first: KeywordOS must not invent search volume, sales, ranking, bid, competitor, inventory, profitability, or attribution data.

Status rules:

- `[x]` means implemented in the repository and covered by appropriate verification.
- `[ ]` means planned, incomplete, experimental, or waiting for a required data source.
- Amazon Ads API, SP-API, OAuth, remote Amazon mutation and Listing publishing remain disabled until the owner explicitly resumes that work.

### Completed foundation

- [x] Multi-Store analytics shell with explicit global read-only and Store execution boundaries.
- [x] Amazon Ads Search Term and Unified Transaction CSV validation/import.
- [x] Advertising Dashboard, Analytics and campaign → ad group → target → search-term drill-down.
- [x] Source-backed Suggestions, supported local Rules, Action Center, Change Log and protected-negative checks.
- [x] Keyword research, tracker, keyword/negative libraries and cross-product/cross-Store conflict guards.
- [x] Unified Transaction revenue, refunds, fees, advertising-charge and settlement analytics.
- [x] Listing preparation workspace without Amazon publishing.
- [x] CSV-first SQP/ABA Search Query Funnel with demand, funnel and share analysis.
- [x] CSV-first Product 360 joining loaded advertising, finance, cost and inventory evidence.
- [x] Local approved-action baselines and later-import outcome review.
- [x] CSV rank/index snapshots and latest organic/sponsored rank status.
- [x] Listing Optimizer 2.0 keyword coverage, repetition and backend UTF-8 byte checks.
- [x] CSV inventory snapshots with evidence-labelled days-of-cover risk.
- [x] Deterministic advertising, conversion and inventory anomaly checks.
- [x] Downloadable parseable templates for SQP/ABA, cost, inventory and rank imports.

### P0 — trustworthy connected decision system

- [x] Store-scoped browser Dataset Registry for currently supported Ads, Unified, SQP/ABA, cost, inventory and rank imports, including source, import time, coverage, row count, schema version, checksum and validation status.
- [x] Core growth imports migrated into the registry, Data Health and local backup/restore, with safe legacy browser-data migration.
- [x] Product Master workspace and imported SKU/ASIN/Parent ASIN/FNSKU/family/marketplace mappings; Product 360 only joins explicitly mapped records.
- [x] Visible unmapped-record queue that excludes ambiguous source identities from authoritative product economics.
- [x] Action Outcome windows now retain an approval timestamp and compare equal-length loaded-date windows, with spend, sales, orders, ACoS, ROAS, CPC and CVR plus partial-window/sample warnings.
- [x] Store analytics pages display the loaded Ads and Unified source, coverage period and actual-import status before decisions are made.
- [x] Store-scoped keyword-asset records use stable IDs and synchronize Ads plus SQP/ABA-only evidence, library tags/protection, tracker state and staged advertising actions into the Dataset Registry; SQP-only terms remain explicitly unqualified until supporting evidence exists.
- [x] Keyword Workflow view traces evidence, qualification, Listing coverage, local advertising proposal, imported rank and outcome readiness without fabricating missing stages.
- [x] Listing drafts and approved-action outcome baselines are Store-scoped registry datasets, included in Data Health and validated local backup/restore with legacy browser-data migration.
- [x] Data Health exposes per-dataset Store, source, import timestamp, coverage, row count, schema version, validation status and checksum for auditable decisions; the full audit renderer is protected from being shadowed by a summary view.
- [x] Growth workspaces show the precise persisted dataset source, coverage, import date and validation state ahead of evidence-derived KPI views; a missing import time remains explicit.
- [x] Growth CSV imports enforce the 16 MiB browser safety limit and reject malformed unclosed CSV fields before any workspace data is replaced.
- [x] Competitor Snapshots provides Store-scoped CSV import, template, source provenance and latest-per-ASIN point-in-time listing evidence; no competitor metric is inferred when it is absent from the import.
- [x] Review Evidence provides Store-scoped CSV import, provenance and raw rating/text sample review; missing review text, sentiment, themes and representativeness are never inferred.
- [x] Action Outcome review warns on incomplete windows, small samples, same-scope concurrent local actions and unavailable Amazon-side confounders.
- [x] Shared keyword assets support Store-scoped tags and intent classification across library, tracker and workflow, with backup/restore coverage.
- [x] Keyword Workflow now displays the exact Ads, SQP/ABA and imported rank evidence available for each keyword asset rather than reducing every source to Ads.
- [x] Tracked keywords surface exact imported organic and sponsored rank snapshots by ASIN; multi-ASIN evidence stays separated rather than being collapsed into a guessed rank.
- [x] Unified Dataset Registry covering Ads, Unified, SQP/ABA, cost, inventory, rank, competitor, competitor Ads, review and Listing datasets.
- [x] Dataset provenance: Store, source, import time, coverage dates, row count, schema version, checksum and validation state.
- [x] Bring all growth datasets into Data Health, backup/restore and Store isolation instead of independent `localStorage` silos.
- [x] Product master-data workspace for ASIN, Parent ASIN, SKU, FNSKU, product family, marketplace and Store.
- [x] Explicit unmapped-record queue; no heuristic Product 360 join may silently become authoritative.
- [x] Shared keyword asset IDs across SQP, research, keyword lists, Listing coverage, advertising actions and rank tracking.
- [x] End-to-end keyword workflow: evidence → qualification → list/tag/intent → Listing → advertising proposal → rank → outcome.
- [x] Action Outcome attribution with real approval timestamp, equal before/after windows and data-completeness checks.
- [x] Outcome metrics for spend, sales, orders, ACoS, ROAS, CPC and CVR with sample-size/confounder warnings.
- [x] Page-level source chips showing the exact dataset, coverage period, freshness and imported/local-record status behind every KPI.

### P1 — competitor, Listing and operating intelligence

#### Multi-ASIN keyword and traffic intelligence

- [x] Generic reverse-ASIN/keyword CSV import adapter with documented template and validated Store-scoped provenance. Helium 10 and SellerSprite-specific adapters remain pending.
- [x] Compare 2–20 imported ASINs in one project.
- [x] Shared, own-only, competitor-only and missing-keyword sets, with ownership derived only from Product Master ASINs.
- [x] Organic-rank, sponsored-rank, search-volume, conversion and traffic-share side-by-side gaps when both sides are present in imported evidence.
- [x] Keyword overlap/coverage score from imported comparison sets and one-click staging of competitor-only/missing terms in the shared keyword asset library.
- [x] Imported traffic-share comparison and keyword-set distribution view. It sums only supplied Traffic Share values by own/shared/competitor-only set, explicitly avoids normalization and remains unavailable when Traffic Share is absent.

#### Product, market and competitor monitoring

- [x] Browser-local reusable competitor groups for imported ASIN snapshots, including per-group imported/missing ASIN counts, snapshot counts and detected consecutive-snapshot changes. Groups organize evidence only and do not provide live monitoring or market-data enrichment.
- [x] CSV snapshot history for price, BSR, rating, review count, estimated sales, variants and availability.
- [x] Imported competitor snapshot trend charts use explicit snapshot dates for Price, BSR and Review Count. Seasonality evidence is shown only when the same ASIN has the same calendar month across 2+ years; single-year history never fabricates a seasonal pattern or forecast.
- [x] Alerts for imported price, BSR, rating, review-count, variant and availability changes between consecutive dated snapshots of the same ASIN; no alert is fabricated without a baseline.
- [x] Competitor storefront snapshot CSV import reuses the existing Store-scoped competitor dataset and provides 7/15/30/60-day per-storefront listing-set change summaries. “Explicit new listings” are counted only when one unambiguous imported First Seen Date falls inside the window; newly observed ASINs without that field are not treated as launches, and partial exports remain partial evidence.
- [x] Existing imported competitor ASIN snapshots provide conservative 7/15/30/60-day price/BSR/review lookbacks only when a dated historical baseline is available; storefront snapshot set summaries follow the same baseline rule.
- [x] Imported competitor Ads Insights panel accepts dated ASIN-level CSV observations for supplied keywords, placements, ad types, campaign labels, observed positions and source notes; summaries use each ASIN's latest imported snapshot and count observation rows without treating them as traffic/impression share.
- [ ] Competitor advertising structure inference (campaign/ad-group/targeting relationships) remains pending until an authoritative source supplies those relationships; KeywordOS does not infer them from observed keywords or placements.
- [x] Latest-snapshot market structure screen provides price quartiles/bands, review-count median/Q3 barrier, Estimated Sales share concentration (HHI/top-3) when 3+ ASINs have sales evidence, and a disclosed relative opportunity score (65% sales percentile + 35% inverse review-count percentile) only when 3+ ASINs have both inputs. Missing values are never estimated; price bands do not affect the score and no external concentration benchmark is asserted.

#### Review and voice-of-customer intelligence

- [x] Review CSV import with ASIN, variation, rating, date, title and body validation.
- [ ] Positive/negative themes, complaints, purchasing motivations, use cases and requested features.
- [x] Literal two-word frequency review by explicit 1–2-star versus 4–5-star imported samples; this is not inferred sentiment, themes or intent.
- [x] Variant-level imported rating and star-band comparison, with raw review text retained.
- [x] Own-versus-competitor imported review sample comparison when Product Master identifies the owned ASINs.
- [x] Evidence-linked product investigation and Listing selling-point candidate backlog from literal imported review phrases, with sample date/ASIN/rating/title references. Low-star rows are investigation prompts and high-star rows require manual claim substantiation; neither is inferred sentiment, root cause or automatic Listing text.
- [ ] Multi-market/language review normalization while preserving original review text.
- [x] Marketplace-level imported review breakdown while preserving original text and labels; cross-language normalization remains unavailable without an authoritative source.

#### Listing Optimizer 3.0

- [x] Root-word and phrase coverage instead of simple substring matching.
- [x] Separate title, bullets, description and backend-term coverage/scoring.
- [x] User-configured brand-term exclusion, duplicate-root control and keyword-stuffing warnings.
- [x] High-value unused keyword placement suggestions based on imported evidence, with manual relevance confirmation.
- [x] Competitor Listing title phrase-gap comparison using only imported snapshots and the local draft; it does not infer ranking, traffic or relevance.
- [x] Marketplace field-validation profile with editable title-character and backend UTF-8-byte limits, plus title/backend over-limit warnings and bullet/description counts. Defaults are explicitly presented as review thresholds that must be confirmed against the current Seller Central category policy.
- [x] Browser-local Listing snapshots with timestamp, note and field-level diff for title, bullets, description, backend terms, brand exclusions and policy-profile settings. Versions do not imply publishing status or later rank/conversion attribution; that requires separately imported evidence.
- [x] Browser-local product-image and selling-point evidence checklist. It is a human review aid only and does not imply Amazon compliance approval.

#### Profitability, inventory and replenishment

- [x] Local per-order profit scenario calculator for price, unit cost, user-entered fees, ad cost, freight, tariff, promotion and expected refund impact. It discloses the formula and never estimates omitted Amazon fees or benchmarks.
- [x] Imported-period contribution margin and break-even ACoS readout, using explicit Product Master joins plus loaded operating-net, COGS and ad-sales evidence; it remains unavailable when those inputs are absent and is not a forecast.
- [x] 7/30/60/90-day sales velocity from dated imported Ads units/orders, with observed-day coverage shown so incomplete reports are not treated as full windows. Transaction/order-led velocity remains a future enhancement when an authoritative order feed is connected.
- [x] Supplier lead-time and safety-stock inputs, inbound/reserved inventory treatment, and a stockout-date estimate when the imported inventory snapshot is dated. Forecasts use observed Ads velocity and remain planning estimates rather than supplier or Amazon confirmations.
- [x] Reorder review date and coverage-gap calculator with formula disclosure. It requires explicit supplier lead time and safety-stock inputs plus a literal Inventory-to-dated-Ads product-label match; it creates no purchase order and stays unavailable when evidence is missing.
- [x] Inventory capital, inbound capital, unfulfillable capital and slow-stock review from explicit Product Master cost joins and dated Ads unit evidence. “Slow-moving” means 90+ observed-velocity days of cover; aging/stranded status remains unavailable without an authoritative aging report.
- [x] Evidence-led inventory review priority that ranks critical cover, low cover, damaged inventory and missing sales evidence without creating a purchase order or reorder quantity.
- [x] Local purchase-order planning preview and CSV export for the currently selected inventory SKU, reusing the explicit lead-time, safety-stock, inventory snapshot and observed Ads velocity inputs. Exported rows are labelled planning-only and are never submitted to Amazon or suppliers.
- [x] Refund cost-exposure review based on imported Unified refund rows, explicit Product Master joins and imported unit cost. It is a manual follow-up queue, not an Amazon reimbursement eligibility or amount decision.

### P2 — advanced automation and assistance

- [ ] Read-only KeywordOS Agent over validated local/Store data with answers linked to source rows and date ranges.
- [ ] Specialist analysis modes for knowledge/help, advertising, keyword, Listing, profitability and inventory questions.
- [ ] Natural-language “why did this metric change?” diagnostics with deterministic evidence before AI narrative.
- [ ] AI-assisted Listing drafting with optional product-image understanding and explicit human approval.
- [ ] Competitor image/selling-point comparison with evidence capture.
- [ ] Category/market AI summaries over imported or licensed market datasets.
- [ ] Local alert inbox, digest and scheduled monitoring summaries.
- [ ] Browser extension for opt-in Amazon-page research and snapshot capture.
- [ ] Mobile-focused operating dashboard and alert review.
- [ ] Design-patent, trademark and global-brand research integrations when authoritative sources are available.
- [ ] External Google Trends/Keepa-style history connectors when licensed and technically supported.
- [ ] Amazon API/OAuth/SP-API integration only after the owner resumes it and authentication/data-boundary acceptance is complete.
- [ ] Optional managed advertising execution, budget control, dayparting and campaign mutation only behind explicit Store-scoped authorization, preview, approval, audit and rollback controls.
- [ ] Optional Listing publishing only behind explicit diff, preview, authorization and audit controls.

### Product and UI optimization backlog

- [x] Remove the separate visible Growth navigation group and place its existing tools under Products, Keywords, Listing, Marketing, Operations or Analytics while preserving the existing workspace page IDs and URL hashes. The hidden `#growth-nav` marker remains only to prevent duplicate reinjection by the legacy workspace bootstrap.
- [ ] Turn every top suite into a KPI/data-health/task-oriented home instead of a link directory.
- [ ] Replace irrelevant global controls on CSV-first pages with dataset- and page-specific selectors.
- [ ] Consolidate duplicate Keyword Tracker, Listing and analytics surfaces into one clear workflow per job.
- [ ] Complete Chinese/English/bilingual coverage for dynamic messages, statuses and table content.
- [ ] Add trend charts, drill-down drawers and evidence details to Search Funnel, Rank, Inventory, Outcomes and Anomalies.
- [ ] Improve mobile data tables with priority columns, cards or controlled horizontal scrolling.
- [ ] Add empty/loading/error/partial-data states with schema guidance and template downloads on every import-driven page.
- [ ] Add saved views, filters, projects, tags, favorites and recent-work shortcuts.
- [x] Replace the user-visible legacy `Cerebro` label with KeywordOS-owned **Keyword Research** language across sidebar navigation, suite cards, page heading/breadcrumb and Listing links while preserving the stable internal `cerebro` route/hash for backward compatibility.

### Delivery order

Implementation should proceed in this order unless the owner explicitly reprioritizes it:

1. Unified Dataset Registry and provenance.
2. Product master-data mapping and unmapped queue.
3. Shared keyword assets and cross-page workflow.
4. Action Outcome attribution accuracy.
5. Multi-ASIN keyword gap and traffic comparison.
6. Product/competitor snapshot monitoring.
7. Listing Optimizer 3.0.
8. Review/VOC intelligence.
9. Profit simulator and replenishment planning.
10. Read-only AI assistance and external integrations.

The intended differentiation is not to pretend KeywordOS already owns Helium 10 or SellerSprite-scale external datasets. KeywordOS should turn the seller's Amazon exports, finance reports, inventory files, licensed research exports and approved future connections into one traceable operating and decision system.

## Recent product hardening and suite UX phase

Recent merged work:

- #59 — Ads import value validation
- #60 — Unified Transaction value validation
- #61 — loaded-data recency awareness
- #62 — Bid Suggestions source truth
- #65 — backup restore row validation before IndexedDB writes
- #69 — persisted dataset startup integrity, including strict Ads bid lineage
- #70 — backup localStorage shape integrity
- #71 — live localStorage preflight repair before application initialization
- #72 — restore the previously disabled top suite navigation
- #73 — truthful suite launchers + mobile horizontal suite navigation
- #74 — lightweight `#page=...` URL history and Back/Forward
- #75 — startup hash restore race fix
- #76 — first-class Listing Workspace page with session-only Title/Bullets/Search Terms preparation
- #77 — Listing prefers only validated browser-persisted Ads evidence; otherwise visibly labeled bundled fallback
- #78 — Listing/sidebar async startup race fix
- #79 — Products / Keywords / Marketing / Operations / Analytics promoted to stable first-class main-workspace suite homes

### Current suite navigation

All six top-level suite entries are now usable first-class surfaces:

- **Products** — suite home for existing product/store workspace capabilities
- **Keywords** — suite home for existing keyword intelligence capabilities
- **Listing** — dedicated first-class preparation page; no Amazon publishing
- **Marketing** — suite home for advertising workflows
- **Operations** — suite home for supported data/finance operating workflows
- **Analytics** — suite home for analytics surfaces

The suite bar is no longer hidden below 900px; it remains horizontally navigable on narrower layouts.

Suite homes and Listing participate in the existing lightweight `#page=...` URL/history behavior, so reload and browser Back/Forward reuse the real application navigation path without a routing framework.

The former visible `GROWTH` sidebar group is now redistributed under those six suite labels. Existing Growth workspace buttons are moved rather than recreated, so their click handlers, stable page IDs and `#page=...` history behavior are preserved.

## Listing data and draft boundary

Listing is not a fake Amazon editor. It is a local preparation workspace:

- keyword candidates come from Amazon Ads search-term evidence already available to KeywordOS
- if a schema-v1 browser-persisted Ads dataset exists and passes the existing persisted-dataset guard, Listing prefers that evidence
- otherwise Listing fails closed to the bundled dataset and labels the evidence source
- Title / Bullets / Search Terms draft text is session-only
- no synthetic search-volume/ranking data is invented
- no Amazon credentials, API calls, listing writes, or publishing are performed

## Non-auth server persistence foundation

The code-side foundation is ready and intentionally unexposed.

### D1 schema

`migrations/0003_dataset_versions.sql` defines:

- immutable `dataset_versions`
- per-Store/per-kind `dataset_current`
- composite dataset/Store/kind foreign-key integrity
- schema metadata version `3`

The migration is applied to Production D1 and verified remotely.

### Import validation

`src/import-validation.js` enforces:

- Ads and Unified supported report shapes
- required Ads fields
- finance-critical Unified fields
- malformed CSV / invalid UTF-8 / empty input rejection
- consistent nonblank CSV row widths
- exact raw-byte SHA-256
- a 16 MiB buffered-import limit

Current accepted fixtures remain:

- Ads: 3,202,495 bytes — 8,753 rows / 45 fields
- Unified: 1,566,578 bytes — 3,643 rows / 32 fields

The 16 MiB limit should only be raised after large imports use a streaming parser.

### R2 + D1 persistence integrity

`src/dataset-persistence.js` enforces:

- immutable Store/kind-scoped R2 keys
- create-only R2 writes
- actual R2 object size and stored SHA-256 verification
- complete R2 custom metadata consistency
- D1 version/current promotion only after R2 integrity succeeds
- Store/kind-safe current lookup
- the same object integrity checks on restore

`src/import-pipeline.js` remains simply:

```text
validateImportBody()
-> persistAcceptedDataset()
```

Invalid imports perform zero R2/D1 writes; R2 integrity mismatch cannot promote the D1 current pointer.

Do not add speculative persistence validation or abstractions without a concrete defect.

## Remote D1 migration verification

Production D1: `amazon-keyword-intelligence-db` (`e38981da-fbeb-412e-ac8c-936bf16adb36`).

Verified state:

- `dataset_versions` exists and `count = 0`
- `dataset_current` exists and `count = 0`
- `idx_dataset_versions_store_kind_imported` exists
- `idx_dataset_current_dataset` exists
- `deployment_meta.schema_version = 3`
- `access_users = 0`
- `store_memberships = 0`

No membership rows were inserted. The non-auth server persistence foundation is therefore **GITHUB + D1 READY**.

Protected runtime Store read/write wiring remains deferred while authentication is frozen.

## Browser application assets

`npm run build` publishes only browser application assets in `dist/`. Raw/sample CSVs, seed source files, Worker source, migrations, Wrangler configuration, repository documentation and dependencies are not public Static Assets.

## Data boundary

- Cloudflare Access configuration: present; login acceptance frozen
- D1 membership tables: present but intentionally unbootstrapped
- D1 dataset schema: version 3 live and empty
- server persistence code: prepared internally but not exposed through Worker mutation routes
- product mutable state: browser-local/session-local where implemented
- Amazon Ads OAuth/API/SP-API: disabled
- Amazon mutation and Listing publishing: disabled

See [`P0_DATA_BOUNDARY.md`](./P0_DATA_BOUNDARY.md).

## Known repository administration gap

`main` branch protection is currently not enabled. This is a repository-administration gap, not a product-runtime blocker. Do not claim branch protection is configured until it is actually enabled through a supported repository-admin path.

## Development

```bash
npm install
npm run check
npm run build
npm run dev
```

D1 migrations:

```bash
npm run db:migrate
```

Manual production deployment, when intentionally needed:

```bash
npm run check
npm run build
npm run deploy
```

Normal Production flow remains GitHub `main` -> Cloudflare Workers Builds -> Wrangler deploy.

## Repository documentation

Current root documentation:

- `README.md` — current product/runtime truth
- `CURRENT_HANDOFF.md` — authoritative continuation checkpoint
- `CLOUDFLARE_ARCHITECTURE.md` — current deployment architecture
- `P0_DATA_BOUNDARY.md` — current security/data boundary

Historical V5/V6/V7/V8/V9 implementation notes are retired and are not authoritative.
