from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    p.write_text(text.replace(old, new, 1))


# app.js — reuse the existing state contracts, but batch them idempotently.
replace_once(
    'app.js',
    "function queueAction(type,termOrName,meta={}){const term=typeof termOrName==='string'?termOrName:termOrName.name;state.actions.unshift({id:'a'+Date.now()+Math.random().toString(16).slice(2),keywordAssetId:keywordAssetId(term),date:new Date().toLocaleString(),type,term,status:'Pending',scope:meta.scope||'Campaign scoped',reason:meta.reason||'',source:meta.source||'Manual'});save(STORAGE.actions,state.actions);void syncKeywordAssets();}\nfunction stageKeywordAsset(term,reason='Imported keyword comparison'){const keyword=String(term||'').trim(),id=keywordAssetId(keyword);if(!keyword)return false;if(!(state.actions||[]).some(action=>action.keywordAssetId===id&&action.type==='Add to Keyword Library'))queueAction('Add to Keyword Library',keyword,{reason,scope:'Global asset',source:'Imported reverse-ASIN comparison'});else void syncKeywordAssets();toast(`${keyword} added to shared keyword assets`,'success');return true;}\nfunction queueNegative(term,match='Negative Exact',scope='Campaign scoped'){if(isProtected(term)){toast('Protected keyword blocked from negative targeting','error');return false}queueAction(match,term,{scope,reason:'Negative candidate from search-term performance'});if(!state.negatives.some(n=>n.term===term&&n.status==='Suggested'))state.negatives.unshift({id:'n'+Date.now()+Math.random().toString(16).slice(2),term,match,scope,status:'Suggested',created:today(),reason:'Performance threshold'});save(STORAGE.negatives,state.negatives);return true;}\n",
    "function normalizeKeywordTerms(values){const seen=new Set(),out=[];for(const raw of Array.isArray(values)?values:[values]){const term=String(raw||'').trim().replace(/\\s+/g,' '),key=term.toLowerCase();if(!term||seen.has(key))continue;seen.add(key);out.push(term);}return out;}\nfunction makeAction(type,termOrName,meta={}){const term=typeof termOrName==='string'?termOrName:termOrName.name;return{id:'a'+Date.now()+Math.random().toString(16).slice(2),keywordAssetId:keywordAssetId(term),date:new Date().toLocaleString(),type,term,status:'Pending',scope:meta.scope||'Campaign scoped',reason:meta.reason||'',source:meta.source||'Manual'};}\nfunction queueAction(type,termOrName,meta={}){state.actions.unshift(makeAction(type,termOrName,meta));save(STORAGE.actions,state.actions);void syncKeywordAssets();}\nfunction trackKeywords(values){const keywords=normalizeKeywordTerms(values),known=new Set(state.tracked.map(term=>String(term).toLowerCase())),added=[];for(const keyword of keywords){const key=keyword.toLowerCase();if(known.has(key))continue;known.add(key);state.tracked.push(keyword);added.push(keyword);}if(added.length){save(STORAGE.tracked,state.tracked);void syncKeywordAssets();}toast(`${added.length} keyword${added.length===1?'':'s'} added to tracker; rank snapshots remain import-driven`,added.length?'success':'info');return{requested:keywords.length,added:added.length,total:state.tracked.length};}\nfunction stageKeywordAssets(values,reason='Keyword Lab selection'){const keywords=normalizeKeywordTerms(values),existing=new Set((state.actions||[]).filter(action=>action.type==='Add to Keyword Library').map(action=>action.keywordAssetId)),added=[];for(const keyword of keywords){const id=keywordAssetId(keyword);if(existing.has(id))continue;existing.add(id);state.actions.unshift(makeAction('Add to Keyword Library',keyword,{reason,scope:'Global asset',source:'Keyword Lab'}));added.push(keyword);}if(added.length)save(STORAGE.actions,state.actions);void syncKeywordAssets();toast(`${added.length} keyword${added.length===1?'':'s'} added to shared keyword assets`,added.length?'success':'info');return{requested:keywords.length,added:added.length};}\nfunction stageNegativeCandidates(values,match='Negative Exact',scope='Campaign scoped'){const keywords=normalizeKeywordTerms(values),blocked=[],duplicates=[],staged=[];for(const keyword of keywords){if(isProtected(keyword)||negativeConflict(keyword,getRangeRows())){blocked.push(keyword);continue;}const key=keyword.toLowerCase(),pending=(state.actions||[]).some(action=>String(action.term||'').toLowerCase()===key&&action.type===match&&action.scope===scope&&action.status==='Pending'),suggested=(state.negatives||[]).some(item=>String(item.term||'').toLowerCase()===key&&item.match===match&&item.scope===scope&&item.status==='Suggested');if(pending||suggested){duplicates.push(keyword);continue;}state.actions.unshift(makeAction(match,keyword,{scope,reason:'Keyword Lab negative candidate',source:'Keyword Lab'}));state.negatives.unshift({id:'n'+Date.now()+Math.random().toString(16).slice(2),term:keyword,match,scope,status:'Suggested',created:today(),reason:'Keyword Lab candidate'});staged.push(keyword);}if(staged.length){save(STORAGE.actions,state.actions);save(STORAGE.negatives,state.negatives);void syncKeywordAssets();}toast(`${staged.length} negative candidate${staged.length===1?'':'s'} staged${blocked.length?` · ${blocked.length} protected/conflicted blocked`:''}${duplicates.length?` · ${duplicates.length} duplicate skipped`:''}`,staged.length?'success':blocked.length?'warn':'info');return{requested:keywords.length,staged:staged.length,blocked,duplicates};}\nfunction stageKeywordAsset(term,reason='Imported keyword comparison'){const keyword=String(term||'').trim();if(!keyword)return false;stageKeywordAssets([keyword],reason);return true;}\nfunction queueNegative(term,match='Negative Exact',scope='Campaign scoped'){if(isProtected(term)){toast('Protected keyword blocked from negative targeting','error');return false}queueAction(match,term,{scope,reason:'Negative candidate from search-term performance'});if(!state.negatives.some(n=>n.term===term&&n.status==='Suggested'))state.negatives.unshift({id:'n'+Date.now()+Math.random().toString(16).slice(2),term,match,scope,status:'Suggested',created:today(),reason:'Performance threshold'});save(STORAGE.negatives,state.negatives);return true;}\n",
    'app batch wrappers'
)
replace_once(
    'app.js',
    "getRangeRows,aggregateLevel,isProtected,toast,syncKeywordAssets,stageKeywordAsset,render,getResearchItems(){return researchTerms();},",
    "getRangeRows,aggregateLevel,isProtected,toast,syncKeywordAssets,stageKeywordAsset,stageKeywordAssets,trackKeywords,stageNegativeCandidates,render,getResearchItems(){return researchTerms();},",
    'bridge exports'
)

