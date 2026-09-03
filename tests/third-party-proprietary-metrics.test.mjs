import test from 'node:test';
import assert from 'node:assert/strict';

await import('../growth-import-validation.js');
await import('../growth-workspaces.js');
await import('../keyword-lab.js');

const validation = globalThis.KeywordOSGrowthImportValidationTest;
const growth = globalThis.KeywordOSGrowthTest;
const lab = globalThis.KeywordOSKeywordLabTest;

function profileRows(csv, options){
  const profile = validation.profileThirdPartyCsv('reverse-asin', csv, options);
  assert.equal(profile.canProfile, true);
  const checked = validation.validateGrowthCsv('reverse-asin', profile.normalizedCsv);
  assert.equal(checked.rejectedCount, 0);
  return growth.parseKind('reverse-asin', checked.acceptedCsv);
}

test('Helium 10 proprietary columns keep exact names, raw values and snapshot provenance in Keyword Lab evidence', () => {
  const rows = profileRows(
    'Keyword Phrase,Search Volume,Cerebro IQ Score,CPR,KPS,Title Density\nreading glasses,1200,3456,18,9.7,7',
    { asin:'B000000001', marketplace:'US', snapshotDate:'2026-09-03', reportVersion:'h10-export', sourceFile:'cerebro.csv' }
  );
  const [result] = lab.reverseAsinEvidenceRows(rows, 'discovery');
  for(const [name,value] of Object.entries({'Cerebro IQ Score':'3456',CPR:'18',KPS:'9.7','Title Density':'7'})){
    assert.ok(Object.hasOwn(result.metrics, name), `${name} must keep its vendor field name`);
    const evidence = result.metrics[name];
    assert.equal(evidence.value, value);
    assert.equal(evidence.originalName, name);
    assert.equal(evidence.source, 'Helium 10');
    assert.equal(evidence.provider, 'Helium 10');
    assert.equal(evidence.reportType, 'Cerebro');
    assert.equal(evidence.reportVersion, 'h10-export');
    assert.equal(evidence.snapshotDate, '2026-09-03');
    assert.equal(evidence.sourceFile, 'cerebro.csv');
    assert.equal(evidence.quality, 'third-party-estimate');
    assert.equal(evidence.observations[0].value, value);
    assert.equal(evidence.observations[0].snapshotDate, '2026-09-03');
  }
  const provenance = result.provenance.find(item => item.kind === 'third-party-metric');
  assert.equal(provenance.provider, 'Helium 10');
  assert.equal(provenance.snapshotDate, '2026-09-03');
  assert.deepEqual(provenance.columns, ['Cerebro IQ Score','CPR','KPS','Title Density']);
});

test('SellerSprite SPR and DSR remain imported vendor evidence rather than KeywordOS-computed scores', () => {
  const rows = profileRows(
    'Keyword,Searches/M,SPR,DSR\nblue light readers,1500,22,4.5',
    { asin:'B000000002', marketplace:'US', snapshotDate:'2026-09-02', reportVersion:'seller-web', sourceFile:'sellersprite.csv' }
  );
  const [result] = lab.reverseAsinEvidenceRows(rows, 'batch');
  assert.equal(result.metrics.SPR.value, '22');
  assert.equal(result.metrics.DSR.value, '4.5');
  assert.equal(result.metrics.SPR.source, 'SellerSprite');
  assert.equal(result.metrics.DSR.snapshotDate, '2026-09-02');
  assert.equal(result.metrics.SPR.quality, 'third-party-estimate');
  assert.equal(result.metrics.DSR.quality, 'third-party-estimate');
});

test('Keyword Lab never invents proprietary score fields when the imported source did not provide them', () => {
  const [result] = lab.reverseAsinEvidenceRows([{
    asin:'B000000003', keyword:'computer readers', volume:800, organicRank:5, sponsoredRank:2,
    trafficShare:0.1, conversionRate:0.05, marketplace:'US', provider:'Helium 10', reportType:'Cerebro',
    reportVersion:'h10-export', snapshotDate:'2026-09-03', sourceFile:'cerebro.csv', sourceColumns:{'Title Density':'6'}
  }], 'discovery');
  assert.equal(result.metrics['Title Density'].value, '6');
  for(const name of ['Cerebro IQ Score','IQ','CPR','KPS','SPR','DSR'])assert.equal(Object.hasOwn(result.metrics,name), false, `${name} must not be synthesized`);
});
