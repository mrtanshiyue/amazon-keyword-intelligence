import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../keyword-lab.js');
const lab = globalThis.KeywordOSKeywordLabTest;

test('Keyword Lab exposes three modes without pretending the batch parser already supports 200 inputs', () => {
  assert.deepEqual(Object.keys(lab.MODE_CATALOG), ['discovery', 'batch', 'asin']);
  assert.equal(lab.MODE_CATALOG.discovery.route, 'cerebro');
  assert.equal(lab.MODE_CATALOG.batch.route, 'cerebro');
  assert.equal(lab.MODE_CATALOG.batch.capability, 'single-phrase');
  assert.equal(lab.MODE_CATALOG.batch.inputLimit, 1);
  assert.equal(lab.MODE_CATALOG.asin.route, 'asin-comparison');
  assert.match(lab.labels('en').batchLimit, /one phrase/i);
  assert.match(lab.labels('en').batchLimit, /200-keyword/i);
});

test('Ads discovery and batch rows use the same source-aware result contract', () => {
  const source = [{
    name: 'reading glasses women', impressions: 100, clicks: 10, orders: 2,
    spend: 12.5, sales: 45, cvr: 0.2, acos: 12.5 / 45, roas: 3.6,
    products: 1
  }];
  const discovery = lab.adsResultRows(source, 'discovery')[0];
  const batch = lab.adsResultRows(source, 'batch')[0];
  assert.deepEqual(Object.keys(discovery), lab.RESULT_FIELDS);
  assert.deepEqual(Object.keys(batch), lab.RESULT_FIELDS);
  assert.equal(discovery.keyword, 'reading glasses women');
  assert.equal(batch.mode, 'batch');
  assert.deepEqual(discovery.sources, ['ads']);
  assert.equal(discovery.metrics.orders.source, 'ads');
  assert.equal(discovery.metrics.orders.value, 2);
  assert.equal(discovery.provenance[0].kind, 'ads');
});

test('ASIN comparison rows preserve imported ASIN context inside the same result shape', () => {
  const row = lab.asinResultRows([{
    keyword: 'reading glasses women',
    asins: ['B000000001', 'B000000002'],
    segment: 'Shared',
    volume: 1200,
    organicGap: { own: 8, competitor: 3 },
    sponsoredGap: null,
    trafficGap: { own: 0.12, competitor: 0.2 },
    conversionGap: null
  }])[0];
  assert.deepEqual(Object.keys(row), lab.RESULT_FIELDS);
  assert.equal(row.mode, 'asin');
  assert.deepEqual(row.sources, ['reverse-asin']);
  assert.deepEqual(row.asins, ['B000000001', 'B000000002']);
  assert.equal(row.segment, 'Shared');
  assert.equal(row.metrics.searchVolume.value, 1200);
  assert.equal(row.metrics.organicRank.source, 'reverse-asin');
  assert.equal(row.metrics.sponsoredRank.available, false);
});

test('discovery keeps token-any behavior while the current batch boundary remains one literal phrase', () => {
  const rows = [
    { name: 'reading glasses women' },
    { name: 'blue light glasses' },
    { name: 'reading sunglasses' }
  ];
  assert.deepEqual(
    lab.filterAdsByQuery(rows, 'reading glasses', 'discovery').map(row => row.name),
    ['reading glasses women', 'blue light glasses', 'reading sunglasses']
  );
  assert.deepEqual(
    lab.filterAdsByQuery(rows, 'reading glasses', 'batch').map(row => row.name),
    ['reading glasses women']
  );
});

test('model summary reports only explicitly available source metrics', () => {
  const rows = lab.asinResultRows([{
    keyword: 'women readers', asins: ['B000000001'], segment: 'Ownership unknown',
    volume: 0, organicGap: null, sponsoredGap: null, trafficGap: null, conversionGap: null
  }]);
  const summary = lab.modelSummary(rows);
  assert.equal(summary.rows, 1);
  assert.deepEqual(summary.sources, ['reverse-asin']);
  assert.deepEqual(summary.metrics, []);
  assert.equal(lab.sameResultShape(rows), true);
});

test('Keyword Lab runtime loads after app state is exposed and is included in check/build', async () => {
  const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const appIndex = index.indexOf('<script src="app.js"></script>');
  const labIndex = index.indexOf('<script src="keyword-lab.js"></script>');
  assert.ok(appIndex >= 0);
  assert.ok(labIndex > appIndex, 'Keyword Lab should load after app.js exposes KeywordOSUIBridge');
  assert.match(pkg.scripts.check, /node --check keyword-lab\.js/);
  assert.match(pkg.scripts.build, /keyword-lab\.js/);
});