# growth-workspaces.js — a planning intake only; it does not mutate copy fields.
helpers = """function normalizeListingKeywordBank(values){const seen=new Set(),out=[];for(const raw of Array.isArray(values)?values:[]){const keyword=String(typeof raw==='string'?raw:raw?.keyword||'').trim().replace(/\\s+/g,' '),key=keyword.toLowerCase();if(!keyword||seen.has(key))continue;seen.add(key);out.push({keyword,source:String(typeof raw==='object'&&raw?.source?raw.source:'Keyword Lab'),addedAt:String(typeof raw==='object'&&raw?.addedAt?raw.addedAt:'')});}return out;}\nfunction mergeListingKeywordBank(existing,values,{source='Keyword Lab',addedAt=''}={}){const bank=normalizeListingKeywordBank(existing),seen=new Set(bank.map(item=>item.keyword.toLowerCase())),added=[];for(const raw of Array.isArray(values)?values:[values]){const keyword=String(raw||'').trim().replace(/\\s+/g,' '),key=keyword.toLowerCase();if(!keyword||seen.has(key))continue;seen.add(key);const item={keyword,source:String(source||'Keyword Lab'),addedAt:String(addedAt||'')};bank.push(item);added.push(item);}return{bank,added};}\nasync function stageListingKeywords(values,source='Keyword Lab'){const draft={title:'',bullets:'',description:'',searchTerms:'',brandTerms:'',...(load('listing')[0]||{})},merged=mergeListingKeywordBank(draft.keywordBank,values,{source,addedAt:new Date().toISOString()});if(!merged.added.length){root?.KeywordOSUIBridge?.toast?.('Selected keywords are already in Listing intake','info');return{added:0,total:merged.bank.length};}await save('listing',[{...draft,keywordBank:merged.bank}],'Keyword Lab send-to-listing');root?.KeywordOSUIBridge?.toast?.(`${merged.added.length} keyword${merged.added.length===1?'':'s'} sent to Listing intake`,'success');if((root?.KeywordOSPageRegistry?.pageFromHash?.(root.location?.hash||'')||'')==='listing-optimizer')render('listing-optimizer');return{added:merged.added.length,total:merged.bank.length};}\n"""
replace_once(
    'growth-workspaces.js',
    "function renderListing(){const draft={title:'',bullets:'',description:'',searchTerms:'',brandTerms:'',...(load('listing')[0]||{})},fields=",
    helpers + "function renderListing(){const draft={title:'',bullets:'',description:'',searchTerms:'',brandTerms:'',keywordBank:[],...(load('listing')[0]||{})},intake=normalizeListingKeywordBank(draft.keywordBank),fields=",
    'listing intake helpers'
)
intake_ui = """<h3>Keyword Lab intake</h3>${intake.length?table(['Keyword','Source','Added'],intake.slice(0,100).map(item=>`<tr><td class="left"><b>${esc(item.keyword)}</b></td><td>${esc(item.source||'Keyword Lab')}</td><td>${esc(item.addedAt?item.addedAt.slice(0,10):'—')}</td></tr>`)):'<div class="growth-chips"><span>No keywords sent from Keyword Lab</span></div>'}<small>Intake is a planning bank only. Sending keywords here never edits Title, Bullets, Description or Backend Search Terms automatically.</small><h3>Field coverage</h3>"""
replace_once('growth-workspaces.js', '<h3>Field coverage</h3>', intake_ui, 'listing intake UI')
replace_once(
    'growth-workspaces.js',
    'listingEvidenceTerms,listingPlacementSuggestions,competitorListingGaps,',
    'listingEvidenceTerms,listingPlacementSuggestions,normalizeListingKeywordBank,mergeListingKeywordBank,stageListingKeywords,competitorListingGaps,',
    'growth listing API exports'
)

