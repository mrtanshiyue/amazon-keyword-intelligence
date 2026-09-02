import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../listing-workspace-actions.js');

const {LEGACY_LISTING_PAGE,CANONICAL_LISTING_PAGE,aggregateKeywordEvidence,composeSearchTerms,draftStatus,chooseListingDataset,canonicalListingPage,legacyListingUiEnabled} = globalThis.KeywordOSListingWorkspaceTest;

test('aggregateKeywordEvidence uses loaded Ads rows and ranks by real orders then sales', () => {
  const rows = [
    { searchTerm: 'reading glasses', impressions: 100, clicks: 10, orders: 2, spend: 8, sales: 40 },
    { searchTerm: 'Reading Glasses', impressions: 50, clicks: 4, orders: 1, spend: 4, sales: 20 },
    { searchTerm: 'blue light readers', impressions: 200, clicks: 20, orders: 1, spend: 10, sales: 30 },
    { searchTerm: '', impressions: 999, clicks: 99, orders: 99, spend: 99, sales: 99 }
  ];
  const result = aggregateKeywordEvidence(rows);
  assert.equal(result.length, 2);
  assert.equal(result[0].term, 'reading glasses');
  assert.equal(result[0].orders, 3);
  assert.equal(result[0].sales, 60);
  assert.equal(result[0].spend, 12);
  assert.equal(result[0].acos, 0.2);
  assert.equal(result[0].cvr, 3 / 14);
});

test('composeSearchTerms removes duplicates without inventing keywords', () => {
  assert.equal(composeSearchTerms(['reading glasses', 'Blue Light Readers', 'reading glasses', '', '  women readers  ']), 'reading glasses Blue Light Readers women readers');
});

test('draftStatus reports only actual human-entered draft sections', () => {
  assert.deepEqual(draftStatus({ title: '', bullets: '', searchTerms: '' }), { completed: 0, total: 3, ready: false });
  assert.deepEqual(draftStatus({ title: 'Title', bullets: 'Bullet', searchTerms: '' }), { completed: 2, total: 3, ready: false });
  assert.deepEqual(draftStatus({ title: 'Title', bullets: 'Bullet', searchTerms: 'terms' }), { completed: 3, total: 3, ready: true });
});

test('legacy Listing Workspace is compatibility-only and resolves to Listing Optimizer', async () => {
  assert.equal(LEGACY_LISTING_PAGE, 'listing-workspace');
  assert.equal(CANONICAL_LISTING_PAGE, 'listing-optimizer');
  assert.equal(canonicalListingPage('listing-workspace'), 'listing-optimizer');
  assert.equal(canonicalListingPage('listing-optimizer'), 'listing-optimizer');
  assert.equal(legacyListingUiEnabled(), false);
  const source = await readFile(new URL('../listing-workspace-actions.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /ensureSidebarEntry|renderListingWorkspace|suite-nav button|data-listing-nav/);
});

test('chooseListingDataset prefers only validated browser-persisted Ads rows', () => {
  const fallback = [{ searchTerm: 'seed term' }];
  const persisted = [{ searchTerm: 'new imported term' }];
  const record = { schemaVersion: 1, source: '202608.csv', rows: persisted };
  assert.deepEqual(chooseListingDataset(record, fallback, () => ({ ok: true })), { rows: persisted, source: '202608.csv', mode: 'Browser persisted' });
  assert.deepEqual(chooseListingDataset(record, fallback, () => ({ ok: false })), { rows: fallback, source: 'Bundled Ads dataset', mode: 'Bundled fallback' });
  assert.deepEqual(chooseListingDataset(record, fallback, undefined), { rows: fallback, source: 'Bundled Ads dataset', mode: 'Bundled fallback' });
});