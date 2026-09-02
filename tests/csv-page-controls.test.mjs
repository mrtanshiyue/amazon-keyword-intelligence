import test from 'node:test';
import assert from 'node:assert/strict';
import controls from '../csv-page-controls.js';

const expected=['product-master','search-funnel','asin-comparison','rank-intelligence','inventory-risk','competitor-snapshots','review-evidence'];

test('targets exactly the direct CSV-first growth pages',()=>{
  assert.deepEqual(Object.keys(controls.CSV_PAGE_CONFIG).sort(),expected.sort());
  for(const page of expected)assert.equal(controls.isCsvFirstPage(page),true);
  assert.equal(controls.isCsvFirstPage('product-360'),false);
  assert.equal(controls.isCsvFirstPage('keyword-workflow'),false);
});

test('replaces global header controls only on configured CSV-first pages',()=>{
  assert.deepEqual(controls.HIDDEN_GLOBAL_SELECTORS,['.profile-control','.date-control','#scope-mode-badge','#import-top']);
  assert.deepEqual(controls.controlStateForPage('search-funnel'),{contextual:true,hideGlobal:true,label:'ASIN',header:'ASIN'});
  assert.deepEqual(controls.controlStateForPage('anomaly-center'),{contextual:false,hideGlobal:false,label:'',header:''});
});

test('page filter fields are tied to actual workspace table concepts',()=>{
  assert.equal(controls.CSV_PAGE_CONFIG['product-master'].header,'Marketplace');
  assert.equal(controls.CSV_PAGE_CONFIG['asin-comparison'].header,'Set');
  assert.equal(controls.CSV_PAGE_CONFIG['inventory-risk'].header,'SKU');
  assert.equal(controls.CSV_PAGE_CONFIG['review-evidence'].header,'ASIN');
});

test('extracts deterministic unique selector values from a table matrix',()=>{
  const headers=['Keyword','ASIN','Volume'];
  const rows=[['alpha','B2','10'],['beta','B1','20'],['gamma','B2','30'],['delta','','40']];
  assert.deepEqual(controls.uniqueFilterValues(headers,rows,'ASIN'),['B1','B2']);
  assert.deepEqual(controls.uniqueFilterValues(headers,rows,'Missing'),[]);
});

test('matches selected context without fuzzy or partial matching',()=>{
  const headers=['ASIN','Keyword'];
  assert.equal(controls.rowMatchesSelection(headers,['B01','alpha'],'ASIN',''),true);
  assert.equal(controls.rowMatchesSelection(headers,['B01','alpha'],'ASIN','B01'),true);
  assert.equal(controls.rowMatchesSelection(headers,['B010','alpha'],'ASIN','B01'),false);
});

test('reads the lightweight hash route used by KeywordOS',()=>{
  assert.equal(controls.currentPage({hash:'#page=review-evidence'}),'review-evidence');
  assert.equal(controls.currentPage({hash:'#page=ASIN%20View'}),'ASIN View');
  assert.equal(controls.currentPage({hash:'#other=x'}),'');
});
