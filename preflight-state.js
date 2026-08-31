(() => {
  'use strict';

  const SCHEDULES_KEY = 'keywordos_v9_schedules';
  const MAX_DATASET_ROWS = 250000;
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

  if (typeof globalThis !== 'undefined') {
    globalThis.KeywordOSPreflightTest = {
      ADS_PERSISTED_NUMERIC_FIELDS,
      FINANCE_PERSISTED_NUMERIC_FIELDS,
      validNormalizedDate,
      validatePersistedDatasetRows,
      sanitizeScheduleDrafts
    };
    globalThis.KeywordOSPersistedDatasetGuard = {
      validateDatasetRows: validatePersistedDatasetRows
    };
  }

  if (typeof localStorage === 'undefined') return;

  try {
    const raw = localStorage.getItem(SCHEDULES_KEY);
    if (raw === null) {
      localStorage.setItem(SCHEDULES_KEY, '[]');
      return;
    }
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeScheduleDrafts(parsed);
    if (!Array.isArray(parsed) || sanitized.length !== parsed.length) {
      localStorage.setItem(SCHEDULES_KEY, JSON.stringify(sanitized));
    }
  } catch {
    // Leave unreadable storage untouched; the application already fails closed to defaults.
  }
})();
