import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../keyword-library-state.js');
const library=globalThis.KeywordOSKeywordLibraryStateTest;

test('keyword asset metadata normalizes folders tags status notes favorite and custom fields without changing identity',()=>{
  const row=library.normalizeAssetMetadata({id:'kw_123',keyword:'Reading Glasses',folders:['Seasonal','seasonal',''],tags:['Hero','hero'],status:'review',note:'  keep   this  ',favorite:1,customFields:{owner:' Alice ','':'drop'}});
  assert.equal(row.id,'kw_123');
  assert.deepEqual(row.folders,['Seasonal']);
  assert.deepEqual(row.tags,['Hero']);
  assert.equal(row.status,'Review');
  assert.equal(row.note,'keep this');
  assert.equal(row.favorite,true);
  assert.deepEqual(row.customFields,{owner:'Alice'});
});

test('move replaces folder memberships while copy adds membership without duplicating the asset',()=>{
  const rows=[{id:'kw_a',keyword:'a',folders:['Core']},{id:'kw_b',keyword:'b',folders:['Other']}];
  const moved=library.moveAssets(rows,['kw_a'],'Seasonal');
  assert.deepEqual(moved.find(row=>row.id==='kw_a').folders,['Seasonal']);
  const copied=library.copyAssetsToFolder(moved,['kw_a'],'Winners');
  assert.deepEqual(copied.find(row=>row.id==='kw_a').folders,['Seasonal','Winners']);
  assert.equal(copied.length,2);
});

test('Recycle Bin is reversible and preserves metadata',()=>{
  const rows=[{id:'kw_a',keyword:'a',folders:['Core'],status:'Archived',note:'retain me',favorite:true,customFields:{owner:'Alice'}}];
  const trashed=library.trashAssets(rows,['kw_a'],'2026-09-03T03:00:00Z');
  assert.equal(trashed[0].deletedAt,'2026-09-03T03:00:00Z');
  const restored=library.restoreAssets(trashed,['kw_a']);
  assert.equal(restored[0].deletedAt,'');
  assert.equal(restored[0].note,'retain me');
  assert.equal(restored[0].favorite,true);
  assert.deepEqual(restored[0].customFields,{owner:'Alice'});
});

test('custom columns use deterministic IDs and values stay on keyword-assets rows',()=>{
  const first=library.addCustomColumn([],'Priority Owner');
  const duplicate=library.addCustomColumn(first.columns,'priority owner');
  assert.equal(first.added,true);
  assert.equal(duplicate.added,false);
  assert.equal(first.columns[0].id,library.customColumnId('Priority Owner'));
  let rows=library.setCustomField([{id:'kw_a',keyword:'a'}],['kw_a'],first.column.id,' Alice ');
  assert.equal(rows[0].customFields[first.column.id],'Alice');
  rows=library.removeCustomField(rows,first.column.id);
  assert.deepEqual(rows[0].customFields,{});
});

test('Keyword Library pagination accepts only 20 50 or 100 and clamps page bounds',()=>{
  const rows=Array.from({length:135},(_,index)=>({id:`kw_${index}`,keyword:`k${index}`}));
  assert.deepEqual(library.PAGE_SIZES,[20,50,100]);
  const page=library.paginate(rows,3,50);
  assert.equal(page.pageNo,3);
  assert.equal(page.from,101);
  assert.equal(page.to,135);
  assert.equal(page.rows.length,35);
  const fallback=library.paginate(rows,99,25);
  assert.equal(fallback.pageSize,20);
  assert.equal(fallback.pageNo,7);
});

test('Keyword Library runtime is wired into app build and Keyword Lab excludes recycled assets',async()=>{
  const [app,index,pkg,lab]=await Promise.all([
    readFile(new URL('../app.js',import.meta.url),'utf8'),
    readFile(new URL('../index.html',import.meta.url),'utf8'),
    readFile(new URL('../package.json',import.meta.url),'utf8'),
    readFile(new URL('../keyword-lab.js',import.meta.url),'utf8')
  ]);
  assert.match(index,/keyword-library-state\.js[\s\S]*app\.js/);
  assert.match(pkg,/node --check keyword-library-state\.js/);
  assert.match(pkg,/keyword-lab-view\.js keyword-library-state\.js suggested-keywords\.js navigation-taxonomy\.js/);
  assert.match(app,/folder:'all',status:'all',trash:false,pageNo:1,pageSize:20/);
  assert.match(app,/keywordLibraryState\.moveAssets/);
  assert.match(app,/keywordLibraryState\.copyAssetsToFolder/);
  assert.match(app,/keywordLibraryState\.trashAssets/);
  assert.match(app,/keywordLibraryState\.restoreAssets/);
  assert.match(app,/Custom Columns/);
  assert.match(lab,/filter\(row=>!clean\(row\?\.deletedAt\)\)\.map\(keywordAssetValue\)/);
});
