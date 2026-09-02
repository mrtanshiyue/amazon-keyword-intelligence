(() => {
  'use strict';

  const STORE_ID = 'store-a';
  const ACTIONS_KEY = 'keywordos_v9_actions';
  const APPROVAL_SELECTOR = '[data-action-approve],#approve-all,#export-approved';
  const DERIVED_DATASET_KINDS = new Set(['keyword-assets', 'action-outcomes']);
  const VALID_RECORD_STATES = new Set(['validated', 'migrated']);

  const PROVENANCE_TYPES = Object.freeze({
    'user-import': Object.freeze({ type: 'user-import', label: 'USER IMPORT', approvalAllowed: true }),
    'bundled-seed': Object.freeze({ type: 'bundled-seed', label: 'BUNDLED SEED', approvalAllowed: false }),
    calculated: Object.freeze({ type: 'calculated', label: 'CALCULATED', approvalAllowed: false }),
    'third-party-estimate': Object.freeze({ type: 'third-party-estimate', label: 'THIRD-PARTY ESTIMATE', approvalAllowed: false }),
    missing: Object.freeze({ type: 'missing', label: 'MISSING', approvalAllowed: false }),
    'legacy-unknown': Object.freeze({ type: 'legacy-unknown', label: 'UNKNOWN LEGACY SOURCE', approvalAllowed: false }),
  });

  function result(type, description, extra = {}) {
    const base = PROVENANCE_TYPES[type] || PROVENANCE_TYPES.missing;
    return { ...base, description: description || base.label, ...extra };
  }

  function hasRows(record) {
    return Boolean(record && Array.isArray(record.rows) && record.rows.length);
  }

  function recordValidated(record) {
    return hasRows(record) && VALID_RECORD_STATES.has(String(record?.validation?.status || '').toLowerCase());
  }

  function classifyDatasetSource({ kind = '', record = null, seedRows = [], validation = null, fallbackLabel = '' } = {}) {
    const normalizedKind = String(kind || record?.kind || '').trim();
    const persistedRows = hasRows(record);
    const explicitValidation = validation && typeof validation.ok === 'boolean' ? validation.ok : null;
    const validated = persistedRows && (explicitValidation === true || (explicitValidation === null && recordValidated(record)));

    if (validated && DERIVED_DATASET_KINDS.has(normalizedKind)) {
      return result('calculated', record.source || `Derived ${normalizedKind} dataset`, {
        kind: normalizedKind,
        checksum: record.checksum || '',
        rowCount: record.rows.length,
      });
    }
    if (validated) {
      return result('user-import', record.source || fallbackLabel || `User-imported ${normalizedKind || 'dataset'}`, {
        kind: normalizedKind,
        checksum: record.checksum || '',
        rowCount: record.rows.length,
      });
    }
    if (Array.isArray(seedRows) && seedRows.length) {
      const rejected = persistedRows ? ' · stored import rejected' : '';
      return result('bundled-seed', `${fallbackLabel || 'Bundled public-test seed'}${rejected}`, {
        kind: normalizedKind,
        rowCount: seedRows.length,
      });
    }
    const detail = persistedRows ? `Stored ${normalizedKind || 'dataset'} failed validation` : `No validated ${normalizedKind || 'dataset'}`;
    return result('missing', detail, { kind: normalizedKind, rowCount: 0 });
  }

  function classifyAdsSource({ record = null, seedRows = [], validation = null } = {}) {
    return classifyDatasetSource({
      kind: 'ads',
      record,
      seedRows,
      validation,
      fallbackLabel: 'Bundled public-test Ads seed',
    });
  }

  function classifyFinanceSource({ record = null, seedRows = [], validation = null } = {}) {
    return classifyDatasetSource({
      kind: 'finance',
      record,
      seedRows,
      validation,
      fallbackLabel: 'Bundled public-test Unified seed',
    });
  }

  function classifyMetricEvidence({ value, source = null, calculated = false, estimated = false, description = '' } = {}) {
    const missing = value === null || value === undefined || value === '' || (typeof value === 'number' && !Number.isFinite(value));
    if (missing) return result('missing', description || 'No usable value in current evidence');
    if (estimated) return result('third-party-estimate', description || 'Estimate supplied by an imported third-party dataset');
    if (calculated) return result('calculated', description || 'Transparent local calculation from loaded evidence');
    if (source?.type && PROVENANCE_TYPES[source.type]) return result(source.type, description || source.description, source);
    return result('user-import', description || 'Raw value from validated user-imported evidence');
  }

  function approvalBlocked(provenance) {
    return provenance?.approvalAllowed !== true;
  }

  function actionEvidenceType(action) {
    const type = String(action?.evidenceProvenance || '').trim();
    return PROVENANCE_TYPES[type] ? type : 'legacy-unknown';
  }

  function actionApprovalBlocked(action, provenance) {
    if (approvalBlocked(provenance)) return true;
    if (actionEvidenceType(action) !== 'user-import') return true;
    if (action?.evidenceChecksum && provenance?.checksum && action.evidenceChecksum !== provenance.checksum) return true;
    return false;
  }

  function markLegacyActions(actions = []) {
    let changed = 0;
    for (const action of Array.isArray(actions) ? actions : []) {
      if (!action || action.evidenceProvenance) continue;
      action.evidenceProvenance = 'legacy-unknown';
      action.evidenceSource = 'Action predates provenance lineage capture';
      changed += 1;
    }
    return changed;
  }

  function stampNewActionLineage(actions = [], knownIds = new Set(), provenance = result('missing')) {
    let changed = 0;
    for (const action of Array.isArray(actions) ? actions : []) {
      if (!action?.id || knownIds.has(action.id)) continue;
      knownIds.add(action.id);
      if (action.evidenceProvenance) continue;
      action.evidenceProvenance = provenance.type;
      action.evidenceSource = provenance.description || provenance.label;
      action.evidenceChecksum = provenance.checksum || '';
      action.evidenceCapturedAt = new Date().toISOString();
      changed += 1;
    }
    return changed;
  }

  const api = {
    PROVENANCE_TYPES,
    DERIVED_DATASET_KINDS,
    classifyDatasetSource,
    classifyAdsSource,
    classifyFinanceSource,
    classifyMetricEvidence,
    approvalBlocked,
    actionEvidenceType,
    actionApprovalBlocked,
    markLegacyActions,
    stampNewActionLineage,
  };
  globalThis.KeywordOSDataProvenance = api;

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const initialAds = classifyAdsSource({ seedRows: window.KEYWORDOS_SEED?.rows || [] });
  const initialFinance = classifyFinanceSource({ seedRows: window.KEYWORDOS_UNIFIED_SEED?.rows || [] });
  let current = { ads: initialAds, finance: initialFinance };
  let refreshTimer = null;
  const knownActionIds = new Set();

  function bridge() {
    return window.KeywordOSUIBridge || {};
  }

  function persistActions(actions) {
    try {
      localStorage.setItem(ACTIONS_KEY, JSON.stringify(actions));
    } catch {
      // In-memory lineage still protects the current session when storage is unavailable.
    }
  }

  function initializeActionLineage() {
    const actions = bridge().actions || [];
    for (const action of actions) if (action?.id) knownActionIds.add(action.id);
    if (markLegacyActions(actions)) persistActions(actions);
  }

  function captureNewActionLineage() {
    const actions = bridge().actions || [];
    if (stampNewActionLineage(actions, knownActionIds, current.ads)) persistActions(actions);
  }

  async function resolvePrimarySources() {
    const registry = window.KeywordOSDatasetRegistry;
    const guard = window.KeywordOSPersistedDatasetGuard;
    let adsRecord = null;
    let financeRecord = null;
    let adsValidation = null;
    let financeValidation = null;
    try {
      [adsRecord, financeRecord] = await Promise.all([
        registry?.get?.('ads', STORE_ID) || null,
        registry?.get?.('finance', STORE_ID) || null,
      ]);
      if (hasRows(adsRecord)) adsValidation = guard?.validateDatasetRows?.('ads', adsRecord.rows) || { ok: false };
      if (hasRows(financeRecord)) financeValidation = guard?.validateDatasetRows?.('finance', financeRecord.rows) || { ok: false };
    } catch (error) {
      console.warn('KeywordOS provenance check failed', error);
    }
    return {
      ads: classifyAdsSource({ record: adsRecord, seedRows: window.KEYWORDOS_SEED?.rows || [], validation: adsValidation }),
      finance: classifyFinanceSource({ record: financeRecord, seedRows: window.KEYWORDOS_UNIFIED_SEED?.rows || [], validation: financeValidation }),
    };
  }

  function datasetCoverage(rows = []) {
    const dates = rows.map((row) => String(row?.date || '')).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
    return dates.length ? `${dates[0]} → ${dates.at(-1)}` : 'No dated rows';
  }

  function ensureSourceBadge() {
    const controls = document.querySelector('.page-controls');
    if (!controls) return null;
    let badge = document.getElementById('data-provenance-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'data-provenance-badge';
      badge.className = 'scope-mode-badge';
      controls.appendChild(badge);
    }
    return badge;
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function ensureInlineBadge(container, provenance, id = '') {
    if (!container || !provenance) return null;
    const selector = id ? `[data-provenance-badge="${id}"]` : '[data-provenance-badge]';
    let badge = container.querySelector(selector);
    if (!badge) {
      badge = document.createElement('span');
      badge.className = `badge ${provenance.type === 'user-import' ? 'green' : provenance.type === 'bundled-seed' ? 'amber' : 'gray'}`;
      badge.dataset.provenanceBadge = id || provenance.type;
      container.appendChild(badge);
    }
    badge.className = `badge ${provenance.type === 'user-import' ? 'green' : provenance.type === 'bundled-seed' || provenance.type === 'third-party-estimate' ? 'amber' : provenance.type === 'calculated' ? 'blue' : 'gray'}`;
    badge.dataset.provenance = provenance.type;
    badge.title = provenance.description || provenance.label;
    setText(badge, provenance.label);
    return badge;
  }

  function applyPrimarySourceTruth() {
    const badge = ensureSourceBadge();
    if (badge) {
      badge.className = `scope-mode-badge ${current.ads.type === 'user-import' ? 'store' : 'global'}`;
      setText(badge, `ADS · ${current.ads.label}${current.ads.type === 'user-import' ? ' · LOCAL' : ' · READ ONLY'}`);
      badge.title = current.ads.description;
    }
    document.documentElement.dataset.adsEvidenceSource = current.ads.type;
    document.documentElement.dataset.financeEvidenceSource = current.finance.type;
  }

  function applySourceChips() {
    const chips = [...document.querySelectorAll('.source-chip-row .badge')];
    const bridgeState = bridge();
    if (chips[0]) {
      const coverage = datasetCoverage(bridgeState.adsRows || []);
      setText(chips[0], `Ads: ${coverage} · ${current.ads.label}`);
      chips[0].dataset.provenance = current.ads.type;
      chips[0].title = `${current.ads.description} · ${coverage} · ${current.ads.label}`;
      chips[0].classList.toggle('amber', current.ads.type !== 'user-import');
    }
    if (chips[1]) {
      const coverage = datasetCoverage(bridgeState.financeRows || []);
      setText(chips[1], `Unified: ${coverage} · ${current.finance.label}`);
      chips[1].dataset.provenance = current.finance.type;
      chips[1].title = `${current.finance.description} · ${coverage} · ${current.finance.label}`;
      chips[1].classList.toggle('amber', current.finance.type !== 'user-import');
    }
  }

  function applyFinanceTruth() {
    const source = document.querySelector('.finance-source');
    if (source) ensureInlineBadge(source, current.finance, 'finance');
  }

  function recordForKind(kind) {
    return (bridge().datasetRegistry || []).find((record) => record?.storeId === STORE_ID && record?.kind === kind) || null;
  }

  function provenanceForKind(kind) {
    if (kind === 'ads') return current.ads;
    if (kind === 'finance') return current.finance;
    return classifyDatasetSource({ kind, record: recordForKind(kind) });
  }

  function applyImportReadinessTruth() {
    const page = bridge().page || '';
    const entries = window.KeywordOSImportStates?.configForPage?.(page) || [];
    const rows = [...document.querySelectorAll('.keywordos-import-schema-row')];
    rows.forEach((row, index) => {
      const entry = entries[index];
      if (!entry) return;
      const kind = entry.datasetKind || entry.kind;
      const meta = row.querySelector('.keywordos-import-schema-meta') || row;
      ensureInlineBadge(meta, provenanceForKind(kind), `dataset-${kind}-${index}`);
    });
  }

  function applyDataHealthTruth() {
    if (bridge().page !== 'data-health') return;
    const cards = [...document.querySelectorAll('.health-grid .health-card')];
    if (cards[0]) ensureInlineBadge(cards[0], current.ads, 'health-ads');
    if (cards[1]) ensureInlineBadge(cards[1], current.finance, 'health-finance');
    const sourceRows = [...document.querySelectorAll('.schema-list p')];
    if (sourceRows[0]) ensureInlineBadge(sourceRows[0], current.ads, 'source-health-ads');
    if (sourceRows[1]) ensureInlineBadge(sourceRows[1], current.finance, 'source-health-finance');
  }

  const CALCULATED_HEADERS = new Set([
    'acos', 'roas', 'cvr', 'cpc', 'ctr', 'refund rate', 'fee rate', 'net rate', 'operating net',
    'tacos proxy', 'provisional contribution', 'days of cover', 'units/day', 'daily velocity',
    'purchase rate', 'search cvr', 'click cvr', 'cpa', 'break-even acos',
  ]);
  const ESTIMATED_HEADERS = new Set(['estimated sales', 'est. sales', 'sales estimate', 'estimated monthly sales']);

  function applyMetricHeaderTruth() {
    document.querySelectorAll('#content th').forEach((header) => {
      const key = String(header.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      let provenance = null;
      if (ESTIMATED_HEADERS.has(key)) provenance = classifyMetricEvidence({ value: 1, estimated: true });
      else if (CALCULATED_HEADERS.has(key)) provenance = classifyMetricEvidence({ value: 1, calculated: true });
      if (!provenance) return;
      header.dataset.provenance = provenance.type;
      const note = `${provenance.label} · ${provenance.description}`;
      if (!header.title || !header.title.includes(provenance.label)) header.title = header.title ? `${header.title} · ${note}` : note;
    });
  }

  function ensureProvenanceLegend() {
    const content = document.getElementById('content');
    if (!content) return;
    const managed = content.querySelector('.source-chip-row,.finance-source,.keywordos-import-readiness,[data-action-approve],#approve-all,#export-approved') || ['data-health', 'sync-center'].includes(bridge().page);
    let legend = document.getElementById('keywordos-provenance-legend');
    if (!managed) {
      legend?.remove();
      return;
    }
    if (!legend) {
      legend = document.createElement('div');
      legend.id = 'keywordos-provenance-legend';
      legend.className = 'notice-banner';
      content.prepend(legend);
    }
    legend.innerHTML = `<b>Evidence status:</b> <span class="badge green">USER IMPORT</span> <span class="badge amber">BUNDLED SEED</span> <span class="badge blue">CALCULATED</span> <span class="badge amber">THIRD-PARTY ESTIMATE</span> <span class="badge gray">MISSING</span> <span class="small muted">Bundled seed is read-only; calculated values use local formulas; third-party estimates remain imported estimates; missing values stay unavailable.</span>`;
  }

  function actionById(id) {
    return (bridge().actions || []).find((action) => String(action?.id) === String(id)) || null;
  }

  function pendingActions() {
    return (bridge().actions || []).filter((action) => action?.status === 'Pending');
  }

  function approvedActions() {
    return (bridge().actions || []).filter((action) => action?.status === 'Approved');
  }

  function approvalReason(action = null) {
    if (approvalBlocked(current.ads)) return `${current.ads.description}. Validated user-imported Ads data is required.`;
    if (!action) return 'Some actions do not have validated USER IMPORT evidence lineage. Recreate legacy or seed-derived actions from the current validated Ads dataset.';
    const type = actionEvidenceType(action);
    if (type === 'legacy-unknown') return 'This action predates provenance lineage capture. Recreate it from the current validated Ads dataset before approval.';
    if (type !== 'user-import') return `This action was created from ${PROVENANCE_TYPES[type]?.label || type} evidence and cannot be approved.`;
    if (action.evidenceChecksum && current.ads.checksum && action.evidenceChecksum !== current.ads.checksum) return 'This action belongs to a different Ads dataset version. Recreate it from the current validated import.';
    return 'Validated USER IMPORT evidence is required.';
  }

  function setBlocked(button, blocked, reason) {
    if (!(button instanceof HTMLButtonElement)) return;
    if (blocked) {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.dataset.provenanceBlocked = '1';
      button.title = reason;
    } else if (button.dataset.provenanceBlocked === '1') {
      button.disabled = false;
      button.removeAttribute('aria-disabled');
      delete button.dataset.provenanceBlocked;
      button.removeAttribute('title');
    }
  }

  function ensureApprovalNotice() {
    const content = document.getElementById('content');
    if (!content) return;
    const controls = content.querySelector(APPROVAL_SELECTOR);
    let notice = document.getElementById('seed-approval-guard-notice');
    if (!controls) {
      notice?.remove();
      return;
    }
    const pendingUnsafe = pendingActions().filter((action) => actionApprovalBlocked(action, current.ads));
    const approvedUnsafe = approvedActions().filter((action) => actionApprovalBlocked(action, current.ads));
    const globallyBlocked = approvalBlocked(current.ads);
    if (!globallyBlocked && !pendingUnsafe.length && !approvedUnsafe.length) {
      notice?.remove();
      return;
    }
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'seed-approval-guard-notice';
      notice.className = 'notice-banner';
      content.prepend(notice);
    }
    const detail = globallyBlocked
      ? `${current.ads.description}. Import and validate an Amazon Ads CSV before approving or exporting advertising actions.`
      : `${pendingUnsafe.length} pending and ${approvedUnsafe.length} approved action(s) lack current validated USER IMPORT lineage. Recreate legacy, seed-derived, or stale-dataset actions before approval/export.`;
    notice.innerHTML = `<b>Evidence lineage guard.</b> ${detail}`;
  }

  function applyApprovalGuard() {
    document.querySelectorAll('[data-action-approve]').forEach((button) => {
      const action = actionById(button.dataset.actionApprove);
      const blocked = !action || actionApprovalBlocked(action, current.ads);
      setBlocked(button, blocked, approvalReason(action));
    });
    const pending = pendingActions();
    const approveAll = document.getElementById('approve-all');
    if (approveAll) {
      const unsafe = pending.filter((action) => actionApprovalBlocked(action, current.ads));
      setBlocked(approveAll, approvalBlocked(current.ads) || Boolean(unsafe.length), approvalReason(unsafe[0] || null));
    }
    const approved = approvedActions();
    const exportButton = document.getElementById('export-approved');
    if (exportButton) {
      const unsafe = approved.filter((action) => actionApprovalBlocked(action, current.ads));
      setBlocked(exportButton, approvalBlocked(current.ads) || Boolean(unsafe.length), approvalReason(unsafe[0] || null));
    }
    ensureApprovalNotice();
  }

  function applyTruth() {
    captureNewActionLineage();
    applyPrimarySourceTruth();
    applySourceChips();
    applyFinanceTruth();
    applyImportReadinessTruth();
    applyDataHealthTruth();
    applyMetricHeaderTruth();
    applyApprovalGuard();
    ensureProvenanceLegend();
  }

  async function refresh() {
    current = await resolvePrimarySources();
    applyTruth();
  }

  function scheduleRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      void refresh();
    }, 50);
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest(APPROVAL_SELECTOR) : null;
    if (!target) return;
    let blocked = false;
    let action = null;
    if (target.matches('[data-action-approve]')) {
      action = actionById(target.dataset.actionApprove);
      blocked = !action || actionApprovalBlocked(action, current.ads);
    } else if (target.id === 'approve-all') {
      blocked = approvalBlocked(current.ads) || pendingActions().some((item) => actionApprovalBlocked(item, current.ads));
    } else if (target.id === 'export-approved') {
      blocked = approvalBlocked(current.ads) || approvedActions().some((item) => actionApprovalBlocked(item, current.ads));
    }
    if (!blocked) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    applyApprovalGuard();
    target.title = approvalReason(action);
  }, true);

  const observer = new MutationObserver(() => scheduleRefresh());

  function start() {
    initializeActionLineage();
    applyTruth();
    observer.observe(document.body, { childList: true, subtree: true });
    void refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
