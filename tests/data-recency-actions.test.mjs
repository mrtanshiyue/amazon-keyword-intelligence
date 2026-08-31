import assert from 'node:assert/strict';
import test from 'node:test';

await import('../data-recency-actions.js');

const { extractLatestDate, validIsoDate, ageDays, formatRecency } = globalThis.KeywordOSDataRecencyTest;

test('extractLatestDate returns the latest displayed coverage endpoint', () => {
  assert.equal(extractLatestDate('2026-06-01 → 2026-06-30'), '2026-06-30');
  assert.equal(extractLatestDate('No dated rows'), '');
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