# keyword-lab-view.js — one bulk action surface for Discovery and Batch.
anchor = """function openExport(mode=activeMode()){\n"""
helpers = """function normalizeKeywordSelection(values){const seen=new Set(),out=[];for(const raw of Array.isArray(values)?values:[]){const keyword=clean(raw),key=keyword.toLowerCase();if(!keyword||seen.has(key))continue;seen.add(key);out.push(keyword);}return out;}\nfunction selectedKeywords(mode=activeMode()){if(mode==='batch')return normalizeKeywordSelection([...batchSelected]);return normalizeKeywordSelection(root.KeywordOSUIBridge?.researchSelection||[]);}\nasync function runBulkAction(action,mode=activeMode()){if(action==='export'){openExport(mode);return{action,count:selectedKeywords(mode).length};}const keywords=selectedKeywords(mode),bridge=root.KeywordOSUIBridge;if(!keywords.length){bridge?.toast?.('Select at least one Keyword Lab result first','warn');return{action,count:0};}if(action==='list')return bridge?.stageKeywordAssets?.(keywords,'Keyword Lab bulk selection')||{action,count:0};if(action==='track')return bridge?.trackKeywords?.(keywords)||{action,count:0};if(action==='negative')return bridge?.stageNegativeCandidates?.(keywords,'Negative Exact','Campaign scoped')||{action,count:0};if(action==='listing'){if(typeof root.KeywordOSGrowth?.stageListingKeywords!=='function'){bridge?.toast?.('Listing intake is unavailable','error');return{action,count:0};}return root.KeywordOSGrowth.stageListingKeywords(keywords,'Keyword Lab');}return{action,count:0};}\nfunction ensureBulkActions(table,mode){const keywords=selectedKeywords(mode),workspace=mode==='batch'?table?.closest('[data-keyword-lab-batch-results]'):table?.closest('.data-workspace'),legacy=mode==='discovery'?workspace?.querySelector('.bulkbar:not([data-keyword-lab-unified-bulk])'):null;if(legacy){legacy.hidden=true;legacy.setAttribute('aria-hidden','true');}let bar=workspace?.querySelector('[data-keyword-lab-unified-bulk]');if(!keywords.length){bar?.remove();return;}if(!bar){bar=doc.createElement('div');bar.className='bulkbar';bar.dataset.keywordLabUnifiedBulk='1';const anchor=workspace?.querySelector('.table-scroll')||workspace?.firstElementChild;workspace?.insertBefore(bar,anchor||null);}bar.innerHTML=`<strong>${keywords.length} selected</strong><button type="button" class="btn success sm" data-keyword-lab-bulk="list">＋ Add to List</button><button type="button" class="btn success sm" data-keyword-lab-bulk="track" title="Adds keywords to the tracker. Rank snapshot values remain imported evidence only.">↗ Track Snapshot</button><button type="button" class="btn danger sm" data-keyword-lab-bulk="negative">⊖ Negative Candidate</button><button type="button" class="btn sm" data-keyword-lab-bulk="listing">→ Send to Listing</button><button type="button" class="btn sm" data-keyword-lab-bulk="export">⇩ Export</button>`;$$('[data-keyword-lab-bulk]',bar).forEach(button=>button.addEventListener('click',()=>{void runBulkAction(button.dataset.keywordLabBulk,mode);}));}\n"""
replace_once('keyword-lab-view.js', anchor, helpers + anchor, 'bulk action helpers')
replace_once(
    'keyword-lab-view.js',
    "function updateBatchSelectionCount(table){const current=new Set($$('[data-keyword-lab-view-select]',table).map(box=>decode(box.dataset.keywordLabViewSelect)));for(const keyword of [...batchSelected])if(!current.has(keyword))batchSelected.delete(keyword);const target=table?.closest('[data-keyword-lab-batch-results]')?.previousElementSibling?.querySelector('[data-keyword-lab-batch-selection]');if(target)target.textContent=`${batchSelected.size} selected`;}",
    "function updateBatchSelectionCount(table){const current=new Set($$('[data-keyword-lab-view-select]',table).map(box=>decode(box.dataset.keywordLabViewSelect)));for(const keyword of [...batchSelected])if(!current.has(keyword))batchSelected.delete(keyword);const target=table?.closest('[data-keyword-lab-batch-results]')?.previousElementSibling?.querySelector('[data-keyword-lab-batch-selection]');if(target)target.textContent=`${batchSelected.size} selected`;ensureBulkActions(table,'batch');}",
    'batch selection bulk sync'
)
replace_once(
    'keyword-lab-view.js',
    "if(mode==='batch'){sortBatchDom(table);updateBatchSelectionCount(table);}else bindPresetControls();}",
    "if(mode==='batch'){sortBatchDom(table);updateBatchSelectionCount(table);}else{bindPresetControls();ensureBulkActions(table,mode);}}",
    'enhance bulk surface'
)
replace_once(
    'keyword-lab-view.js',
    'return Object.assign(PUBLIC_API,{openColumnSettings,openExport,openPresetSave,openPresetLibrary,openHistory,restoreBatchQuery,captureWorkspaceContext,applyWorkspaceContext,start});',
    'return Object.assign(PUBLIC_API,{normalizeKeywordSelection,selectedKeywords,runBulkAction,openColumnSettings,openExport,openPresetSave,openPresetLibrary,openHistory,restoreBatchQuery,captureWorkspaceContext,applyWorkspaceContext,start});',
    'view API exports'
)

