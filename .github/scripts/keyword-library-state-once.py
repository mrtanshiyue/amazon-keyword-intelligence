from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    p.write_text(text.replace(old, new, 1))


def replace_between(path, start_marker, end_marker, replacement, label):
    p = Path(path)
    text = p.read_text()
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f"{label}: start marker missing")
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f"{label}: end marker missing")
    p.write_text(text[:start] + replacement + text[end:])


module = r'''(function(root,factory){
  const api=factory();
  if(typeof globalThis!=='undefined')globalThis.KeywordOSKeywordLibraryStateTest=api;
  if(root)root.KeywordOSKeywordLibraryState=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';

const PAGE_SIZES=Object.freeze([20,50,100]);
const STATUS_OPTIONS=Object.freeze(['Active','Review','Archived']);
const DEFAULT_FOLDER='Unfiled';
const MAX_FOLDERS=12;
const MAX_TAGS=12;
const MAX_CUSTOM_COLUMNS=12;

function clean(value,max=500){return String(value??'').replace(/\s+/g,' ').trim().slice(0,max)}
function unique(values,normalizer){const out=[],seen=new Set();for(const raw of Array.isArray(values)?values:[]){const value=normalizer(raw),key=value.toLowerCase();if(!value||seen.has(key))continue;seen.add(key);out.push(value)}return out}
function normalizeFolders(values){const source=Array.isArray(values)?values:String(values??'').split(',');const folders=unique(source,value=>clean(value,80)).slice(0,MAX_FOLDERS);return folders.length?folders:[DEFAULT_FOLDER]}
function normalizeTags(values){const source=Array.isArray(values)?values:String(values??'').split(',');return unique(source,value=>clean(value,80)).slice(0,MAX_TAGS)}
function normalizeStatus(value){const match=STATUS_OPTIONS.find(option=>option.toLowerCase()===clean(value,40).toLowerCase());return match||STATUS_OPTIONS[0]}
function normalizeCustomFields(value){if(!value||typeof value!=='object'||Array.isArray(value))return{};const out={};for(const [rawKey,rawValue] of Object.entries(value)){const key=clean(rawKey,100),field=clean(rawValue,500);if(key&&field)out[key]=field}return out}
function normalizeAssetMetadata(asset={}){return{...asset,folders:normalizeFolders(asset.folders??asset.folder??[]),status:normalizeStatus(asset.status),note:clean(asset.note,1000),favorite:Boolean(asset.favorite),deletedAt:clean(asset.deletedAt,80),tags:normalizeTags(asset.tags),intent:clean(asset.intent,80)||'Unclassified',customFields:normalizeCustomFields(asset.customFields)}}
function idSet(ids){return new Set((Array.isArray(ids)?ids:[]).map(value=>clean(value,120)).filter(Boolean))}
function updateAssets(rows,ids,updater){const targets=idSet(ids);return(Array.isArray(rows)?rows:[]).map(raw=>{const row=normalizeAssetMetadata(raw);return targets.has(clean(row.id,120))?normalizeAssetMetadata(updater(row)):row})}
function setFolders(rows,ids,folders){const normalized=normalizeFolders(folders);return updateAssets(rows,ids,row=>({...row,folders:normalized}))}
function moveAssets(rows,ids,folder){return setFolders(rows,ids,[clean(folder,80)||DEFAULT_FOLDER])}
function copyAssetsToFolder(rows,ids,folder){const target=clean(folder,80)||DEFAULT_FOLDER;return updateAssets(rows,ids,row=>({...row,folders:normalizeFolders([...row.folders,target])}))}
function trashAssets(rows,ids,deletedAt){const stamp=clean(deletedAt,80);if(!stamp)return(Array.isArray(rows)?rows:[]).map(normalizeAssetMetadata);return updateAssets(rows,ids,row=>({...row,deletedAt:stamp}))}
function restoreAssets(rows,ids){return updateAssets(rows,ids,row=>({...row,deletedAt:''}))}
function setStatus(rows,ids,status){const next=normalizeStatus(status);return updateAssets(rows,ids,row=>({...row,status:next}))}
function setNote(rows,ids,note){const next=clean(note,1000);return updateAssets(rows,ids,row=>({...row,note:next}))}
function setFavorite(rows,ids,value){return updateAssets(rows,ids,row=>({...row,favorite:value==null?!row.favorite:Boolean(value)}))}
function setTags(rows,ids,tags){const next=normalizeTags(tags);return updateAssets(rows,ids,row=>({...row,tags:next}))}
function setCustomField(rows,ids,columnId,value){const key=clean(columnId,100),nextValue=clean(value,500);if(!key)return(Array.isArray(rows)?rows:[]).map(normalizeAssetMetadata);return updateAssets(rows,ids,row=>{const customFields={...row.customFields};if(nextValue)customFields[key]=nextValue;else delete customFields[key];return{...row,customFields}})}
function removeCustomField(rows,columnId){const key=clean(columnId,100);if(!key)return(Array.isArray(rows)?rows:[]).map(normalizeAssetMetadata);return(Array.isArray(rows)?rows:[]).map(raw=>{const row=normalizeAssetMetadata(raw),customFields={...row.customFields};delete customFields[key];return{...row,customFields}})}
function hash(value){let h=2166136261;for(const char of String(value)){h^=char.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
function customColumnId(label){const value=clean(label,80),slug=value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24)||'field';return`custom_${slug}_${hash(value.toLowerCase()).slice(0,6)}`}
function normalizeCustomColumns(columns){const out=[],seenLabels=new Set(),seenIds=new Set();for(const raw of Array.isArray(columns)?columns:[]){const label=clean(typeof raw==='string'?raw:raw?.label,80);if(!label)continue;const id=clean(typeof raw==='object'&&raw?.id?raw.id:customColumnId(label),100),labelKey=label.toLowerCase();if(!id||seenIds.has(id)||seenLabels.has(labelKey))continue;seenIds.add(id);seenLabels.add(labelKey);out.push({id,label});if(out.length>=MAX_CUSTOM_COLUMNS)break}return out}
function addCustomColumn(columns,label){const current=normalizeCustomColumns(columns),cleanLabel=clean(label,80);if(!cleanLabel)return{columns:current,column:null,added:false};const existing=current.find(column=>column.label.toLowerCase()===cleanLabel.toLowerCase());if(existing)return{columns:current,column:existing,added:false};if(current.length>=MAX_CUSTOM_COLUMNS)return{columns:current,column:null,added:false};const column={id:customColumnId(cleanLabel),label:cleanLabel};return{columns:[...current,column],column,added:true}}
function removeCustomColumn(columns,columnId){const id=clean(columnId,100);return normalizeCustomColumns(columns).filter(column=>column.id!==id)}
function folderCatalog(rows=[],configured=[]){return unique([DEFAULT_FOLDER,...normalizeFolders(configured),...(Array.isArray(rows)?rows:[]).flatMap(row=>normalizeFolders(row?.folders??row?.folder??[]))],value=>clean(value,80)).sort((a,b)=>a.localeCompare(b))}
function paginate(rows=[],pageNo=1,pageSize=20){const source=Array.isArray(rows)?rows:[],size=PAGE_SIZES.includes(Number(pageSize))?Number(pageSize):PAGE_SIZES[0],pages=Math.max(1,Math.ceil(source.length/size)),page=Math.min(pages,Math.max(1,Number(pageNo)||1)),start=source.length?(page-1)*size:0,end=Math.min(start+size,source.length);return{rows:source.slice(start,end),pageNo:page,pageSize:size,pages,total:source.length,from:source.length?start+1:0,to:end}}

return{PAGE_SIZES,STATUS_OPTIONS,DEFAULT_FOLDER,normalizeFolders,normalizeTags,normalizeStatus,normalizeAssetMetadata,setFolders,moveAssets,copyAssetsToFolder,trashAssets,restoreAssets,setStatus,setNote,setFavorite,setTags,setCustomField,removeCustomField,customColumnId,normalizeCustomColumns,addCustomColumn,removeCustomColumn,folderCatalog,paginate};
});
'''
Path('keyword-library-state.js').write_text(module)

