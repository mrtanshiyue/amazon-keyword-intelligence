import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../workflow-canonicalization.js');
const canonical = globalThis.KeywordOSWorkflowCanonicalizationTest;

test('legacy Keyword Tracker resolves to Rank & Index Tracker', () => {
  assert.equal(canonical.canonicalPage('tracker'), 'rank-intelligence');
  assert.equal(canonical.aliasTarget('tracker'), 'rank-intelligence');
});

test('legacy Listing Workspace resolves to Listing Optimizer', () => {
  assert.equal(canonical.canonicalPage('listing-workspace'), 'listing-optimizer');
  assert.equal(canonical.aliasTarget('listing-workspace'), 'listing-optimizer');
});

test('non-legacy pages remain unchanged', () => {
  for (const page of ['keyword-workflow', 'analytics', 'portfolio-overview', 'cross-store']) {
    assert.equal(canonical.canonicalPage(page), page);
    assert.equal(canonical.aliasTarget(page), '');
  }
});

test('legacy hashes canonicalize without changing unrelated hashes', () => {
  assert.equal(canonical.canonicalHash('#page=tracker'), '#page=rank-intelligence');
  assert.equal(canonical.canonicalHash('#page=listing-workspace'), '#page=listing-optimizer');
  assert.equal(canonical.canonicalHash('#page=analytics'), '#page=analytics');
  assert.equal(canonical.canonicalHash('#other=tracker'), '#other=tracker');
});

test('malformed route hashes are not guessed', () => {
  assert.equal(canonical.rawPageFromHash('#page=%E0%A4%A'), '');
  assert.equal(canonical.canonicalHash('#page=%E0%A4%A'), '#page=%E0%A4%A');
});

test('only legacy duplicate pages are hidden', () => {
  assert.equal(canonical.shouldHidePage('tracker'), true);
  assert.equal(canonical.shouldHidePage('listing-workspace'), true);
  assert.equal(canonical.shouldHidePage('rank-intelligence'), false);
  assert.equal(canonical.shouldHidePage('listing-optimizer'), false);
});

test('Listing top-suite click has one canonical destination', () => {
  assert.equal(canonical.listingSuiteTarget('Listing'), 'listing-optimizer');
  assert.equal(canonical.listingSuiteTarget(' listing '), 'listing-optimizer');
  assert.equal(canonical.listingSuiteTarget('Analytics'), '');
});

test('canonicalization intentionally does not merge distinct analytics scopes', () => {
  assert.equal(canonical.canonicalPage('portfolio-overview'), 'portfolio-overview');
  assert.equal(canonical.canonicalPage('cross-store'), 'cross-store');
  assert.equal(canonical.canonicalPage('analytics'), 'analytics');
});

test('canonicalization script loads before legacy Listing interceptor', async () => {
  const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const canonicalIndex = index.indexOf('<script src="workflow-canonicalization.js"></script>');
  const listingIndex = index.indexOf('<script src="listing-workspace-actions.js"></script>');
  assert.ok(canonicalIndex >= 0, 'canonicalization script should be loaded');
  assert.ok(listingIndex >= 0, 'legacy listing script should remain for compatibility helpers');
  assert.ok(canonicalIndex < listingIndex, 'canonical click/hash interception must register before the legacy Listing interceptor');
});
