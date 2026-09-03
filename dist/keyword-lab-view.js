(function(root,factory){
  const api=factory(root);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSKeywordLabViewTest=api;
  if(root){root.KeywordOSKeywordLabView=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const STORAGE_KEY='keywordos_v9_keyword_lab_view';
const MAX_PRESETS=30;
const FILTER_KEYS=Object.freeze(['wordMin','wordMax','minClicks','minOrders','minSpend','maxAcos','contains','exclude','matchType']);
const COLUMN_CATALOG=Object.freeze({
  discovery:Object.freeze([
    Object.freeze({key:'keyword',label:'Keyword Phrase',sortKey:'name',type:'text'}),
    Object.freeze({key:'impressions',label:'Ad Impressions',sortKey:'impressions',type:'number'}),
    Object.freeze({key:'clicks',label:'Clicks',sortKey:'clicks',type:'number'}),
    Object.freeze({key:'orders',label:'Orders',sortKey:'orders',type:'number'}),
    Object.freeze({key:'cvr',label:'CVR',sortKey:'cvr',type:'number'}),
    Object.freeze({key:'spend',label:'Spend',sortKey:'spend',type:'number'}),
    Object.freeze({key:'sales',label:'Sales',sortKey:'sales',type:'number'}),
    Object.freeze({key:'acos',label:'ACoS',sortKey:'acos',type:'number'}),
    Object.freeze({key:'roas',label:'ROAS',sortKey:'roas',type:'number'}),
    Object.freeze({key:'products',label:'Products',sortKey:'products',type:'number'}),
    Object.freeze({key:'matchTypes',label:'Match Types',sortKey:'',type:'text'})
  ]),
  batch:Object.freeze([
    Object.freeze({key:'keyword',label:'Keyword',sortKey:'keyword',type:'text'}),
    Object.freeze({key:'matched',label:'Matched',sortKey:'matched',type:'text'}),
    Object.freeze({key:'source',label:'Source',sortKey:'source',type:'text'}),
    Object.freeze({key:'orders',label:'Orders',sortKey:'orders',type:'number'}),
    Object.freeze({key:'sales',label:'Sales',sortKey:'sales',type:'number'}),
    Object.freeze({key:'reason',label:'Reason',sortKey:'reason',type:'text'})
  ])
});
const DEFAULT_SORT=Object.freeze({
  discovery:Object.freeze({key:'spend',dir:'desc'}),
  batch:Object.freeze({key:'keyword',dir:'asc'})
});

function clean(value){return String(value??'').replace(/\s+/g,' ').trim();}
function modeId(value){return value==='batch'?'batch':'discovery';}
function catalog(mode){return COLUMN_CATALOG[modeId(mode)];}
function allowedKeys(mode){return catalog(mode).map(column=>column.key);}
function normalizeColumns(mode,values){
  const allowed=allowedKeys(mode),seen=new Set(),out=[];
  for(const raw of Array.isArray(values)?values:[]){const key=clean(raw);if(!allowed.includes(key)||seen.has(key))continue;seen.add(key);out.push(key);}
  if(!seen.has('keyword'))out.unshift('keyword');
  return out.length?out:[...allowed];
}
function moveColumn(columns,key,toIndex,mode='discovery'){
  const current=normalizeColumns(mode,columns),target=clean(key),from=current.indexOf(target);
  if(from<0)return current;
  const next=[...current];next.splice(from,1);const index=Math.max(0,Math.min(Number(toIndex)||0,next.length));next.splice(index,0,target);return next;
}
function normalizeSort(mode,input){
  const id=modeId(mode),requested=clean(input?.key),column=catalog(id).find(item=>item.key===requested&&item.sortKey),fallback=DEFAULT_SORT[id];
  return Object.freeze({key:column?column.key:fallback.key,dir:input?.dir==='asc'?'asc':'desc'});
}
function normalizeFilterSnapshot(input={}){
  const source=input&&typeof input==='object'&&!Array.isArray(input)?input:{},out={};
  for(const key of FILTER_KEYS)out[key]=key==='matchType'?(clean(source[key])||'all'):String(source[key]??'').trim().slice(0,200);
  return Object.freeze(out);
}
function normalizePreset(input){
  const id=clean(input?.id),name=clean(input?.name).slice(0,100);if(!id||!name)return null;
  return Object.freeze({id,name,filters:normalizeFilterSnapshot(input?.filters),createdAt:clean(input?.createdAt)});
}
function normalizeState(input={}){
  const source=input&&typeof input==='object'&&!Array.isArray(input)?input:{},presets=[],seen=new Set();
  for(const raw of Array.isArray(source.presets)?source.presets:[]){const preset=normalizePreset(raw);if(!preset||seen.has(preset.id)||presets.length>=MAX_PRESETS)continue;seen.add(preset.id);presets.push(preset);}
  return{version:1,columns:{discovery:normalizeColumns('discovery',source.columns?.discovery),batch:normalizeColumns('batch',source.columns?.batch)},sort:{discovery:normalizeSort('discovery',source.sort?.discovery),batch:normalizeSort('batch',source.sort?.batch)},presets};
}
function upsertPreset(state,name,filters,{id='',now=''}={}){
  const current=normalizeState(state),title=clean(name).slice(0,100);if(!title)throw Error('Preset name is required.');
  const existing=current.presets.find(item=>item.name.toLowerCase()===title.toLowerCase()),preset=Object.freeze({id:existing?.id||clean(id)||`preset-${Date.now().toString(36)}`,name:title,filters:normalizeFilterSnapshot(filters),createdAt:existing?.createdAt||clean(now)||new Date().toISOString()});
  current.presets=[preset,...current.presets.filter(item=>item.id!==preset.id)].slice(0,MAX_PRESETS);return current;
}
function deletePreset(state,id){const current=normalizeState(state),key=clean(id);current.presets=current.presets.filter(item=>item.id!==key);return current;}
function metricValue(row,key){const direct=row?.metrics?.[key],ads=row?.metrics?.[`ads.${key}`];return (direct||ads)?.available?(direct||ads).value:null;}
function rowValue(row,mode,key){
  if(modeId(mode)==='batch'){
    if(key==='keyword')return clean(row?.keyword);if(key==='matched')return row?.matched?'Matched':'Missing';if(key==='source')return (row?.sources||[]).join('|');if(key==='reason')return clean(row?.reason);if(key==='orders'||key==='sales')return metricValue(row,key);return '';
  }
  if(key==='keyword')return clean(row?.name??row?.keyword);if(key==='matchTypes')return Array.isArray(row?.matchTypes)?row.matchTypes.join('|'):clean(row?.matchTypes);return row?.[key]??'';
}
function comparable(value,type){if(type==='number'){const number=Number(value);return Number.isFinite(number)?number:Number.NEGATIVE_INFINITY;}return clean(value).toLowerCase();}
function sortRows(rows=[],mode='discovery',sort={}){
  const id=modeId(mode),rule=normalizeSort(id,sort),column=catalog(id).find(item=>item.key===rule.key)||catalog(id)[0],factor=rule.dir==='asc'?1:-1;
  return (Array.isArray(rows)?rows:[]).map((row,index)=>({row,index})).sort((a,b)=>{const av=comparable(rowValue(a.row,id,column.key),column.type),bv=comparable(rowValue(b.row,id,column.key),column.type);if(av<bv)return-factor;if(av>bv)return factor;return a.index-b.index;}).map(item=>item.row);
}
function csvQuote(value){return `"${String(value??'').replace(/"/g,'""')}"`;}
function rowsToCsv(rows=[],mode='discovery',columns=[]){const id=modeId(mode),keys=normalizeColumns(id,columns),defs=keys.map(key=>catalog(id).find(item=>item.key===key)).filter(Boolean);return[defs.map(item=>csvQuote(item.label)).join(','),...(Array.isArray(rows)?rows:[]).map(row=>defs.map(item=>csvQuote(rowValue(row,id,item.key))).join(','))].join('\n');}

const PUBLIC_API={STORAGE_KEY,MAX_PRESETS,FILTER_KEYS,COLUMN_CATALOG,DEFAULT_SORT,clean,modeId,catalog,allowedKeys,normalizeColumns,moveColumn,normalizeSort,normalizeFilterSnapshot,normalizePreset,normalizeState,upsertPreset,deletePreset,rowValue,sortRows,csvQuote,rowsToCsv};
if(!root?.document)return PUBLIC_API;

const doc=root.document,$=(selector,scope=doc)=>scope.querySelector(selector),$$=(selector,scope=doc)=>[...scope.querySelectorAll(selector)];
let uiState=loadState(),observer=null,timer=0,syncingDiscoverySort=false;const batchSelected=new Set();
function loadState(){try{return normalizeState(JSON.parse(root.localStorage?.getItem(STORAGE_KEY)||'{}'));}catch{return normalizeState({});}}
function saveState(next=uiState){uiState=normalizeState(next);try{root.localStorage?.setItem(STORAGE_KEY,JSON.stringify(uiState));}catch{}return uiState;}
function activeMode(){return root.KeywordOSKeywordLab?.uiMode?.()||'';}
function pageId(){return root.KeywordOSPageRegistry?.pageFromHash?.(root.location?.hash||'')||root.KeywordOSUIBridge?.page||'';}
function tableFor(mode){if(mode==='batch')return $('[data-keyword-lab-batch-results] table');return $('.data-workspace .data-table');}
function columnDef(mode,key){return catalog(mode).find(item=>item.key===key)||null;}
function canonicalKeys(mode){return ['select',...allowedKeys(mode)];}
function decode(value){try{return decodeURIComponent(value||'');}catch{return value||'';}}
function batchKeyword(row){return decode(row?.dataset?.keywordLabKeyword)||clean(row?.querySelector('.keyword-lab-keyword-text')?.textContent);}
function ensureBatchSelection(table){
  if(!table||table.querySelector('th[data-keyword-lab-column="select"]'))return;
  const head=table.querySelector('thead tr');if(!head)return;const th=doc.createElement('th');th.className='check-col';th.dataset.keywordLabColumn='select';th.innerHTML='<input type="checkbox" data-keyword-lab-view-select-all aria-label="Select all visible rows">';head.insertBefore(th,head.firstElementChild);
  $$('tbody tr',table).forEach(row=>{const keyword=batchKeyword(row),td=doc.createElement('td');td.className='check-col';td.dataset.keywordLabColumn='select';td.innerHTML=`<input type="checkbox" data-keyword-lab-view-select="${encodeURIComponent(keyword)}" ${batchSelected.has(keyword)?'checked':''} aria-label="Select ${String(keyword).replace(/"/g,'&quot;')}">`;row.insertBefore(td,row.firstElementChild);});
  $('[data-keyword-lab-view-select-all]',table)?.addEventListener('change',event=>{for(const box of $$('[data-keyword-lab-view-select]',table)){const keyword=decode(box.dataset.keywordLabViewSelect);box.checked=event.target.checked;if(box.checked)batchSelected.add(keyword);else batchSelected.delete(keyword);}updateBatchSelectionCount(table);});
  $$('[data-keyword-lab-view-select]',table).forEach(box=>box.addEventListener('change',()=>{const keyword=decode(box.dataset.keywordLabViewSelect);if(box.checked)batchSelected.add(keyword);else batchSelected.delete(keyword);updateBatchSelectionCount(table);}));
}
function assignColumnKeys(table,mode){
  if(!table)return false;const keys=canonicalKeys(mode),headers=$$('thead th',table);if(headers.length!==keys.length)return false;
  headers.forEach((cell,index)=>{if(!cell.dataset.keywordLabColumn)cell.dataset.keywordLabColumn=keys[index];});
  $$('tbody tr',table).forEach(row=>{const cells=[...row.children];if(cells.length!==keys.length)return;cells.forEach((cell,index)=>{if(!cell.dataset.keywordLabColumn)cell.dataset.keywordLabColumn=keys[index];});});return true;
}
function applyLayout(table,mode){
  if(!table||!assignColumnKeys(table,mode))return;const visible=uiState.columns[mode],hidden=allowedKeys(mode).filter(key=>!visible.includes(key)),order=['select',...visible,...hidden];
  for(const row of $$('thead tr,tbody tr',table)){
    const cells=[...row.children],map=new Map(cells.map(cell=>[cell.dataset.keywordLabColumn,cell])),desired=order.map(key=>map.get(key)).filter(Boolean),current=cells.map(cell=>cell.dataset.keywordLabColumn).join('|'),next=desired.map(cell=>cell.dataset.keywordLabColumn).join('|');if(current!==next)desired.forEach(cell=>row.appendChild(cell));
    for(const cell of desired){const key=cell.dataset.keywordLabColumn;cell.hidden=key!=='select'&&!visible.includes(key);}
  }
}
function appSortKey(mode,key){return mode==='discovery'?(columnDef(mode,key)?.sortKey||''):key;}
function bindSortHeaders(table,mode){
  if(!table)return;for(const th of $$('thead th[data-keyword-lab-column]',table)){const key=th.dataset.keywordLabColumn,def=columnDef(mode,key);if(!def?.sortKey)continue;th.style.cursor='pointer';th.setAttribute('role','button');const rule=uiState.sort[mode];th.setAttribute('aria-sort',rule.key===key?(rule.dir==='asc'?'ascending':'descending'):'none');if(th.dataset.keywordLabSortBound==='1')continue;th.dataset.keywordLabSortBound='1';th.addEventListener('click',event=>{if(event.target.closest('input,button'))return;const current=uiState.sort[mode],dir=current.key===key&&current.dir==='desc'?'asc':'desc';uiState.sort[mode]=normalizeSort(mode,{key,dir});saveState();if(mode==='discovery'){root.KeywordOSUIBridge?.setResearchSort?.(appSortKey(mode,key),dir);}else{sortBatchDom(table);bindSortHeaders(table,mode);}});}
}
function domComparable(row,key,type){const cell=row.querySelector(`[data-keyword-lab-column="${key}"]`),text=clean(cell?.textContent).replace(/[$,%]/g,'').replace(/,/g,'');if(type==='number'){const number=Number(text);return Number.isFinite(number)?number:Number.NEGATIVE_INFINITY;}return clean(cell?.textContent).toLowerCase();}
function sortBatchDom(table){
  const tbody=table?.querySelector('tbody');if(!tbody)return;const rule=uiState.sort.batch,def=columnDef('batch',rule.key)||columnDef('batch','keyword'),factor=rule.dir==='asc'?1:-1,rows=$$('tr',tbody).map((row,index)=>({row,index}));rows.sort((a,b)=>{const av=domComparable(a.row,def.key,def.type),bv=domComparable(b.row,def.key,def.type);if(av<bv)return-factor;if(av>bv)return factor;return a.index-b.index;});const current=$$('tr',tbody),next=rows.map(item=>item.row);if(current.some((row,index)=>row!==next[index]))next.forEach(row=>tbody.appendChild(row));
}
function labelsForTable(table,mode){const map={};for(const def of catalog(mode)){const th=table?.querySelector(`th[data-keyword-lab-column="${def.key}"]`);map[def.key]=clean(th?.textContent)||def.label;}return map;}
function closeModal(){const rootNode=$('#modal-root');if(rootNode?.querySelector('#keyword-lab-view-modal'))rootNode.innerHTML='';}
function modalShell(title,body,footer=''){const rootNode=$('#modal-root');if(!rootNode)return null;rootNode.innerHTML=`<div class="modal-wrap" id="keyword-lab-view-modal"><div class="modal"><div class="modal-header"><div><h2>${title}</h2></div><button type="button" class="drawer-close" data-keyword-lab-view-close>×</button></div><div class="modal-body">${body}${footer}</div></div></div>`;$('[data-keyword-lab-view-close]',rootNode)?.addEventListener('click',closeModal);return rootNode;}
function openColumnSettings(mode=activeMode()){
  if(!['discovery','batch'].includes(mode))return;const table=tableFor(mode);if(!table)return;assignColumnKeys(table,mode);const labelMap=labelsForTable(table,mode),visible=uiState.columns[mode],all=[...visible,...allowedKeys(mode).filter(key=>!visible.includes(key))],rows=all.map(key=>`<div class="column-item" draggable="true" data-keyword-lab-column-row="${key}" style="margin-bottom:5px"><span style="cursor:grab;color:#8b9baa">☷</span><input type="checkbox" data-keyword-lab-column-check ${visible.includes(key)?'checked':''} ${key==='keyword'?'disabled':''}><span style="flex:1">${labelMap[key]||key}</span><button type="button" class="kebab" data-keyword-lab-column-up>↑</button><button type="button" class="kebab" data-keyword-lab-column-down>↓</button></div>`).join('');const rootNode=modalShell('Keyword Lab Columns',`<p class="small muted">Drag, reorder, show or hide result columns. Keyword stays visible so exports and saved views keep a stable identity field.</p><div id="keyword-lab-column-list">${rows}</div><div class="toolbar" style="margin-top:12px"><button type="button" class="btn" data-keyword-lab-column-reset>Reset</button><button type="button" class="btn primary" data-keyword-lab-column-apply>Apply</button></div>`);if(!rootNode)return;const list=$('#keyword-lab-column-list',rootNode);let dragged=null;$$('[data-keyword-lab-column-row]',rootNode).forEach(row=>{row.addEventListener('dragstart',()=>{dragged=row;});row.addEventListener('dragover',event=>event.preventDefault());row.addEventListener('drop',event=>{event.preventDefault();if(dragged&&dragged!==row)list.insertBefore(dragged,row);});});$$('[data-keyword-lab-column-up]',rootNode).forEach(button=>button.addEventListener('click',()=>{const row=button.closest('[data-keyword-lab-column-row]');if(row?.previousElementSibling)list.insertBefore(row,row.previousElementSibling);}));$$('[data-keyword-lab-column-down]',rootNode).forEach(button=>button.addEventListener('click',()=>{const row=button.closest('[data-keyword-lab-column-row]');if(row?.nextElementSibling)list.insertBefore(row.nextElementSibling,row);}));$('[data-keyword-lab-column-reset]',rootNode)?.addEventListener('click',()=>{uiState.columns[mode]=allowedKeys(mode);saveState();closeModal();schedule();});$('[data-keyword-lab-column-apply]',rootNode)?.addEventListener('click',()=>{const selected=$$('[data-keyword-lab-column-row]',rootNode).filter(row=>row.querySelector('[data-keyword-lab-column-check]')?.checked||row.dataset.keywordLabColumnRow==='keyword').map(row=>row.dataset.keywordLabColumnRow);uiState.columns[mode]=normalizeColumns(mode,selected);saveState();closeModal();schedule();});
}
function ensureToolbar(table,mode){
  if(mode==='discovery'){
    const right=table?.closest('.data-workspace')?.querySelector('.toolbar-right'),buttons=right?[...right.querySelectorAll('button')]:[];const columnButton=buttons[1],exportButton=buttons[2];if(columnButton){columnButton.textContent='☷ Columns';columnButton.title='Show, hide and reorder Keyword Lab columns.';}if(exportButton){exportButton.textContent='⇩ Export';if(exportButton.dataset.keywordLabViewExportBound!=='1'){exportButton.dataset.keywordLabViewExportBound='1';exportButton.addEventListener('click',()=>openExport('discovery'));}}return;
  }
  const wrap=table?.closest('[data-keyword-lab-batch-results]');if(!wrap)return;let toolbar=wrap.previousElementSibling;if(!toolbar?.matches?.('[data-keyword-lab-view-toolbar="batch"]')){wrap.insertAdjacentHTML('beforebegin','<div class="toolbar" data-keyword-lab-view-toolbar="batch"><div class="toolbar-left"><b style="font-size:12px">Batch Results</b><span class="result-count" data-keyword-lab-batch-selection>0 selected</span></div><div class="toolbar-right"><button type="button" class="btn" data-keyword-lab-columns>☷ Columns</button><button type="button" class="btn" data-keyword-lab-history>History</button><button type="button" class="btn" data-keyword-lab-export>⇩ Export</button></div></div>');toolbar=wrap.previousElementSibling;$('[data-keyword-lab-columns]',toolbar)?.addEventListener('click',()=>openColumnSettings('batch'));$('[data-keyword-lab-export]',toolbar)?.addEventListener('click',()=>openExport('batch'));}updateBatchSelectionCount(table);
}
function updateBatchSelectionCount(table){const current=new Set($$('[data-keyword-lab-view-select]',table).map(box=>decode(box.dataset.keywordLabViewSelect)));for(const keyword of [...batchSelected])if(!current.has(keyword))batchSelected.delete(keyword);const target=table?.closest('[data-keyword-lab-batch-results]')?.previousElementSibling?.querySelector('[data-keyword-lab-batch-selection]');if(target)target.textContent=`${batchSelected.size} selected`;}
function downloadCsv(name,csv){const link=doc.createElement('a'),url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));link.href=url;link.download=name;link.click();root.setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportRows(mode){
  if(mode==='batch'){const lab=root.KeywordOSKeywordLab,all=sortRows(lab?.applyKeywordWorkspace?.(lab?.currentRows?.('batch')||[],lab?.getRootWorkspaceState?.()||{})||[],'batch',uiState.sort.batch),selected=all.filter(row=>batchSelected.has(row.keyword));return{all,page:all,selected};}
  const bridge=root.KeywordOSUIBridge,all=sortRows(bridge?.getResearchItems?.()||[],'discovery',uiState.sort.discovery),selectedSet=new Set(bridge?.researchSelection||[]),selected=all.filter(row=>selectedSet.has(clean(row?.name))),pageNo=Math.max(1,Number(bridge?.researchPageNo)||1),pageSize=Math.max(1,Number(bridge?.researchPageSize)||25),start=(pageNo-1)*pageSize;return{all,page:all.slice(start,start+pageSize),selected};
}
function openExport(mode=activeMode()){
  if(!['discovery','batch'].includes(mode))return;const rows=exportRows(mode),rootNode=modalShell('Keyword Lab Export',`<p class="small muted">Exports use the current visible column order. Selected export includes the currently selected result rows; current-page export uses exactly the rendered page scope.</p><div class="kworg-row"><button type="button" class="btn primary" data-keyword-lab-export-selected ${rows.selected.length?'':'disabled'}>Export selected · ${rows.selected.length}</button><button type="button" class="btn" data-keyword-lab-export-page>Export current page · ${rows.page.length}</button></div>`);if(!rootNode)return;$('[data-keyword-lab-export-selected]',rootNode)?.addEventListener('click',()=>{if(!rows.selected.length)return;downloadCsv(`KeywordOS_keyword_lab_${mode}_selected.csv`,rowsToCsv(rows.selected,mode,uiState.columns[mode]));closeModal();});$('[data-keyword-lab-export-page]',rootNode)?.addEventListener('click',()=>{downloadCsv(`KeywordOS_keyword_lab_${mode}_current_page.csv`,rowsToCsv(rows.page,mode,uiState.columns[mode]));closeModal();});
}
function openPresetSave(){const current=normalizeFilterSnapshot(root.KeywordOSUIBridge?.researchState||{}),rootNode=modalShell('Save Keyword Lab Filter',`<div class="form-field"><label>Preset name</label><input class="input" data-keyword-lab-preset-name placeholder="e.g. High Intent Long Tail"></div><div class="toolbar" style="margin-top:12px"><button type="button" class="btn primary" data-keyword-lab-preset-save>Save preset</button></div>`);if(!rootNode)return;$('[data-keyword-lab-preset-save]',rootNode)?.addEventListener('click',()=>{try{uiState=upsertPreset(uiState,$('[data-keyword-lab-preset-name]',rootNode)?.value||'',current);saveState();closeModal();schedule();}catch(error){root.KeywordOSUIBridge?.toast?.(error.message,'error');}});}
function openPresetLibrary(){const current=root.KeywordOSUIBridge?.researchState||{},items=uiState.presets.map(item=>`<div class="preset-item"><div class="preset-icon">⚙</div><div class="preset-copy"><b>${item.name}</b><small>${FILTER_KEYS.filter(key=>item.filters[key]&&item.filters[key]!=='all').map(key=>`${key}: ${item.filters[key]}`).join(' · ')||'No constraints'}</small></div><button type="button" class="btn sm" data-keyword-lab-preset-apply="${item.id}">Apply</button><button type="button" class="btn sm" data-keyword-lab-preset-delete="${item.id}">Delete</button></div>`).join('')||'<div class="empty-state"><h3>No saved filters</h3><p>Open filters and use Save as Filter Preset.</p></div>',rootNode=modalShell('Keyword Lab Saved Filters',`<div class="preset-list">${items}</div>`);if(!rootNode)return;$$('[data-keyword-lab-preset-apply]',rootNode).forEach(button=>button.addEventListener('click',()=>{const preset=uiState.presets.find(item=>item.id===button.dataset.keywordLabPresetApply);if(!preset)return;closeModal();root.KeywordOSUIBridge?.applyResearchView?.({mode:'suggest',query:current.query||'',filters:preset.filters,sort:uiState.sort.discovery});root.setTimeout(schedule,0);}));$$('[data-keyword-lab-preset-delete]',rootNode).forEach(button=>button.addEventListener('click',()=>{uiState=deletePreset(uiState,button.dataset.keywordLabPresetDelete);saveState();closeModal();openPresetLibrary();}));}
function bindPresetControls(){if(activeMode()!=='discovery')return;const save=$('#r-save');if(save){save.hidden=false;save.removeAttribute('aria-hidden');if(save.dataset.keywordLabPresetBound!=='1'){save.dataset.keywordLabPresetBound='1';save.addEventListener('click',openPresetSave);}}const row=$('.preset-row');if(row&&!$('[data-keyword-lab-preset-library]',row)){const button=doc.createElement('button');button.type='button';button.className='btn sm';button.dataset.keywordLabPresetLibrary='1';button.textContent='Saved Filters';button.addEventListener('click',openPresetLibrary);row.insertBefore(button,$('#research-toggle',row));}}
function historyRows(){try{const value=JSON.parse(root.localStorage?.getItem('keywordos_v9_research_history')||'[]');return Array.isArray(value)?value:[];}catch{return[];}}
function saveHistory(rows){try{root.localStorage?.setItem('keywordos_v9_research_history',JSON.stringify(rows));}catch{}}
function recordBatchHistory(raw,count){const query=String(raw??'').trim();if(!query||!count)return;const item={id:`rh-${Date.now()}`,query,mode:'analyze',resultCount:Number(count)||0,createdAt:new Date().toLocaleString()},rows=[item,...historyRows().filter(entry=>!(String(entry?.query||'').toLowerCase()===query.toLowerCase()&&entry?.mode==='analyze'))].slice(0,30);saveHistory(rows);}
function restoreBatchQuery(raw,tries=0){const input=$('#keyword-lab-batch-input');if(!input&&tries<20)return root.setTimeout(()=>restoreBatchQuery(raw,tries+1),40);if(!input)return false;input.value=String(raw??'');input.dispatchEvent(new Event('input',{bubbles:true}));$('[data-keyword-lab-action="analyze"]')?.click();return true;}
function openHistory(){const rows=historyRows(),items=rows.map((item,index)=>`<div class="preset-item"><div class="preset-icon">⌕</div><div class="preset-copy"><b>${String(item.query||'').split(/\r?\n/).slice(0,2).join(' · ')}</b><small>${item.mode==='analyze'?'Batch Analysis':'Keyword Discovery'} · ${Number(item.resultCount||0)} results · ${clean(item.createdAt)}</small></div><button type="button" class="btn sm" data-keyword-lab-history-run="${index}">Run again</button></div>`).join('')||'<div class="empty-state"><h3>No query history</h3><p>Run a discovery or batch query and it will be kept locally in this browser.</p></div>',rootNode=modalShell('Keyword Lab Query History',`<div class="preset-list">${items}</div><div class="toolbar" style="margin-top:12px"><button type="button" class="btn danger" data-keyword-lab-history-clear>Clear History</button></div>`);if(!rootNode)return;$$('[data-keyword-lab-history-run]',rootNode).forEach(button=>button.addEventListener('click',()=>{const item=rows[Number(button.dataset.keywordLabHistoryRun)];if(!item)return;closeModal();if(item.mode==='analyze'){root.KeywordOSKeywordLab?.activate?.('batch');root.setTimeout(()=>restoreBatchQuery(item.query),70);}else{root.KeywordOSKeywordLab?.activate?.('discovery');root.setTimeout(()=>root.KeywordOSUIBridge?.applyResearchView?.({mode:'suggest',query:item.query,filters:normalizeFilterSnapshot(root.KeywordOSUIBridge?.researchState||{}),sort:uiState.sort.discovery}),60);}}));$('[data-keyword-lab-history-clear]',rootNode)?.addEventListener('click',()=>{saveHistory([]);closeModal();});}
function captureWorkspaceContext(){const mode=activeMode();if(!['discovery','batch','asin'].includes(mode))return null;const lab=root.KeywordOSKeywordLab,query=mode==='batch'?String($('#keyword-lab-batch-input')?.value||''):String(root.KeywordOSUIBridge?.researchState?.query||''),columns=['discovery','batch'].includes(mode)?[...uiState.columns[mode]]:[],sort=['discovery','batch'].includes(mode)?{...uiState.sort[mode]}:null;return{keywordLab:{version:1,mode,query,filters:mode==='discovery'?normalizeFilterSnapshot(root.KeywordOSUIBridge?.researchState||{}):null,root:lab?.getRootWorkspaceState?.()||null,columns,sort}};}
function applyWorkspaceContext(workspace){const snapshot=workspace?.keywordLab;if(!snapshot||typeof snapshot!=='object')return false;const mode=['discovery','batch','asin'].includes(snapshot.mode)?snapshot.mode:'discovery';if(mode!=='asin'){uiState.columns[mode]=normalizeColumns(mode,snapshot.columns);uiState.sort[mode]=normalizeSort(mode,snapshot.sort);saveState();}if(snapshot.root)root.KeywordOSKeywordLab?.replaceRootWorkspaceState?.(snapshot.root);if(mode==='batch'){root.KeywordOSKeywordLab?.activate?.('batch');root.setTimeout(()=>restoreBatchQuery(snapshot.query),80);return true;}if(mode==='asin'){root.KeywordOSKeywordLab?.activate?.('asin');root.setTimeout(schedule,80);return true;}root.KeywordOSKeywordLab?.activate?.('discovery');root.setTimeout(()=>root.KeywordOSUIBridge?.applyResearchView?.({mode:'suggest',query:snapshot.query||'',filters:normalizeFilterSnapshot(snapshot.filters||{}),sort:uiState.sort.discovery}),60);root.setTimeout(schedule,100);return true;}
function syncDiscoverySort(){if(activeMode()!=='discovery'||syncingDiscoverySort)return;const bridge=root.KeywordOSUIBridge,current=bridge?.researchSort||{},wanted=uiState.sort.discovery,appKey=appSortKey('discovery',wanted.key);if(!appKey||current.key===appKey&&current.dir===wanted.dir)return;syncingDiscoverySort=true;bridge?.setResearchSort?.(appKey,wanted.dir);root.setTimeout(()=>{syncingDiscoverySort=false;},0);}
function enhance(){timer=0;const mode=activeMode();if(!['discovery','batch'].includes(mode))return;if(mode==='discovery')syncDiscoverySort();const table=tableFor(mode);if(!table)return;if(mode==='batch')ensureBatchSelection(table);if(!assignColumnKeys(table,mode))return;applyLayout(table,mode);ensureToolbar(table,mode);bindSortHeaders(table,mode);if(mode==='batch'){sortBatchDom(table);updateBatchSelectionCount(table);}else bindPresetControls();}
function schedule(){if(timer)return;timer=root.setTimeout(enhance,20);}
function start(){const boot=()=>{schedule();const content=$('#content');if(content&&typeof MutationObserver!=='undefined'){observer=new MutationObserver(schedule);observer.observe(content,{childList:true,subtree:true});}root.addEventListener('hashchange',schedule);doc.addEventListener('click',event=>{const target=event.target instanceof root.Element?event.target:null;if(!target)return;const history=target.closest('#research-history,[data-keyword-lab-history]');if(history&&pageId()==='cerebro'){event.preventDefault();event.stopImmediatePropagation();openHistory();return;}if(target.closest('[data-keyword-lab-action="analyze"]'))root.setTimeout(()=>{const raw=$('#keyword-lab-batch-input')?.value||'',count=$$('[data-keyword-lab-batch-results] tbody tr').length;if(count)recordBatchHistory(raw,count);},50);},true);};doc.readyState==='loading'?doc.addEventListener('DOMContentLoaded',boot,{once:true}):boot();}

return Object.assign(PUBLIC_API,{openColumnSettings,openExport,openPresetSave,openPresetLibrary,openHistory,restoreBatchQuery,captureWorkspaceContext,applyWorkspaceContext,start});
});
