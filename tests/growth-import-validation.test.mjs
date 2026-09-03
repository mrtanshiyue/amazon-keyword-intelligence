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


test('Helium 10 Cerebro profile maps supported fields and preserves proprietary columns', () => {
  const csv = 'Keyword Phrase,Search Volume,Organic Rank,Sponsored Rank,Cerebro IQ Score,Title Density\nreading glasses,1200,4,2,3456,7';
  const profile = validation.profileThirdPartyCsv('reverse-asin', csv, { asin:'B000000001', marketplace:'US', snapshotDate:'2026-09-03', sourceFile:'cerebro.csv' });
  assert.equal(profile.provider, 'Helium 10');
  assert.equal(profile.reportType, 'Cerebro');
  assert.equal(profile.canProfile, true);
  assert.deepEqual(profile.unknownHeaders, ['Cerebro IQ Score','Title Density']);
  const checked = validation.validateGrowthCsv('reverse-asin', profile.normalizedCsv);
  assert.equal(checked.acceptedCount, 1);
  const [row] = growth.parseKind('reverse-asin', checked.acceptedCsv);
  assert.equal(row.asin, 'B000000001');
  assert.equal(row.provider, 'Helium 10');
  assert.equal(row.marketplace, 'US');
  assert.equal(row.snapshotDate, '2026-09-03');
  assert.equal(row.sourceColumns['Cerebro IQ Score'], '3456');
  assert.equal(row.sourceColumns['Title Density'], '7');
});

test('Helium 10 multi-ASIN rank columns expand into long-form reverse-ASIN rows', () => {
  const csv = 'Keyword Phrase,Search Volume,Cerebro IQ Score,B000000001,B000000002\nreading glasses,900,123,3,8';
  const profile = validation.profileThirdPartyCsv('reverse-asin', csv, { marketplace:'US', snapshotDate:'2026-09-03' });
  assert.equal(profile.canProfile, true);
  assert.deepEqual(profile.wideAsins, ['B000000001','B000000002']);
  const checked = validation.validateGrowthCsv('reverse-asin', profile.normalizedCsv);
  assert.equal(checked.acceptedCount, 2);
  const rows = growth.parseKind('reverse-asin', checked.acceptedCsv);
  assert.deepEqual(rows.map(row => [row.asin,row.organicRank]), [['B000000001',3],['B000000002',8]]);
  assert.equal(rows[0].sourceColumns['Cerebro IQ Score'], '123');
});

test('SellerSprite profile maps current reverse-ASIN aliases without renaming proprietary metrics', () => {
  const csv = 'Keyword,Searches/M,Organic Position,SP Rank,Impression Share,Conversion,SPR,DSR\nreading glasses,1500,5,3,12%,8%,22,4.5';
  const profile = validation.profileThirdPartyCsv('reverse-asin', csv, { asin:'B000000003', marketplace:'US', snapshotDate:'2026-09-03', reportVersion:'web-export' });
  assert.equal(profile.provider, 'SellerSprite');
  assert.equal(profile.canProfile, true);
  assert.deepEqual(profile.unknownHeaders, ['SPR','DSR']);
  const checked = validation.validateGrowthCsv('reverse-asin', profile.normalizedCsv);
  const [row] = growth.parseKind('reverse-asin', checked.acceptedCsv);
  assert.equal(row.volume, 1500);
  assert.equal(row.organicRank, 5);
  assert.equal(row.sponsoredRank, 3);
  assert.equal(row.trafficShare, 0.12);
  assert.equal(row.conversionRate, 0.08);
  assert.equal(row.reportVersion, 'web-export');
  assert.deepEqual(row.sourceColumns, {SPR:'22',DSR:'4.5'});
});

test('third-party profiles fail closed until required source metadata exists and generic CSV is not claimed', () => {
  const h10 = validation.profileThirdPartyCsv('reverse-asin', 'Keyword Phrase,Cerebro IQ Score\nreading glasses,100');
  assert.deepEqual(new Set(h10.missingMetadata), new Set(['asin','marketplace','snapshotDate']));
  assert.equal(h10.canProfile, false);
  assert.throws(() => validation.profileThirdPartyCsv('reverse-asin', 'Keyword Phrase,Cerebro IQ Score\nreading glasses,100', {asin:'bad',marketplace:'US',snapshotDate:'2026-09-03'}), /Fallback ASIN/);
  assert.equal(validation.profileThirdPartyCsv('reverse-asin', 'ASIN,Keyword,Search Volume\nB000000001,reading glasses,100'), null);
});
