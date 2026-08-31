(() => {
  'use strict';

  const SCHEDULES_KEY = 'keywordos_v9_schedules';
  const MAX_DATASET_ROWS = 250000;
  const LOCAL_ARRAY_KEYS = new Set([
    'keywordos_v9_actions',
    'keywordos_v9_negatives',
    'keywordos_v9_tracked',
    'keywordos_v9_protected',
    'keywordos_v9_rules',
    'keywordos_v9_logs',
    'keywordos_v9_presets',
    SCHEDULES_KEY,
    'keywordos_v9_research_history',
    'keywordos_v9_store_workspaces'
  ]);
  const LOCAL_STRING_KEYS = new Set(['keywordos_v9_preset_default']);
  const LOCAL_OBJECT_KEYS = new Set([
    'keywordos_v9_settings',
    'keywordos_v9_suggestion_reviews',
    'keywordos_v9_global_ui',
    'keywordos_v9_keyword_tags',
    'keywordos_v9_keyword_ui',
    'keywordos_v9_tracker_ui',
    'keywordos_v9_change_log_ui',
    'keywordos_v9_dashboard_ui',
    'keywordos_v9_data_ops',
    'keywordos_v9_shell_ui'
  ]);
  const LOCAL_STATE_KEYS = new Set([
    ...LOCAL_ARRAY_KEYS,
    ...LOCAL_STRING_KEYS,
    ...LOCAL_OBJECT_KEYS
  ]);
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

  function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function validNormalizedDate(value) {
    const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function validatePersistedDatasetRows(key, rows) {
    if (!['ads', 'finance'].includes(key) || !Array.isArray(rows) || rows.length > MAX_DATASET_ROWS) {
      return { ok: false, error: `Dataset ${key} has an unsupported persisted row set.` };
    }
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

  function sanitizeScheduleDrafts(value) {
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && item.id !== 'schedule-default');
  }

  function localStateDecision(key, raw) {
    if (!LOCAL_STATE_KEYS.has(key)) return { action: 'keep' };
    if (raw === null) return key === SCHEDULES_KEY ? { action: 'set', raw: '[]' } : { action: 'keep' };

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return key === SCHEDULES_KEY ? { action: 'set', raw: '[]' } : { action: 'remove' };
    }

    if (LOCAL_ARRAY_KEYS.has(key)) {
      if (!Array.isArray(parsed)) {
        return key === SCHEDULES_KEY ? { action: 'set', raw: '[]' } : { action: 'remove' };
      }
      if (key === SCHEDULES_KEY) {
        const sanitized = sanitizeScheduleDrafts(parsed);
        const nextRaw = JSON.stringify(sanitized);
        if (nextRaw !== raw) return { action: 'set', raw: nextRaw };
      }
      return { action: 'keep' };
    }

    if (LOCAL_STRING_KEYS.has(key)) {
      return typeof parsed === 'string' ? { action: 'keep' } : { action: 'remove' };
    }

    return isRecord(parsed) ? { action: 'keep' } : { action: 'remove' };
  }

  function repairLocalState(storage) {
    for (const key of LOCAL_STATE_KEYS) {
      const decision = localStateDecision(key, storage.getItem(key));
      if (decision.action === 'set') storage.setItem(key, decision.raw);
      if (decision.action === 'remove') storage.removeItem(key);
    }
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.KeywordOSPreflightTest = {
      ADS_PERSISTED_NUMERIC_FIELDS,
      FINANCE_PERSISTED_NUMERIC_FIELDS,
      validNormalizedDate,
      validatePersistedDatasetRows,
      sanitizeScheduleDrafts,
      localStateDecision,
      repairLocalState
    };
    globalThis.KeywordOSPersistedDatasetGuard = {
      validateDatasetRows: validatePersistedDatasetRows
    };
  }

  if (typeof localStorage === 'undefined') return;

  try {
    repairLocalState(localStorage);
  } catch {
    // Storage may be unavailable; application load helpers still fall back locally.
  }
})();
