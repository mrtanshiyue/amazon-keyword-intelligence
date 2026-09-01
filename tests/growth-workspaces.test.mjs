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

test('ships parseable templates for every local growth import', () => {
  for (const kind of ['sqp', 'costs', 'inventory', 'ranks', 'product-master']) {
    const rows = growth.parseKind(kind, growth.TEMPLATES[kind]);
    assert.equal(rows.length, 1, `${kind} template should parse`);
  }
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
