import test from 'node:test';
import assert from 'node:assert/strict';

await import('../navigation-taxonomy.js');
const nav = globalThis.KeywordOSNavigationTaxonomyTest;

const expected = [
  'product-master','product-360','competitor-snapshots','review-evidence',
  'keyword-workflow','search-funnel','asin-comparison','rank-intelligence',
  'listing-optimizer','action-outcomes','inventory-risk','anomaly-center'
];

test('assigns every growth workspace to exactly one product suite', () => {
  const pages = nav.allGrowthPages();
  assert.equal(pages.length, expected.length);
  assert.equal(new Set(pages).size, expected.length);
  assert.deepEqual([...pages].sort(), [...expected].sort());
});

test('uses the six top-level suite labels and preserves stable page ids', () => {
  assert.deepEqual(nav.ORDER, ['PRODUCTS','KEYWORDS','LISTING','MARKETING','OPERATIONS','ANALYTICS']);
  assert.equal(nav.suiteForPage('competitor-snapshots'), 'PRODUCTS');
  assert.equal(nav.suiteForPage('rank-intelligence'), 'KEYWORDS');
  assert.equal(nav.suiteForPage('listing-optimizer'), 'LISTING');
  assert.equal(nav.suiteForPage('action-outcomes'), 'MARKETING');
  assert.equal(nav.suiteForPage('inventory-risk'), 'OPERATIONS');
  assert.equal(nav.suiteForPage('anomaly-center'), 'ANALYTICS');
  assert.equal(nav.suiteForPage('unknown-page'), '');
});
