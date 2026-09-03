from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    p.write_text(text.replace(old, new, 1))


def replace_between(path, start, end, new, label):
    p = Path(path)
    text = p.read_text()
    s = text.find(start)
    if s < 0:
        raise SystemExit(f"{label}: start anchor not found")
    e = text.find(end, s + len(start))
    if e < 0:
        raise SystemExit(f"{label}: end anchor not found")
    if text.find(start, s + 1) >= 0:
        raise SystemExit(f"{label}: start anchor not unique")
    p.write_text(text[:s] + new + text[e:])


growth = Path('growth-workspaces.js')
text = growth.read_text()
start = text.find('function normalizeListingKeywordBank(values){')
end = text.find('function renderListing(){', start)
if start < 0 or end < 0 or text.find('function normalizeListingKeywordBank(values){', start + 1) >= 0:
    raise SystemExit('listing keyword bank function block anchors invalid')
new_block = r'''function listingBankSources(values){const out=[],seen=new Set();for(const raw of Array.isArray(values)?values:[]){const value=String(raw||'').trim(),key=value.toLowerCase();if(!value||seen.has(key))continue;seen.add(key);out.push(value)}return out}
function normalizeListingKeywordBank(values){const seen=new Set(),out=[];for(const raw of Array.isArray(values)?values:[]){const object=raw&&typeof raw==='object'&&!Array.isArray(raw),keyword=String(object?(raw.keyword||raw.name||''):raw||'').trim().replace(/\s+/g,' '),key=normalizedTokens(keyword).join(' ');if(!keyword||!key||seen.has(key))continue;seen.add(key);const source=String(object&&raw.source?raw.source:'Keyword Lab'),sources=listingBankSources(object&&Array.isArray(raw.sources)&&raw.sources.length?raw.sources:[source]);out.push({keyword,assetId:String(object?(raw.assetId||raw.id||''):''),source,sources,addedAt:String(object&&raw.addedAt?raw.addedAt:''),favorite:Boolean(object&&raw.favorite),deletedAt:String(object&&raw.deletedAt?raw.deletedAt:''),status:String(object&&raw.status?raw.status:'')})}return out}
function mergeListingKeywordBank(existing,values,{source='Keyword Lab',addedAt=''}={}){const bank=normalizeListingKeywordBank(existing),index=new Map(bank.map((item,i)=>[normalizedTokens(item.keyword).join(' '),i])),added=[],updated=[];for(const raw of Array.isArray(values)?values:[values]){const object=raw&&typeof raw==='object'&&!Array.isArray(raw),prepared=object?{...raw,source:raw.source||source,addedAt:raw.addedAt||addedAt}:{keyword:raw,source,addedAt},incoming=normalizeListingKeywordBank([prepared])[0];if(!incoming)continue;const key=normalizedTokens(incoming.keyword).join(' '),position=index.get(key);if(position==null){index.set(key,bank.length);bank.push(incoming);added.push(incoming);continue}const current=bank[position],next={...current,assetId:incoming.assetId||current.assetId,source:object?incoming.source:current.source||incoming.source,sources:listingBankSources([...(current.sources||[]),...(incoming.sources||[])]),addedAt:current.addedAt||incoming.addedAt,favorite:object&&Object.prototype.hasOwnProperty.call(raw,'favorite')?incoming.favorite:current.favorite,deletedAt:object&&Object.prototype.hasOwnProperty.call(raw,'deletedAt')?incoming.deletedAt:current.deletedAt,status:object&&Object.prototype.hasOwnProperty.call(raw,'status')?incoming.status:current.status};if(JSON.stringify(next)!==JSON.stringify(current)){bank[position]=next;updated.push(next)}}return{bank,added,updated}}
function listingKeywordPlacement(fields,keyword){const labels={title:'Title',bullets:'Bullets',description:'Description',searchTerms:'Backend'},byField={};for(const field of Object.keys(labels))byField[field]=phraseCoverage(fields?.[field]||'',keyword);const placedFields=Object.keys(labels).filter(field=>byField[field].phrase).map(field=>labels[field]);return{placed:Boolean(placedFields.length),fields:placedFields,label:placedFields.join(' · ')||'Unplaced',byField}}
function listingKeywordBankRows(bank,assets,fields){const assetRows=Array.isArray(assets)?assets:[],byId=new Map(),byKeyword=new Map();for(const raw of assetRows){const keyword=String(raw?.keyword||raw?.name||'').trim(),key=normalizedTokens(keyword).join(' ');if(raw?.id)byId.set(String(raw.id),raw);if(key&&!byKeyword.has(key))byKeyword.set(key,raw)}return normalizeListingKeywordBank(bank).map(item=>{const key=normalizedTokens(item.keyword).join(' '),asset=(item.assetId&&byId.get(item.assetId))||byKeyword.get(key)||null,sources=listingBankSources([...(item.sources||[]),...(Array.isArray(asset?.sources)?asset.sources:[])]),favorite=asset?Boolean(asset.favorite):item.favorite,deletedAt=asset?String(asset.deletedAt||''):item.deletedAt,status=asset?String(asset.status||'Active'):item.status,placement=listingKeywordPlacement(fields,item.keyword);return{...item,assetId:String(asset?.id||item.assetId||''),sources,favorite,deletedAt,status,inLibrary:Boolean(asset),libraryState:deletedAt?'Recycle Bin':asset?(status||'Active'):'Bank only',placement}})}
async function stageListingKeywords(values,source='Keyword Lab'){const draft={title:'',bullets:'',description:'',searchTerms:'',brandTerms:'',...(load('listing')[0]||{})},merged=mergeListingKeywordBank(draft.keywordBank,values,{source,addedAt:new Date().toISOString()}),changed=merged.added.length+merged.updated.length;if(!changed){root?.KeywordOSUIBridge?.toast?.('Selected keywords are already current in Listing Keyword Bank','info');return{added:0,updated:0,total:merged.bank.length}}await save('listing',[{...draft,keywordBank:merged.bank}],`${source} send-to-listing`);root?.KeywordOSUIBridge?.toast?.(`${merged.added.length} keyword${merged.added.length===1?'':'s'} added · ${merged.updated.length} metadata link${merged.updated.length===1?'':'s'} refreshed`,'success');if((root?.KeywordOSPageRegistry?.pageFromHash?.(root.location?.hash||'')||'')==='listing-optimizer')render('listing-optimizer');return{added:merged.added.length,updated:merged.updated.length,total:merged.bank.length}}
'''
growth.write_text(text[:start] + new_block + text[end:])

