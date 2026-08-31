(() => {
  'use strict';

  const NUMERIC_HEADERS = [
    'quantity',
    'product sales',
    'product sales tax',
    'shipping credits',
    'shipping credits tax',
    'gift wrap credits',
    'giftwrap credits tax',
    'regulatory fee',
    'tax on regulatory fee',
    'promotional rebates',
    'promotional rebates tax',
    'marketplace withheld tax',
    'selling fees',
    'fba fees',
    'other transaction fees',
    'other',
    'total'
  ];

  function nonBlank(row) {
    return Array.isArray(row) && row.some((value) => String(value ?? '').trim());
  }

  function parseSignedNumberOrBlank(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return { blank: true, value: 0 };
    const normalized = raw.replace(/[$,\s]/g, '');
    if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return null;
    const number = Number(normalized);
    return Number.isFinite(number) ? { blank: false, value: number } : null;
  }

  function validTransactionDate(value) {
    const raw = String(value ?? '').trim();
    return Boolean(raw) && !Number.isNaN(Date.parse(raw));
  }

  function validationError(code, details) {
    const error = new Error(code);
    error.name = 'UnifiedImportValueValidationError';
    error.code = code;
    error.details = details;
    return error;
  }

  function validateUnifiedAnalysis(result) {
    const parsed = result?.parsed;
    const headerIndex = result?.headerIndex;
    const headers = result?.headers;
    if (!Array.isArray(parsed) || !Number.isInteger(headerIndex) || !Array.isArray(headers)) return result;

    const indexByHeader = new Map(headers.map((header, index) => [String(header || '').trim().toLowerCase(), index]));
    const dateIndex = indexByHeader.get('date/time');

    for (let index = headerIndex + 1; index < parsed.length; index += 1) {
      const row = parsed[index];
      if (!nonBlank(row)) continue;

      for (const header of NUMERIC_HEADERS) {
        const column = indexByHeader.get(header);
        if (column == null) continue;
        const value = row[column];
        if (parseSignedNumberOrBlank(value) === null) {
          throw validationError('invalid_unified_numeric_value', {
            rowNumber: index + 1,
            field: header,
            value: String(value ?? '')
          });
        }
      }

      const dateValue = row[dateIndex];
      if (!validTransactionDate(dateValue)) {
        throw validationError('invalid_unified_date_value', {
          rowNumber: index + 1,
          field: 'date/time',
          value: String(dateValue ?? '')
        });
      }
    }
    return result;
  }

  function install(adapter) {
    if (!adapter || typeof adapter.analyzeText !== 'function' || adapter.__keywordosValueGuard) return adapter;
    const original = adapter.analyzeText.bind(adapter);
    adapter.analyzeText = (text) => validateUnifiedAnalysis(original(text));
    Object.defineProperty(adapter, '__keywordosValueGuard', { value: true });
    return adapter;
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.KeywordOSUnifiedValueGuardTest = {
      NUMERIC_HEADERS,
      parseSignedNumberOrBlank,
      validTransactionDate,
      validateUnifiedAnalysis,
      install
    };
  }

  if (typeof window !== 'undefined') install(window.UnifiedReportAdapter);
})();