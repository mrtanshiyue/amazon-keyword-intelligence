import test from 'node:test';
import assert from 'node:assert/strict';

await import('../growth-workspaces.js');
await import('../growth-import-validation.js');
await import('../growth-import-gate.js');

const growth = globalThis.KeywordOSGrowthTest;
const validation = globalThis.KeywordOSGrowthImportValidationTest;
const gate = globalThis.KeywordOSGrowthImportGateTest;

test('all eight KeywordOS growth templates pass strict validation', () => {
  for (const kind of ['sqp', 'costs', 'inventory', 'ranks', 'product-master', 'competitor', 'reviews', 'reverse-asin']) {
    const result = validation.validateGrowthCsv(kind, growth.TEMPLATES[kind]);
    assert.equal(result.acceptedCount, 1, `${kind} template should be accepted`);
    assert.equal(result.rejectedCount, 0, `${kind} template should have no rejected rows`);
    assert.equal(result.canImport, true);
  }
});

test('invalid nonblank numeric values are rejected instead of becoming zero', () => {
  const csv = 'Search Query,Search Query Volume,Clicks\nvalid term,120,5\nbad term,not-a-number,3';
  const result = validation.validateGrowthCsv('sqp', csv);
  assert.equal(result.acceptedCount, 1);
  assert.equal(result.rejectedCount, 1);
  assert.match(result.rejectedRows[0].reasons.join(' '), /Search Query Volume is not a valid number/);
  assert.doesNotMatch(result.acceptedCsv, /bad term/);
});

test('impossible dates and missing identity fields are rejected with row reasons', () => {
  const csv = 'Date,Keyword,ASIN,Organic Rank\n2026-02-30,good keyword,B000000001,12\n2026-08-31,,B000000002,4\n2026-08-31,valid keyword,B000000003,7';
  const result = validation.validateGrowthCsv('ranks', csv);
  assert.equal(result.acceptedCount, 1);
  assert.equal(result.rejectedCount, 2);
  assert.match(result.rejectedRows[0].reasons.join(' '), /valid ISO-style date/);
  assert.match(result.rejectedRows[1].reasons.join(' '), /Keyword is required/);
});

test('blank records are counted as skipped and rejected CSV preserves original evidence', () => {
  const csv = 'SKU,Unit Cost\nGOOD-SKU,10\n\nBAD-SKU,abc\n';
  const result = validation.validateGrowthCsv('costs', csv);
  assert.equal(result.acceptedCount, 1);
  assert.equal(result.rejectedCount, 1);
  assert.equal(result.skippedCount, 1);
  assert.match(result.rejectedCsv, /CSV Row,Reason,SKU,Unit Cost/);
  assert.match(result.rejectedCsv, /BAD-SKU,abc/);
});

test('competitor snapshots allow an undated correction but reject an invalid supplied date', () => {
  const undated = validation.validateGrowthCsv('competitor', 'Date,ASIN,Price\n,B000000001,19.99');
  const badDate = validation.validateGrowthCsv('competitor', 'Date,ASIN,Price\n2026-02-30,B000000001,19.99');
  assert.equal(undated.acceptedCount, 1);
  assert.equal(undated.rejectedCount, 0);
  assert.equal(badDate.acceptedCount, 0);
  assert.match(badDate.rejectedRows[0].reasons.join(' '), /valid ISO-style date/);
});

test('review rating and reverse-ASIN comparison bounds fail closed', () => {
  const reviews = 'Date,ASIN,Rating,Title,Body\n2026-08-31,B000000001,6,Title,Body';
  const reviewResult = validation.validateGrowthCsv('reviews', reviews);
  assert.equal(reviewResult.acceptedCount, 0);
  assert.equal(reviewResult.rejectedCount, 1);

  const rows = ['ASIN,Keyword'];
  for (let index = 1; index <= 21; index += 1) rows.push(`B${String(index).padStart(9, '0')},keyword ${index}`);
  assert.throws(() => validation.validateGrowthCsv('reverse-asin', rows.join('\n')), /at most 20 ASINs/);
});

test('growth input gate recognizes only growth-file inputs and exposes deterministic counts', () => {
  assert.equal(gate.kindForInputId('growth-file-inventory'), 'inventory');
  assert.equal(gate.kindForInputId('hidden-file'), '');
  assert.equal(gate.summaryText({ acceptedCount: 4, rejectedCount: 2, skippedCount: 1 }), '4 accepted · 2 rejected · 1 skipped');
});