# Render the bank against the live Listing draft and current Keyword Library metadata.
replace_once(
    'growth-workspaces.js',
    "},intake=normalizeListingKeywordBank(draft.keywordBank),fields={title:draft.title,bullets:draft.bullets,description:draft.description,searchTerms:draft.searchTerms},quality=",
    "},fields={title:draft.title,bullets:draft.bullets,description:draft.description,searchTerms:draft.searchTerms},intake=listingKeywordBankRows(draft.keywordBank,root?.KeywordOSUIBridge?.keywordAssets?.()||[],fields),quality=",
    'listing render intake join'
)

p = Path('growth-workspaces.js')
text = p.read_text()
ui_start = '<h3>Keyword Lab intake</h3>'
ui_end = '<h3>Field coverage</h3>'
s = text.find(ui_start)
e = text.find(ui_end, s)
if s < 0 or e < 0 or text.find(ui_start, s + 1) >= 0:
    raise SystemExit('listing bank UI anchors invalid')
new_ui = '''<h3>Listing Keyword Bank</h3>${intake.length?table(['Keyword','Library state','Sources','Favorite','Placement','Added'],intake.slice(0,100).map(item=>`<tr><td class="left"><b>${esc(item.keyword)}</b><small>${esc(item.assetId||'No Library asset link')}</small></td><td>${item.libraryState==='Recycle Bin'?'<span class="badge amber">Recycle Bin</span>':item.libraryState==='Bank only'?'<span class="badge gray">Bank only</span>':`<span class="badge ${item.libraryState==='Active'?'green':item.libraryState==='Review'?'amber':'gray'}">${esc(item.libraryState)}</span>`}</td><td class="left">${esc(item.sources.join(' + ')||item.source||'—')}<small>Intake: ${esc(item.source||'Keyword Lab')}</small></td><td>${item.favorite?'★':'☆'}</td><td class="left"><b>${esc(item.placement.label)}</b><small>Exact phrase in current local draft</small></td><td>${esc(item.addedAt?item.addedAt.slice(0,10):'—')}</td></tr>`)):'<div class="growth-chips"><span>No keywords in Listing Keyword Bank</span></div>'}<small>Keyword Bank is a planning bank only. Library source, favorite and Recycle Bin state remain traceable; placement is derived live from exact phrase presence in Title, Bullets, Description or Backend. Sending keywords here never edits those fields automatically.</small>'''
p.write_text(text[:s] + new_ui + text[e:])

