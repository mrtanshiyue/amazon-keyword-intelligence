(function(root,factory){
  const api=factory(root);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSImportStatesTest=api;
  if(root){root.KeywordOSImportStates=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const STORE_ID='store-a';
const IMPORT_PAGE_CONFIG=Object.freeze({
  'product-master':Object.freeze([
    Object.freeze({kind:'product-master',label:'Product Master',required:'Product ID plus SKU or ASIN',optional:'Parent ASIN, FNSKU, Product Family, Marketplace and Store',template:'growth'})
  ]),
  'search-funnel':Object.freeze([
    Object.freeze({kind:'sqp',label:'SQP / ABA',required:'Search Query',optional:'ASIN, dated demand/funnel totals and brand-share fields',template:'growth',dated:true})
  ]),
  'asin-comparison':Object.freeze([
    Object.freeze({kind:'reverse-asin',label:'Reverse-ASIN',required:'ASIN and Keyword for 2–20 ASINs',optional:'Search Volume, organic/sponsored rank, Traffic Share and Conversion Rate',template:'growth'})
  ]),
  'product-360':Object.freeze([
    Object.freeze({kind:'costs',label:'COGS',required:'SKU',optional:'Product, Unit Cost and Inbound Cost',template:'growth'}),
    Object.freeze({kind:'inventory',label:'Inventory',required:'SKU',optional:'Date, ASIN, Product, Available, Inbound, Reserved and Unfulfillable',template:'growth',dated:true})
  ]),
  'rank-intelligence':Object.freeze([
    Object.freeze({kind:'ranks',label:'Rank snapshots',required:'Date, Keyword and ASIN',optional:'Organic Rank, Sponsored Rank and Indexed',template:'growth',dated:true})
  ]),
  'inventory-risk':Object.freeze([
    Object.freeze({kind:'inventory',label:'Inventory',required:'SKU',optional:'Date, ASIN, Product, Available, Inbound, Reserved and Unfulfillable',template:'growth',dated:true})
  ]),
  'competitor-snapshots':Object.freeze([
    Object.freeze({kind:'competitor',label:'Competitor snapshots',required:'ASIN',optional:'Date, Title, Price, BSR, Rating, Review Count, Estimated Sales, Variants and Availability',template:'growth',dated:true}),
    Object.freeze({kind:'storefront',datasetKind:'competitor',label:'Storefront snapshots',required:'Snapshot Date, Storefront and ASIN',optional:'First Seen Date and supplied listing metrics',template:'storefront',dated:true,subset:'storefront'}),
    Object.freeze({kind:'competitor-ads',label:'Competitor Ads observations',required:'Date, ASIN and Keyword',optional:'Placement, Ad Type, Campaign Label, Observed Position and Source Note',template:'competitor-ads',dated:true})
  ]),
  'review-evidence':Object.freeze([
    Object.freeze({kind:'reviews',label:'Review evidence',required:'Date, ASIN, Rating, Title and Body',optional:'Variant, Marketplace, Language and explicit VOC labels',template:'growth',dated:true})
  ]),
  'import':Object.freeze([
    Object.freeze({kind:'ads',label:'Amazon Ads Search Term report',required:'Use an actual supported Amazon Ads Search Term CSV export',optional:'KeywordOS validates the existing Ads report shape and values before browser persistence',template:'authoritative'}),
    Object.freeze({kind:'finance',label:'Unified Transaction report',required:'Use an actual supported Unified Transaction CSV export',optional:'KeywordOS validates finance-critical fields before browser persistence',template:'authoritative'})
  ])
});
const IMPORT_CENTER_TITLES=new Set(['Import Center']);
const GROWTH_DATASET_KINDS=new Set(['sqp','costs','inventory','ranks','product-master','competitor','reviews','reverse-asin']);
const INPUT_KIND_BY_ID=Object.freeze({
  'hidden-file':'ads',
  'hidden-unified-file':'finance',
  'keywordos-storefront-snapshot-file':'storefront',
  'keywordos-competitor-ads-file':'competitor-ads'
});
let activeImport=null,lastError='',observer=null,toastWrapped=false,refreshQueued=false;

function clean(value){return String(value??'').replace(/\s+/g,' ').trim();}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function currentPage(locationLike=root?.location,title=''){
  const hash=String(locationLike?.hash||'');
  const match=hash.match(/^#page=(.+)$/);
  if(match)return decodeURIComponent(match[1]);
  return IMPORT_CENTER_TITLES.has(clean(title))?'import':'';
}
function configForPage(page){return IMPORT_PAGE_CONFIG[page]||[];}
function recordFor(records=[],kind){
  return (Array.isArray(records)?records:[]).find(record=>record?.storeId===STORE_ID&&record?.kind===kind)||null;
}
function rowCount(record){return Array.isArray(record?.rows)?record.rows.length:Number(record?.rowCount)||0;}
function subsetCount(entry,record){
  const rows=Array.isArray(record?.rows)?record.rows:[];
  if(entry?.subset==='storefront')return rows.filter(row=>clean(row?.storefront)&&clean(row?.asin)&&clean(row?.date)).length;
  return rowCount(record);
}
function entryStatus(entry,records=[]){
  const datasetKind=entry.datasetKind||entry.kind,record=recordFor(records,datasetKind),rows=subsetCount(entry,record);
  if(!record||!rows)return{state:'empty',rows:0,record:null,reason:'No imported rows'};
  if(entry.dated&&!record?.coverage?.min)return{state:'partial',rows,record,reason:'Rows exist, but dated coverage is unavailable'};
  return{state:'ready',rows,record,reason:''};
}
function pageState(page,records=[],pendingKind='',error=''){
  const entries=configForPage(page);
  if(!entries.length)return{state:'unmanaged',entries:[]};
  const statuses=entries.map(entry=>({...entry,...entryStatus(entry,records)}));
  if(error)return{state:'error',entries:statuses,message:error};
  if(pendingKind&&entries.some(entry=>entry.kind===pendingKind))return{state:'loading',entries:statuses,message:`Reading ${pendingKind} CSV`};
  const partial=statuses.filter(item=>item.state==='partial').length;
  const present=statuses.filter(item=>item.rows>0).length;
  if(!present)return{state:'empty',entries:statuses,message:'No imported dataset is available for this workspace yet.'};
  if(partial||present<statuses.length)return{state:'partial',entries:statuses,message:'Some required workspace evidence is missing or incomplete.'};
  return{state:'ready',entries:statuses,message:'Imported evidence is available.'};
}
function statusLabel(state){
  return({empty:'EMPTY · 等待导入',loading:'LOADING · 正在读取',error:'ERROR · 导入失败',partial:'PARTIAL · 部分数据',ready:'READY · 已载入'})[state]||state.toUpperCase();
}
function templateText(entry){
  if(entry.template==='growth')return root?.KeywordOSGrowthTest?.TEMPLATES?.[entry.kind]||root?.KeywordOSGrowth?.TEMPLATES?.[entry.kind]||'';
  if(entry.template==='storefront')return root?.KeywordOSCompetitorStorefrontTest?.TEMPLATE||'';
  if(entry.template==='competitor-ads')return root?.KeywordOSCompetitorAdsInsightsTest?.TEMPLATE||'';
  return'';
}
function templateFilename(entry){
  if(entry.kind==='storefront')return'KeywordOS_competitor_storefront_snapshot_template.csv';
  if(entry.kind==='competitor-ads')return'KeywordOS_competitor_ads_insights_template.csv';
  return`KeywordOS_${entry.kind}_template.csv`;
}
function downloadTemplate(entry){
  const csv=templateText(entry);
  if(!csv)return false;
  const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=templateFilename(entry);document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),0);
  return true;
}
function sourceDetail(status){
  const record=status.record;
  if(!record)return'No imported rows';
  const coverage=record.coverage?.min?`${record.coverage.min} → ${record.coverage.max||record.coverage.min}`:'No dated coverage';
  return`${status.rows} rows · ${clean(record.source)||'Unknown source'} · ${coverage}`;
}
function stateCardHtml(page,state){
  const tone=state.state==='error'?'red':state.state==='ready'?'green':state.state==='partial'||state.state==='loading'?'amber':'gray';
  const rows=state.entries.map(entry=>{
    const action=entry.template==='authoritative'
      ?'<span class="muted">Actual source export required · 不生成伪造 Amazon 模板</span>'
      :`<button type="button" class="btn sm" data-keywordos-schema-template="${escapeHtml(entry.kind)}">Download template · 下载模板</button>`;
    return `<div class="keywordos-import-schema-row"><div><b>${escapeHtml(entry.label)}</b><small><strong>Required:</strong> ${escapeHtml(entry.required)}<br><strong>Optional/evidence:</strong> ${escapeHtml(entry.optional)}</small></div><div class="keywordos-import-schema-meta"><span class="badge ${entry.state==='ready'?'green':entry.state==='partial'?'amber':'gray'}">${escapeHtml(entry.state)}</span><small>${escapeHtml(sourceDetail(entry))}</small>${action}</div></div>`;
  }).join('');
  const message=state.state==='loading'
    ?'A local CSV is being read and validated. Existing data remains authoritative until the importer completes.'
    :state.message;
  return `<div class="card keywordos-import-readiness" data-keywordos-import-page="${escapeHtml(page)}"><div class="card-head"><div class="card-title"><h3>Import readiness · 导入状态</h3><small>Explicit local/imported evidence only</small></div><span class="badge ${tone}">${escapeHtml(statusLabel(state.state))}</span></div><div class="card-body"><div class="notice-banner">${escapeHtml(message)}</div><div class="keywordos-import-schema-list">${rows}</div><p class="keywordos-import-schema-note">Schema guidance reflects KeywordOS's current local parsers. Template files are provided only for KeywordOS-defined CSV schemas; Amazon Ads and Unified Transaction imports require real source exports and are never synthesized.</p></div></div>`;
}
function datasetRecords(){return root?.KeywordOSUIBridge?.datasetRegistry||[];}
function findInsertionPoint(content){
  const source=content.querySelector('.source-chip-row');
  if(source)return source.nextElementSibling||source;
  const firstNotice=content.querySelector(':scope > .notice-banner');
  return firstNotice?.nextElementSibling||firstNotice||content.firstElementChild;
}
function renderState(){
  refreshQueued=false;
  if(!root?.document)return;
  const content=document.querySelector('#content'),title=clean(document.querySelector('#page-title')?.textContent),page=currentPage(root.location,title);
  document.querySelectorAll('.keywordos-import-readiness').forEach(node=>node.remove());
  if(!content||!configForPage(page).length)return;
  const state=pageState(page,datasetRecords(),activeImport?.kind||'',lastError);
  const shell=document.createElement('div');shell.innerHTML=stateCardHtml(page,state);
  const card=shell.firstElementChild;
  const point=findInsertionPoint(content);
  if(point&&point.parentNode===content)content.insertBefore(card,point);
  else content.prepend(card);
  card.querySelectorAll('[data-keywordos-schema-template]').forEach(button=>button.addEventListener('click',()=>{
    const kind=button.dataset.keywordosSchemaTemplate,entry=configForPage(page).find(item=>item.kind===kind);
    if(!entry||!downloadTemplate(entry))root?.KeywordOSUIBridge?.toast?.('Template is unavailable for this schema.','error');
  }));
}
function queueRender(){if(refreshQueued)return;refreshQueued=true;queueMicrotask(renderState);}
function kindFromTarget(target){
  const button=target?.closest?.('[data-growth-import],#keywordos-storefront-import,#keywordos-competitor-ads-import,#keywordos-import-unified,#import-top');
  if(!button)return'';
  if(button.dataset?.growthImport)return button.dataset.growthImport;
  if(button.id==='keywordos-storefront-import')return'storefront';
  if(button.id==='keywordos-competitor-ads-import')return'competitor-ads';
  if(button.id==='keywordos-import-unified')return'finance';
  if(button.id==='import-top')return'ads';
  return'';
}
function installToastBridge(){
  if(toastWrapped||typeof root?.KeywordOSUIBridge?.toast!=='function')return;
  const bridge=root.KeywordOSUIBridge,original=bridge.toast.bind(bridge);
  bridge.toast=(message,type,...rest)=>{
    const result=original(message,type,...rest);
    if(activeImport){
      if(type==='error'){lastError=clean(message)||'Import failed';activeImport=null;queueRender();}
      else if(type==='success'){lastError='';activeImport=null;setTimeout(queueRender,0);}
    }
    return result;
  };
  toastWrapped=true;
}
function handleClick(event){
  const kind=kindFromTarget(event.target);
  if(!kind)return;
  activeImport={kind,startedAt:Date.now()};lastError='';queueRender();
}
function handleChange(event){
  const input=event.target;
  if(!(input instanceof HTMLInputElement)||input.type!=='file')return;
  const kind=INPUT_KIND_BY_ID[input.id]||(input.id.startsWith('growth-file-')?input.id.slice('growth-file-'.length):'');
  if(!kind)return;
  if(input.files?.length){activeImport={kind,startedAt:Date.now()};lastError='';queueRender();}
  else if(activeImport?.kind===kind){activeImport=null;queueRender();}
}
function start(){
  if(!root?.document)return;
  const boot=()=>{
    installToastBridge();
    renderState();
    document.addEventListener('click',handleClick,true);
    document.addEventListener('change',handleChange,true);
    const content=document.querySelector('#content');
    if(content){observer=new MutationObserver(records=>{const relevant=records.some(record=>[...record.addedNodes,...record.removedNodes].some(node=>!(node instanceof Element&&node.matches?.('.keywordos-import-readiness'))));if(relevant){installToastBridge();queueRender();}});observer.observe(content,{childList:true,subtree:true});}
    root.addEventListener?.('hashchange',()=>{activeImport=null;lastError='';queueRender();});
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
}

return{IMPORT_PAGE_CONFIG,GROWTH_DATASET_KINDS,INPUT_KIND_BY_ID,currentPage,configForPage,recordFor,rowCount,subsetCount,entryStatus,pageState,statusLabel,templateFilename,kindFromTarget,stateCardHtml,start};
});
