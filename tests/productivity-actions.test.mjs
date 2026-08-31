import test from 'node:test';
import assert from 'node:assert/strict';

await import('../productivity-actions.js');

const { normalizeSearch, filterEntries } = globalThis.KeywordOSProductivityTest;

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
