import test from 'node:test';
import assert from 'node:assert/strict';

await import('../import-workspace-states.js');
const states=globalThis.KeywordOSImportStatesTest;
assert.ok(states,'import workspace states test API should be exposed');

const record=(kind,rows=1,coverage=true,extra={})=>({
  kind,storeId:'store-a',rows:Array.from({length:rows},()=>({})),
  rowCount:rows,source:'fixture.csv',
  coverage:coverage?{min:'2026-08-01',max:'2026-08-31'}:{min:null,max:null},
  ...extra
});

test('covers every KeywordOS local import-driven workspace plus Import Center',()=>{
  const expected=['asin-comparison','competitor-snapshots','import','inventory-risk','product-360','product-master','rank-intelligence','review-evidence','search-funnel'];
  assert.deepEqual(Object.keys(states.IMPORT_PAGE_CONFIG).sort(),expected);
});

test('maps all eight growth parser kinds to a schema-guided page',()=>{
  const kinds=new Set(Object.values(states.IMPORT_PAGE_CONFIG).flat().map(entry=>entry.kind));
  for(const kind of ['sqp','costs','inventory','ranks','product-master','competitor','reviews','reverse-asin'])assert.equal(kinds.has(kind),true,kind);
});

test('empty, loading, error, partial and ready states are deterministic',()=>{
  assert.equal(states.pageState('search-funnel',[]).state,'empty');
  assert.equal(states.pageState('search-funnel',[],'sqp').state,'loading');
  assert.equal(states.pageState('search-funnel',[],'','bad header').state,'error');
  assert.equal(states.pageState('product-360',[record('costs',2,false)]).state,'partial');
  assert.equal(states.pageState('product-360',[record('costs',2,false),record('inventory',3,true)]).state,'ready');
});

test('dated dataset without coverage is explicitly partial',()=>{
  const status=states.entryStatus(states.IMPORT_PAGE_CONFIG['rank-intelligence'][0],[record('ranks',3,false)]);
  assert.equal(status.state,'partial');
  assert.match(status.reason,/dated coverage/i);
});

test('storefront status counts only rows with explicit storefront ASIN and date evidence',()=>{
  const entry=states.IMPORT_PAGE_CONFIG['competitor-snapshots'].find(item=>item.kind==='storefront');
  const records=[{
    kind:'competitor',storeId:'store-a',source:'competitor.csv',coverage:{min:'2026-08-01',max:'2026-09-01'},
    rows:[{asin:'A',date:'2026-09-01'},{asin:'B',date:'2026-09-01',storefront:'Shop'},{asin:'C',storefront:'Shop'}]
  }];
  assert.equal(states.subsetCount(entry,records[0]),1);
  assert.equal(states.entryStatus(entry,records).state,'ready');
});

test('Amazon Ads and Unified imports require authoritative exports rather than generated templates',()=>{
  const entries=states.IMPORT_PAGE_CONFIG.import;
  assert.deepEqual(entries.map(entry=>entry.template),['authoritative','authoritative']);
  const html=states.stateCardHtml('import',states.pageState('import',[]));
  assert.match(html,/不生成伪造 Amazon 模板/);
  assert.match(html,/real source exports/);
});

test('local schema entries expose stable template filenames',()=>{
  assert.equal(states.templateFilename({kind:'sqp'}),'KeywordOS_sqp_template.csv');
  assert.equal(states.templateFilename({kind:'storefront'}),'KeywordOS_competitor_storefront_snapshot_template.csv');
  assert.equal(states.templateFilename({kind:'competitor-ads'}),'KeywordOS_competitor_ads_insights_template.csv');
});
