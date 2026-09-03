(function(root,factory){
  const api=factory(root);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSLocalFilterBuilderTest=api;
  if(root){root.KeywordOSLocalFilterBuilder=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const STORAGE_KEY='keywordos_v9_local_filter_builder';
const MAX_PRESETS=30;
const MAX_CONDITIONS=5;
const TOP_N_MAX=1000;
const OPERATORS=Object.freeze([
  Object.freeze({key:'contains',label:'contains',value:true}),
  Object.freeze({key:'notContains',label:'does not contain',value:true}),
  Object.freeze({key:'equals',label:'equals',value:true}),
  Object.freeze({key:'notEquals',label:'does not equal',value:true}),
  Object.freeze({key:'gt',label:'>',value:true,numeric:true}),
  Object.freeze({key:'gte',label:'≥',value:true,numeric:true}),
  Object.freeze({key:'lt',label:'<',value:true,numeric:true}),
  Object.freeze({key:'lte',label:'≤',value:true,numeric:true}),
  Object.freeze({key:'between',label:'between',value:true,value2:true,numeric:true}),
  Object.freeze({key:'missing',label:'is missing'}),
  Object.freeze({key:'present',label:'is present'})
]);
const OPERATOR_KEYS=new Set(OPERATORS.map(item=>item.key));

function clean(value,max=200){return String(value??'').replace(/\s+/g,' ').trim().slice(0,max);}
function normalizePage(value){return clean(value,80);}
function normalizeMode(value){return value==='advanced'?'advanced':'simple';}
function normalizeJoin(value){return value==='any'?'any':'all';}
function normalizeOperator(value){return OPERATOR_KEYS.has(value)?value:'contains';}
function normalizeCondition(input={}){
  const field=clean(input?.field,120);if(!field)return null;
  return Object.freeze({field,operator:normalizeOperator(input?.operator),value:clean(input?.value),value2:clean(input?.value2)});
}
function normalizeTopN(input={}){
  const field=clean(input?.field,120),enabled=Boolean(input?.enabled&&field),raw=Number(input?.count),count=Number.isFinite(raw)?Math.max(1,Math.min(TOP_N_MAX,Math.trunc(raw))):10;
  return Object.freeze({enabled,field,direction:input?.direction==='bottom'?'bottom':'top',count});
}
function normalizeRule(input={}){
  const source=input&&typeof input==='object'&&!Array.isArray(input)?input:{},mode=normalizeMode(source.mode),conditions=[];
  for(const raw of Array.isArray(source.conditions)?source.conditions:[]){const condition=normalizeCondition(raw);if(!condition)continue;conditions.push(condition);if(conditions.length>=MAX_CONDITIONS)break;}
  return Object.freeze({mode,join:normalizeJoin(source.join),conditions:Object.freeze(mode==='simple'?conditions.slice(0,1):conditions),topN:normalizeTopN(source.topN)});
}
function hasRule(rule){const normalized=normalizeRule(rule);return normalized.conditions.length>0||normalized.topN.enabled;}
function normalizePreset(input={}){
  const id=clean(input?.id,120),name=clean(input?.name,100),page=normalizePage(input?.page);if(!id||!name||!page)return null;
  const rule=normalizeRule(input?.rule);if(!hasRule(rule))return null;
  return Object.freeze({id,name,page,rule,createdAt:clean(input?.createdAt,40)});
}
function normalizeState(input={}){
  const source=input&&typeof input==='object'&&!Array.isArray(input)?input:{},pages={},presets=[],seen=new Set();
  if(source.pages&&typeof source.pages==='object'&&!Array.isArray(source.pages))for(const [rawPage,rawRule] of Object.entries(source.pages).slice(0,50)){const page=normalizePage(rawPage),rule=normalizeRule(rawRule);if(page&&hasRule(rule))pages[page]=rule;}
  for(const raw of Array.isArray(source.presets)?source.presets:[]){const preset=normalizePreset(raw);if(!preset||seen.has(preset.id)||presets.length>=MAX_PRESETS)continue;seen.add(preset.id);presets.push(preset);}
  return{version:1,pages,presets};
}
function savePageRule(state,page,rule){const current=normalizeState(state),key=normalizePage(page),normalized=normalizeRule(rule);if(!key)return current;if(hasRule(normalized))current.pages[key]=normalized;else delete current.pages[key];return current;}
function clearPageRule(state,page){const current=normalizeState(state),key=normalizePage(page);if(key)delete current.pages[key];return current;}
function upsertPreset(state,{page,name,rule,id='',now=''}={}){
  const current=normalizeState(state),pageId=normalizePage(page),title=clean(name,100),normalized=normalizeRule(rule);if(!pageId||!title)throw Error('Preset page and name are required.');if(!hasRule(normalized))throw Error('At least one condition or Top-N rule is required.');
  const existing=current.presets.find(item=>item.page===pageId&&item.name.toLowerCase()===title.toLowerCase()),preset=Object.freeze({id:existing?.id||clean(id,120)||`filter-${Date.now().toString(36)}`,name:title,page:pageId,rule:normalized,createdAt:existing?.createdAt||clean(now,40)||new Date().toISOString()});
  current.presets=[preset,...current.presets.filter(item=>item.id!==preset.id)].slice(0,MAX_PRESETS);return current;
}
function deletePreset(state,id){const current=normalizeState(state),key=clean(id,120);current.presets=current.presets.filter(item=>item.id!==key);return current;}
function numericValue(value){
  const raw=clean(value).replace(/,/g,'').replace(/^\((.*)\)$/,'-$1'),stripped=raw.replace(/^[$£€¥]/,'').replace(/%$/,'').trim();if(!/^[-+]?\d+(?:\.\d+)?$/.test(stripped))return null;const number=Number(stripped);return Number.isFinite(number)?number:null;
}
function isMissing(value){const text=clean(value);return !text||text==='—'||text==='-'||text.toLowerCase()==='n/a';}
function conditionMatches(cellValue,condition){
  const rule=normalizeCondition(condition);if(!rule)return true;const text=clean(cellValue),left=text.toLowerCase(),right=clean(rule.value).toLowerCase();
  if(rule.operator==='missing')return isMissing(text);if(rule.operator==='present')return !isMissing(text);if(rule.operator==='contains')return left.includes(right);if(rule.operator==='notContains')return !left.includes(right);
  if(rule.operator==='equals'){const a=numericValue(text),b=numericValue(rule.value);return a!=null&&b!=null?a===b:left===right;}
  if(rule.operator==='notEquals'){const a=numericValue(text),b=numericValue(rule.value);return a!=null&&b!=null?a!==b:left!==right;}
  const a=numericValue(text),b=numericValue(rule.value);if(a==null||b==null)return false;
  if(rule.operator==='gt')return a>b;if(rule.operator==='gte')return a>=b;if(rule.operator==='lt')return a<b;if(rule.operator==='lte')return a<=b;
  if(rule.operator==='between'){const c=numericValue(rule.value2);return c!=null&&a>=Math.min(b,c)&&a<=Math.max(b,c);}
  return false;
}
function headerIndex(headers=[],field=''){const wanted=clean(field).toLowerCase();return headers.findIndex(value=>clean(value).toLowerCase()===wanted);}
function applyRuleToRows(headers=[],rows=[],rule={}){
  const normalized=normalizeRule(rule),conditionIndexes=normalized.conditions.map(condition=>headerIndex(headers,condition.field)),missingFields=normalized.conditions.filter((_,index)=>conditionIndexes[index]<0).map(item=>item.field),source=Array.isArray(rows)?rows:[];
  let indices=source.map((_,index)=>index).filter(index=>{
    if(!normalized.conditions.length)return true;const matches=normalized.conditions.map((condition,conditionIndex)=>conditionIndexes[conditionIndex]>=0&&conditionMatches(source[index]?.[conditionIndexes[conditionIndex]],condition));return normalized.join==='any'?matches.some(Boolean):matches.every(Boolean);
  });
  let topNUnavailable='';
  if(normalized.topN.enabled){const index=headerIndex(headers,normalized.topN.field);if(index<0){indices=[];topNUnavailable=`Top-N field "${normalized.topN.field}" is unavailable.`;}else{const ranked=indices.map(rowIndex=>({rowIndex,value:numericValue(source[rowIndex]?.[index])})).filter(item=>item.value!=null);if(!ranked.length){indices=[];topNUnavailable=`Top-N field "${normalized.topN.field}" has no numeric values.`;}else{const factor=normalized.topN.direction==='bottom'?1:-1;ranked.sort((a,b)=>a.value===b.value?a.rowIndex-b.rowIndex:(a.value-b.value)*factor);const selected=new Set(ranked.slice(0,normalized.topN.count).map(item=>item.rowIndex));indices=indices.filter(index=>selected.has(index));}}
  }
  return Object.freeze({indices:Object.freeze(indices),missingFields:Object.freeze(missingFields),topNUnavailable,rule:normalized});
}
function numericHeaders(headers=[],rows=[]){return headers.filter((_,index)=>rows.some(row=>numericValue(row?.[index])!=null));}

const PUBLIC_API={STORAGE_KEY,MAX_PRESETS,MAX_CONDITIONS,TOP_N_MAX,OPERATORS,clean,normalizePage,normalizeMode,normalizeJoin,normalizeOperator,normalizeCondition,normalizeTopN,normalizeRule,hasRule,normalizePreset,normalizeState,savePageRule,clearPageRule,upsertPreset,deletePreset,numericValue,isMissing,conditionMatches,headerIndex,applyRuleToRows,numericHeaders};
if(!root?.document)return PUBLIC_API;

const doc=root.document,$=(selector,scope=doc)=>scope.querySelector(selector),$$=(selector,scope=doc)=>[...scope.querySelectorAll(selector)];
const OWN_HIDDEN='keywordosLocalFilterHidden';
let uiState=loadState(),observer=null,scheduled=false;
function loadState(){try{return normalizeState(JSON.parse(root.localStorage?.getItem(STORAGE_KEY)||'{}'));}catch{return normalizeState({});}}
function saveState(next=uiState){uiState=normalizeState(next);try{root.localStorage?.setItem(STORAGE_KEY,JSON.stringify(uiState));}catch{}return uiState;}
function pageId(){return root.KeywordOSCsvPageControls?.currentPage?.(root.location)||root.KeywordOSPageRegistry?.pageFromHash?.(root.location?.hash||'')||'';}
function supported(page){return Boolean(root.KeywordOSCsvPageControls?.CSV_PAGE_CONFIG?.[page]);}
function primaryTable(content=$('#content')){const tables=$$('table',content).map((table,index)=>({table,index,count:$$('tbody tr',table).length})).filter(item=>item.count>0);tables.sort((a,b)=>b.count-a.count||a.index-b.index);return tables[0]?.table||null;}
function snapshot(table){const headers=$$('thead th',table).map(cell=>clean(cell.textContent)),rows=$$('tbody tr',table),values=rows.map(row=>[...row.children].map(cell=>clean(cell.textContent)));return{headers,rows,values};}
function restoreOwn(table){for(const row of $$('tbody tr',table)){if(row.dataset[OWN_HIDDEN]!=='1')continue;delete row.dataset[OWN_HIDDEN];row.hidden=row.dataset.keywordosCsvContextHidden==='1';}}
function applyDomRule(table,rule){
  if(!table)return{shown:0,total:0,reason:'No data table is available.'};restoreOwn(table);const model=snapshot(table),eligible=[];model.rows.forEach((row,index)=>{if(!row.hidden)eligible.push(index);});const eligibleValues=eligible.map(index=>model.values[index]),result=applyRuleToRows(model.headers,eligibleValues,rule),shownSet=new Set(result.indices.map(index=>eligible[index]));for(const index of eligible){if(shownSet.has(index))continue;model.rows[index].hidden=true;model.rows[index].dataset[OWN_HIDDEN]='1';}
  const reason=result.topNUnavailable||(result.missingFields.length?`Unavailable field(s): ${result.missingFields.join(', ')}`:'');return{shown:shownSet.size,total:eligible.length,reason};
}
function conditionSlots(rule){const slots=rule.mode==='advanced'?MAX_CONDITIONS:1,out=[...rule.conditions];while(out.length<slots)out.push(null);return out;}
function options(values,selected=''){return values.map(value=>`<option value="${escapeAttr(value)}" ${value===selected?'selected':''}>${escapeHtml(value)}</option>`).join('');}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function escapeAttr(value){return escapeHtml(value);}
function operatorOptions(selected='contains'){return OPERATORS.map(item=>`<option value="${item.key}" ${item.key===selected?'selected':''}>${escapeHtml(item.label)}</option>`).join('');}
function readConditionRow(row){const field=$('[data-local-filter-field]',row)?.value||'';if(!field)return null;return{field,operator:$('[data-local-filter-operator]',row)?.value||'contains',value:$('[data-local-filter-value]',row)?.value||'',value2:$('[data-local-filter-value2]',row)?.value||''};}
function readRule(modal){const mode=$('[data-local-filter-mode]',modal)?.value||'simple',join=$('[data-local-filter-join]',modal)?.value||'all',conditions=$$('[data-local-filter-condition]',modal).map(readConditionRow).filter(Boolean),enabled=Boolean($('[data-local-filter-top-enabled]',modal)?.checked),count=$('[data-local-filter-top-count]',modal)?.value||10,field=$('[data-local-filter-top-field]',modal)?.value||'',direction=$('[data-local-filter-top-direction]',modal)?.value||'top';return normalizeRule({mode,join,conditions,topN:{enabled,count,field,direction}});}
function closeModal(){const host=$('#modal-root');if(host?.querySelector('#local-filter-builder-modal'))host.innerHTML='';}
function renderConditionRows(rule,headers){return conditionSlots(rule).map((condition,index)=>`<div data-local-filter-condition style="display:grid;grid-template-columns:1.25fr 1fr 1fr 1fr;gap:6px;margin-bottom:7px"><select class="select" data-local-filter-field aria-label="Condition ${index+1} field"><option value="">Field…</option>${options(headers,condition?.field||'')}</select><select class="select" data-local-filter-operator aria-label="Condition ${index+1} operator">${operatorOptions(condition?.operator||'contains')}</select><input class="input" data-local-filter-value value="${escapeAttr(condition?.value||'')}" placeholder="Value"><input class="input" data-local-filter-value2 value="${escapeAttr(condition?.value2||'')}" placeholder="2nd value"></div>`).join('');}
function openBuilder(page=pageId(),draft=null){
  const table=primaryTable(),model=table?snapshot(table):null;if(!supported(page)||!model)return;const rule=normalizeRule(draft||uiState.pages[page]||{}),numeric=numericHeaders(model.headers,model.values),presets=uiState.presets.filter(item=>item.page===page),host=$('#modal-root');if(!host)return;
  host.innerHTML=`<div class="modal-wrap" id="local-filter-builder-modal"><div class="modal"><div class="modal-header"><div><h2>Local Filter Builder</h2><small>Conditions are evaluated against the current rendered imported table.</small></div><button type="button" class="drawer-close" data-local-filter-close>×</button></div><div class="modal-body"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px"><label>Mode <select class="select" data-local-filter-mode><option value="simple" ${rule.mode==='simple'?'selected':''}>Simple</option><option value="advanced" ${rule.mode==='advanced'?'selected':''}>Advanced</option></select></label><label ${rule.mode==='advanced'?'':'hidden'} data-local-filter-join-wrap>Match <select class="select" data-local-filter-join><option value="all" ${rule.join==='all'?'selected':''}>ALL conditions</option><option value="any" ${rule.join==='any'?'selected':''}>ANY condition</option></select></label></div><div data-local-filter-conditions>${renderConditionRows(rule,model.headers)}</div><div class="card top-gap"><div class="card-body"><label><input type="checkbox" data-local-filter-top-enabled ${rule.topN.enabled?'checked':''}> Top-N</label> <input class="input" style="width:90px" type="number" min="1" max="${TOP_N_MAX}" data-local-filter-top-count value="${rule.topN.count}"> <select class="select" data-local-filter-top-direction><option value="top" ${rule.topN.direction==='top'?'selected':''}>Top</option><option value="bottom" ${rule.topN.direction==='bottom'?'selected':''}>Bottom</option></select> <select class="select" data-local-filter-top-field><option value="">Numeric field…</option>${options(numeric,rule.topN.field)}</select><div class="muted top-gap">Top-N is applied after the conditions and after the existing page context filter. Rows with a missing Top-N metric are excluded.</div></div></div><div class="card top-gap"><div class="card-body"><b>Saved conditions</b><div class="top-gap" style="display:flex;gap:6px;flex-wrap:wrap"><select class="select" data-local-filter-preset><option value="">Saved preset…</option>${presets.map(item=>`<option value="${escapeAttr(item.id)}">${escapeHtml(item.name)}</option>`).join('')}</select><button class="btn" type="button" data-local-filter-load>Load</button><button class="btn" type="button" data-local-filter-delete>Delete</button></div><div class="top-gap" style="display:flex;gap:6px;flex-wrap:wrap"><input class="input" data-local-filter-preset-name placeholder="Preset name"><button class="btn" type="button" data-local-filter-save>Save conditions</button></div></div></div><div class="notice-banner top-gap">Saved state contains only page, mode, conditions and Top-N rules. It never stores matched rows, result counts, evaluated timestamps or imported evidence.</div><div class="top-gap muted" data-local-filter-status></div><div class="top-gap" style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" type="button" data-local-filter-clear>Clear</button><button class="btn primary" type="button" data-local-filter-apply>Apply</button></div></div></div></div>`;
  const modal=$('#local-filter-builder-modal',host),status=$('[data-local-filter-status]',modal);$('[data-local-filter-close]',modal)?.addEventListener('click',closeModal);
  $('[data-local-filter-mode]',modal)?.addEventListener('change',event=>{const next=readRule(modal);openBuilder(page,{...next,mode:event.target.value});});
  $('[data-local-filter-apply]',modal)?.addEventListener('click',()=>{const next=readRule(modal);uiState=savePageRule(uiState,page,next);saveState();const outcome=hasRule(next)?applyDomRule(table,next):(restoreOwn(table),{shown:model.rows.length,total:model.rows.length,reason:''});status.textContent=outcome.reason||`Applied to current table: ${outcome.shown} of ${outcome.total} eligible rows shown.`;refreshButton(page);});
  $('[data-local-filter-clear]',modal)?.addEventListener('click',()=>{uiState=clearPageRule(uiState,page);saveState();restoreOwn(table);refreshButton(page);closeModal();});
  $('[data-local-filter-save]',modal)?.addEventListener('click',()=>{try{uiState=upsertPreset(uiState,{page,name:$('[data-local-filter-preset-name]',modal)?.value||'',rule:readRule(modal)});saveState();openBuilder(page,readRule(modal));}catch(error){status.textContent=error.message;}});
  $('[data-local-filter-load]',modal)?.addEventListener('click',()=>{const id=$('[data-local-filter-preset]',modal)?.value||'',preset=uiState.presets.find(item=>item.id===id&&item.page===page);if(preset)openBuilder(page,preset.rule);else status.textContent='Choose a saved preset first.';});
  $('[data-local-filter-delete]',modal)?.addEventListener('click',()=>{const id=$('[data-local-filter-preset]',modal)?.value||'';if(!id){status.textContent='Choose a saved preset first.';return;}uiState=deletePreset(uiState,id);saveState();openBuilder(page,readRule(modal));});
}
function refreshButton(page=pageId()){
  const controls=$('.page-controls');if(!controls)return;let button=$('#keywordos-local-filter-builder');if(!supported(page)){button?.remove();return;}if(!button){button=doc.createElement('button');button.type='button';button.className='btn';button.id='keywordos-local-filter-builder';button.addEventListener('click',()=>openBuilder());controls.appendChild(button);}const rule=uiState.pages[page],count=rule?rule.conditions.length+(rule.topN.enabled?1:0):0;button.textContent=count?`Filter Builder · ${count}`:'Filter Builder';button.title='Build browser-local conditions for the current rendered imported table.';
}
function refresh(){scheduled=false;const page=pageId(),content=$('#content');if(!supported(page)||!content){refreshButton(page);return;}const table=primaryTable(content);refreshButton(page);if(!table)return;const rule=uiState.pages[page];if(rule)applyDomRule(table,rule);else restoreOwn(table);}
function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(refresh);}
function start(){if(!root?.document)return;const run=()=>{const content=$('#content');if(content&&!observer){observer=new MutationObserver(schedule);observer.observe(content,{childList:true,subtree:true});}schedule();};doc.readyState==='loading'?doc.addEventListener('DOMContentLoaded',run,{once:true}):run();root.addEventListener?.('hashchange',schedule);}

return{...PUBLIC_API,start,openBuilder};
});
