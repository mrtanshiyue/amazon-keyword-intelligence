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

  const provenance = (type, description, extra = {}) => ({
    ...(PROVENANCE_TYPES[type] || PROVENANCE_TYPES.missing),
    description: description || PROVENANCE_TYPES[type]?.label || PROVENANCE_TYPES.missing.label,
    ...extra,
  });
  const hasRows = (record) => Boolean(record && Array.isArray(record.rows) && record.rows.length);
  const recordValidated = (record) => hasRows(record) && VALID_RECORD_STATES.has(String(record?.validation?.status || '').toLowerCase());

  function classifyDatasetSource({ kind = '', record = null, seedRows = [], validation = null, fallbackLabel = '' } = {}) {
    const normalizedKind = String(kind || record?.kind || '').trim();
    const persistedRows = hasRows(record);
    const explicit = validation && typeof validation.ok === 'boolean' ? validation.ok : null;
    const validated = persistedRows && (explicit === true || (explicit === null && recordValidated(record)));
    const common = validated ? { kind: normalizedKind, checksum: record.checksum || '', rowCount: record.rows.length } : { kind: normalizedKind };

    if (validated && DERIVED_DATASET_KINDS.has(normalizedKind)) {
      return provenance('calculated', record.source || `Derived ${normalizedKind} dataset`, common);
    }
    if (validated) {
      return provenance('user-import', record.source || fallbackLabel || `User-imported ${normalizedKind || 'dataset'}`, common);
    }
    if (Array.isArray(seedRows) && seedRows.length) {
      return provenance('bundled-seed', `${fallbackLabel || 'Bundled public-test seed'}${persistedRows ? ' · stored import rejected' : ''}`, {
        kind: normalizedKind,
        rowCount: seedRows.length,
      });
    }
    return provenance('missing', persistedRows ? `Stored ${normalizedKind || 'dataset'} failed validation` : `No validated ${normalizedKind || 'dataset'}`, {
      kind: normalizedKind,
      rowCount: 0,
    });
  }

  const classifyAdsSource = ({ record = null, seedRows = [], validation = null } = {}) => classifyDatasetSource({
    kind: 'ads', record, seedRows, validation, fallbackLabel: 'Bundled public-test Ads seed',
  });
  const classifyFinanceSource = ({ record = null, seedRows = [], validation = null } = {}) => classifyDatasetSource({
    kind: 'finance', record, seedRows, validation, fallbackLabel: 'Bundled public-test Unified seed',
  });

  function classifyMetricEvidence({ value, source = null, calculated = false, estimated = false, description = '' } = {}) {
    const missing = value === null || value === undefined || value === '' || (typeof value === 'number' && !Number.isFinite(value));
    if (missing) return provenance('missing', description || 'No usable value in current evidence');
    if (estimated) return provenance('third-party-estimate', description || 'Estimate supplied by an imported third-party dataset');
    if (calculated) return provenance('calculated', description || 'Transparent local calculation from loaded evidence');
    if (source?.type && PROVENANCE_TYPES[source.type]) return provenance(source.type, description || source.description, source);
    return provenance('user-import', description || 'Raw value from validated user-imported evidence');
  }

  const approvalBlocked = (source) => source?.approvalAllowed !== true;
  const actionEvidenceType = (action) => PROVENANCE_TYPES[String(action?.evidenceProvenance || '').trim()] ? String(action.evidenceProvenance).trim() : 'legacy-unknown';

  function actionApprovalBlocked(action, source) {
    if (approvalBlocked(source) || actionEvidenceType(action) !== 'user-import') return true;
    return Boolean(action?.evidenceChecksum && source?.checksum && action.evidenceChecksum !== source.checksum);
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

  function stampNewActionLineage(actions = [], knownIds = new Set(), source = provenance('missing')) {
    let changed = 0;
    for (const action of Array.isArray(actions) ? actions : []) {
      if (!action?.id || knownIds.has(action.id)) continue;
      knownIds.add(action.id);
      if (action.evidenceProvenance) continue;
      action.evidenceProvenance = source.type;
      action.evidenceSource = source.description || source.label;
      action.evidenceChecksum = source.checksum || '';
      action.evidenceCapturedAt = new Date().toISOString();
      changed += 1;
    }
    return changed;
  }

  globalThis.KeywordOSDataProvenance = {
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

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  let current = {
    ads: classifyAdsSource({ seedRows: window.KEYWORDOS_SEED?.rows || [] }),
    finance: classifyFinanceSource({ seedRows: window.KEYWORDOS_UNIFIED_SEED?.rows || [] }),
  };
  let refreshTimer = null;
  const knownActionIds = new Set();
  const bridge = () => window.KeywordOSUIBridge || {};
  const actions = () => bridge().actions || [];

  function persistActions() {
    try { localStorage.setItem(ACTIONS_KEY, JSON.stringify(actions())); } catch {}
  }

  function initializeActionLineage() {
    for (const action of actions()) if (action?.id) knownActionIds.add(action.id);
    if (markLegacyActions(actions())) persistActions();
  }

  function captureNewActionLineage() {
    if (stampNewActionLineage(actions(), knownActionIds, current.ads)) persistActions();
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

  function setText(node, text) {
    if (node && node.textContent !== text) node.textContent = text;
  }

  function setHtml(node, html) {
    if (node && node.innerHTML !== html) node.innerHTML = html;
  }

  function coverage(rows = []) {
    const dates = rows.map((row) => String(row?.date || '')).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
    return dates.length ? `${dates[0]} → ${dates.at(-1)}` : 'No dated rows';
  }

  function badgeTone(source) {
    if (source.type === 'user-import') return 'green';
    if (source.type === 'bundled-seed' || source.type === 'third-party-estimate') return 'amber';
    if (source.type === 'calculated') return 'blue';
    return 'gray';
  }

  function ensureInlineBadge(container, source, id) {
    if (!container || !source) return null;
    let badge = container.querySelector(`[data-provenance-badge="${id}"]`);
    if (!badge) {
      badge = document.createElement('span');
      badge.dataset.provenanceBadge = id;
      container.appendChild(badge);
    }
    badge.className = `badge ${badgeTone(source)}`;
    badge.dataset.provenance = source.type;
    badge.title = source.description || source.label;
    setText(badge, source.label);
    return badge;
  }

  function ensureTopBadge() {
    const controls = document.querySelector('.page-controls');
    if (!controls) return;
    let badge = document.getElementById('data-provenance-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'data-provenance-badge';
      controls.appendChild(badge);
    }
    badge.className = `scope-mode-badge ${current.ads.type === 'user-import' ? 'store' : 'global'}`;
    badge.title = current.ads.description;
    setText(badge, `ADS · ${current.ads.label}${current.ads.type === 'user-import' ? ' · LOCAL' : ' · READ ONLY'}`);
  }

  function applyLegacyStoreSurfaces() {
    document.querySelectorAll('.connection-card.connected').forEach((card) => {
      setText(card.querySelector('.badge'), current.ads.label);
      card.querySelectorAll('.connection-details p').forEach((row) => {
        if (row.querySelector('span')?.textContent.trim() === 'Last sync') {
          setText(row.querySelector('b'), current.ads.type === 'user-import' ? 'User import snapshot' : current.ads.type === 'bundled-seed' ? 'Bundled seed snapshot' : 'No validated snapshot');
        }
      });
    });
    document.querySelectorAll('.admin-store-card').forEach((card) => {
      if (!card.textContent.includes('YTDBNS-US-01') && !card.textContent.includes('US01')) return;
      setText(card.querySelector('.badge'), current.ads.label);
      card.querySelectorAll('.admin-fields div').forEach((row) => {
        if (row.querySelector('span')?.textContent.trim() === 'Data source') setText(row.querySelector('b'), current.ads.description);
      });
    });
  }

  function applySourceSurfaces() {
    ensureTopBadge();
    document.documentElement.dataset.adsEvidenceSource = current.ads.type;
    document.documentElement.dataset.financeEvidenceSource = current.finance.type;

    const chips = [...document.querySelectorAll('.source-chip-row .badge')];
    if (chips[0]) {
      const range = coverage(bridge().adsRows || []);
      chips[0].dataset.provenance = current.ads.type;
      chips[0].title = `${current.ads.description} · ${range} · ${current.ads.label}`;
      chips[0].classList.toggle('amber', current.ads.type !== 'user-import');
      setText(chips[0], `Ads: ${range} · ${current.ads.label}`);
    }
    if (chips[1]) {
      const range = coverage(bridge().financeRows || []);
      chips[1].dataset.provenance = current.finance.type;
      chips[1].title = `${current.finance.description} · ${range} · ${current.finance.label}`;
      chips[1].classList.toggle('amber', current.finance.type !== 'user-import');
      setText(chips[1], `Unified: ${range} · ${current.finance.label}`);
    }

    const finance = document.querySelector('.finance-source');
    if (finance) ensureInlineBadge(finance, current.finance, 'finance');
    applyLegacyStoreSurfaces();
  }

  function recordForKind(kind) {
    return (bridge().datasetRegistry || []).find((record) => record?.storeId === STORE_ID && record?.kind === kind) || null;
  }

  function sourceForKind(kind) {
    if (kind === 'ads') return current.ads;
    if (kind === 'finance') return current.finance;
    return classifyDatasetSource({ kind, record: recordForKind(kind) });
  }

  function applyImportReadinessTruth() {
    const entries = window.KeywordOSImportStates?.configForPage?.(bridge().page || '') || [];
    [...document.querySelectorAll('.keywordos-import-schema-row')].forEach((row, index) => {
      const entry = entries[index];
      if (!entry) return;
      const kind = entry.datasetKind || entry.kind;
      ensureInlineBadge(row.querySelector('.keywordos-import-schema-meta') || row, sourceForKind(kind), `dataset-${kind}-${index}`);
    });
  }

  function applyDataHealthTruth() {
    if (bridge().page !== 'data-health') return;
    const cards = [...document.querySelectorAll('.health-grid .health-card')];
    if (cards[0]) ensureInlineBadge(cards[0], current.ads, 'health-ads');
    if (cards[1]) ensureInlineBadge(cards[1], current.finance, 'health-finance');
    const rows = [...document.querySelectorAll('.schema-list p')];
    if (rows[0]) ensureInlineBadge(rows[0], current.ads, 'source-health-ads');
    if (rows[1]) ensureInlineBadge(rows[1], current.finance, 'source-health-finance');
  }

  const CALCULATED_HEADERS = new Set(['acos','roas','cvr','cpc','ctr','refund rate','fee rate','net rate','operating net','tacos proxy','provisional contribution','days of cover','units/day','daily velocity','purchase rate','search cvr','click cvr','cpa','break-even acos']);
  const ESTIMATED_HEADERS = new Set(['estimated sales','est. sales','sales estimate','estimated monthly sales']);

  function applyMetricHeaders() {
    document.querySelectorAll('#content th').forEach((header) => {
      const key = String(header.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const source = ESTIMATED_HEADERS.has(key)
        ? classifyMetricEvidence({ value: 1, estimated: true })
        : CALCULATED_HEADERS.has(key)
          ? classifyMetricEvidence({ value: 1, calculated: true })
          : null;
      if (!source) return;
      header.dataset.provenance = source.type;
      const note = `${source.label} · ${source.description}`;
      if (!header.title.includes(source.label)) header.title = header.title ? `${header.title} · ${note}` : note;
    });
  }

  function ensureLegend() {
    const content = document.getElementById('content');
    if (!content) return;
    const managed = content.querySelector('.source-chip-row,.finance-source,.keywordos-import-readiness,[data-action-approve],#approve-all,#export-approved') || ['data-health','sync-center'].includes(bridge().page);
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
    setHtml(legend, '<b>Evidence status:</b> <span class="badge green">USER IMPORT</span> <span class="badge amber">BUNDLED SEED</span> <span class="badge blue">CALCULATED</span> <span class="badge amber">THIRD-PARTY ESTIMATE</span> <span class="badge gray">MISSING</span> <span class="small muted">Bundled seed is read-only; calculated values use local formulas; third-party estimates remain imported estimates; missing values stay unavailable.</span>');
  }

  const actionById = (id) => actions().find((action) => String(action?.id) === String(id)) || null;
  const pendingActions = () => actions().filter((action) => action?.status === 'Pending');
  const approvedActions = () => actions().filter((action) => action?.status === 'Approved');

  function approvalReason(action = null) {
    if (approvalBlocked(current.ads)) return `${current.ads.description}. Validated user-imported Ads data is required.`;
    if (!action) return 'Some actions do not have current validated USER IMPORT evidence lineage. Recreate legacy, seed-derived, or stale-dataset actions.';
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
    let notice = document.getElementById('seed-approval-guard-notice');
    if (!content.querySelector(APPROVAL_SELECTOR)) {
      notice?.remove();
      return;
    }
    const pendingUnsafe = pendingActions().filter((action) => actionApprovalBlocked(action, current.ads));
    const approvedUnsafe = approvedActions().filter((action) => actionApprovalBlocked(action, current.ads));
    if (!approvalBlocked(current.ads) && !pendingUnsafe.length && !approvedUnsafe.length) {
      notice?.remove();
      return;
    }
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'seed-approval-guard-notice';
      notice.className = 'notice-banner';
      content.prepend(notice);
    }
    const detail = approvalBlocked(current.ads)
      ? `${current.ads.description}. Import and validate an Amazon Ads CSV before approving or exporting advertising actions.`
      : `${pendingUnsafe.length} pending and ${approvedUnsafe.length} approved action(s) lack current validated USER IMPORT lineage. Recreate them before approval/export.`;
    setHtml(notice, `<b>Evidence lineage guard.</b> ${detail}`);
  }

  function applyApprovalGuard() {
    document.querySelectorAll('[data-action-approve]').forEach((button) => {
      const action = actionById(button.dataset.actionApprove);
      setBlocked(button, !action || actionApprovalBlocked(action, current.ads), approvalReason(action));
    });
    const unsafePending = pendingActions().filter((action) => actionApprovalBlocked(action, current.ads));
    const unsafeApproved = approvedActions().filter((action) => actionApprovalBlocked(action, current.ads));
    const approveAll = document.getElementById('approve-all');
    const exportButton = document.getElementById('export-approved');
    if (approveAll) setBlocked(approveAll, approvalBlocked(current.ads) || Boolean(unsafePending.length), approvalReason(unsafePending[0] || null));
    if (exportButton) setBlocked(exportButton, approvalBlocked(current.ads) || Boolean(unsafeApproved.length), approvalReason(unsafeApproved[0] || null));
    ensureApprovalNotice();
  }

  function applyTruth() {
    captureNewActionLineage();
    applySourceSurfaces();
    applyImportReadinessTruth();
    applyDataHealthTruth();
    applyMetricHeaders();
    applyApprovalGuard();
    ensureLegend();
  }

  async function refresh() {
    current = await resolvePrimarySources();
    applyTruth();
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      void refresh();
    }, 50);
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest(APPROVAL_SELECTOR) : null;
    if (!target) return;
    let action = null;
    let blocked = false;
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
    target.title = approvalReason(action);
    applyApprovalGuard();
  }, true);

  function start() {
    initializeActionLineage();
    applyTruth();
    window.addEventListener('keywordos:page-rendered', scheduleRefresh);
    void refresh();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start, { once: true }) : start();
})();