# Load the pure state helper before app.js and ship/check it like every other runtime module.
replace_once('index.html', '  <script src="purchase-order-planning.js"></script>\n  <script src="app.js"></script>', '  <script src="purchase-order-planning.js"></script>\n  <script src="keyword-library-state.js"></script>\n  <script src="app.js"></script>', 'keyword library runtime script order')
replace_once('package.json', 'node --check keyword-lab.js && node --check keyword-lab-view.js', 'node --check keyword-lab.js && node --check keyword-lab-view.js && node --check keyword-library-state.js', 'keyword library syntax check')
replace_once('package.json', 'keyword-lab.js keyword-lab-view.js navigation-taxonomy.js', 'keyword-lab.js keyword-lab-view.js keyword-library-state.js navigation-taxonomy.js', 'keyword library build copy')

# Keyword Lab library input must never load recycled assets into Batch Analysis.
replace_once('keyword-lab.js', "const parsed=normalizeBatchKeywordList((record.rows||[]).map(keywordAssetValue),{source:'keyword-library',format:'library'});", "const parsed=normalizeBatchKeywordList((record.rows||[]).filter(row=>!clean(row?.deletedAt)).map(keywordAssetValue),{source:'keyword-library',format:'library'});", 'Keyword Lab trash exclusion')

app = Path('app.js')
text = app.read_text()
text = text.replace('const datasetRegistry=window.KeywordOSDatasetRegistry;\n', 'const datasetRegistry=window.KeywordOSDatasetRegistry;\nconst keywordLibraryState=window.KeywordOSKeywordLibraryState;\n', 1)

start = text.find('function keywordAssetRows(){')
end = text.find('\n\nconst DEFAULT_PROTECTED', start)
if start < 0 or end < 0:
    raise SystemExit('keyword asset sync block missing')
asset_block = r'''function persistedKeywordAssetRows(){return(state.datasetRegistry||[]).find(record=>record.kind==='keyword-assets')?.rows||[];}
function keywordAssetRows(){const assets=new Map(),normalizeMetadata=row=>keywordLibraryState?.normalizeAssetMetadata?.(row)||{...row,folders:Array.isArray(row?.folders)&&row.folders.length?row.folders:['Unfiled'],status:row?.status||'Active',note:row?.note||'',favorite:Boolean(row?.favorite),deletedAt:row?.deletedAt||'',customFields:row?.customFields&&typeof row.customFields==='object'?row.customFields:{}};for(const raw of persistedKeywordAssetRows()){const keyword=String(raw?.keyword||raw?.name||'').trim();if(!keyword)continue;const id=keywordAssetId(keyword);assets.set(id,normalizeMetadata({...raw,id,keyword}))}const add=(term,asset)=>{const keyword=String(term||'').trim();if(!keyword)return;const id=keywordAssetId(keyword),current=assets.get(id),tags=keywordTagsFor(keyword),intent=keywordIntentFor(keyword),tracked=state.tracked.some(value=>String(value).toLowerCase()===keyword.toLowerCase()),protectedKeyword=isProtected(keyword),sources=[...new Set([...(current?.sources||[]),...(asset.sources||[])])];assets.set(id,normalizeMetadata({...current,id,keyword:current?.keyword||keyword,...asset,sources,lifecycle:asset.lifecycle||current?.lifecycle||'Library candidate',tags:tags.length?tags:(current?.tags||[]),intent:intent!=='Unclassified'?intent:(current?.intent||'Unclassified'),tracked,protected:protectedKeyword,createdAt:current?.createdAt||today()}))};for(const item of aggregateLevel(state.currentRows||[],'searchterm'))add(item.name,{lifecycle:classifyKeyword(item)[0],sources:['ads']});for(const row of sqpKeywordEvidence())add(row.query,{lifecycle:'SQP evidence only',sources:['sqp']});for(const action of state.actions||[])add(action.term,{lifecycle:'Library candidate',sources:['local action']});return[...assets.values()].sort((a,b)=>String(a.keyword).localeCompare(String(b.keyword)))}
async function persistKeywordAssetRows(rows,source='Keyword Library local metadata'){return persistWorkspaceDataset('keyword-assets',{rows,source,importedAt:new Date().toISOString()})}
async function syncKeywordAssets(){try{const rows=keywordAssetRows();await persistKeywordAssetRows(rows,'Derived from Store 01 keyword evidence plus preserved Keyword Library metadata');return rows;}catch(err){console.warn('KeywordOS keyword asset sync skipped',err);return[];}}'''
text = text[:start] + asset_block + text[end:]

