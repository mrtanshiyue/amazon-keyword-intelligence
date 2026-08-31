import test from 'node:test';
import assert from 'node:assert/strict';

await import('../productivity-actions.js');

const { normalizeSearch, filterEntries, suiteAction, suiteForPage, suiteWorkspace } = globalThis.KeywordOSProductivityTest;

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

test('suite toolbar maps every visible suite to a workspace launcher', () => {
  for (const suite of ['products', 'keywords', 'listing', 'marketing', 'operations', 'analytics']) {
    assert.deepEqual(suiteAction(suite), { type: 'workspace', suite });
    const workspace = suiteWorkspace(suite);
    assert.ok(workspace);
    assert.ok(workspace.title);
    assert.ok(workspace.subtitle);
    assert.ok(workspace.notice);
    assert.ok(Array.isArray(workspace.items));
    assert.ok(workspace.items.length > 0);
    workspace.items.forEach((item) => {
      assert.ok(item.page);
      assert.ok(item.label);
      assert.ok(item.detail);
    });
  }
  assert.equal(suiteAction('Unknown'), null);
  assert.equal(suiteWorkspace('unknown'), null);
});

test('Listing workspace remains preparation-only and routes to existing keyword tools', () => {
  const listing = suiteWorkspace('listing');
  assert.match(listing.notice, /not connected/i);
  assert.deepEqual(listing.items.map((item) => item.page), ['global-keywords', 'cerebro', 'keyword-library']);
});

test('suite active state follows the actual current workspace page without absorbing settings', () => {
  assert.equal(suiteForPage('store-workspace'), 'products');
  assert.equal(suiteForPage('stores-settings'), 'products');
  assert.equal(suiteForPage('global-keywords'), 'keywords');
  assert.equal(suiteForPage('keyword-library'), 'keywords');
  assert.equal(suiteForPage('overview'), 'marketing');
  assert.equal(suiteForPage('suggestions'), 'marketing');
  assert.equal(suiteForPage('unified-report'), 'operations');
  assert.equal(suiteForPage('data-health'), 'operations');
  assert.equal(suiteForPage('portfolio-overview'), 'analytics');
  assert.equal(suiteForPage('analytics'), 'analytics');
  assert.equal(suiteForPage('settings'), '');
  assert.equal(suiteForPage('users-permissions'), '');
  assert.equal(suiteForPage('missing-page'), '');
});
