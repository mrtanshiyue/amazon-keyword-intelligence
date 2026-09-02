import test from 'node:test';
import assert from 'node:assert/strict';

await import('../data-provenance-guard.js');
const { classifyAdsSource, approvalBlocked } = globalThis.KeywordOSDataProvenance;

test('validated persisted Ads data is treated as user import', () => {
  const result = classifyAdsSource({
    record: { source: 'ads.csv', rows: [{ searchTerm: 'reader' }] },
    seedRows: [{ searchTerm: 'seed' }],
    validation: { ok: true },
  });
  assert.equal(result.type, 'user-import');
  assert.equal(result.description, 'ads.csv');
  assert.equal(approvalBlocked(result), false);
});

test('invalid persisted Ads data falls back to bundled seed and blocks approval', () => {
  const result = classifyAdsSource({
    record: { source: 'bad.csv', rows: [{ searchTerm: 'reader' }] },
    seedRows: [{ searchTerm: 'seed' }],
    validation: { ok: false },
  });
  assert.equal(result.type, 'bundled-seed');
  assert.match(result.description, /stored import rejected/i);
  assert.equal(approvalBlocked(result), true);
});

test('missing Ads evidence blocks approval', () => {
  const result = classifyAdsSource();
  assert.equal(result.type, 'missing');
  assert.equal(approvalBlocked(result), true);
});
