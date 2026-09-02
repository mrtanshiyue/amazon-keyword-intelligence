(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(typeof globalThis!=='undefined')globalThis.KeywordOSCsvPageControlsTest=api;
  if(root){root.KeywordOSCsvPageControls=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const CSV_PAGE_CONFIG=Object.freeze({
  'product-master':Object.freeze({label:'Marketplace',header:'Marketplace'}),
  'search-funnel':Object.freeze({label:'ASIN',header:'ASIN'}),
  'asin-comparison':Object.freeze({label:'Keyword set',header:'Set'}),
  'rank-intelligence':Object.freeze({label:'ASIN',header:'ASIN'}),
  'inventory-risk':Object.freeze({label:'SKU',header:'SKU'}),
  'competitor-snapshots':Object.freeze({label:'ASIN',header:'ASIN'}),
  'review-evidence':Object.freeze({label:'ASIN',header:'ASIN'})
});
const HIDDEN_GLOBAL_SELECTORS=Object.freeze(['.profile-control','.date-control','#scope-mode-badge','#import-top']);
const OWN_HIDDEN='keywordosCsvContextHidden';

function clean(value){return String(value??'').replace(/\s+/g,' ').trim();}
function currentPage(locationLike=root?.location){
  const hash=String(locationLike?.hash||'');
  const match=hash.match(/^#page=(.+)$/);
  return match?decodeURIComponent(match[1]):'';
}
function isCsvFirstPage(page){return Boolean(CSV_PAGE_CONFIG[page]);}
function columnIndex(headers=[],header=''){
  const wanted=clean(header).toLowerCase();
  return headers.findIndex(value=>clean(value).toLowerCase()===wanted);
}
function uniqueFilterValues(headers=[],rows=[],header=''){
  const index=columnIndex(headers,header);
  if(index<0)return[];
  return [...new Set(rows.map(row=>clean(row?.[index])).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
}
function rowMatchesSelection(headers=[],row=[],header='',selection=''){
  if(!selection)return true;
  const index=columnIndex(headers,header);
  return index>=0&&clean(row?.[index])===clean(selection);
}
function controlStateForPage(page){
  const config=CSV_PAGE_CONFIG[page];
  return config?{contextual:true,hideGlobal:true,label:config.label,header:config.header}:{contextual:false,hideGlobal:false,label:'',header:''};
}
function tableModel(table,header){
  const headers=[...table.querySelectorAll('thead th')].map(cell=>clean(cell.textContent));
  const index=columnIndex(headers,header);
  if(index<0)return null;
  const rows=[...table.querySelectorAll('tbody tr')];
  return{table,headers,index,rows,values:rows.map(row=>clean(row.children[index]?.textContent)).filter(Boolean)};
}
function modelsForContent(content,header){
  return [...content.querySelectorAll('table')].map(table=>tableModel(table,header)).filter(Boolean);
}
function restoreFilteredRows(content){
  content?.querySelectorAll?.(`tbody tr[data-${OWN_HIDDEN.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}="1"]`).forEach(row=>{
    row.hidden=false;
    delete row.dataset[OWN_HIDDEN];
  });
}
function applySelection(content,header,selection){
  const models=modelsForContent(content,header);
  for(const model of models){
    for(const row of model.rows){
      if(row.dataset[OWN_HIDDEN]==='1'){row.hidden=false;delete row.dataset[OWN_HIDDEN];}
      if(!selection)continue;
      const value=clean(row.children[model.index]?.textContent);
      if(value!==selection){row.hidden=true;row.dataset[OWN_HIDDEN]='1';}
    }
  }
  return models.reduce((sum,model)=>sum+model.rows.filter(row=>!row.hidden).length,0);
}
function allValues(content,header){
  const values=[];
  for(const model of modelsForContent(content,header))values.push(...model.values);
  return [...new Set(values)].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
}
function setGlobalVisibility(active){
  for(const selector of HIDDEN_GLOBAL_SELECTORS){
    const element=document.querySelector(selector);
    if(!element)continue;
    if(active){
      if(!element.hasAttribute('data-keywordos-csv-prev-hidden'))element.setAttribute('data-keywordos-csv-prev-hidden',element.hidden?'1':'0');
      element.hidden=true;
    }else if(element.hasAttribute('data-keywordos-csv-prev-hidden')){
      element.hidden=element.getAttribute('data-keywordos-csv-prev-hidden')==='1';
      element.removeAttribute('data-keywordos-csv-prev-hidden');
    }
  }
}
function removeContextControl(){
  document.querySelector('#keywordos-csv-context-control')?.remove();
  document.querySelector('#keywordos-csv-scope-badge')?.remove();
}
function createContextControl(page,config,content){
  const controls=document.querySelector('.page-controls');
  if(!controls)return;
  removeContextControl();
  const wrapper=document.createElement('div');
  wrapper.id='keywordos-csv-context-control';
  wrapper.className='profile-control keywordos-csv-context-control';
  const label=document.createElement('span');label.className='control-label';label.textContent=config.label;
  const select=document.createElement('select');select.className='select control-lg';select.setAttribute('aria-label',`${config.label} filter`);
  const values=allValues(content,config.header);
  const all=document.createElement('option');all.value='';all.textContent=values.length?`All ${config.label} values · ${values.length}`:`No imported ${config.label} values`;select.appendChild(all);
  for(const value of values){const option=document.createElement('option');option.value=value;option.textContent=value;select.appendChild(option);}
  select.disabled=!values.length;
  select.addEventListener('change',()=>applySelection(content,config.header,select.value));
  wrapper.append(label,select);
  const badge=document.createElement('span');badge.id='keywordos-csv-scope-badge';badge.className='scope-mode-badge';badge.textContent='STORE 01 · IMPORTED DATA';
  controls.append(wrapper,badge);
  return{wrapper,select,badge,page};
}
let activePage='',observer=null,scheduled=false;
function refresh(){
  scheduled=false;
  const page=currentPage(),config=CSV_PAGE_CONFIG[page],content=document.querySelector('#content');
  if(!config||!content){
    if(activePage){restoreFilteredRows(content);setGlobalVisibility(false);removeContextControl();activePage='';}
    return;
  }
  if(activePage&&activePage!==page)restoreFilteredRows(content);
  activePage=page;
  setGlobalVisibility(true);
  const existing=document.querySelector('#keywordos-csv-context-control select');
  const previous=existing?.value||'';
  const control=createContextControl(page,config,content);
  if(previous&&control?.select&&[...control.select.options].some(option=>option.value===previous)){
    control.select.value=previous;
    applySelection(content,config.header,previous);
  }
}
function scheduleRefresh(){if(scheduled)return;scheduled=true;queueMicrotask(refresh);}
function start(){
  if(!root?.document)return;
  const run=()=>{const content=document.querySelector('#content');if(content&&!observer){observer=new MutationObserver(scheduleRefresh);observer.observe(content,{childList:true,subtree:true});}scheduleRefresh();};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',run,{once:true}):run();
  root.addEventListener?.('hashchange',scheduleRefresh);
}

return{CSV_PAGE_CONFIG,HIDDEN_GLOBAL_SELECTORS,currentPage,isCsvFirstPage,columnIndex,uniqueFilterValues,rowMatchesSelection,controlStateForPage,start};
});