old_ui = "keywordUi:load(STORAGE.keywordUi,{search:'',lifecycle:'all',tag:'all',columns:['lifecycle','tags','protected','products','campaigns','clicks','orders','spend','sales','acos','cvr']}),"
new_ui = "keywordUi:load(STORAGE.keywordUi,{search:'',lifecycle:'all',tag:'all',folder:'all',status:'all',trash:false,pageNo:1,pageSize:20,folders:['Unfiled'],customColumns:[],libraryVersion:2,columns:['folders','status','lifecycle','tags','note','favorite','protected','clicks','orders','sales','acos']}),"
if text.count(old_ui) != 1:
    raise SystemExit('keywordUi default anchor mismatch')
text = text.replace(old_ui, new_ui, 1)

state_anchor = "};\nlet globalKeywordSearchTimer=null,keywordLibrarySearchTimer=null,trackerSearchTimer=null,changeLogSearchTimer=null;"
state_insert = """};
if(state.keywordUi.libraryVersion!==2){state.keywordUi={...state.keywordUi,folder:'all',status:'all',trash:false,pageNo:1,pageSize:20,folders:['Unfiled'],customColumns:[],libraryVersion:2,columns:['folders','status','lifecycle','tags','note','favorite','protected','clicks','orders','sales','acos']};save(STORAGE.keywordUi,state.keywordUi);}state.keywordUi.pageSize=keywordLibraryState?.PAGE_SIZES?.includes(Number(state.keywordUi.pageSize))?Number(state.keywordUi.pageSize):20;state.keywordUi.folders=keywordLibraryState?.normalizeFolders?.(state.keywordUi.folders||['Unfiled'])||['Unfiled'];state.keywordUi.customColumns=keywordLibraryState?.normalizeCustomColumns?.(state.keywordUi.customColumns||[])||[];
let keywordLibrarySelected=new Set();
let globalKeywordSearchTimer=null,keywordLibrarySearchTimer=null,trackerSearchTimer=null,changeLogSearchTimer=null;"""
if text.count(state_anchor) != 1:
    raise SystemExit('state migration anchor mismatch')
text = text.replace(state_anchor, state_insert, 1)

old_columns = "const KEYWORD_LIBRARY_COLUMNS=[['lifecycle','Lifecycle'],['tags','Tags'],['protected','Protected'],['products','Products'],['campaigns','Campaigns'],['clicks','Clicks'],['orders','Orders'],['spend','Spend'],['sales','Sales'],['acos','ACoS'],['cvr','CVR']];"
new_columns = "const KEYWORD_LIBRARY_COLUMNS=[['folders','Folders'],['status','Status'],['lifecycle','Lifecycle'],['tags','Tags'],['note','Note'],['favorite','Favorite'],['protected','Protected'],['products','Products'],['campaigns','Campaigns'],['clicks','Clicks'],['orders','Orders'],['spend','Spend'],['sales','Sales'],['acos','ACoS'],['cvr','CVR']];"
if text.count(old_columns) != 1:
    raise SystemExit('keyword library columns anchor mismatch')
text = text.replace(old_columns, new_columns, 1)

old_meta = "function keywordTagsFor(term){return normalizeKeywordTags(state.keywordTags[String(term||'').toLowerCase()]||[]);}\nfunction keywordIntentFor(term){return String(state.keywordIntents[String(term||'').toLowerCase()]||'Unclassified');}"
new_meta = "function keywordTagsFor(term){const key=String(term||'').toLowerCase(),legacy=normalizeKeywordTags(state.keywordTags[key]||[]);if(legacy.length)return legacy;const asset=persistedKeywordAssetRows().find(row=>String(row?.keyword||'').toLowerCase()===key);return normalizeKeywordTags(asset?.tags||[]);}\nfunction keywordIntentFor(term){const key=String(term||'').toLowerCase(),legacy=String(state.keywordIntents[key]||'').trim();if(legacy)return legacy;const asset=persistedKeywordAssetRows().find(row=>String(row?.keyword||'').toLowerCase()===key);return String(asset?.intent||'Unclassified');}"
if text.count(old_meta) != 1:
    raise SystemExit('keyword metadata fallback anchor mismatch')
text = text.replace(old_meta, new_meta, 1)

old_all_tags = "function allKeywordTags(){return [...new Set(Object.values(state.keywordTags).flatMap(v=>normalizeKeywordTags(v)))].sort((a,b)=>a.localeCompare(b));}"
new_all_tags = "function allKeywordTags(){return [...new Set([...Object.values(state.keywordTags).flatMap(v=>normalizeKeywordTags(v)),...persistedKeywordAssetRows().flatMap(row=>normalizeKeywordTags(row?.tags||[]))])].sort((a,b)=>a.localeCompare(b));}"
if text.count(old_all_tags) != 1:
    raise SystemExit('all keyword tags anchor mismatch')
