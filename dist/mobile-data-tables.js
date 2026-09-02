(function(root,factory){
  const api=factory(root);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSMobileTablesTest=api;
  if(root){root.KeywordOSMobileTables=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const TABLE_SELECTOR='#content table';
const EXISTING_SHELL_SELECTOR='.table-wrap,.table-scroll';
const SHELL_CLASS='keywordos-mobile-table-shell';
const GENERATED_CLASS='keywordos-mobile-table-generated';
const HINT_CLASS='keywordos-mobile-table-hint';
const PRIMARY_HEADERS=Object.freeze([
  'keyword','search term','product','product id','asin','sku','campaign','ad group','target',
  'storefront','title','date','status','action','marketplace','label','imported label'
]);

function clean(value){return String(value??'').replace(/\s+/g,' ').trim();}
function normalizeHeader(value){return clean(value).toLowerCase();}
function primaryColumnIndex(headers=[]){
  const normalized=headers.map(normalizeHeader);
  const exact=normalized.findIndex(header=>PRIMARY_HEADERS.includes(header));
  if(exact>=0)return exact;
  const firstText=normalized.findIndex(Boolean);
  return firstText>=0?firstText:0;
}
function scrollDeltaForKey(key,step=160){
  if(key==='ArrowLeft')return-step;
  if(key==='ArrowRight')return step;
  return 0;
}
function tableLabel(_headers=[],fallback='Data table'){
  return fallback;
}
function headerCells(table){return [...table.querySelectorAll('thead th')];}
function bodyRows(table){return [...table.querySelectorAll('tbody tr')];}
function markPrimaryColumn(table){
  const headers=headerCells(table);
  if(!headers.length)return-1;
  const index=primaryColumnIndex(headers.map(cell=>cell.textContent));
  headers.forEach((cell,i)=>{if(i===index)cell.dataset.mobilePrimary='1';else delete cell.dataset.mobilePrimary;});
  for(const row of bodyRows(table)){
    [...row.children].forEach((cell,i)=>{if(i===index)cell.dataset.mobilePrimary='1';else delete cell.dataset.mobilePrimary;});
  }
  return index;
}
function ensureShell(table){
  let shell=table.closest(EXISTING_SHELL_SELECTOR);
  if(!shell){
    shell=document.createElement('div');
    shell.className=`${SHELL_CLASS} ${GENERATED_CLASS}`;
    table.parentNode?.insertBefore(shell,table);
    shell.appendChild(table);
  }else shell.classList.add(SHELL_CLASS);
  return shell;
}
function ensureHint(shell){
  let hint=shell.querySelector(`:scope > .${HINT_CLASS}`);
  if(!hint){
    hint=document.createElement('div');
    hint.className=HINT_CLASS;
    hint.setAttribute('aria-hidden','true');
    hint.textContent='↔ 横向滚动 / Horizontal scroll · 关键列固定 / key column pinned';
    shell.insertBefore(hint,shell.firstChild);
  }
  return hint;
}
function onShellKeydown(event){
  if(event.target!==event.currentTarget)return;
  const delta=scrollDeltaForKey(event.key);
  if(!delta)return;
  event.preventDefault();
  event.currentTarget.scrollBy?.({left:delta,behavior:'smooth'});
}
function enhanceTable(table){
  if(!table||table.dataset.keywordosMobileTable==='1')return null;
  const headers=headerCells(table).map(cell=>clean(cell.textContent));
  const shell=ensureShell(table);
  shell.tabIndex=shell.hasAttribute('tabindex')?shell.tabIndex:0;
  shell.setAttribute('role','region');
  if(!shell.hasAttribute('aria-label'))shell.setAttribute('aria-label',tableLabel(headers));
  if(shell.dataset.keywordosMobileKeybound!=='1'){
    shell.addEventListener('keydown',onShellKeydown);
    shell.dataset.keywordosMobileKeybound='1';
  }
  ensureHint(shell);
  markPrimaryColumn(table);
  table.dataset.keywordosMobileTable='1';
  return shell;
}
function enhanceTables(scope=document){
  const tables=[];
  if(scope instanceof HTMLTableElement&&scope.matches(TABLE_SELECTOR.replace('#content ','')))tables.push(scope);
  if(scope.querySelectorAll)tables.push(...scope.querySelectorAll(TABLE_SELECTOR));
  return [...new Set(tables)].map(enhanceTable).filter(Boolean).length;
}
let observer=null;
function start(){
  if(!root?.document)return;
  const run=()=>{
    enhanceTables(document);
    const content=document.querySelector('#content');
    if(content&&!observer){
      observer=new MutationObserver(records=>{
        for(const record of records){
          for(const node of record.addedNodes){if(node instanceof Element)enhanceTables(node);}
        }
      });
      observer.observe(content,{childList:true,subtree:true});
    }
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',run,{once:true}):run();
}

return{TABLE_SELECTOR,EXISTING_SHELL_SELECTOR,SHELL_CLASS,GENERATED_CLASS,HINT_CLASS,PRIMARY_HEADERS,normalizeHeader,primaryColumnIndex,scrollDeltaForKey,tableLabel,start};
});
