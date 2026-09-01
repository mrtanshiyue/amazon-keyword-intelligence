import test from 'node:test';
import assert from 'node:assert/strict';

await import('../growth-workspaces.js');
const growth = globalThis.KeywordOSGrowthTest;

test('parses quoted SQP CSV and normalizes percent or decimal shares', () => {
  const csv = 'Search Query,Search Query Volume,Impressions,Clicks,Purchases,Brand Purchase Share\n"shoe, rack",1000,500,50,10,25%\nmat,200,100,20,4,0.2';
  const rows = growth.parseKind('sqp', csv);
  assert.equal(rows[0].query, 'shoe, rack');
  assert.equal(rows[0].brandPurchaseShare, 0.25);
  assert.equal(rows[1].brandPurchaseShare, 0.2);
});

test('rejects malformed growth CSV with an unclosed quoted field', () => {
  const csv = 'Search Query,Search Query Volume\n"unfinished,100';
  assert.throws(() => growth.parseKind('sqp', csv), /unclosed quoted field/);
});

test('defines the growth-import browser safety limit', () => {
  assert.equal(growth.MAX_GROWTH_IMPORT_BYTES, 16 * 1024 * 1024);
});

test('derives search funnel rates and sorts opportunity', () => {
  const rows = growth.sqpSummary([
    { query: 'a', volume: 100, impressions: 50, clicks: 10, cartAdds: 4, purchases: 2, brandPurchaseShare: 0.8 },
    { query: 'b', volume: 200, impressions: 100, clicks: 25, cartAdds: 10, purchases: 5, brandPurchaseShare: 0.1 }
  ]);
  assert.equal(rows[0].query, 'b');
  assert.equal(rows[0].ctr, 0.25);
  assert.equal(rows[0].purchaseRate, 0.2);
});

test('keeps latest rank snapshot per ASIN and keyword', () => {
  const rows = growth.latestRanks([
    { asin: 'B1', keyword: 'Rack', date: '2026-01-01', organicRank: 20 },
    { asin: 'B1', keyword: 'rack', date: '2026-01-02', organicRank: 12 }
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].organicRank, 12);
});

test('inventory risk only derives cover when sales evidence exists', () => {
  const rows = growth.inventoryRisk([
    { sku: 'A', product: 'P1', available: 10, unfulfillable: 0 },
    { sku: 'B', product: 'P2', available: 10, unfulfillable: 0 }
  ], { P1: 30 });
  assert.equal(rows.find((row) => row.sku === 'A').daysCover, 10);
  assert.equal(rows.find((row) => row.sku === 'A').risk, 'Critical');
  assert.equal(rows.find((row) => row.sku === 'B').risk, 'No sales evidence');
});

test('counts UTF-8 backend search-term bytes', () => {
  assert.equal(growth.utf8Bytes('abc'), 3);
  assert.equal(growth.utf8Bytes('中文'), 6);
});

test('listing coverage checks complete phrases by field and keeps partial roots distinct', () => {
  const coverage = growth.listingCoverage({ title: 'Blue shoe rack', bullets: 'Stackable rack', description: '', searchTerms: '' }, ['shoe rack', 'rack shoe']);
  assert.equal(coverage[0].byField.title.phrase, true);
  assert.equal(coverage[1].byField.title.phrase, false);
  assert.deepEqual(coverage[1].byField.title.roots.sort(), ['rack', 'shoe']);
});

test('ships parseable templates for every local growth import', () => {
  for (const kind of ['sqp', 'costs', 'inventory', 'ranks', 'product-master', 'competitor', 'reviews']) {
    const rows = growth.parseKind(kind, growth.TEMPLATES[kind]);
    assert.equal(rows.length, 1, `${kind} template should parse`);
  }
});

test('imports review evidence only when required identity, date, rating, title and text are present', () => {
  const rows = growth.parseKind('reviews', 'Date,ASIN,Rating,Title,Body\n2026-08-01,B1,2,Small,"too small"\n2026-08-01,B2,5,Great,\n2026-08-01,B3,6,Invalid,Rating');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].asin, 'B1');
  assert.equal(rows[0].rating, 2);
});

test('keeps the newest imported competitor snapshot for each ASIN', () => {
  const rows = growth.latestCompetitors([
    { asin: 'B1', date: '2026-08-01', price: 25, bsr: 200 },
    { asin: 'B1', date: '2026-08-02', price: 23, bsr: 100 },
    { asin: 'B2', date: '2026-08-01', price: 30, bsr: 300 }
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows.find(row => row.asin === 'B1').price, 23);
});

test('reports changes only when an ASIN has consecutive dated snapshots', () => {
  const changes = growth.competitorChanges([
    { asin: 'B1', date: '2026-08-01', price: 25, bsr: 200, rating: 4.5, reviewCount: 10, variants: 1, availability: 'In stock' },
    { asin: 'B1', date: '2026-08-08', price: 20, bsr: 150, rating: 4.5, reviewCount: 12, variants: 1, availability: 'In stock' },
    { asin: 'B2', date: '2026-08-08', price: 30, bsr: 300 }
  ]);
  assert.equal(changes.length, 1);
  assert.match(changes[0].changes.join(' '), /Price: 25 → 20/);
  assert.match(changes[0].changes.join(' '), /Reviews: 10 → 12/);
});

test('product master resolves only explicit identifiers', () => {
  const master = growth.masterIndex([{ productId: 'P1', product: 'Example', sku: 'SKU-1', asin: 'B000000001' }]);
  assert.equal(growth.resolveMaster(master, { sku: 'SKU-1' }).productId, 'P1');
  assert.equal(growth.resolveMaster(master, { product: 'unrelated label' }), null);
});

test('keyword asset ids are stable across keyword workspace consumers', () => {
  assert.equal(growth.keywordAssetId('Reading  Glasses'), growth.keywordAssetId('reading glasses'));
  assert.notEqual(growth.keywordAssetId('reading glasses'), growth.keywordAssetId('reading glasses women'));
});

test('workflow assets do not invent action records when no Store action state exists', () => {
  assert.deepEqual(growth.actionForAsset('kw_example'), []);
});

test('source chips stay explicit when a workspace has no persisted sources', () => {
  assert.match(growth.pageSourceChips('rank-intelligence'), /No persisted source dataset/);
});

test('source chips expose imported source, coverage and import date', () => {
  const chip = growth.pageSourceChips('rank-intelligence', [{
    kind: 'ranks', source: 'rank-snapshot.csv', importedAt: '2026-09-01T12:00:00.000Z',
    coverage: { min: '2026-08-01', max: '2026-08-31' }, validation: { status: 'validated' }, checksum: 'fnv1a32:1234'
  }]);
  assert.match(chip, /rank-snapshot\.csv/);
  assert.match(chip, /2026-08-01 → 2026-08-31/);
  assert.match(chip, /imported 2026-09-01/);
  assert.match(chip, /imported evidence/);
  assert.match(chip, /validated/);
});
