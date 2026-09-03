(function(root,factory){
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
