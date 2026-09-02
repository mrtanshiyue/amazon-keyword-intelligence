(() => {
  'use strict';

  const BACKUP_FORMAT = 'keywordos-local-workspace-backup';
  const BACKUP_VERSION = 2;
  const MAX_BACKUP_BYTES = 32 * 1024 * 1024;
  const MAX_DATASET_ROWS = 250000;
  const DB_NAME = 'keywordos_v9_workspace';
  const DB_VERSION = 2;
  const DATASET_STORE = 'datasets';
  const DATASET_KINDS = new Set(['ads', 'finance', 'sqp', 'costs', 'inventory', 'ranks', 'competitor', 'competitor-ads', 'reviews', 'reverse-asin', 'listing', 'product-master', 'keyword-assets', 'action-outcomes']);
  const SAFE_LOCAL_KEYS = new Set([
    'keywordos_v9_actions',
    'keywordos_v9_negatives',
    'keywordos_v9_tracked',
    'keywordos_v9_protected',
    'keywordos_v9_rules',
    'keywordos_v9_logs',
    'keywordos_v9_settings',
    'keywordos_v9_presets',
    'keywordos_v9_preset_default',
    'keywordos_v9_suggestion_reviews',
    'keywordos_v9_schedules',
    'keywordos_v9_global_ui',
    'keywordos_v9_keyword_tags',
    'keywordos_v9_keyword_intents',
    'keywordos_v9_keyword_ui',
    'keywordos_v9_tracker_ui',
    'keywordos_v9_change_log_ui',
    'keywordos_v9_research_history',
    'keywordos_v9_dashboard_ui',
    'keywordos_v9_data_ops',
    'keywordos_v9_store_workspaces',
    'keywordos_v9_workspace_organizer',
    'keywordos_v9_shell_ui'
  ]);

  function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function datasetKind(record) {
    const raw = String(record?.kind || record?.datasetKind || record?.key || '').toLowerCase();
    return raw.includes('::') ? raw.split('::').at(-1) : raw;
  }

  const LOCAL_ARRAY_KEYS = new Set([
    'keywordos_v9_actions',
    'keywordos_v9_negatives',
    'keywordos_v9_tracked',
    'keywordos_v9_protected',
    'keywordos_v9_rules',
    'keywordos_v9_logs',
    'keywordos_v9_presets',
    'keywordos_v9_schedules',
    'keywordos_v9_research_history',
    'keywordos_v9_store_workspaces'
  ]);
  const LOCAL_STRING_KEYS = new Set(['keywordos_v9_preset_default']);

  function validateLocalStateRaw(key, raw) {
    if (typeof raw !== 'string') return { ok: false, error: `Invalid local value for ${key}.` };
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: `Local value for ${key} is not valid JSON.` };
    }
    if (LOCAL_ARRAY_KEYS.has(key)) {
      return Array.isArray(parsed)
        ? { ok: true }
        : { ok: false, error: `Local value for ${key} must be an array.` };
    }
    if (LOCAL_STRING_KEYS.has(key)) {
      return typeof parsed === 'string'
        ? { ok: true }
        : { ok: false, error: `Local value for ${key} must be a string.` };
    }
    return isRecord(parsed)
      ? { ok: true }
      : { ok: false, error: `Local value for ${key} must be an object.` };
  }

  const ADS_PERSISTED_NUMERIC_FIELDS = ['impressions', 'clicks', 'cost', 'orders', 'sales', 'bid'];
  const FINANCE_PERSISTED_NUMERIC_FIELDS = [
    'quantity',
    'productSales',
    'productSalesTax',
    'shippingCredits',
    'shippingTax',
    'giftWrapCredits',
    'giftWrapTax',
    'regulatoryFee',
    'regulatoryTax',
    'promo',
    'promoTax',
    'withheldTax',
    'sellingFees',
    'fbaFees',
    'otherTxnFees',
    'other',
    'total'
  ];

  function validNormalizedDate(value) {
    const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function validateDatasetRows(key, rows) {
    if (!DATASET_KINDS.has(key) || !Array.isArray(rows) || rows.length > MAX_DATASET_ROWS) return { ok: false, error: `Dataset ${key} has an unsupported row set.` };
    if (!['ads', 'finance'].includes(key)) return rows.every(isRecord) ? { ok: true } : { ok: false, error: `Dataset ${key} contains a non-object row.` };
    const fields = key === 'ads' ? ADS_PERSISTED_NUMERIC_FIELDS : FINANCE_PERSISTED_NUMERIC_FIELDS;
    const nonNegative = key === 'ads';
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (!isRecord(row)) {
        return { ok: false, error: `Dataset ${key} row ${index + 1} must be an object.` };
      }
      if (!validNormalizedDate(row.date)) {
        return { ok: false, error: `Dataset ${key} row ${index + 1} has an invalid normalized date.` };
      }
      for (const field of fields) {
        const value = row[field];
        if (typeof value !== 'number' || !Number.isFinite(value) || (nonNegative && value < 0)) {
          return { ok: false, error: `Dataset ${key} row ${index + 1} has an invalid ${field} value.` };
        }
      }
    }
    return { ok: true };
  }

  function sanitizeScheduleStorage(raw) {
    try {
      const value = JSON.parse(raw);
      if (!Array.isArray(value)) return '[]';
      return JSON.stringify(value.filter((item) => item && item.id !== 'schedule-default'));
    } catch {
      return '[]';
    }
  }

  function validateBackupObject(value) {
    if (!isRecord(value)) return { ok: false, error: 'Backup root must be an object.' };
    if (value.format !== BACKUP_FORMAT || ![1, BACKUP_VERSION].includes(value.version)) {
      return { ok: false, error: 'This is not a supported KeywordOS local workspace backup.' };
    }
    if (!isRecord(value.localStorage)) return { ok: false, error: 'Backup local state is missing.' };

    const localState = {};
    for (const [key, raw] of Object.entries(value.localStorage)) {
      if (!SAFE_LOCAL_KEYS.has(key)) continue;
      const localValidation = validateLocalStateRaw(key, raw);
      if (!localValidation.ok) return localValidation;
      localState[key] = key === 'keywordos_v9_schedules' ? sanitizeScheduleStorage(raw) : raw;
    }

    const sourceDatasets = value.datasets == null ? [] : value.datasets;
    if (!Array.isArray(sourceDatasets)) return { ok: false, error: 'Backup datasets must be an array.' };
    const datasets = [];
    const seen = new Set();
    for (const record of sourceDatasets) {
      const kind = datasetKind(record);
      const identity = `${String(record?.storeId || 'store-a')}::${kind}`;
      if (!isRecord(record) || !DATASET_KINDS.has(kind) || seen.has(identity)) {
        return { ok: false, error: 'Backup contains an unsupported or duplicate dataset.' };
      }
      if (![1, 2].includes(record.schemaVersion) || !Array.isArray(record.rows) || record.rows.length > MAX_DATASET_ROWS) {
        return { ok: false, error: `Dataset ${record.key} has an unsupported schema or row count.` };
      }
      const rowValidation = validateDatasetRows(kind, record.rows);
      if (!rowValidation.ok) return rowValidation;
      seen.add(identity);
      datasets.push({
        ...record,
        key: `${String(record.storeId || 'store-a')}::${kind}`,
        kind,
        storeId: String(record.storeId || 'store-a'),
        schemaVersion: 2,
        rows: record.rows,
        source: String(record.source || 'Restored backup').slice(0, 500),
        importedAt: String(record.importedAt || ''),
        rowCount: record.rows.length,
        coverage: isRecord(record.coverage) ? record.coverage : {},
        checksum: String(record.checksum || ''),
        validation: isRecord(record.validation) ? record.validation : { status: 'restored', validator: 'backup validation' }
      });
    }

    return {
      ok: true,
      backup: {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        createdAt: String(value.createdAt || ''),
        localStorage: localState,
        datasets
      }
    };
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.KeywordOSLocalOperationsTest = {
      BACKUP_FORMAT,
      BACKUP_VERSION,
      sanitizeScheduleStorage,
      validateLocalStateRaw,
      validNormalizedDate,
      validateDatasetRows,
      validateBackupObject
    };
  }

  if (typeof document === 'undefined') return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function pageTitle() {
    return ($('#page-title')?.textContent || '').trim();
  }

  function toast(message, tone = '') {
    const root = $('#toast-root');
    if (!root) return;
    root.innerHTML = `<div class="toast ${tone}">${escapeHtml(message)}</div>`;
    setTimeout(() => {
      if (root.textContent.includes(message)) root.innerHTML = '';
    }, 2800);
  }

  function openWorkspaceDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DATASET_STORE)) db.createObjectStore(DATASET_STORE, { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Unable to open workspace database'));
      request.onblocked = () => reject(new Error('Workspace database is blocked'));
    });
  }

  async function readDatasets() {
    const db = await openWorkspaceDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DATASET_STORE, 'readonly');
      const request = tx.objectStore(DATASET_STORE).getAll();
      let rows = [];
      request.onsuccess = () => {
        rows = (request.result || []).filter((item) => DATASET_KINDS.has(datasetKind(item)));
      };
      request.onerror = () => reject(request.error || new Error('Dataset backup read failed'));
      tx.oncomplete = () => {
        db.close();
        resolve(rows);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error || new Error('Dataset backup read aborted'));
      };
    });
  }

  async function replaceDatasets(records) {
    const db = await openWorkspaceDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DATASET_STORE, 'readwrite');
      const store = tx.objectStore(DATASET_STORE);
      store.clear();
      records.forEach((record) => store.put(record));
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error || new Error('Dataset restore failed'));
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error || new Error('Dataset restore aborted'));
      };
    });
  }

  function collectLocalState() {
    const output = {};
    for (const key of SAFE_LOCAL_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw !== null) output[key] = key === 'keywordos_v9_schedules' ? sanitizeScheduleStorage(raw) : raw;
    }
    return output;
  }

  function replaceLocalState(next) {
    for (const key of SAFE_LOCAL_KEYS) localStorage.removeItem(key);
    for (const [key, raw] of Object.entries(next)) localStorage.setItem(key, raw);
  }

  async function buildBackup() {
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      localStorage: collectLocalState(),
      datasets: await readDatasets()
    };
  }

  function serializeBackup(backup) {
    const content = JSON.stringify(backup);
    if (new Blob([content]).size > MAX_BACKUP_BYTES) {
      throw new Error('Local workspace backup exceeds the 32 MiB safety limit.');
    }
    return content;
  }

  function downloadBackup(content) {
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KeywordOS_local_workspace_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportBackup() {
    try {
      const backup = await buildBackup();
      downloadBackup(serializeBackup(backup));
      const rows = backup.datasets.reduce((sum, item) => sum + item.rows.length, 0);
      toast(`Local workspace backup exported · ${rows.toLocaleString()} dataset rows`, 'success');
    } catch (error) {
      console.error('KeywordOS local backup failed', error);
      toast(error.message || 'Unable to export the local workspace backup', 'error');
    }
  }

  function restoreSummary(backup) {
    return {
      localKeys: Object.keys(backup.localStorage).length,
      adsRows: backup.datasets.find((item) => item.kind === 'ads')?.rows.length || 0,
      financeRows: backup.datasets.find((item) => item.kind === 'finance')?.rows.length || 0,
      registryDatasets: backup.datasets.length
    };
  }

  async function applyBackup(backup) {
    const previousLocal = collectLocalState();
    const previousDatasets = await readDatasets();
    try {
      await replaceDatasets(backup.datasets);
      replaceLocalState(backup.localStorage);
    } catch (error) {
      try {
        await replaceDatasets(previousDatasets);
        replaceLocalState(previousLocal);
      } catch (rollbackError) {
        console.error('KeywordOS restore rollback failed', rollbackError);
        throw new AggregateError([error, rollbackError], 'Restore failed and rollback was incomplete.');
      }
      throw error;
    }
  }

  function closeRestoreModal() {
    const root = $('#modal-root');
    if (root?.querySelector('#keywordos-restore-backup')) root.innerHTML = '';
  }

  function openRestoreConfirmation(fileName, backup) {
    const root = $('#modal-root');
    if (!root) return;
    const summary = restoreSummary(backup);
    root.innerHTML = `<div class="modal-wrap" id="keywordos-restore-backup"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="keywordos-restore-title"><div class="modal-header"><div><h2 id="keywordos-restore-title">Restore Local Workspace Backup</h2><small>${escapeHtml(fileName)}</small></div><button class="drawer-close" id="keywordos-restore-close" aria-label="Close restore dialog">×</button></div><div class="modal-body"><div class="notice-banner"><b>Local browser restore only.</b> This replaces current browser-local KeywordOS settings, decisions, workspaces and persisted imported datasets. It does not call Amazon, Cloudflare Access, or any mutable Worker API.</div><div class="schema-stats top-gap"><div class="schema-stat"><span>Local state keys</span><b>${summary.localKeys}</b></div><div class="schema-stat"><span>Registered datasets</span><b>${summary.registryDatasets}</b></div><div class="schema-stat"><span>Ads rows</span><b>${summary.adsRows.toLocaleString()}</b></div><div class="schema-stat"><span>Unified rows</span><b>${summary.financeRows.toLocaleString()}</b></div></div></div><div class="modal-footer"><button class="btn" id="keywordos-restore-cancel">Cancel</button><button class="btn danger" id="keywordos-restore-confirm">Replace Local Workspace</button></div></div></div>`;
    $('#keywordos-restore-close')?.addEventListener('click', closeRestoreModal);
    $('#keywordos-restore-cancel')?.addEventListener('click', closeRestoreModal);
    $('#keywordos-restore-confirm')?.addEventListener('click', async () => {
      const button = $('#keywordos-restore-confirm');
      if (button) button.disabled = true;
      try {
        await applyBackup(backup);
        location.reload();
      } catch (error) {
        console.error('KeywordOS restore failed', error);
        if (button) button.disabled = false;
        toast(error instanceof AggregateError ? 'Restore failed and automatic rollback was incomplete' : 'Restore failed; the previous local workspace was restored', 'error');
      }
    });
  }

  function chooseRestoreFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.hidden = true;
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return;
      if (file.size > MAX_BACKUP_BYTES) return toast('Backup file is too large to restore safely', 'error');
      try {
        const result = validateBackupObject(JSON.parse(await file.text()));
        if (!result.ok) return toast(result.error, 'error');
        openRestoreConfirmation(file.name, result.backup);
      } catch (error) {
        console.error('KeywordOS backup parsing failed', error);
        toast('Unable to read this backup file', 'error');
      }
    }, { once: true });
    input.click();
  }

  function ensureBackupControls() {
    if (!['Sync Center', 'Data Health'].includes(pageTitle()) || $('#keywordos-backup-actions')) return;
    const content = $('#content');
    if (!content) return;
    const actions = document.createElement('div');
    actions.id = 'keywordos-backup-actions';
    actions.className = 'toolbar-right';
    actions.innerHTML = '<button class="btn secondary" id="keywordos-export-backup">⇩ Export Local Backup</button><button class="btn secondary" id="keywordos-restore-backup-button">⇧ Restore Local Backup</button>';
    if (pageTitle() === 'Data Health') $('.settings-intro', content)?.appendChild(actions);
    else $('.card-head > div:last-child', content)?.appendChild(actions);
    $('#keywordos-export-backup')?.addEventListener('click', exportBackup);
    $('#keywordos-restore-backup-button')?.addEventListener('click', chooseRestoreFile);
  }

  function ensureUnifiedImportShortcut() {
    if (pageTitle() !== 'Import Center' || $('#keywordos-unified-import-shortcut')) return;
    const layout = $('.import-layout');
    if (!layout) return;
    const card = document.createElement('div');
    card.id = 'keywordos-unified-import-shortcut';
    card.className = 'card';
    card.style.marginBottom = '12px';
    card.innerHTML = '<div class="card-head"><div class="card-title"><h3>Unified Transaction Report</h3><small>Use the existing Finance validator and browser persistence path from Import Center.</small></div><button class="btn primary" id="keywordos-import-unified">＋ Import Unified Report</button></div><div class="card-body"><div class="notice-banner"><b>Local Store 01 import.</b> This reuses the existing Unified Transaction parser and does not upload the report to Amazon or create a remote mutable API request.</div></div>';
    layout.insertAdjacentElement('beforebegin', card);
    $('#keywordos-import-unified')?.addEventListener('click', () => $('#hidden-unified-file')?.click());
  }

  function enforceSuggestionTruth() {
    const navPill = $('#sidebar-nav [data-page="suggestions"] .nav-pill');
    if (navPill) {
      navPill.hidden = true;
      navPill.title = 'Aggregate count hidden because the legacy calculation includes unsupported Budget suggestions.';
    }

    if (pageTitle() === 'Dashboard') {
      const button = $('.h10-dashboard-head [data-nav="suggestions"]');
      if (button && /Suggestions/.test(button.textContent)) button.textContent = '✦ Suggestions';
    }

    if (pageTitle() !== 'Suggestions') return;
    const budget = $('[data-suggestion-tab="Budget"]');
    if (budget) {
      if (budget.classList.contains('active')) {
        $('[data-suggestion-tab="AI Bids"]')?.click();
        return;
      }
      budget.disabled = true;
      budget.setAttribute('aria-disabled', 'true');
      budget.title = 'Campaign budget is not present in the current imported Ads search-term dataset; KeywordOS will not synthesize current or recommended budget values.';
      const count = $('.tab-count', budget);
      if (count) count.textContent = '—';
    }
    const callout = $('.h10-callout');
    if (callout && !$('#keywordos-budget-truth')) {
      const notice = document.createElement('div');
      notice.id = 'keywordos-budget-truth';
      notice.className = 'notice-banner';
      notice.innerHTML = '<b>Budget recommendations unavailable:</b> the current imported Ads search-term dataset does not contain campaign budget. Bid, keyword and negative recommendations remain based on loaded report fields.';
      callout.insertAdjacentElement('afterend', notice);
    }
  }

  function neutralizeHourlyPreview() {
    if (pageTitle() !== 'Dayparting Schedules') return;
    $$('.hour-cell').forEach((button) => {
      for (let level = 0; level <= 4; level += 1) button.classList.remove(`level-${level}`);
      button.classList.add('keywordos-no-hourly-data');
    });
    const legend = $('.heat-legend');
    if (legend && legend.dataset.truthApplied !== '1') {
      legend.dataset.truthApplied = '1';
      legend.innerHTML = '<span>No hourly performance data loaded</span>';
    }
  }

  function installStyles() {
    if ($('#keywordos-local-operations-style')) return;
    const style = document.createElement('style');
    style.id = 'keywordos-local-operations-style';
    style.textContent = '.hour-cell.keywordos-no-hourly-data{background:#f4f7f9!important;color:#8a99a5!important;border-color:#e1e7eb!important}.heat-legend[data-truth-applied="1"]{color:var(--muted);font-size:11px}#keywordos-backup-actions{flex-wrap:wrap}';
    document.head.appendChild(style);
  }

  let refreshPending = false;
  function refresh() {
    if (refreshPending) return;
    refreshPending = true;
    requestAnimationFrame(() => {
      refreshPending = false;
      ensureBackupControls();
      ensureUnifiedImportShortcut();
      enforceSuggestionTruth();
      neutralizeHourlyPreview();
    });
  }

  function start() {
    installStyles();
    refresh();
    const content = $('#content');
    if (content) new MutationObserver(refresh).observe(content, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
