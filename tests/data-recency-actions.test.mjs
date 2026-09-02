import assert from 'node:assert/strict';
import test from 'node:test';

await import('../data-recency-actions.js');

const {
  validIsoDate,
  latestDateFromRows,
  datasetRecency,
  recencyModel,
  ageDays,
  formatRecency,
  dataHealthRecencyText
} = globalThis.KeywordOSDataRecencyTest;

test('latestDateFromRows reads active data rows instead of rendered coverage text', () => {
  assert.equal(latestDateFromRows([{ date: '2026-06-01' }, { date: '2026-06-30' }, { date: 'bad-date' }]), '2026-06-30');
  assert.equal(latestDateFromRows([]), '');
});

test('recency model uses matching validated registry coverage for active Ads and Finance rows', () => {
  const adsRows = [{ date: '2026-06-01' }, { date: '2026-06-30' }];
  const financeRows = [{ date: '2026-07-01' }, { date: '2026-07-04' }];
  const model = recencyModel({
    adsRows,
    financeRows,
    datasetRegistry: [
      { kind: 'ads', storeId: 'store-a', rowCount: 2, coverage: { max: '2026-06-30' }, validation: { status: 'validated' } },
      { kind: 'finance', storeId: 'store-a', rowCount: 2, coverage: { max: '2026-07-04' }, validation: { status: 'validated' } }
    ]
  });
  assert.deepEqual(model.ads, { latestDate: '2026-06-30', origin: 'registry' });
  assert.deepEqual(model.finance, { latestDate: '2026-07-04', origin: 'registry' });
});

test('stale registry metadata never overrides the currently active rows', () => {
  const rows = [{ date: '2026-08-01' }, { date: '2026-08-31' }];
  const result = datasetRecency([
    { kind: 'ads', storeId: 'store-a', rowCount: 2, coverage: { max: '2026-01-31' }, validation: { status: 'validated' } }
  ], 'ads', rows);
  assert.deepEqual(result, { latestDate: '2026-08-31', origin: 'active-rows' });
});

test('ageDays uses calendar-day distance without timezone drift', () => {
  assert.equal(ageDays('2026-06-30', '2026-08-31'), 62);
  assert.equal(ageDays('2026-08-31', '2026-08-31'), 0);
  assert.equal(ageDays('2026-09-01', '2026-08-31'), -1);
});

test('invalid calendar dates are not accepted as recency evidence', () => {
  assert.equal(validIsoDate('2026-02-30'), false);
  assert.equal(ageDays('2026-02-30', '2026-08-31'), null);
});

test('formatRecency reports exact loaded-data age without inventing a freshness threshold', () => {
  assert.equal(formatRecency('2026-06-30', '2026-08-31'), '2026-06-30 · 62 days behind today');
  assert.equal(formatRecency('2026-09-01', '2026-08-31'), '2026-09-01 · 1 day ahead of today · review source date');
});

test('Data Health recency text reports Ads and Finance dates from the same state model', () => {
  const text = dataHealthRecencyText({
    ads: { latestDate: '2026-06-30' },
    finance: { latestDate: '2026-07-04' }
  }, '2026-09-02');
  assert.equal(text, 'Amazon Ads 2026-06-30 · 64 days behind today · Unified Transaction 2026-07-04 · 60 days behind today');
});