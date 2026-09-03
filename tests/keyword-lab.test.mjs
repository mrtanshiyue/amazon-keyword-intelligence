import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../keyword-lab.js');
const lab = globalThis.KeywordOSKeywordLabTest;

test('Keyword Lab exposes three modes and Batch Analysis supports up to 200 inputs', () => {
  assert.deepEqual(Object.keys(lab.MODE_CATALOG), ['discovery', 'batch', 'asin']);
  assert.equal(lab.MODE_CATALOG.discovery.route, 'cerebro');
  assert.equal(lab.MODE_CATALOG.batch.route, 'cerebro');
  assert.equal(lab.MODE_CATALOG.batch.capability, 'up-to-200');
  assert.equal(lab.MODE_CATALOG.batch.inputLimit, 200);
  assert.equal(lab.BATCH_INPUT_LIMIT, 200);
  assert.equal(lab.MODE_CATALOG.asin.route, 'asin-comparison');
  assert.match(lab.labels('en').batchLimit, /200 unique keywords/i);
  assert.match(lab.labels('en').batchLimit, /left join/i);
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
  assert.equal(discovery.matched, true);
  assert.equal(discovery.reason, '');
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
  assert.equal(row.matched, true);
});

test('discovery keeps token-any behavior', () => {
  const rows = [
    { name: 'reading glasses women' },
    { name: 'blue light glasses' },
    { name: 'reading sunglasses' }
  ];
  assert.deepEqual(
    lab.filterAdsByQuery(rows, 'reading glasses', 'discovery').map(row => row.name),
    ['reading glasses women', 'blue light glasses', 'reading sunglasses']
  );
});

test('batch input accepts line breaks, comma lists and keyword CSV while preserving order', () => {
  const lines = lab.parseBatchInput('Reading Glasses\nblue light readers\ncomputer readers');
  assert.equal(lines.ok, true);
  assert.equal(lines.format, 'lines');
  assert.deepEqual(lines.keywords, ['Reading Glasses', 'blue light readers', 'computer readers']);

  const commas = lab.parseBatchInput('reading glasses,blue light readers,computer readers');
  assert.equal(commas.ok, true);
  assert.equal(commas.format, 'comma');
  assert.deepEqual(commas.keywords, ['reading glasses', 'blue light readers', 'computer readers']);

  const csv = lab.parseBatchInput('Keyword,Note\n"reading glasses, women",hero\nblue light readers,secondary', { source: 'csv' });
  assert.equal(csv.ok, true);
  assert.equal(csv.format, 'csv');
  assert.equal(csv.source, 'csv');
  assert.deepEqual(csv.keywords, ['reading glasses, women', 'blue light readers']);
});

test('batch input deduplicates case-insensitively and rejects malformed or ambiguous CSV', () => {
  const deduped = lab.parseBatchInput('Reading Glasses\nreading glasses\nBLUE LIGHT\nblue light');
  assert.equal(deduped.ok, true);
  assert.deepEqual(deduped.keywords, ['Reading Glasses', 'BLUE LIGHT']);
  assert.equal(deduped.duplicateCount, 2);

  const malformed = lab.parseBatchInput('Keyword\n"reading glasses');
  assert.equal(malformed.ok, false);
  assert.equal(malformed.reason, 'malformed-csv');

  const ambiguous = lab.parseBatchInput('alpha,beta\nreading glasses,hero\nblue light,secondary');
  assert.equal(ambiguous.ok, false);
  assert.equal(ambiguous.reason, 'csv-header-required');
});

test('batch input rejects more than 200 unique keywords instead of truncating', () => {
  const input = Array.from({ length: 201 }, (_, index) => `keyword ${index + 1}`).join('\n');
  const parsed = lab.parseBatchInput(input);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.reason, 'limit-exceeded');
  assert.equal(parsed.keywords.length, 201);
  assert.equal(parsed.keywords.at(-1), 'keyword 201');
});

test('Keyword Library input reads validated keyword-assets and fails closed when unavailable', () => {
  const parsed = lab.keywordLibraryInput([{
    kind: 'keyword-assets',
    validation: { status: 'validated' },
    rows: [
      { keyword: 'reading glasses women' },
      { display_keyword: 'blue light readers' },
      { normalized_keyword: 'computer readers' }
    ]
  }]);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.source, 'keyword-library');
  assert.deepEqual(parsed.keywords, ['reading glasses women', 'blue light readers', 'computer readers']);

  const missing = lab.keywordLibraryInput([{ kind: 'keyword-assets', validation: { status: 'invalid' }, rows: [{ keyword: 'x' }] }]);
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, 'library-missing');
});

