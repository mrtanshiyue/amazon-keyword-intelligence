import test from 'node:test';
import assert from 'node:assert/strict';

await import('../competitor-storefront.js');
const storefront = globalThis.KeywordOSCompetitorStorefrontTest;

test('parses storefront snapshot CSV with explicit first-seen evidence', () => {
  const rows = storefront.parseStorefrontCsv(storefront.TEMPLATE);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].storefront, 'Example Storefront');
  assert.equal(rows[0].asin, 'B000000000');
  assert.equal(rows[0].date, '2026-09-01');
  assert.equal(rows[0].firstSeenDate, '2026-08-20');
});

test('rejects malformed or impossible first-seen dates', () => {
  assert.throws(
    () => storefront.parseStorefrontCsv('Snapshot Date,Storefront,ASIN,First Seen Date\n2026-09-01,Store A,B1,2026-99-40'),
    /invalid First Seen Date/
  );
  assert.throws(
    () => storefront.parseStorefrontCsv('Snapshot Date,Storefront,ASIN,First Seen Date\n2026-09-01,Store A,B1,2026-09-02'),
    /after Snapshot Date/
  );
});

test('summarizes 7-day storefront additions and removals from dated snapshot sets', () => {
  const summaries = storefront.storefrontChangeSummaries([
    { date: '2026-08-20', storefront: 'Store A', asin: 'B1' },
    { date: '2026-08-20', storefront: 'Store A', asin: 'B2' },
    { date: '2026-09-01', storefront: 'Store A', asin: 'B2' },
    { date: '2026-09-01', storefront: 'Store A', asin: 'B3', firstSeenDate: '2026-08-29' }
  ], [7]);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].baselineDate, '2026-08-20');
  assert.deepEqual(summaries[0].addedAsins, ['B3']);
  assert.deepEqual(summaries[0].removedAsins, ['B1']);
  assert.deepEqual(summaries[0].newListingAsins, ['B3']);
  assert.equal(summaries[0].netChange, 0);
});

test('does not infer a new listing from a newly observed ASIN without explicit first-seen evidence', () => {
  const summaries = storefront.storefrontChangeSummaries([
    { date: '2026-08-01', storefront: 'Store A', asin: 'B1' },
    { date: '2026-09-01', storefront: 'Store A', asin: 'B1' },
    { date: '2026-09-01', storefront: 'Store A', asin: 'B2' }
  ], [15]);
  assert.deepEqual(summaries[0].addedAsins, ['B2']);
  assert.deepEqual(summaries[0].newListingAsins, []);
});

test('omits a window when no imported baseline is old enough', () => {
  const summaries = storefront.storefrontChangeSummaries([
    { date: '2026-08-29', storefront: 'Store A', asin: 'B1' },
    { date: '2026-09-01', storefront: 'Store A', asin: 'B1' }
  ], [7, 15, 30, 60]);
  assert.equal(summaries.length, 0);
});

test('re-import replaces the same storefront ASIN snapshot without duplicating history', () => {
  const merged = storefront.mergeRows(
    [{ date: '2026-09-01', storefront: 'Store A', asin: 'B1', title: 'Old' }, { date: '2026-08-01', asin: 'LEGACY' }],
    [{ date: '2026-09-01', storefront: 'Store A', asin: 'B1', title: 'Corrected' }]
  );
  assert.equal(merged.length, 2);
  assert.equal(merged.find(row => row.asin === 'B1').title, 'Corrected');
  assert.equal(merged.find(row => row.asin === 'LEGACY').date, '2026-08-01');
});