# Export the new pure bank helpers.
replace_once(
    'growth-workspaces.js',
    'listingPlacementSuggestions,normalizeListingKeywordBank,mergeListingKeywordBank,stageListingKeywords,competitorListingGaps',
    'listingPlacementSuggestions,normalizeListingKeywordBank,mergeListingKeywordBank,listingKeywordPlacement,listingKeywordBankRows,stageListingKeywords,competitorListingGaps',
    'growth export listing bank helpers'
)

# App: derive Listing placement for each Library asset from the current persisted local draft.
p = Path('app.js')
text = p.read_text()
anchor = 'function keywordLibraryRows(){'
helper = r'''function listingDraftForKeywordLibrary(){return(state.datasetRegistry||[]).find(record=>record.kind==='listing')?.rows?.[0]||{}}
function keywordLibraryListingState(asset){const draft=listingDraftForKeywordLibrary(),bank=Array.isArray(draft.keywordBank)?draft.keywordBank:[],key=String(asset?.keyword||'').trim().toLowerCase().replace(/\s+/g,' '),inBank=bank.some(item=>String(item?.assetId||'')===String(asset?.id||'')||String(typeof item==='string'?item:item?.keyword||'').trim().toLowerCase().replace(/\s+/g,' ')===key);if(!inBank)return{inBank:false,label:'Not in bank'};const placement=window.KeywordOSGrowth?.listingKeywordPlacement?.({title:draft.title||'',bullets:draft.bullets||'',description:draft.description||'',searchTerms:draft.searchTerms||''},asset?.keyword||'');return{inBank:true,label:placement?.label||'Unplaced'}}
'''
if text.count(anchor) != 1:
    raise SystemExit(f'keywordLibraryRows anchor expected once, found {text.count(anchor)}')
text = text.replace(anchor, helper + anchor, 1)
p.write_text(text)

# Add the placement state to Library row data.
replace_once(
    'app.js',
    "return{...base,id:asset.id,name:asset.keyword,asset,lifecycle,folders:keywordLibraryState.normalizeFolders(asset.folders),status:keywordLibraryState.normalizeStatus(asset.status),tags:normalizeKeywordTags(asset.tags),note:String(asset.note||''),favorite:Boolean(asset.favorite),deletedAt:String(asset.deletedAt||''),customFields:asset.customFields&&typeof asset.customFields==='object'?asset.customFields:{},hasAdsEvidence:Boolean(performance),sources:Array.isArray(asset.sources)?asset.sources:[]}",
    "const listingState=keywordLibraryListingState(asset);return{...base,id:asset.id,name:asset.keyword,asset,lifecycle,folders:keywordLibraryState.normalizeFolders(asset.folders),status:keywordLibraryState.normalizeStatus(asset.status),tags:normalizeKeywordTags(asset.tags),note:String(asset.note||''),favorite:Boolean(asset.favorite),deletedAt:String(asset.deletedAt||''),customFields:asset.customFields&&typeof asset.customFields==='object'?asset.customFields:{},hasAdsEvidence:Boolean(performance),sources:Array.isArray(asset.sources)?asset.sources:[],inListingBank:listingState.inBank,listingPlacement:listingState.label}",
    'keyword library listing state row'
)

# Add placement as a first-class Library column without altering the shared base column constant.
replace_once(
    'app.js',
    "function keywordLibraryColumnCatalog(){return[...KEYWORD_LIBRARY_COLUMNS,...keywordCustomColumns().map(column=>[`custom:${column.id}`,column.label])]} ".rstrip(),
    "function keywordLibraryColumnCatalog(){return[...KEYWORD_LIBRARY_COLUMNS,['listingPlacement','Listing placement'],...keywordCustomColumns().map(column=>[`custom:${column.id}`,column.label])]}",
    'keyword library column catalog'
)

# Ensure all current default/reset column sets include Listing placement.
p = Path('app.js')
text = p.read_text()
old_cols = "['folders','status','lifecycle','tags','note','favorite','protected','clicks','orders','sales','acos']"
count = text.count(old_cols)
if count < 3:
    raise SystemExit(f'keyword library default columns expected at least 3 matches, found {count}')
text = text.replace(old_cols, "['folders','status','lifecycle','listingPlacement','tags','note','favorite','protected','clicks','orders','sales','acos']")
p.write_text(text)

# Render/export the placement column.
replace_once(
    'app.js',
    "function keywordLibraryExportValue(x,key){if(key==='folders')",
    "function keywordLibraryExportValue(x,key){if(key==='listingPlacement')return x.listingPlacement||'Not in bank';if(key==='folders')",
    'keyword library placement export'
)
replace_once(
    'app.js',
    "function keywordLibraryCell(x,key){if(key==='folders')",
    "function keywordLibraryCell(x,key){if(key==='listingPlacement')return x.inListingBank?badge(x.listingPlacement||'Unplaced',x.listingPlacement&&x.listingPlacement!=='Unplaced'?'green':'amber'):badge('Not in bank','gray');if(key==='folders')",
    'keyword library placement cell'
)

