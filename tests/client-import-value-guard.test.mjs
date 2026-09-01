import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

await import('../client-import-value-guard.js');

const { install, parseNonNegativeNumber } = globalThis.KeywordOSImportValueGuardTest;
const adapterCode = await readFile(new URL('../report-adapter.js', import.meta.url), 'utf8');

function createAdapter() {
  const sandbox = { window: {} };
  vm.runInNewContext(adapterCode, sandbox);
  return install(sandbox.window.ReportAdapter);
}

const HEADER = [
  'Advertiser Account Name', 'Campaign Name', 'Ad Group Name', 'Customer Search Term',
  'Date', 'Targeting', 'Match Type', 'Impressions', 'Clicks', 'Spend', 'Orders', 'Sales'
].join(',');

function row(overrides = {}) {
  const values = {
    account: 'Account A', campaign: 'Campaign A', adGroup: 'Group A', term: 'reading glasses',
    date: '2026-06-01', target: 'reading glasses', match: 'EXACT', impressions: '100',
    clicks: '10', spend: '5.25', orders: '2', sales: '20', ...overrides
  };
  return [values.account, values.campaign, values.adGroup, values.term, values.date, values.target,
    values.match, values.impressions, values.clicks, values.spend, values.orders, values.sales].join(',');
}

test('client value guard accepts the authoritative Ads sample', async () => {
  const body = await readFile(new URL('../sample-data/202606.csv', import.meta.url), 'utf8');
  const result = createAdapter().analyzeText(body);
  assert.equal(result.summary.rows, 8753);
});

test('client value guard rejects malformed required numeric values instead of coercing them to zero', () => {
  const adapter = createAdapter();
  assert.throws(
    () => adapter.analyzeText(`${HEADER}\n${row({ spend: 'not-a-number' })}\n`),
    (error) => error.code === 'invalid_numeric_value' && error.details?.field === 'cost' && error.details?.rowNumber === 2
  );
});

test('client value guard rejects negative required Ads metrics', () => {
  const adapter = createAdapter();
  assert.throws(
    () => adapter.analyzeText(`${HEADER}\n${row({ clicks: '-1' })}\n`),
    (error) => error.code === 'invalid_numeric_value' && error.details?.field === 'clicks'
  );
});

test('client value guard rejects dates the existing normalizer cannot parse', () => {
  const adapter = createAdapter();
  assert.throws(
    () => adapter.analyzeText(`${HEADER}\n${row({ date: 'not-a-date' })}\n`),
    (error) => error.code === 'invalid_date_value' && error.details?.rowNumber === 2
  );
});

test('numeric parser accepts normal Amazon numeric formatting', () => {
  assert.equal(parseNonNegativeNumber('$1,234.56'), 1234.56);
  assert.equal(parseNonNegativeNumber('0'), 0);
  assert.equal(parseNonNegativeNumber(''), null);
  assert.equal(parseNonNegativeNumber('NaN'), null);
});

test('Ads adapter rejects unclosed quoted fields', () => {
  assert.throws(() => createAdapter().analyzeText('"unclosed'), /unclosed quoted field/i);
});
