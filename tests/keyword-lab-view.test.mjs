import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../keyword-lab-view.js');
const view = globalThis.KeywordOSKeywordLabViewTest;

test('Keyword Lab column normalization keeps one stable keyword identity and drops unknown columns', () => {
  assert.deepEqual(view.normalizeColumns('discovery'),view.allowedKeys('discovery'));
  assert.deepEqual(view.normalizeState({}).columns.batch,view.allowedKeys('batch'));
  assert.deepEqual(view.normalizeColumns('discovery',['sales','bogus','sales']),['keyword','sales']);
  assert.deepEqual(view.normalizeColumns('batch',['source','keyword','reason']),['source','keyword','reason']);
});

test('column order moves deterministically without duplicating fields', () => {
  assert.deepEqual(view.moveColumn(['keyword','clicks','orders'],'orders',0,'discovery'),['orders','keyword','clicks']);
  assert.deepEqual(view.moveColumn(['keyword','clicks','orders'],'missing',1,'discovery'),['keyword','clicks','orders']);
});

test('filter presets preserve only explicit Keyword Lab filter fields', () => {
  const filters=view.normalizeFilterSnapshot({minClicks:'12',contains:'blue light',matchType:'EXACT',query:'ignored',unknown:'x'});
  assert.equal(filters.minClicks,'12');
  assert.equal(filters.contains,'blue light');
  assert.equal(filters.matchType,'EXACT');
  assert.equal(Object.hasOwn(filters,'query'),false);
  assert.equal(Object.hasOwn(filters,'unknown'),false);
});

test('saved filter names update case-insensitively instead of creating duplicate presets', () => {
  let state=view.upsertPreset(view.normalizeState({}),'High Intent',{minOrders:'2'},{id:'p1',now:'2026-09-03T00:00:00Z'});
  state=view.upsertPreset(state,'high intent',{minOrders:'3'},{id:'p2',now:'2026-09-03T01:00:00Z'});
  assert.equal(state.presets.length,1);
  assert.equal(state.presets[0].id,'p1');
  assert.equal(state.presets[0].filters.minOrders,'3');
});

test('column sorting is stable for discovery metrics and Batch keyword evidence', () => {
  const discovery=view.sortRows([{name:'b',orders:1},{name:'a',orders:3},{name:'c',orders:3}],'discovery',{key:'orders',dir:'desc'});
  assert.deepEqual(discovery.map(row=>row.name),['a','c','b']);
  const batch=view.sortRows([{keyword:'b',matched:true,metrics:{orders:{available:true,value:1}}},{keyword:'a',matched:true,metrics:{orders:{available:true,value:4}}}],'batch',{key:'orders',dir:'desc'});
  assert.deepEqual(batch.map(row=>row.keyword),['a','b']);
});

test('selected or current-page CSV uses only the visible ordered data columns', () => {
  const csv=view.rowsToCsv([{name:'reading glasses',orders:2,sales:45}],'discovery',['keyword','sales','orders']);
  assert.equal(csv.split('\n')[0],'"Keyword Phrase","Sales","Orders"');
  assert.equal(csv.split('\n')[1],'"reading glasses","45","2"');
});

test('Keyword Lab view runtime is wired into build, backup, bridge and Saved View replay without adding a dependency', async () => {
  const source=await readFile(new URL('../keyword-lab-view.js',import.meta.url),'utf8');
  const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  const ops=await readFile(new URL('../local-operations-actions.js',import.meta.url),'utf8');
  const organizer=await readFile(new URL('../workspace-organizer.js',import.meta.url),'utf8');
  const lab=await readFile(new URL('../keyword-lab.js',import.meta.url),'utf8');
  assert.ok(index.indexOf('<script src="keyword-lab-view.js"></script>')>index.indexOf('<script src="keyword-lab.js"></script>'));
  assert.match(pkg.scripts.check,/node --check keyword-lab-view\.js/);
  assert.match(pkg.scripts.build,/keyword-lab-view\.js/);
  assert.match(app,/setResearchSort\(key,dir\)/);
  assert.match(app,/applyResearchView\(payload=\{\}\)/);
  assert.match(ops,/keywordos_v9_keyword_lab_view/);
  assert.match(organizer,/captureWorkspaceContext/);
  assert.match(organizer,/applyWorkspaceContext/);
  assert.match(lab,/getRootWorkspaceState/);
  assert.match(source,/data-keyword-lab-column-row/);
  assert.match(source,/Export current page/);
  assert.match(source,/Keyword Lab Query History/);
  assert.equal(Object.keys(pkg.dependencies).length,1);
});
