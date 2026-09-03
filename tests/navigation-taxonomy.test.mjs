import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../navigation-taxonomy.js');
const nav = globalThis.KeywordOSNavigationTaxonomyTest;

const expected = ['product-master','product-360','competitor-snapshots','review-evidence','keyword-workflow','search-funnel','asin-comparison','rank-intelligence','listing-optimizer','action-outcomes','inventory-risk','anomaly-center'];

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

test('navigation organizer hides legacy buttons and never uses them to satisfy canonical ordering', async () => {
  const source = await readFile(new URL('../navigation-taxonomy.js', import.meta.url), 'utf8');
  assert.match(source, /if\(registry\.isLegacy\(raw\)\)\{hideLegacyButton\(button\);continue;\}/);
  assert.match(source, /!registry\.isLegacy\(item\.dataset\.page\)&&registry\.canonicalPage\(item\.dataset\.page\)===record\.id/);
  assert.match(source, /hasVisibleCanonical/);
});

test('sidebar navigation is explicitly synchronized without MutationObserver feedback loops', async () => {
  const [taxonomySource, growthSource, appSource] = await Promise.all([
    readFile(new URL('../navigation-taxonomy.js', import.meta.url), 'utf8'),
    readFile(new URL('../growth-workspaces.js', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);
  assert.doesNotMatch(taxonomySource, /new MutationObserver\(schedule\).*sidebar-nav/);
  assert.doesNotMatch(growthSource, /new MutationObserver\(injectNav\)/);
  assert.match(taxonomySource, /seenPages\.has\(record\.id\)\)\{button\.remove\(\);continue;\}/);
  assert.match(growthSource, /const missing=GROWTH_NAV_ITEMS\.filter/);
  assert.match(growthSource, /ensureNavigation:injectNav/);
  assert.match(appSource, /KeywordOSGrowth\?\.ensureNavigation\?\.\(\);/);
  assert.match(appSource, /KeywordOSNavigationTaxonomy\?\.organizeGrowthNavigation\?\.\(\);/);
});
