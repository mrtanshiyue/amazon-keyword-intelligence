import test from 'node:test';
import assert from 'node:assert/strict';

await import('../keyword-lab.js');
const lab = globalThis.KeywordOSKeywordLabTest;
const validated = (kind, rows) => ({
  kind,
  source: `${kind}.csv`,
  importedAt: '2026-09-03T00:00:00Z',
  validation: { status: 'validated' },
  rows
});

test('all five keyword evidence sources merge on an exact normalized keyword', () => {
  const records = [
    validated('sqp', [{ query: 'Reading Glasses', date: '2026-09-02', volume: 1000, impressions: 500, clicks: 50, purchases: 10 }]),
    validated('reverse-asin', [{ keyword: 'reading glasses', asin: 'B1', volume: 900, organicRank: 4, sponsoredRank: 2, trafficShare: 0.1, conversionRate: 0.2 }]),
    validated('ranks', [
      { keyword: 'READING GLASSES', asin: 'B1', date: '2026-09-01', organicRank: 8, sponsoredRank: 3, indexed: true },
      { keyword: 'READING GLASSES', asin: 'B1', date: '2026-09-03', organicRank: 6, sponsoredRank: 2, indexed: true }
    ]),
    validated('keyword-assets', [{ keyword: 'reading glasses', status: 'active', intent: 'core', tags: ['hero'], protected: true }])
  ];
  const rows = lab.combinedKeywordEvidence([
    { name: 'reading glasses', impressions: 100, clicks: 10, orders: 2, spend: 5, sales: 20, cvr: 0.2, acos: 0.25, roas: 4, products: 1 }
  ], records);
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.deepEqual(row.sources, ['ads', 'sqp', 'reverse-asin', 'ranks', 'keyword-assets']);
  assert.equal(row.metrics.orders.value, 2);
  assert.equal(row.metrics['ads.clicks'].value, 10);
  assert.equal(row.metrics['sqp.clicks'].value, 50);
  assert.equal(row.metrics['sqp.searchVolume'].value, 1000);
  assert.equal(row.metrics['reverse-asin.searchVolume'].value, 900);
  assert.equal(row.metrics['ranks.organicRank'].value, 6);
  assert.equal(row.metrics['reverse-asin.organicRank'].value, 4);
  assert.equal(row.metrics.assetStatus.value, 'active');
});

test('same-named metrics are source-qualified instead of silently overwritten', () => {
  const ads = lab.resultRow({ keyword: 'reader', sources: ['ads'], metrics: { clicks: lab.metric(3, 'ads') } });
  const sqp = lab.resultRow({ keyword: 'reader', sources: ['sqp'], metrics: { clicks: lab.metric(9, 'sqp') } });
  const merged = lab.mergeKeywordRows([ads, sqp]);
  assert.equal(Object.hasOwn(merged.metrics, 'clicks'), false);
  assert.equal(merged.metrics['ads.clicks'].value, 3);
  assert.equal(merged.metrics['sqp.clicks'].value, 9);
});

test('invalid Dataset Registry records do not enter keyword evidence', () => {
  const records = [{ kind: 'sqp', validation: { status: 'invalid' }, rows: [{ query: 'sqp only', clicks: 3 }] }];
  assert.deepEqual(lab.combinedKeywordEvidence([], records), []);
});

test('rank evidence keeps the latest snapshot per ASIN without collapsing different ASINs', () => {
  const rows = lab.rankResultRows([
    { keyword: 'reader', asin: 'B1', date: '2026-09-01', organicRank: 10, indexed: false },
    { keyword: 'reader', asin: 'B1', date: '2026-09-03', organicRank: 5, indexed: true },
    { keyword: 'reader', asin: 'B2', date: '2026-09-02', organicRank: 7, indexed: true }
  ]);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].asins, ['B1', 'B2']);
  assert.ok(Array.isArray(rows[0].metrics.organicRank.value));
  assert.deepEqual(rows[0].metrics.organicRank.value.map(item => [item.asin, item.value]), [['B1', 5], ['B2', 7]]);
});

test('Batch Analysis can match SQP or Keyword Library evidence even when Ads has no exact row', () => {
  const records = [
    validated('sqp', [{ query: 'sqp only', volume: 100 }]),
    validated('keyword-assets', [{ keyword: 'library only', status: 'saved' }])
  ];
  const evidence = lab.combinedKeywordEvidence([], records, 'batch');
  const joined = lab.batchLeftJoin(['SQP ONLY', 'library only', 'missing'], evidence);
  assert.equal(joined[0].matched, true);
  assert.deepEqual(joined[0].sources, ['sqp']);
  assert.equal(joined[1].matched, true);
  assert.deepEqual(joined[1].sources, ['keyword-assets']);
  assert.equal(joined[2].matched, false);
  assert.match(joined[2].reason, /No exact keyword match/i);
});

test('ASIN enrichment excludes raw reverse-ASIN rows so comparison evidence is not duplicated', () => {
  const records = [
    validated('reverse-asin', [{ keyword: 'reader', asin: 'B1', volume: 100 }]),
    validated('sqp', [{ query: 'reader', volume: 120 }])
  ];
  const auxiliary = lab.combinedKeywordEvidence([], records, 'asin', { excludeSources: ['reverse-asin'] });
  assert.deepEqual(auxiliary[0].sources, ['sqp']);
  const base = lab.asinResultRows([{ keyword: 'reader', asins: ['B1'], segment: 'Shared', volume: 100 }]);
  const enriched = lab.enrichBaseRows(base, auxiliary, 'asin')[0];
  assert.deepEqual(enriched.sources, ['sqp', 'reverse-asin']);
  assert.equal(enriched.metrics['sqp.searchVolume'].value, 120);
  assert.equal(enriched.metrics['reverse-asin.searchVolume'].value, 100);
});