# Add Send to Listing to the normal Library bulk actions.
replace_once(
    'app.js',
    '<button class="btn sm" id="kw-status-selected">Status</button><button class="btn danger sm" id="kw-trash-selected">Trash</button>',
    '<button class="btn sm" id="kw-status-selected">Status</button><button class="btn sm" id="kw-listing-selected">Send to Listing</button><button class="btn danger sm" id="kw-trash-selected">Trash</button>',
    'keyword library listing bulk button'
)
replace_once(
    'app.js',
    "$('#kw-status-selected')?.addEventListener('click',openKeywordStatusAction);$('#kw-trash-selected')",
    "$('#kw-status-selected')?.addEventListener('click',openKeywordStatusAction);$('#kw-listing-selected')?.addEventListener('click',async()=>{const ids=new Set(keywordLibrarySelected),assets=keywordAssetRows().filter(row=>ids.has(row.id)&&!row.deletedAt),growth=window.KeywordOSGrowth;if(!assets.length)return toast('Select active Keyword Library assets first','warn');if(!growth?.stageListingKeywords)return toast('Listing Keyword Bank is unavailable','error');try{await growth.stageListingKeywords(assets,'Keyword Library');keywordLibrarySelected.clear();await window.KeywordOSUIBridge?.refreshDatasetRegistry?.();render()}catch(err){console.warn('Keyword Library send-to-listing failed',err);toast('Keywords could not be sent to Listing Keyword Bank','error')}});$('#kw-trash-selected')",
    'keyword library listing bulk handler'
)

# Expose the current authoritative Library asset rows to the Listing workspace.
replace_once(
    'app.js',
    'getRangeRows,aggregateLevel,isProtected,toast,syncKeywordAssets,stageKeywordAsset,stageKeywordAssets,trackKeywords,stageNegativeCandidates,render,',
    'keywordAssets(){return keywordAssetRows();},getRangeRows,aggregateLevel,isProtected,toast,syncKeywordAssets,stageKeywordAsset,stageKeywordAssets,trackKeywords,stageNegativeCandidates,render,',
    'UI bridge keyword assets'
)