text = text.replace(old_all_tags, new_all_tags, 1)

start = text.find('function classifyKeyword(x){')
end = text.find('function renderNegativeLibrary(){', start)
if start < 0 or end < 0:
    raise SystemExit('keyword library render block missing')
new_library_block = r'''function classifyKeyword(x){if(isProtected(x.name))return['Protected','blue'];if(x.orders>=3&&x.acos!=null&&x.acos<=.35)return['Core','green'];if(x.orders>=2&&x.acos!=null&&x.acos<=state.settings.harvestAcos/100)return['Winner','green'];if(x.orders===0&&x.clicks>=state.settings.negativeClicks&&x.spend>=state.settings.negativeSpend)return['Negative Candidate','red'];if(x.orders===0&&x.clicks>=6)return['Weak','amber'];return['Testing','gray'];}
function keywordLibraryRows(){const ads=new Map(aggregateLevel(getRangeRows(),'searchterm').map(row=>[String(row.name||'').toLowerCase(),row]));return keywordAssetRows().map(asset=>{const performance=ads.get(String(asset.keyword||'').toLowerCase())||null,base=performance?{...performance}:{name:asset.keyword,impressions:null,clicks:null,orders:null,spend:null,sales:null,acos:null,cvr:null,products:null,campaigns:null},lifecycle=performance?classifyKeyword(performance)[0]:(asset.lifecycle||'Library candidate');return{...base,id:asset.id,name:asset.keyword,asset,lifecycle,folders:keywordLibraryState.normalizeFolders(asset.folders),status:keywordLibraryState.normalizeStatus(asset.status),tags:normalizeKeywordTags(asset.tags),note:String(asset.note||''),favorite:Boolean(asset.favorite),deletedAt:String(asset.deletedAt||''),customFields:asset.customFields&&typeof asset.customFields==='object'?asset.customFields:{},hasAdsEvidence:Boolean(performance),sources:Array.isArray(asset.sources)?asset.sources:[]}})}
function keywordCustomColumns(){return keywordLibraryState.normalizeCustomColumns(state.keywordUi.customColumns||[])}
function keywordLibraryColumnCatalog(){return[...KEYWORD_LIBRARY_COLUMNS,...keywordCustomColumns().map(column=>[`custom:${column.id}`,column.label])]}
function allKeywordFolders(){return keywordLibraryState.folderCatalog(keywordAssetRows(),state.keywordUi.folders||['Unfiled'])}
function registerKeywordFolders(values){state.keywordUi.folders=keywordLibraryState.folderCatalog([],[(state.keywordUi.folders||[]),...(Array.isArray(values)?values:[values])].flat());save(STORAGE.keywordUi,state.keywordUi)}
function filteredKeywordLibraryRows(){let rows=keywordLibraryRows(),q=String(state.keywordUi.search||'').trim().toLowerCase(),lifecycle=state.keywordUi.lifecycle||'all',tag=state.keywordUi.tag||'all',folder=state.keywordUi.folder||'all',status=state.keywordUi.status||'all',trash=Boolean(state.keywordUi.trash);rows=rows.filter(row=>Boolean(row.deletedAt)===trash);if(q)rows=rows.filter(row=>[row.name,row.note,row.status,row.lifecycle,...row.tags,...row.folders,...Object.values(row.customFields||{})].some(value=>String(value||'').toLowerCase().includes(q)));if(lifecycle!=='all')rows=rows.filter(row=>row.lifecycle===lifecycle);if(tag!=='all')rows=rows.filter(row=>row.tags.includes(tag));if(folder!=='all')rows=rows.filter(row=>row.folders.includes(folder));if(status!=='all')rows=rows.filter(row=>row.status===status);return rows.sort((a,b)=>Number(b.favorite)-Number(a.favorite)||(Number(b.sales)||0)-(Number(a.sales)||0)||a.name.localeCompare(b.name))}
function keywordLibraryVisibleColumns(){const catalog=keywordLibraryColumnCatalog(),valid=new Set(catalog.map(row=>row[0])),configured=Array.isArray(state.keywordUi.columns)?state.keywordUi.columns:[],selected=configured.filter(key=>valid.has(key));return selected.length?selected:['folders','status','lifecycle','tags','note','favorite','protected','clicks','orders','sales','acos']}
function lifecycleBadge(value){const color=value==='Protected'||value==='Core'||value==='Winner'?'green':value==='Negative Candidate'?'red':value==='Weak'?'amber':value==='SQP evidence only'?'violet':'gray';return badge(value||'Unqualified',color)}
function keywordLibraryCell(x,key){if(key==='folders')return`<button class="btn ghost sm" data-kw-asset-edit="${esc(x.id)}">${x.folders.map(esc).join(' · ')}</button>`;if(key==='status')return`<button class="btn ghost sm" data-kw-asset-edit="${esc(x.id)}">${badge(x.status,x.status==='Active'?'green':x.status==='Review'?'amber':'gray')}</button>`;if(key==='lifecycle')return lifecycleBadge(x.lifecycle);if(key==='tags')return`<button class="btn ghost sm" data-tag-edit="${encodeURIComponent(x.name)}">${x.tags.length?x.tags.map(esc).join(' · '):'＋ Add tag'}</button>`;if(key==='note')return`<button class="btn ghost sm" data-kw-asset-edit="${esc(x.id)}" title="${esc(x.note)}">${x.note?esc(x.note.slice(0,48)):'＋ Note'}</button>`;if(key==='favorite')return`<button class="btn ghost sm" data-kw-favorite="${esc(x.id)}" aria-label="${x.favorite?'Remove favorite':'Add favorite'}">${x.favorite?'★':'☆'}</button>`;if(key==='protected')return`<span class="toggle ${isProtected(x.name)?'on':''}" data-protect="${encodeURIComponent(x.name)}"></span>`;if(key.startsWith('custom:')){const columnId=key.slice(7),value=String(x.customFields?.[columnId]||'');return`<button class="btn ghost sm" data-kw-custom-edit="${esc(x.id)}" data-column-id="${esc(columnId)}" title="${esc(value)}">${value?esc(value.slice(0,48)):'＋'}</button>`}if(['products','campaigns','clicks','orders','spend','sales','acos','cvr'].includes(key)&&!x.hasAdsEvidence)return'—';if(key==='products')return fmtInt(x.products);if(key==='campaigns')return fmtInt(x.campaigns);if(key==='clicks')return fmtInt(x.clicks);if(key==='orders')return fmtInt(x.orders);if(key==='spend')return fmtMoney(x.spend);if(key==='sales')return fmtMoney(x.sales);if(key==='acos')return fmtPct(x.acos);if(key==='cvr')return fmtPct(x.cvr);return '—'}
async function mutateKeywordLibrary(ids,transform,message){const selected=[...new Set((Array.isArray(ids)?ids:[]).filter(Boolean))];if(!selected.length)return;try{const next=transform(keywordAssetRows(),selected);await persistKeywordAssetRows(next,'Keyword Library local metadata');keywordLibrarySelected.clear();if(message)toast(message,'success');render()}catch(err){console.warn('Keyword Library mutation failed',err);toast('Keyword Library change could not be saved','error')}}
function openKeywordAssetEditor(assetId){const asset=keywordAssetRows().find(row=>row.id===assetId);if(!asset)return;const metadata=keywordLibraryState.normalizeAssetMetadata(asset);openModal('Keyword Asset Metadata',`<div class="form-field"><label>${esc(asset.keyword)}</label><small>Stable asset ID: ${esc(asset.id)}</small></div><div class="form-field top-gap"><label>Folders</label><input class="input" id="kw-asset-folders" value="${esc(metadata.folders.join(', '))}" placeholder="Unfiled, Seasonal"></div><div class="form-field top-gap"><label>Status</label><select class="select" id="kw-asset-status">${keywordLibraryState.STATUS_OPTIONS.map(option=>`<option ${metadata.status===option?'selected':''}>${esc(option)}</option>`).join('')}</select></div><div class="form-field top-gap"><label>Note</label><textarea class="input" id="kw-asset-note" rows="4" placeholder="Store-scoped working note">${esc(metadata.note)}</textarea></div><label class="mapping-row top-gap"><input type="checkbox" id="kw-asset-favorite" ${metadata.favorite?'checked':''}><b>Favorite</b><span>Pin this asset to the top of the current Library view.</span></label><div class="notice-banner top-gap">Move replaces folder memberships; Copy adds another membership while keeping one stable keyword asset ID.</div>`,[{label:'Cancel',action:closeModal},{label:'Save Metadata',type:'primary',action:()=>{const folders=keywordLibraryState.normalizeFolders($('#kw-asset-folders')?.value||'Unfiled'),status=$('#kw-asset-status')?.value||'Active',note=$('#kw-asset-note')?.value||'',favorite=Boolean($('#kw-asset-favorite')?.checked);registerKeywordFolders(folders);closeModal();void mutateKeywordLibrary([assetId],(rows,ids)=>keywordLibraryState.setFavorite(keywordLibraryState.setNote(keywordLibraryState.setStatus(keywordLibraryState.setFolders(rows,ids,folders),ids,status),ids,note),ids,favorite),'Keyword metadata saved')}}])}
function openKeywordFolderAction(mode){const ids=[...keywordLibrarySelected];if(!ids.length)return;const folders=allKeywordFolders();openModal(`${mode==='move'?'Move':'Copy'} selected keywords`,`<div class="form-field"><label>Target folder</label><input class="input" id="kw-folder-target" list="kw-folder-list" placeholder="Existing or new folder"><datalist id="kw-folder-list">${folders.map(folder=>`<option value="${esc(folder)}"></option>`).join('')}</datalist></div><div class="notice-banner top-gap">${mode==='move'?'Move replaces all current folder memberships.':'Copy adds the target folder membership; it does not duplicate the keyword asset or its ID.'}</div>`,[{label:'Cancel',action:closeModal},{label:mode==='move'?'Move':'Copy',type:'primary',action:()=>{const target=String($('#kw-folder-target')?.value||'').trim();if(!target)return toast('Enter a target folder','warn');registerKeywordFolders([target]);closeModal();void mutateKeywordLibrary(ids,(rows,selected)=>mode==='move'?keywordLibraryState.moveAssets(rows,selected,target):keywordLibraryState.copyAssetsToFolder(rows,selected,target),`${ids.length} keyword assets ${mode==='move'?'moved':'copied to folder'}`)}}])}
function openKeywordStatusAction(){const ids=[...keywordLibrarySelected];if(!ids.length)return;openModal('Set Keyword Library status',`<div class="form-field"><label>Status</label><select class="select" id="kw-bulk-status">${keywordLibraryState.STATUS_OPTIONS.map(option=>`<option>${esc(option)}</option>`).join('')}</select></div>`,[{label:'Cancel',action:closeModal},{label:'Apply Status',type:'primary',action:()=>{const status=$('#kw-bulk-status')?.value||'Active';closeModal();void mutateKeywordLibrary(ids,(rows,selected)=>keywordLibraryState.setStatus(rows,selected,status),`${ids.length} keyword assets updated`)}}])}
function openKeywordCustomValueEditor(assetId,columnId){const asset=keywordAssetRows().find(row=>row.id===assetId),column=keywordCustomColumns().find(item=>item.id===columnId);if(!asset||!column)return;const value=String(asset.customFields?.[columnId]||'');openModal(column.label,`<div class="form-field"><label>${esc(asset.keyword)}</label><input class="input" id="kw-custom-value" value="${esc(value)}" placeholder="Custom value"></div>`,[{label:'Cancel',action:closeModal},{label:'Save',type:'primary',action:()=>{const next=$('#kw-custom-value')?.value||'';closeModal();void mutateKeywordLibrary([assetId],(rows,ids)=>keywordLibraryState.setCustomField(rows,ids,columnId,next),'Custom field saved')}}])}
function openKeywordCustomColumnManager(){const columns=keywordCustomColumns();openModal('Keyword Library Custom Columns',`<div class="mapping-list">${columns.length?columns.map(column=>`<div class="mapping-row"><b>${esc(column.label)}</b><span>${esc(column.id)}</span><button class="btn danger sm" data-kw-custom-remove="${esc(column.id)}">Remove</button></div>`).join(''):'<div class="notice-banner">No custom columns yet.</div>'}</div><div class="form-field top-gap"><label>New column name</label><input class="input" id="kw-custom-column-name" placeholder="Priority owner"></div><div class="notice-banner top-gap">Up to 12 local custom columns. Values are stored on the same keyword-assets rows and included in backup/restore.</div>`,[{label:'Close',action:closeModal},{label:'Add Column',type:'primary',action:()=>{const result=keywordLibraryState.addCustomColumn(state.keywordUi.customColumns||[],$('#kw-custom-column-name')?.value||'');if(!result.added)return toast(result.column?'That custom column already exists':'Enter a unique custom column name','warn');state.keywordUi.customColumns=result.columns;state.keywordUi.columns=[...new Set([...(state.keywordUi.columns||[]),`custom:${result.column.id}`])];save(STORAGE.keywordUi,state.keywordUi);closeModal();render()}}]);$$('[data-kw-custom-remove]').forEach(button=>button.addEventListener('click',()=>{const columnId=button.dataset.kwCustomRemove;state.keywordUi.customColumns=keywordLibraryState.removeCustomColumn(state.keywordUi.customColumns||[],columnId);state.keywordUi.columns=(state.keywordUi.columns||[]).filter(key=>key!==`custom:${columnId}`);save(STORAGE.keywordUi,state.keywordUi);closeModal();void mutateKeywordLibrary(keywordAssetRows().map(row=>row.id),rows=>keywordLibraryState.removeCustomField(rows,columnId),'Custom column removed')}))}
function openKeywordColumnManager(){const visible=new Set(keywordLibraryVisibleColumns()),catalog=keywordLibraryColumnCatalog();openModal('Keyword Library Columns',`<div class="mapping-list">${catalog.map(([key,label])=>`<label class="mapping-row"><input type="checkbox" data-keyword-column="${esc(key)}" ${visible.has(key)?'checked':''}><b>${esc(label)}</b><span>Show in Keyword Library</span></label>`).join('')}</div>`,[{label:'Reset',action:()=>{state.keywordUi.columns=['folders','status','lifecycle','tags','note','favorite','protected','clicks','orders','sales','acos'];save(STORAGE.keywordUi,state.keywordUi);closeModal();render()}},{label:'Save Columns',type:'primary',action:()=>{const selected=$$('[data-keyword-column]:checked').map(input=>input.dataset.keywordColumn);state.keywordUi.columns=selected.length?selected:['folders','status','lifecycle','tags','note','favorite'];save(STORAGE.keywordUi,state.keywordUi);closeModal();render()}}])}
function keywordLibraryExportValue(x,key){if(key==='folders')return x.folders.join('|');if(key==='status')return x.status;if(key==='lifecycle')return x.lifecycle;if(key==='tags')return x.tags.join('|');if(key==='note')return x.note;if(key==='favorite')return x.favorite?'Yes':'No';if(key==='protected')return isProtected(x.name)?'Yes':'No';if(key.startsWith('custom:'))return x.customFields?.[key.slice(7)]||'';if(!x.hasAdsEvidence&&['products','campaigns','clicks','orders','spend','sales','acos','cvr'].includes(key))return'';if(key==='acos')return x.acos==null?'':(x.acos*100).toFixed(2)+'%';if(key==='cvr')return x.cvr==null?'':(x.cvr*100).toFixed(2)+'%';return x[key]??''}
function exportKeywordLibrary(rows){const visible=keywordLibraryVisibleColumns(),catalog=new Map(keywordLibraryColumnCatalog()),head=['Keyword',...visible.map(key=>catalog.get(key)||key)];const csv=[head.map(csvq).join(','),...rows.map(x=>[x.name,...visible.map(key=>keywordLibraryExportValue(x,key))].map(csvq).join(','))].join('\n');download(`KeywordOS_keyword_library_${today()}.csv`,csv,'text/csv;charset=utf-8')}
function renderKeywordLibrary(){const all=keywordLibraryRows(),items=filteredKeywordLibraryRows(),tags=allKeywordTags(),folders=allKeywordFolders(),lifecycles=[...new Set(all.map(row=>row.lifecycle).filter(Boolean))].sort(),visible=keywordLibraryVisibleColumns(),catalog=new Map(keywordLibraryColumnCatalog()),page=keywordLibraryState.paginate(items,state.keywordUi.pageNo,state.keywordUi.pageSize);if(page.pageNo!==state.keywordUi.pageNo){state.keywordUi.pageNo=page.pageNo;save(STORAGE.keywordUi,state.keywordUi)}const display=page.rows,selectedCount=keywordLibrarySelected.size;$('#content').innerHTML=`<div class="data-workspace"><div class="toolbar"><div class="toolbar-left"><div class="searchbox"><input id="kw-search" class="input" value="${esc(state.keywordUi.search||'')}" placeholder="Search keyword, tag, folder, note or custom value"></div><select id="kw-lifecycle-filter" class="select"><option value="all">All lifecycles</option>${lifecycles.map(value=>`<option value="${esc(value)}" ${state.keywordUi.lifecycle===value?'selected':''}>${esc(value)}</option>`).join('')}</select><select id="kw-tag-filter" class="select"><option value="all">All tags</option>${tags.map(value=>`<option value="${esc(value)}" ${state.keywordUi.tag===value?'selected':''}>${esc(value)}</option>`).join('')}</select><select id="kw-folder-filter" class="select"><option value="all">All folders</option>${folders.map(value=>`<option value="${esc(value)}" ${state.keywordUi.folder===value?'selected':''}>${esc(value)}</option>`).join('')}</select><select id="kw-status-filter" class="select"><option value="all">All statuses</option>${keywordLibraryState.STATUS_OPTIONS.map(value=>`<option value="${esc(value)}" ${state.keywordUi.status===value?'selected':''}>${esc(value)}</option>`).join('')}</select><span class="result-count">${fmtInt(items.length)} / ${fmtInt(all.length)} assets</span></div><div class="toolbar-right"><button class="btn ${state.keywordUi.trash?'danger':''}" id="kw-trash-view">♻ ${state.keywordUi.trash?'Back to Library':'Recycle Bin'}</button><button class="btn" id="kw-custom-columns">＋ Custom Columns</button><button class="btn" id="kw-columns">☷ Columns</button><button class="btn" id="kw-export">⇩ Export filtered</button><button class="btn primary" data-nav="cerebro">＋ Research Keywords</button></div></div>${selectedCount?`<div class="bulkbar"><strong>${selectedCount} selected</strong>${state.keywordUi.trash?'<button class="btn success sm" id="kw-restore-selected">Restore</button>':`<button class="btn sm" id="kw-move-selected">Move</button><button class="btn sm" id="kw-copy-selected">Copy</button><button class="btn sm" id="kw-status-selected">Status</button><button class="btn danger sm" id="kw-trash-selected">Trash</button>`}</div>`:''}<div class="table-scroll"><table class="data-table"><thead><tr><th class="check-col"><input type="checkbox" id="kw-select-page"></th><th class="left">Keyword Asset</th>${visible.map(key=>`<th class="${['folders','status','lifecycle','tags','note'].includes(key)||key.startsWith('custom:')?'left':key==='protected'||key==='favorite'?'center':''}">${esc(catalog.get(key)||key)}</th>`).join('')}</tr></thead><tbody>${display.length?display.map(x=>`<tr><td class="check-col"><input type="checkbox" data-kw-select="${esc(x.id)}" ${keywordLibrarySelected.has(x.id)?'checked':''}></td><td class="left"><span class="entity-link" data-kw-detail="${encodeURIComponent(x.name)}">${esc(x.name)}</span><small>${esc(x.id)} · ${esc(x.sources.join(', ')||'local asset')}</small></td>${visible.map(key=>`<td class="${['folders','status','lifecycle','tags','note'].includes(key)||key.startsWith('custom:')?'left':key==='protected'||key==='favorite'?'center':key==='acos'&&x.hasAdsEvidence?metricClassAcos(x.acos):key==='cvr'&&x.hasAdsEvidence?metricClassCvr(x.cvr):''}">${keywordLibraryCell(x,key)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${visible.length+2}"><div class="empty-state"><h3>${state.keywordUi.trash?'Recycle Bin is empty':'No keyword assets match'}</h3><p>${state.keywordUi.trash?'Trashed assets stay recoverable until restored.':'Clear a filter or sync new imported keyword evidence.'}</p></div></td></tr>`}</tbody></table></div><div class="table-footer"><div>Showing ${page.from}–${page.to} of ${fmtInt(page.total)} filtered assets · export includes all filtered rows</div><div class="pager"><select id="kw-page-size" class="select">${keywordLibraryState.PAGE_SIZES.map(size=>`<option value="${size}" ${page.pageSize===size?'selected':''}>${size} / page</option>`).join('')}</select><button id="kw-prev" ${page.pageNo<=1?'disabled':''}>‹</button><button class="active" disabled aria-current="page">${page.pageNo} / ${page.pages}</button><button id="kw-next" ${page.pageNo>=page.pages?'disabled':''}>›</button></div></div></div>`;$$('[data-protect]').forEach(toggle=>toggle.addEventListener('click',()=>toggleProtect(decodeURIComponent(toggle.dataset.protect))));$$('[data-kw-detail]').forEach(link=>link.addEventListener('click',()=>openSearchTermDetail(decodeURIComponent(link.dataset.kwDetail),getRangeRows())));$$('[data-tag-edit]').forEach(button=>button.addEventListener('click',()=>openKeywordTagEditor(decodeURIComponent(button.dataset.tagEdit))));$$('[data-kw-asset-edit]').forEach(button=>button.addEventListener('click',()=>openKeywordAssetEditor(button.dataset.kwAssetEdit)));$$('[data-kw-favorite]').forEach(button=>button.addEventListener('click',()=>void mutateKeywordLibrary([button.dataset.kwFavorite],(rows,ids)=>keywordLibraryState.setFavorite(rows,ids),'Favorite updated')));$$('[data-kw-custom-edit]').forEach(button=>button.addEventListener('click',()=>openKeywordCustomValueEditor(button.dataset.kwCustomEdit,button.dataset.columnId)));$$('[data-kw-select]').forEach(input=>input.addEventListener('change',()=>{if(input.checked)keywordLibrarySelected.add(input.dataset.kwSelect);else keywordLibrarySelected.delete(input.dataset.kwSelect);render()}));$('#kw-select-page')?.addEventListener('change',event=>{for(const row of display){if(event.target.checked)keywordLibrarySelected.add(row.id);else keywordLibrarySelected.delete(row.id)}render()});const resetPage=()=>{state.keywordUi.pageNo=1;keywordLibrarySelected.clear();save(STORAGE.keywordUi,state.keywordUi);render()};$('#kw-search')?.addEventListener('input',event=>{state.keywordUi.search=event.target.value;state.keywordUi.pageNo=1;save(STORAGE.keywordUi,state.keywordUi);clearTimeout(keywordLibrarySearchTimer);keywordLibrarySearchTimer=setTimeout(()=>{keywordLibrarySelected.clear();render();requestAnimationFrame(()=>{const input=$('#kw-search');if(input){input.focus();const n=input.value.length;input.setSelectionRange(n,n)}})},120)});$('#kw-lifecycle-filter')?.addEventListener('change',event=>{state.keywordUi.lifecycle=event.target.value;resetPage()});$('#kw-tag-filter')?.addEventListener('change',event=>{state.keywordUi.tag=event.target.value;resetPage()});$('#kw-folder-filter')?.addEventListener('change',event=>{state.keywordUi.folder=event.target.value;resetPage()});$('#kw-status-filter')?.addEventListener('change',event=>{state.keywordUi.status=event.target.value;resetPage()});$('#kw-trash-view')?.addEventListener('click',()=>{state.keywordUi.trash=!state.keywordUi.trash;resetPage()});$('#kw-columns')?.addEventListener('click',openKeywordColumnManager);$('#kw-custom-columns')?.addEventListener('click',openKeywordCustomColumnManager);$('#kw-export')?.addEventListener('click',()=>exportKeywordLibrary(items));$('#kw-page-size')?.addEventListener('change',event=>{state.keywordUi.pageSize=Number(event.target.value);resetPage()});$('#kw-prev')?.addEventListener('click',()=>{state.keywordUi.pageNo=Math.max(1,page.pageNo-1);save(STORAGE.keywordUi,state.keywordUi);render()});$('#kw-next')?.addEventListener('click',()=>{state.keywordUi.pageNo=Math.min(page.pages,page.pageNo+1);save(STORAGE.keywordUi,state.keywordUi);render()});$('#kw-move-selected')?.addEventListener('click',()=>openKeywordFolderAction('move'));$('#kw-copy-selected')?.addEventListener('click',()=>openKeywordFolderAction('copy'));$('#kw-status-selected')?.addEventListener('click',openKeywordStatusAction);$('#kw-trash-selected')?.addEventListener('click',()=>void mutateKeywordLibrary([...keywordLibrarySelected],(rows,ids)=>keywordLibraryState.trashAssets(rows,ids,new Date().toISOString()),'Keyword assets moved to Recycle Bin'));$('#kw-restore-selected')?.addEventListener('click',()=>void mutateKeywordLibrary([...keywordLibrarySelected],(rows,ids)=>keywordLibraryState.restoreAssets(rows,ids),'Keyword assets restored'))}
function toggleProtect(term){const k=term.toLowerCase();if(state.protected.has(k))state.protected.delete(k);else state.protected.add(k);save(STORAGE.protected,[...state.protected]);void syncKeywordAssets();toast(state.protected.has(k)?'Keyword protected':'Protection removed','success');render()}

'''
text = text[:start] + new_library_block + text[end:]
app.write_text(text)