Path('tests/keyword-lab-bulk-actions.test.mjs').write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../keyword-lab-view.js');
await import('../growth-workspaces.js');
const view = globalThis.KeywordOSKeywordLabViewTest;
const growth = globalThis.KeywordOSGrowthTest;

test('Keyword Lab bulk selection is exact, ordered and case-insensitive deduplicated', () => {
  assert.deepEqual(view.normalizeKeywordSelection([' Reading Glasses ', 'reading glasses', '', 'Blue Light Readers']), ['Reading Glasses', 'Blue Light Readers']);
});

test('Listing intake merges Keyword Lab keywords without editing listing text fields', () => {
  const merged = growth.mergeListingKeywordBank(
    [{ keyword: 'reading glasses', source: 'Keyword Library', addedAt: '2026-09-01T00:00:00Z' }],
    ['Reading Glasses', 'blue light readers'],
    { source: 'Keyword Lab', addedAt: '2026-09-03T00:00:00Z' }
  );
  assert.equal(merged.added.length, 1);
  assert.deepEqual(merged.bank.map(item => item.keyword), ['reading glasses', 'blue light readers']);
  assert.equal(merged.bank[1].source, 'Keyword Lab');
});

test('unified bulk actions reuse Store state contracts and keep rank snapshots import-driven', async () => {
  const [app, viewSource, growthSource, readme] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../keyword-lab-view.js', import.meta.url), 'utf8'),
    readFile(new URL('../growth-workspaces.js', import.meta.url), 'utf8'),
    readFile(new URL('../README.md', import.meta.url), 'utf8')
  ]);
  assert.match(app, /stageKeywordAssets,trackKeywords,stageNegativeCandidates/);
  assert.match(app, /negativeConflict\(keyword,getRangeRows\(\)\)/);
  for (const label of ['Add to List','Track Snapshot','Negative Candidate','Send to Listing','⇩ Export']) assert.match(viewSource, new RegExp(label));
  assert.match(viewSource, /rank snapshot values remain imported evidence only/i);
  assert.match(growthSource, /planning bank only/);
  assert.match(growthSource, /never edits Title, Bullets, Description or Backend Search Terms automatically/);
  assert.match(readme, /- \[x\] 统一批量动作：Add to List、Track Snapshot、Negative Candidate、Send to Listing、Export。/);
});
''')

replace_once(
    'README.md',
    '- [ ] 统一批量动作：Add to List、Track Snapshot、Negative Candidate、Send to Listing、Export。',
    """- [x] 统一批量动作：Add to List、Track Snapshot、Negative Candidate、Send to Listing、Export。\n  - 2026-09-03：Keyword Lab 的 Discovery 与 Batch 现在共享同一组选中项批量动作。Add to List 复用现有 `keyword-assets` / Action Center 派生链路并按 keyword asset id 去重；Track Snapshot 只把关键词加入 Store tracker，明确不伪造 rank snapshot，排名值仍只来自导入的 `ranks` 证据；Negative Candidate 继续先执行 Protected Keyword 与 cross-product conflict gate，并对相同 Pending/Suggested 候选去重。Send to Listing 新增最小 `listing.keywordBank` intake：保留 keyword / source / addedAt，并在 Listing Optimizer 显示，但不会自动改写 Title、Bullets、Description 或 Backend Search Terms。Export 继续复用 Keyword Lab 现有 Selected / Current Page CSV 逻辑与可见列顺序。批量动作保持 browser-local / review-first，不新增 Amazon 写 API。CI 为 **345 passed / 0 failed**；`npm run build` 验证 **43 个 JS + 9 个 CSS，53 个发布文件**，source/dist byte identity 与 committed-dist parity gate 全部通过。""",
    'README task'
)
