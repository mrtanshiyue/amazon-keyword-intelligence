(() => {
  'use strict';

  const NUMERIC_FIELDS = ['impressions', 'clicks', 'cost', 'orders', 'sales'];

  function nonBlank(row) {
    return Array.isArray(row) && row.some((value) => String(value ?? '').trim());
  }

  function parseNonNegativeNumber(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const normalized = raw.replace(/[$,\s]/g, '');
    if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return null;
    const number = Number(normalized);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function validationError(code, details) {
    const error = new Error(code);
    error.name = 'ImportValueValidationError';
    error.code = code;
    error.details = details;
    return error;
  }

  function validateAdsAnalysis(result) {
    const parsed = result?.parsed;
    const resolved = result?.resolved;
    const normalizedRows = result?.rows;
    if (!Array.isArray(parsed) || !resolved?.map || !Array.isArray(normalizedRows)) return result;

    let normalizedIndex = 0;
    for (let index = 1; index < parsed.length; index += 1) {
      const row = parsed[index];
      if (!nonBlank(row)) continue;

      for (const field of NUMERIC_FIELDS) {
        const column = resolved.map[field];
        if (column == null) continue;
        const value = row[column];
        if (parseNonNegativeNumber(value) === null) {
          throw validationError('invalid_numeric_value', {
            rowNumber: index + 1,
            field,
            value: String(value ?? '')
          });
        }
      }

      const normalized = normalizedRows[normalizedIndex++];
      if (!normalized?.date) {
        throw validationError('invalid_date_value', {
          rowNumber: index + 1,
          field: 'date',
          value: String(row[resolved.map.date] ?? '')
        });
      }
    }
    return result;
  }

  function install(adapter) {
    if (!adapter || typeof adapter.analyzeText !== 'function' || adapter.__keywordosValueGuard) return adapter;
    const original = adapter.analyzeText.bind(adapter);
    adapter.analyzeText = (text) => validateAdsAnalysis(original(text));
    Object.defineProperty(adapter, '__keywordosValueGuard', { value: true });
    return adapter;
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.KeywordOSImportValueGuardTest = {
      NUMERIC_FIELDS,
      parseNonNegativeNumber,
      validateAdsAnalysis,
      install
    };
  }

  if (typeof window !== 'undefined') install(window.ReportAdapter);
})();