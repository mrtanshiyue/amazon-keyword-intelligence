const ADS_REQUIRED_HEADERS = {
  accountName: ['广告主账户名称', 'Advertiser Account Name', 'Account Name'],
  campaignName: ['广告活动名称', 'Campaign Name'],
  adGroupName: ['广告组名称', 'Ad Group Name'],
  searchTerm: ['搜索词', 'Customer Search Term', 'Search Term'],
  date: ['日期', 'Date'],
  target: ['投放方案', 'Targeting', 'Target'],
  matchType: ['投放匹配类型-Targeting match type', 'Match Type', 'Targeting match type'],
  impressions: ['展示量', 'Impressions'],
  clicks: ['点击量', 'Clicks'],
  cost: ['总成本', 'Spend', 'Cost'],
  orders: ['购买量', 'Orders', 'Purchases'],
  sales: ['销售额', 'Sales', 'Attributed Sales'],
};

const UNIFIED_REQUIRED_HEADERS = [
  'date/time',
  'settlement id',
  'type',
  'order id',
  'sku',
  'description',
  'quantity',
  'marketplace',
  'product sales',
  'promotional rebates',
  'marketplace withheld tax',
  'selling fees',
  'fba fees',
  'other transaction fees',
  'other',
  'total',
];

const IMPORT_KINDS = new Set(['amazon_ads', 'unified_transaction']);

// The parser materializes bytes, decoded text, rows and fields at once. Increase this
// only after moving large imports to a streaming parser.
export const MAX_IMPORT_BYTES = 16 * 1024 * 1024;

export class ImportValidationError extends Error {
  constructor(code, details = null) {
    super(code);
    this.name = 'ImportValidationError';
    this.code = code;
    this.details = details;
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') quoted = true;
    else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (character !== '\r') {
      field += character;
    }
  }

  if (quoted) throw new ImportValidationError('malformed_csv');
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function cleanHeader(value) {
  return String(value || '').replace(/^\uFEFF/, '').trim().toLowerCase();
}

function nonBlank(row) {
  return Array.isArray(row) && row.some((value) => String(value || '').trim());
}

function validateRowWidths(rows, startIndex, expectedFieldCount) {
  for (let index = startIndex; index < rows.length; index += 1) {
    const row = rows[index];
    if (!nonBlank(row)) continue;
    if (row.length !== expectedFieldCount) {
      throw new ImportValidationError('inconsistent_row_width', {
        rowNumber: index + 1,
        expectedFieldCount,
        actualFieldCount: row.length,
      });
    }
  }
}

function validateAdsCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length || !nonBlank(rows[0])) throw new ImportValidationError('empty_csv');

  const headers = rows[0].map(cleanHeader);
  const missingRequiredFields = [];
  for (const [field, aliases] of Object.entries(ADS_REQUIRED_HEADERS)) {
    const found = aliases.some((alias) => headers.includes(alias.toLowerCase()));
    if (!found) missingRequiredFields.push(field);
  }
  if (missingRequiredFields.length) {
    throw new ImportValidationError('missing_required_fields', { missingRequiredFields });
  }

  validateRowWidths(rows, 1, rows[0].length);
  const rowCount = rows.slice(1).filter(nonBlank).length;
  if (!rowCount) throw new ImportValidationError('empty_dataset');

  return {
    kind: 'amazon_ads',
    reportType: 'Amazon Ads Search Term Performance',
    rowCount,
    fieldCount: rows[0].length,
    missingRequiredFields: [],
  };
}

function findUnifiedHeader(rows) {
  return rows.findIndex((row) => {
    if (!nonBlank(row) || cleanHeader(row[0]) !== 'date/time') return false;
    const headers = row.map(cleanHeader);
    return headers.includes('type') && headers.includes('total');
  });
}

function validateUnifiedCsv(text) {
  const rows = parseCsv(text);
  const headerIndex = findUnifiedHeader(rows);
  if (headerIndex < 0) throw new ImportValidationError('unified_header_not_found');

  const headers = rows[headerIndex].map(cleanHeader);
  const missingRequiredFields = UNIFIED_REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingRequiredFields.length) {
    throw new ImportValidationError('missing_required_fields', { missingRequiredFields });
  }

  validateRowWidths(rows, headerIndex + 1, rows[headerIndex].length);
  const rowCount = rows.slice(headerIndex + 1).filter(nonBlank).length;
  if (!rowCount) throw new ImportValidationError('empty_dataset');

  return {
    kind: 'unified_transaction',
    reportType: 'Amazon Unified Transaction Report',
    rowCount,
    fieldCount: rows[headerIndex].length,
    headerIndex,
    missingRequiredFields: [],
  };
}

export function validateImportText(kind, text) {
  const normalizedKind = String(kind || '').trim().toLowerCase();
  if (!IMPORT_KINDS.has(normalizedKind)) {
    throw new ImportValidationError('unsupported_import_kind');
  }
  if (typeof text !== 'string' || !text.length) {
    throw new ImportValidationError('empty_import_body');
  }
  return normalizedKind === 'amazon_ads' ? validateAdsCsv(text) : validateUnifiedCsv(text);
}

function bodyBytes(body) {
  if (typeof body === 'string') return new TextEncoder().encode(body);
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (ArrayBuffer.isView(body)) {
    return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  }
  throw new ImportValidationError('invalid_import_body');
}

function hex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function validateImportBody(kind, body) {
  const bytes = bodyBytes(body);
  if (!bytes.byteLength) throw new ImportValidationError('empty_import_body');
  if (bytes.byteLength > MAX_IMPORT_BYTES) {
    throw new ImportValidationError('import_too_large', {
      maxByteSize: MAX_IMPORT_BYTES,
      actualByteSize: bytes.byteLength,
    });
  }

  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new ImportValidationError('invalid_utf8');
  }

  const summary = validateImportText(kind, text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return {
    ...summary,
    byteSize: bytes.byteLength,
    contentSha256: hex(digest),
  };
}
