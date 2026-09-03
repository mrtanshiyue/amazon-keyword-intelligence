import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

await import('../local-filter-builder.js');
const filters=globalThis.KeywordOSLocalFilterBuilderTest;
assert.ok(filters,'local filter builder test API should be exposed');

test('normalization keeps only condition definitions and strips evaluated result payloads',()=>{
  const state=filters.normalizeState({version:9,pages:{'search-funnel':{mode:'advanced',join:'any',conditions:[{field:'Clicks',operator:'gte',value:'2'}],topN:{enabled:true,field:'Purchases',direction:'top',count:25},results:[1,2],resultRows:['stale'],resultCount:99,evaluatedAt:'yesterday'}},results:['global stale'],evaluatedAt:'old'});
  assert.equal(state.version,1);
  assert.deepEqual(Object.keys(state.pages['search-funnel']).sort(),['conditions','join','mode','topN']);
  assert.equal(JSON.stringify(state).includes('resultRows'),false);
  assert.equal(JSON.stringify(state).includes('resultCount'),false);
  assert.equal(JSON.stringify(state).includes('evaluatedAt'),false);
});

test('Simple keeps one condition while Advanced caps deterministic conditions at five',()=>{
  const raw=Array.from({length:7},(_,index)=>({field:`Field ${index}`,operator:'equals',value:String(index)}));
  assert.equal(filters.normalizeRule({mode:'simple',conditions:raw}).conditions.length,1);
  const advanced=filters.normalizeRule({mode:'advanced',join:'any',conditions:raw});
  assert.equal(advanced.conditions.length,5);
  assert.equal(advanced.join,'any');
});

test('condition operators handle text, formatted numbers, intervals and missing values explicitly',()=>{
  assert.equal(filters.conditionMatches('Reading Glasses',{field:'Keyword',operator:'contains',value:'glasses'}),true);
  assert.equal(filters.conditionMatches('$1,234.50',{field:'Sales',operator:'gt',value:'1200'}),true);
  assert.equal(filters.conditionMatches('12.5%',{field:'CVR',operator:'between',value:'10',value2:'15'}),true);
  assert.equal(filters.conditionMatches('—',{field:'Orders',operator:'missing'}),true);
  assert.equal(filters.conditionMatches('0',{field:'Orders',operator:'present'}),true);
});

test('Advanced ALL and ANY conditions are evaluated against exact headers',()=>{
  const headers=['Keyword','Clicks','Orders'];
  const rows=[['alpha','10','2'],['beta','3','1'],['alphabet','8','0']];
  const all=filters.applyRuleToRows(headers,rows,{mode:'advanced',join:'all',conditions:[{field:'Keyword',operator:'contains',value:'alpha'},{field:'Clicks',operator:'gte',value:'9'}]});
  assert.deepEqual(all.indices,[0]);
  const any=filters.applyRuleToRows(headers,rows,{mode:'advanced',join:'any',conditions:[{field:'Orders',operator:'gt',value:'1'},{field:'Clicks',operator:'lt',value:'4'}]});
  assert.deepEqual(any.indices,[0,1]);
});

test('Top-N ranks only condition-matched numeric rows and preserves original table order',()=>{
  const headers=['Keyword','Orders','Sales'];
  const rows=[['a','2','$50'],['b','0','$900'],['c','3','$70'],['d','4','—'],['e','1','$60']];
  const result=filters.applyRuleToRows(headers,rows,{mode:'simple',conditions:[{field:'Orders',operator:'gt',value:'0'}],topN:{enabled:true,field:'Sales',direction:'top',count:2}});
  assert.deepEqual(result.indices,[2,4]);
  assert.equal(result.topNUnavailable,'');
});

test('configured Top-N fails closed when its field has no usable numeric evidence',()=>{
  const result=filters.applyRuleToRows(['Keyword','Status'],[['a','Good'],['b','Bad']],{topN:{enabled:true,field:'Status',direction:'top',count:10}});
  assert.deepEqual(result.indices,[]);
  assert.match(result.topNUnavailable,/no numeric values/i);
});

test('saved condition names update case-insensitively per page without storing results',()=>{
  let state=filters.upsertPreset(filters.normalizeState({}),{page:'search-funnel',name:'High Intent',rule:{conditions:[{field:'Clicks',operator:'gte',value:'5'}]},id:'p1',now:'2026-09-03T00:00:00Z'});
  state=filters.upsertPreset(state,{page:'search-funnel',name:'high intent',rule:{conditions:[{field:'Orders',operator:'gte',value:'2'}]},id:'ignored'});
  state=filters.upsertPreset(state,{page:'inventory-risk',name:'High Intent',rule:{conditions:[{field:'Available',operator:'lt',value:'10'}]},id:'p2'});
  assert.equal(state.presets.length,2);
  assert.equal(state.presets.find(item=>item.page==='search-funnel').id,'p1');
  assert.equal(JSON.stringify(state).includes('results'),false);
});

test('runtime is wired after CSV context controls, backup-safe and included in committed build',()=>{
  const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  const local=fs.readFileSync(new URL('../local-operations-actions.js',import.meta.url),'utf8');
  assert.ok(index.indexOf('csv-page-controls.js')<index.indexOf('local-filter-builder.js'));
  assert.ok(index.indexOf('local-filter-builder.js')<index.indexOf('mobile-data-tables.js'));
  assert.match(pkg.scripts.check,/node --check local-filter-builder\.js/);
  assert.match(pkg.scripts.build,/local-filter-builder\.js/);
  assert.match(local,/keywordos_v9_local_filter_builder/);
  assert.match(fs.readFileSync(new URL('../local-filter-builder.js',import.meta.url),'utf8'),/Saved state contains only page, mode, conditions and Top-N rules/);
});
