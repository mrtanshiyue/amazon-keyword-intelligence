import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

await import('../client-unified-value-guard.js');

const { install, parseSignedNumberOrBlank, validTransactionDate } = globalThis.KeywordOSUnifiedValueGuardTest;
const adapterCode = await readFile(new URL('../unified-report-adapter.js', import.meta.url), 'utf8');

function createAdapter() {
  const sandbox = { window: {} };
  vm.runInNewContext(adapterCode, sandbox);
  return install(sandbox.window.UnifiedReportAdapter);
}

const HEADER = [
  'Date/Time', 'Settlement Id', 'Type', 'Order Id', 'SKU', 'Description', 'Quantity', 'Marketplace',
  'Product Sales', 'Promotional Rebates', 'Marketplace Withheld Tax', 'Selling Fees', 'FBA Fees',
  'Other Transaction Fees', 'Other', 'Total'
].join(',');

function row(overrides = {}) {
  const values = {
    date: 'Jun 1, 2026 12:00:00 AM PDT', settlement: '1', type: 'Order', orderId: 'ORDER-1', sku: 'YS001',
    description: 'Sale', quantity: '1', marketplace: 'Amazon.com', productSales: '20', promo: '0', withheld: '-1.20',
    sellingFees: '-3', fbaFees: '-4', otherTxn: '0', other: '', total: '11.80', ...overrides
  };
  return [values.date, values.settlement, values.type, values.orderId, values.sku, values.description, values.quantity,
    values.marketplace, values.productSales, values.promo, values.withheld, values.sellingFees, values.fbaFees,
    values.otherTxn, values.other, values.total].map((value) => String(value).includes(',') ? `"${value}"` : value).join(',');
}

test('Unified value guard accepts the authoritative transaction sample', async () => {
  const body = await readFile(new URL('../sample-data/UnifiedTransaction-202606.csv', import.meta.url), 'utf8');
  const result = createAdapter().analyzeText(body);
  assert.equal(result.summary.rows, 3643);
});

test('Unified value guard accepts signed values and blank optional numeric cells', () => {
  const result = createAdapter().analyzeText(`${HEADER}\n${row()}\n`);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].sellingFees, -3);
  assert.equal(result.rows[0].other, 0);
});

test('Unified value guard rejects nonblank malformed finance values', () => {
  assert.throws(
    () => createAdapter().analyzeText(`${HEADER}\n${row({ total: 'not-a-number' })}\n`),
    (error) => error.code === 'invalid_unified_numeric_value' && error.details?.field === 'total' && error.details?.rowNumber === 2
  );
});

test('Unified value guard rejects invalid transaction dates', () => {
  assert.throws(
    () => createAdapter().analyzeText(`${HEADER}\n${row({ date: 'Foo 99, 2026' })}\n`),
    (error) => error.code === 'invalid_unified_date_value' && error.details?.rowNumber === 2
  );
});

test('signed parser distinguishes blanks from malformed values', () => {
  assert.deepEqual(parseSignedNumberOrBlank(''), { blank: true, value: 0 });
  assert.deepEqual(parseSignedNumberOrBlank('$-1,234.50'), { blank: false, value: -1234.5 });
  assert.equal(parseSignedNumberOrBlank('abc'), null);
  assert.equal(validTransactionDate('Jun 1, 2026 12:00:00 AM PDT'), true);
});