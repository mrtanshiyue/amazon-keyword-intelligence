import test from 'node:test';
import assert from 'node:assert/strict';

await import('../mobile-data-tables.js');
const mobile=globalThis.KeywordOSMobileTablesTest;
assert.ok(mobile,'mobile table test API should be exposed');

test('normalizes table headers deterministically',()=>{
  assert.equal(mobile.normalizeHeader('  Search   Term '),'search term');
});

test('prefers explicit identity columns over blank or metric columns',()=>{
  assert.equal(mobile.primaryColumnIndex(['','Spend','ASIN','Orders']),2);
  assert.equal(mobile.primaryColumnIndex(['Metric','Value']),0);
});

test('recognizes the key operating identifiers used across KeywordOS tables',()=>{
  for(const header of ['Keyword','ASIN','SKU','Campaign','Storefront','Marketplace','Status']){
    assert.equal(mobile.primaryColumnIndex(['Metric',header,'Value']),1);
  }
});

test('arrow keys map to bounded horizontal scroll deltas only',()=>{
  assert.equal(mobile.scrollDeltaForKey('ArrowLeft'),-160);
  assert.equal(mobile.scrollDeltaForKey('ArrowRight'),160);
  assert.equal(mobile.scrollDeltaForKey('Enter'),0);
});

test('table labels use the first explicit header and fail closed to a generic label',()=>{
  assert.equal(mobile.tableLabel(['','ASIN','Price']),'ASIN data table');
  assert.equal(mobile.tableLabel([]),'Data table');
});

test('mobile enhancement is scoped to content tables and reuses existing table wrappers',()=>{
  assert.equal(mobile.TABLE_SELECTOR,'#content table');
  assert.equal(mobile.EXISTING_SHELL_SELECTOR,'.table-wrap,.table-scroll');
  assert.equal(mobile.SHELL_CLASS,'keywordos-mobile-table-shell');
});
