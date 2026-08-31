import test from 'node:test';
import assert from 'node:assert/strict';

await import('../productivity-actions.js');

const { normalizeSearch, filterEntries, suiteAction, suiteForPage } = globalThis.KeywordOSProductivityTest;

test('normalizeSearch makes command matching case and whitespace insensitive', () => {
  assert.equal(normalizeSearch('  Data   HEALTH  '), 'data health');
});

test('filterEntries matches page labels and sections without inventing results', () => {
  const entries = [
    { page: 'data-health', label: 'Data Health', section: 'DATA' },
    { page: 'suggestions', label: 'Suggestions', section: 'ADVERTISING' },
    { page: 'keyword-library', label: 'Keyword Library', section: 'KEYWORDS' },
  ];

  assert.deepEqual(filterEntries(entries, 'health').map((item) => item.page), ['data-health']);
  assert.deepEqual(filterEntries(entries, 'keywords').map((item) => item.page), ['keyword-library']);
  assert.deepEqual(filterEntries(entries, '').map((item) => item.page), entries.map((item) => item.page));
});

test('suite toolbar maps every visible suite to a real action', () => {
  assert.deepEqual(suiteAction('Products'), { type: 'page', page: 'store-workspace' });
  assert.deepEqual(suiteAction('Keywords'), { type: 'page', page: 'global-keywords' });
  assert.deepEqual(suiteAction('Listing'), { type: 'listing' });
  assert.deepEqual(suiteAction('Marketing'), { type: 'page', page: 'overview' });
  assert.deepEqual(suiteAction('Operations'), { type: 'page', page: 'unified-report' });
  assert.deepEqual(suiteAction('Analytics'), { type: 'page', page: 'analytics' });
  assert.equal(suiteAction('Unknown'), null);
});

test('suite active state follows the actual current workspace page', () => {
  assert.equal(suiteForPage('store-workspace'), 'products');
  assert.equal(suiteForPage('global-keywords'), 'keywords');
  assert.equal(suiteForPage('keyword-library'), 'keywords');
  assert.equal(suiteForPage('overview'), 'marketing');
  assert.equal(suiteForPage('suggestions'), 'marketing');
  assert.equal(suiteForPage('unified-report'), 'operations');
  assert.equal(suiteForPage('data-health'), 'operations');
  assert.equal(suiteForPage('portfolio-overview'), 'analytics');
  assert.equal(suiteForPage('analytics'), 'analytics');
  assert.equal(suiteForPage('missing-page'), '');
});