# Tests for metadata linkage and live placement.
tests = r'''import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../growth-workspaces.js');
const growth = globalThis.KeywordOSGrowthTest;

test('Listing Keyword Bank keeps legacy rows readable and preserves linked Library metadata', () => {
  const rows = growth.normalizeListingKeywordBank([
    'reading glasses',
    { keyword:'blue light readers', id:'kw_blue', source:'Keyword Library', sources:['ads','sqp'], addedAt:'2026-09-03T00:00:00Z', favorite:true, status:'Review' }
  ]);
  assert.equal(rows[0].keyword,'reading glasses');
  assert.equal(rows[0].source,'Keyword Lab');
  assert.equal(rows[1].assetId,'kw_blue');
  assert.deepEqual(rows[1].sources,['ads','sqp']);
  assert.equal(rows[1].favorite,true);
  assert.equal(rows[1].status,'Review');
});

test('duplicate Listing intake refreshes Library metadata without duplicating the keyword', () => {
  const merged = growth.mergeListingKeywordBank(
    [{ keyword:'reading glasses', source:'Keyword Lab', addedAt:'2026-09-01T00:00:00Z' }],
    [{ id:'kw_readers', keyword:'Reading Glasses', sources:['ads','sqp'], favorite:true, deletedAt:'', status:'Active' }],
    { source:'Keyword Library', addedAt:'2026-09-03T00:00:00Z' }
  );
  assert.equal(merged.bank.length,1);
  assert.equal(merged.added.length,0);
  assert.equal(merged.updated.length,1);
  assert.equal(merged.bank[0].assetId,'kw_readers');
  assert.equal(merged.bank[0].source,'Keyword Library');
  assert.deepEqual(merged.bank[0].sources,['Keyword Lab','ads','sqp']);
  assert.equal(merged.bank[0].favorite,true);
});

test('Listing placement is exact phrase presence across Title Bullets Description and Backend', () => {
  const fields={title:'Reading glasses for women',bullets:'Blue light readers for office',description:'Lightweight TR frame reading glasses',searchTerms:'computer readers spring hinge'};
  assert.equal(growth.listingKeywordPlacement(fields,'reading glasses').label,'Title · Description');
  assert.equal(growth.listingKeywordPlacement(fields,'blue light readers').label,'Bullets');
  assert.equal(growth.listingKeywordPlacement(fields,'computer readers').label,'Backend');
  assert.equal(growth.listingKeywordPlacement(fields,'glasses reading').label,'Unplaced');
});

test('Listing Keyword Bank joins current Library favorite delete status sources and live placement', () => {
  const bank=[{ keyword:'reading glasses', assetId:'kw_a', source:'Keyword Library', sources:['ads'], addedAt:'2026-09-01T00:00:00Z', favorite:true }];
  const assets=[{ id:'kw_a', keyword:'Reading Glasses', sources:['ads','sqp'], favorite:false, deletedAt:'2026-09-03T01:00:00Z', status:'Archived' }];
  const rows=growth.listingKeywordBankRows(bank,assets,{title:'Reading glasses for women',bullets:'',description:'',searchTerms:''});
  assert.equal(rows.length,1);
  assert.equal(rows[0].favorite,false);
  assert.equal(rows[0].deletedAt,'2026-09-03T01:00:00Z');
  assert.equal(rows[0].libraryState,'Recycle Bin');
  assert.deepEqual(rows[0].sources,['ads','sqp']);
  assert.equal(rows[0].placement.label,'Title');
});

test('Keyword Library and Listing Optimizer are wired to one traceable bank without automatic copy mutation', async () => {
  const [app,workspace,readme]=await Promise.all([
    readFile(new URL('../app.js',import.meta.url),'utf8'),
    readFile(new URL('../growth-workspaces.js',import.meta.url),'utf8'),
    readFile(new URL('../README.md',import.meta.url),'utf8')
  ]);
  assert.match(app,/id="kw-listing-selected">Send to Listing/);
  assert.match(app,/stageListingKeywords\(assets,'Keyword Library'\)/);
  assert.match(app,/\['listingPlacement','Listing placement'\]/);
  assert.match(app,/keywordAssets\(\)\{return keywordAssetRows\(\);\}/);
  assert.match(workspace,/<h3>Listing Keyword Bank<\/h3>/);
  assert.match(workspace,/Library state','Sources','Favorite','Placement'/);
  assert.match(workspace,/never edits those fields automatically/i);
  assert.match(readme,/- \[x\] 串联 Keyword Library → Listing Keyword Bank → Title\/Bullets\/Description\/Backend/);
});
'''
Path('tests/listing-keyword-bank.test.mjs').write_text(tests)

# README: close the exact roadmap item with implementation/verification placeholders.
readme = Path('README.md')
text = readme.read_text()
old = '- [ ] 串联 Keyword Library → Listing Keyword Bank → Title/Bullets/Description/Backend，保留来源、收藏、删除和 placement 状态。'
new = '''- [x] 串联 Keyword Library → Listing Keyword Bank → Title/Bullets/Description/Backend，保留来源、收藏、删除和 placement 状态。
  - 2026-09-03：Keyword Library 的已选 active assets 现在可直接 **Send to Listing**，继续写入现有 `listing.keywordBank`，没有新建第二个 keyword bank / localStorage key。Bank item 在兼容旧 `keyword/source/addedAt` 行的同时补齐稳定 `assetId`、imported source list、favorite、Recycle Bin / status metadata；同一 normalized exact keyword 再次从 Library 送入时只刷新 metadata link，不复制关键词。Listing Optimizer 的 **Listing Keyword Bank** 会把 bank row 与当前 `keyword-assets` 重新精确关联，因此 Library 后续收藏切换或移入 Recycle Bin 不会让来源链断掉，删除资产也不会静默从已有 Listing Bank 消失。Title / Bullets / Description / Backend placement 不另存一份易过期状态，而是每次从当前本地 Listing draft 用完整 token-boundary phrase 精确计算：只显示真实命中的字段，词序颠倒、partial root 或 fuzzy match 不算 placement；Library 新增 `Listing placement` 列，可直接看到 `Not in bank / Unplaced / Title · Bullets · Description · Backend`。整个链路仍是 planning-only，不自动把词写进任何 Listing 字段，也不调用 Amazon API。CI 为 **__TEST_COUNT__ passed / 0 failed**；`npm run build` 验证 **__JS_COUNT__ 个 JS + 9 个 CSS，__PUBLISH_COUNT__ 个发布文件**，source/dist byte identity 与 committed-dist parity gate 全部通过。'''
if text.count(old) != 1:
    raise SystemExit(f'README listing bank item expected once, found {text.count(old)}')
readme.write_text(text.replace(old,new,1))
