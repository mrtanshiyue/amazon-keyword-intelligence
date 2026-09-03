import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../growth-workspaces.js');
await import('../growth-consistency-actions.js');

const consistency = globalThis.KeywordOSGrowthConsistencyTest;

test('inventory risk uses observed dated product velocity instead of total units divided by 30', () => {
  const rows = consistency.inventoryRisk(
    [{ sku: 'SKU-1', product: 'Blue', available: 10, unfulfillable: 0 }],
    [
      { date: '2026-08-01', product: 'Blue', units: 4 },
      { date: '2026-08-03', product: 'Blue', units: 6 }
    ],
    30
  );
  assert.equal(rows[0].observedDays, 2);
  assert.equal(rows[0].dailySales, 5);
  assert.equal(rows[0].daysCover, 2);
  assert.equal(rows[0].risk, 'Critical');
});

test('inventory risk stays unavailable when Ads rows have no dated velocity evidence', () => {
  const rows = consistency.inventoryRisk(
    [{ sku: 'SKU-1', product: 'Blue', available: 10, unfulfillable: 0 }],
    [{ product: 'Blue', units: 30 }],
    30
  );
  assert.equal(rows[0].observedDays, 0);
  assert.equal(rows[0].dailySales, null);
  assert.equal(rows[0].daysCover, null);
  assert.equal(rows[0].risk, 'No sales evidence');
});

test('listing backend summary uses the editable profile limit', () => {
  const summary = consistency.listingBackendSummary(
    { searchTerms: '中文' },
    { titleLimit: 180, searchTermsLimit: 5 }
  );
  assert.equal(summary.used, 6);
  assert.equal(summary.limit, 5);
  assert.equal(summary.remaining, -1);
  assert.equal(summary.status, 'Over limit');
});

test('custom backend limit controls placement hints instead of a hardcoded 250 bytes', () => {
  const fields = { title: '', bullets: '', description: '', searchTerms: 'abcd' };
  const evidence = [{ keyword: 'shoe rack', orders: 1, purchases: 0, volume: 0, sources: ['Ads'] }];
  const full = consistency.listingPlacementSuggestions(fields, evidence, '', { titleLimit: 200, searchTermsLimit: 4 });
  const room = consistency.listingPlacementSuggestions(fields, evidence, '', { titleLimit: 200, searchTermsLimit: 5 });
  assert.equal(full[0].placement, 'Consider title or bullets');
  assert.equal(room[0].placement, 'Consider backend terms');
});

test('invalid listing profile fails closed for backend placement', () => {
  const suggestions = consistency.listingPlacementSuggestions(
    { title: '', bullets: '', description: '', searchTerms: '' },
    [{ keyword: 'shoe rack', orders: 1, purchases: 0, volume: 0, sources: ['Ads'] }],
    '',
    { titleLimit: 200, searchTermsLimit: 0 }
  );
  assert.equal(consistency.listingProfile({ titleLimit: 200, searchTermsLimit: 0 }).available, false);
  assert.equal(suggestions[0].placement, 'Consider title or bullets');
});

test('growth consistency script loads immediately after the growth workspace', async () => {
  const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const growth = index.indexOf('<script src="growth-workspaces.js?v=search-funnel-deferred-1"></script>');
  const consistencyIndex = index.indexOf('<script src="growth-consistency-actions.js"></script>');
  const navigation = index.indexOf('<script src="navigation-taxonomy.js"></script>');
  assert.ok(growth >= 0);
  assert.ok(consistencyIndex > growth);
  assert.ok(navigation > consistencyIndex);
});