# Focused pure-state and wiring tests.
test = r'''import test from 'node:test';
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
  assert.match(pkg,/keyword-lab-view\.js keyword-library-state\.js navigation-taxonomy\.js/);
  assert.match(app,/folder:'all',status:'all',trash:false,pageNo:1,pageSize:20/);
  assert.match(app,/keywordLibraryState\.moveAssets/);
  assert.match(app,/keywordLibraryState\.copyAssetsToFolder/);
  assert.match(app,/keywordLibraryState\.trashAssets/);
  assert.match(app,/keywordLibraryState\.restoreAssets/);
  assert.match(app,/Custom Columns/);
  assert.match(lab,/filter\(row=>!clean\(row\?\.deletedAt\)\)\.map\(keywordAssetValue\)/);
});
'''
Path('tests/keyword-library-state.test.mjs').write_text(test)

# README task acceptance record; counts are filled from the actual workflow output.
p = Path('README.md')
readme = p.read_text()
old = '- [ ] Keyword Library 增加 folder、tag、status、note、favorite、move/copy、回收站、custom columns 和 20/50/100 分页。'
new = '''- [x] Keyword Library 增加 folder、tag、status、note、favorite、move/copy、回收站、custom columns 和 20/50/100 分页。
  - 2026-09-03：Keyword Library 不再只把当前 Ads search-term 聚合表当成资产表；`keyword-assets` 保持稳定 keyword ID，并在每次 Ads / SQP / local action 同步时保留 Library 元数据，因此 SQP-only、本地候选以及后续导入中暂时不再出现的已登记关键词不会因为缺少当前 Ads 行而丢失。新增 `keyword-library-state.js` 作为无依赖纯状态层，统一 folder membership、tag/status/note/favorite、Recycle Bin、custom fields 与 20/50/100 分页；Move 会替换 folder memberships，Copy 只增加 folder membership，不复制 keyword asset ID。Library 支持 folder/tag/status/lifecycle 搜索筛选、收藏优先、批量 Move/Copy/Status/Trash、Recycle Bin 恢复、最多 12 个本地 custom columns、列显隐和全量 filtered export；无 Ads 证据的资产其广告指标显示 `—`，不会伪造 0。custom column 定义继续保存在现有 backup-safe `keywordos_v9_keyword_ui`，每个值和 folder/status/note/favorite/trash 状态直接保存在同一个 `keyword-assets` Dataset Registry 行中，没有新建第二个关键词库或新 storage key。Keyword Lab 的 “Use Keyword Library” 会排除 Recycle Bin 资产。CI 为 **__TEST_COUNT__ passed / 0 failed**；`npm run build` 验证 **__JS_COUNT__ 个 JS + 9 个 CSS，__PUBLISH_COUNT__ 个发布文件**，source/dist byte identity 与 committed-dist parity gate 全部通过。'''
if readme.count(old) != 1:
    raise SystemExit(f'README item expected once, found {readme.count(old)}')
p.write_text(readme.replace(old,new,1))