test('Batch Analysis performs an exact left join and keeps every unmatched input with a reason', () => {
  const evidence = lab.adsResultRows([
    { name: 'reading glasses women', impressions: 100, clicks: 10, orders: 2, spend: 5, sales: 20, cvr: 0.2, acos: 0.25, roas: 4, products: 1 },
    { name: 'blue light readers', impressions: 80, clicks: 8, orders: 1, spend: 4, sales: 12, cvr: 0.125, acos: 1 / 3, roas: 3, products: 1 }
  ], 'batch');
  const joined = lab.batchLeftJoin(
    ['READING GLASSES WOMEN', 'reading glasses', 'blue light readers'],
    evidence,
    { inputSource: 'manual' }
  );
  assert.equal(joined.length, 3);
  assert.equal(joined[0].matched, true);
  assert.equal(joined[0].metrics.orders.value, 2);
  assert.equal(joined[0].keyword, 'READING GLASSES WOMEN');
  assert.equal(joined[1].matched, false, 'substring evidence must not count as an exact join');
  assert.match(joined[1].reason, /No exact keyword match/i);
  assert.deepEqual(joined[1].sources, []);
  assert.equal(joined[1].provenance[1].quality, 'missing');
  assert.equal(joined[2].matched, true);
  assert.deepEqual(lab.batchMatchSummary(joined), { total: 3, matched: 2, missing: 1 });
  assert.equal(lab.sameResultShape(joined), true);
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

test('Keyword Lab runtime exposes real Batch CSV and Keyword Library controls and remains in check/build', async () => {
  const source = await readFile(new URL('../keyword-lab.js', import.meta.url), 'utf8');
  const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const appIndex = index.indexOf('<script src="app.js"></script>');
  const labIndex = index.indexOf('<script src="keyword-lab.js"></script>');
  assert.ok(appIndex >= 0);
  assert.ok(labIndex > appIndex, 'Keyword Lab should load after app.js exposes KeywordOSUIBridge');
  assert.match(source, /data-keyword-lab-action="csv"/);
  assert.match(source, /data-keyword-lab-action="library"/);
  assert.match(source, /data-keyword-lab-action="analyze"/);
  assert.match(source, /\[data-page=\\?"asin-comparison\\?"\]/);
  assert.match(pkg.scripts.check, /node --check keyword-lab\.js/);
  assert.match(pkg.scripts.build, /keyword-lab\.js/);
});


test('Keyword Lab n-grams use contiguous token matches with 1/2/3+ modes and edge stopword control', () => {
  assert.deepEqual(lab.keywordTokens('Reading-glasses for Women 2.0'), ['reading-glasses','for','women','2.0']);
  assert.deepEqual(lab.extractNgrams('reading glasses for women', '1', { ignoreStopwords:true }), ['reading','glasses','women']);
  assert.deepEqual(lab.extractNgrams('reading glasses for women', '2', { ignoreStopwords:true }), ['reading glasses']);
  assert.deepEqual(lab.extractNgrams('reading glasses for women', '3+', { ignoreStopwords:true }), ['glasses for women','reading glasses for women']);
  assert.equal(lab.containsGram('reading glasses for women', 'glasses for'), true);
  assert.equal(lab.containsGram('reading glasses for women', 'reader'), false);
});

test('n-gram frequency counts result rows once per root and sorts deterministically', () => {
  const rows = [{keyword:'reading glasses women'},{keyword:'reading glasses men'},{keyword:'blue light glasses'}];
  assert.deepEqual(lab.ngramFrequency(rows,'2',{ignoreStopwords:true,limit:3}), [
    {gram:'reading glasses',count:2},
    {gram:'blue light',count:1},
    {gram:'glasses men',count:1}
  ]);
});

test('Common Words exclusion and delete/restore are reversible view state only', () => {
  const rows = [{keyword:'reading glasses women'},{keyword:'blue light glasses'},{keyword:'computer readers'}];
  let state = lab.normalizeRootWorkspaceState({});
  state = lab.reduceRootWorkspaceState(state,{type:'select-root',value:'glasses'});
  assert.deepEqual(lab.applyKeywordWorkspace(rows,state).map(row=>row.keyword), ['reading glasses women','blue light glasses']);
  state = lab.reduceRootWorkspaceState(state,{type:'exclude-root',value:'blue light'});
  assert.deepEqual(lab.applyKeywordWorkspace(rows,state).map(row=>row.keyword), ['reading glasses women']);
  state = lab.reduceRootWorkspaceState(state,{type:'delete-keyword',value:'reading glasses women'});
  assert.deepEqual(lab.applyKeywordWorkspace(rows,state), []);
  state = lab.reduceRootWorkspaceState(state,{type:'restore-keyword',value:'reading glasses women'});
  state = lab.reduceRootWorkspaceState(state,{type:'include-root',value:'blue light'});
  assert.deepEqual(lab.applyKeywordWorkspace(rows,state).map(row=>row.keyword), ['reading glasses women','blue light glasses']);
  assert.deepEqual(rows.map(row=>row.keyword), ['reading glasses women','blue light glasses','computer readers'], 'source evidence must remain untouched');
});

test('root highlight marks only the selected phrase and escapes source text', () => {
  assert.equal(lab.highlightKeywordHtml('Reading Glasses <Women>', 'reading glasses'), '<mark>Reading Glasses</mark> &lt;Women&gt;');
});

test('Keyword Lab runtime owns the Common Words workspace and links the legacy Ads table through the same view filter', async () => {
  const source = await readFile(new URL('../keyword-lab.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(source, /data-keyword-lab-gram-mode/);
  assert.match(source, /data-keyword-lab-exclude-root/);
  assert.match(source, /data-keyword-lab-delete/);
  assert.match(source, /data-keyword-lab-restore/);
  assert.match(app, /KeywordOSKeywordLab\?\.filterLegacyAdsItems/);
  assert.match(app, /stageKeywordAsset,stageKeywordAssets,trackKeywords,stageNegativeCandidates,render,/);
});
