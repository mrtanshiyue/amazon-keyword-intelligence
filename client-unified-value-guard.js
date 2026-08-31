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
  const MONTH = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

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

  function validCalendarDate(year, month, day) {
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function validTransactionDate(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return false;
    let match = raw.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})(?:\s|$)/);
    if (match) {
      const month = MONTH[match[1]];
      return Boolean(month) && validCalendarDate(Number(match[3]), month, Number(match[2]));
    }
    match = raw.match(/^(\d{4})[-\/]([0-9]{1,2})[-\/]([0-9]{1,2})(?:\s|$)/);
    return Boolean(match) && validCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  function validationError(code, details) {
    const error = new Error(code);
    error.name = 'UnifiedImportValueValidationError';
    error.code = code;
    error.details = details;
    return error;
  }

  function validateUnifiedRows(parsed, headerIndex) {
    if (!Array.isArray(parsed) || !Number.isInteger(headerIndex) || headerIndex < 0) return;
    const headers = parsed[headerIndex].map((header) => String(header || '').trim().toLowerCase());
    const indexByHeader = new Map(headers.map((header, index) => [header, index]));
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

      const dateValue = dateIndex == null ? '' : row[dateIndex];
      if (!validTransactionDate(dateValue)) {
        throw validationError('invalid_unified_date_value', {
          rowNumber: index + 1,
          field: 'date/time',
          value: String(dateValue ?? '')
        });
      }
    }
  }

  function validateUnifiedText(adapter, text) {
    const parsed = adapter.parseCSV(text);
    const headerIndex = adapter.findHeader(parsed);
    validateUnifiedRows(parsed, headerIndex);
  }

  function install(adapter) {
    if (!adapter || typeof adapter.analyzeText !== 'function' || adapter.__keywordosValueGuard) return adapter;
    if (typeof adapter.parseCSV !== 'function' || typeof adapter.findHeader !== 'function') return adapter;
    const original = adapter.analyzeText.bind(adapter);
    adapter.analyzeText = (text) => {
      validateUnifiedText(adapter, text);
      return original(text);
    };
    Object.defineProperty(adapter, '__keywordosValueGuard', { value: true });
    return adapter;
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.KeywordOSUnifiedValueGuardTest = {
      NUMERIC_HEADERS,
      parseSignedNumberOrBlank,
      validTransactionDate,
      validateUnifiedRows,
      install
    };
  }

  if (typeof window !== 'undefined') install(window.UnifiedReportAdapter);
})();