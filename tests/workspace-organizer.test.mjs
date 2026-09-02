import test from 'node:test';
import assert from 'node:assert/strict';
await import('../workspace-organizer.js');
await import('../local-operations-actions.js');
const org=globalThis.KeywordOSWorkspaceOrganizerTest;
const ops=globalThis.KeywordOSLocalOperationsTest;

test('normalizes tags case-insensitively and caps count',()=>{
  assert.deepEqual(org.normalizeTags('Alpha, alpha | Beta\nGamma'),['Alpha','Beta','Gamma']);
});

test('creates projects and unassigns their views when deleted',()=>{
  let state=org.createProject(org.emptyState(),{name:'Holiday','tags':'seasonal, q4'},'p1','2026-09-02T00:00:00Z');
  state=org.saveView(state,{name:'US view',page:'search-funnel',projectId:'p1'},'v1','2026-09-02T00:01:00Z');
  const next=org.deleteProject(state,'p1');
  assert.equal(next.projects.length,0);
  assert.equal(next.views[0].projectId,'');
});

test('saved views preserve only explicit exact filter context',()=>{
  const state=org.saveView(org.emptyState(),{name:'ASIN focus',page:'search-funnel',label:'Search Query Funnel',filter:{label:'ASIN',value:'B000TEST01'},tags:'core'},'v1','2026-09-02T00:00:00Z');
  assert.deepEqual(state.views[0].filter,{label:'ASIN',value:'B000TEST01'});
  assert.deepEqual(state.views[0].tags,['core']);
});

test('favorites toggle and are removed when a view is deleted',()=>{
  let state=org.saveView(org.emptyState(),{name:'A',page:'review-evidence'},'v1','2026-09-02T00:00:00Z');
  state=org.toggleFavorite(state,'v1');
  assert.deepEqual(state.favorites,['v1']);
  state=org.deleteView(state,'v1');
  assert.deepEqual(state.favorites,[]);
});

test('recent work deduplicates page plus filter and keeps newest first',()=>{
  let state=org.emptyState();
  state=org.recordRecent(state,{page:'rank-intelligence',label:'Rank',filter:{label:'ASIN',value:'A'}},'2026-09-02T00:00:00Z');
  state=org.recordRecent(state,{page:'review-evidence',label:'Reviews'},'2026-09-02T00:01:00Z');
  state=org.recordRecent(state,{page:'rank-intelligence',label:'Rank',filter:{label:'ASIN',value:'A'}},'2026-09-02T00:02:00Z');
  assert.equal(state.recent.length,2);
  assert.equal(state.recent[0].page,'rank-intelligence');
  assert.equal(state.recent[0].visitedAt,'2026-09-02T00:02:00Z');
});

test('saved view filters combine project tag favorite and query without fuzzy data matching',()=>{
  let state=org.createProject(org.emptyState(),{name:'P1'},'p1','2026-09-02T00:00:00Z');
  state=org.saveView(state,{name:'Core ASIN',page:'search-funnel',projectId:'p1',tags:'core, ads',filter:{label:'ASIN',value:'B1'}},'v1','2026-09-02T00:01:00Z');
  state=org.saveView(state,{name:'Other',page:'review-evidence',tags:'voc'},'v2','2026-09-02T00:02:00Z');
  state=org.toggleFavorite(state,'v1');
  assert.deepEqual(org.filterViews(state,{projectId:'p1',tag:'core',favoritesOnly:true,query:'B1'}).map(v=>v.id),['v1']);
});

test('normalization drops orphan favorites and project references',()=>{
  const state=org.normalizeState({projects:[],views:[{id:'v1',name:'One',page:'overview',projectId:'missing'}],favorites:['missing','v1'],recent:[]});
  assert.equal(state.views[0].projectId,'');
  assert.deepEqual(state.favorites,['v1']);
});

test('context capture never invents a filter when selector value is empty',()=>{
  assert.deepEqual(org.contextFromValues('inventory-risk','Inventory','SKU',''),{page:'inventory-risk',label:'Inventory',filter:null});
});

test('workspace organizer state is accepted by the existing local backup contract',()=>{
  const raw=JSON.stringify(org.emptyState());
  const result=ops.validateBackupObject({format:ops.BACKUP_FORMAT,version:ops.BACKUP_VERSION,createdAt:'2026-09-02T00:00:00Z',localStorage:{[org.STORAGE_KEY]:raw},datasets:[]});
  assert.equal(result.ok,true);
  assert.equal(result.backup.localStorage[org.STORAGE_KEY],raw);
});
