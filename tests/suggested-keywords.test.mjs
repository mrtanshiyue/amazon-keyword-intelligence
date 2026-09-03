import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../suggested-keywords.js');
const engine=globalThis.KeywordOSSuggestedKeywordsTest;
const record=(kind,rows,extra={})=>({kind,rows,rowCount:rows.length,source:`${kind}.csv`,importedAt:`2026-09-03T0${kind==='sqp'?'1':'2'}:00:00Z`,validation:{status:'validated'},...extra});

test('Suggested Keywords is the exact union of latest imported Ads, SQP and latest reverse-ASIN vocabulary',()=>{
  const rows=engine.sourceVocabulary({
    adsImportedAt:'2026-09-03T00:00:00Z',
    adsRows:[{searchTerm:'Reading Glasses'},{searchTerm:'blue light readers'}],
    records:[
      record('sqp',[{query:'reading glasses'},{query:'computer readers'}]),
      record('reverse-asin',[{keyword:'old keyword',snapshotDate:'2026-09-01'},{keyword:'competitor readers',snapshotDate:'2026-09-03'},{keyword:'reading glasses',snapshotDate:'2026-09-03'}])
    ]
  });
  assert.deepEqual(rows.map(row=>row.keyword),['Reading Glasses','blue light readers','competitor readers','computer readers']);
  assert.deepEqual(rows.find(row=>row.key==='reading glasses').sources,['ads','sqp','reverse-asin']);
  assert.ok(!rows.some(row=>row.key==='old keyword'));
});

test('recompute subtracts tracked and recycle-bin deleted keywords case-insensitively',()=>{
  const snapshot=engine.recomputeSnapshot({
    adsImportedAt:'2026-09-03T00:00:00Z',adsSource:'ads.csv',adsRows:[{searchTerm:'Reading Glasses'},{searchTerm:'Blue Light Readers'},{searchTerm:'Computer Readers'}],
    records:[],tracked:['reading glasses'],assetRows:[{keyword:'BLUE LIGHT READERS',deletedAt:'2026-09-03T01:00:00Z'}],now:'2026-09-03T03:00:00Z'
  });
  assert.deepEqual(snapshot.items.map(item=>item.keyword),['Computer Readers']);
  assert.equal(snapshot.excludedAtCompute,2);
  assert.deepEqual(snapshot.rule,engine.SAVED_RULE);
});

test('import fingerprint changes only with imported evidence metadata, not tracker or delete state',()=>{
  const base={adsImportedAt:'2026-09-03T00:00:00Z',adsSource:'ads.csv',adsRows:[{searchTerm:'one'}],records:[record('sqp',[{query:'two'}])]},key=engine.importKey(base);
  assert.equal(engine.importKey({...base,tracked:['one'],assetRows:[{keyword:'two',deletedAt:'x'}]}),key);
  assert.notEqual(engine.importKey({...base,records:[record('sqp',[{query:'two'}],{importedAt:'2026-09-04T00:00:00Z'})]}),key);
});

test('pruning is monotonic between imports: tracking or deletion removes terms but restore does not re-add them',()=>{
  const original=engine.recomputeSnapshot({adsImportedAt:'2026-09-03T00:00:00Z',adsRows:[{searchTerm:'one'},{searchTerm:'two'}],records:[],now:'x'});
  const pruned=engine.pruneSnapshot(original,{tracked:['one'],assetRows:[]}).snapshot;
  assert.deepEqual(pruned.items.map(item=>item.keyword),['two']);
  const restored=engine.pruneSnapshot(pruned,{tracked:[],assetRows:[]}).snapshot;
  assert.deepEqual(restored.items.map(item=>item.keyword),['two']);
  assert.equal(engine.shouldRecompute(restored,original.importKey),false);
});

test('Suggested Keywords runtime is loaded before app and replaces the old render-time New Keywords threshold tab',async()=>{
  const [app,index,pkgText]=await Promise.all([
    readFile(new URL('../app.js',import.meta.url),'utf8'),
    readFile(new URL('../index.html',import.meta.url),'utf8'),
    readFile(new URL('../package.json',import.meta.url),'utf8')
  ]),pkg=JSON.parse(pkgText);
  assert.ok(index.indexOf('<script src="suggested-keywords.js"></script>')<index.indexOf('<script src="app.js"></script>'));
  assert.match(pkg.scripts.check,/node --check suggested-keywords\.js/);
  assert.match(pkg.scripts.build,/suggested-keywords\.js/);
  assert.match(app,/SUGGESTED_KEYWORDS_STATE_KEY='__suggestedKeywordsSnapshot'/);
  assert.match(app,/latest Ads \+ SQP \+ reverse-ASIN terms − tracked − deleted/);
  assert.match(app,/tabs=\['AI Bids','Bids','Suggested Keywords','Negative Keywords'\]/);
  assert.doesNotMatch(app,/suggestion:'New Keyword'/);
});
