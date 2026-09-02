(function(root,factory){
  const api=factory(root);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSCompetitorCreativeEvidenceTest=api;
  if(root){root.KeywordOSCompetitorCreativeEvidence=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const DATASET_KIND='competitor-creative';
const STORE_ID='store-a';
const STORAGE_KEY='keywordos_competitor_creative_evidence_v1';
const IMAGE_SLOTS=Object.freeze(['Main','Image 2','Image 3','Image 4','Image 5','Image 6','Image 7','Image 8','Image 9','A+','Other']);
let observer=null,scheduled=false;

const clean=value=>String(value??'').trim();
const norm=value=>clean(value).toLowerCase();
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function parseDate(value){
  const raw=clean(value),m=raw.match(/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)$/);if(!m)return'';
  const date=`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`,parsed=new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf())||parsed.toISOString().slice(0,10)!==date?'':date;
}
function validAsin(value){const asin=clean(value).toUpperCase();return /^[A-Z0-9]{10}$/.test(asin)?asin:'';}
function labels(value){
  const seen=new Map();
  for(const part of String(value??'').split(/\||\n/)){const item=clean(part),key=norm(item);if(item&&key&&!seen.has(key))seen.set(key,item);}
  return [...seen.values()];
}
function normalizeEvidence(input,rowNumber='Evidence'){
  const asin=validAsin(input?.asin),date=parseDate(input?.date),slot=clean(input?.slot),imageReference=clean(input?.imageReference);
  if(!asin)throw new Error(`${rowNumber} requires a 10-character ASIN.`);
  if(!date)throw new Error(`${rowNumber} requires a valid YYYY-MM-DD capture date.`);
  if(!IMAGE_SLOTS.includes(slot))throw new Error(`${rowNumber} has an unsupported image slot.`);
  if(!imageReference)throw new Error(`${rowNumber} requires an image reference, URL, filename or evidence ID.`);
  return{date,asin,slot,imageReference:imageReference.slice(0,1000),visualTags:labels(input?.visualTags).join(' | '),sellingPoints:labels(input?.sellingPoints).join(' | '),sourceNote:clean(input?.sourceNote).slice(0,1000)};
}
function rowKey(row){return[parseDate(row?.date),validAsin(row?.asin),clean(row?.slot)].join('|');}
function mergeRows(existing=[],incoming=[]){
  const out=[],positions=new Map();
  const add=(row,prefer)=>{let normalized;try{normalized=normalizeEvidence(row);}catch{return;}const key=rowKey(normalized);if(!positions.has(key)){positions.set(key,out.length);out.push(normalized);return;}if(prefer)out[positions.get(key)]=normalized;};
  for(const row of Array.isArray(existing)?existing:[])add(row,false);
  for(const row of Array.isArray(incoming)?incoming:[])add(row,true);
  return out.sort((a,b)=>a.date.localeCompare(b.date)||a.asin.localeCompare(b.asin)||IMAGE_SLOTS.indexOf(a.slot)-IMAGE_SLOTS.indexOf(b.slot));
}
function latestPerAsinSlot(rows=[]){
  const latest=new Map();
  for(const row of Array.isArray(rows)?rows:[]){let value;try{value=normalizeEvidence(row);}catch{continue;}const key=`${value.asin}|${value.slot}`,prev=latest.get(key);if(!prev||value.date>prev.date)latest.set(key,value);}
  return [...latest.values()].sort((a,b)=>a.asin.localeCompare(b.asin)||IMAGE_SLOTS.indexOf(a.slot)-IMAGE_SLOTS.indexOf(b.slot));
}
function setModel(rows,field){
  const map=new Map();for(const row of rows)for(const label of labels(row?.[field])){const key=norm(label);if(!map.has(key))map.set(key,label);}return map;
}
function setCompare(a,b){
  const shared=[],onlyA=[],onlyB=[];
  for(const [key,label] of a)(b.has(key)?shared:onlyA).push(label);
  for(const [key,label] of b)if(!a.has(key))onlyB.push(label);
  return{shared:shared.sort(),onlyA:onlyA.sort(),onlyB:onlyB.sort()};
}
function slotCompare(rowsA,rowsB){return setCompare(new Map(rowsA.map(r=>[norm(r.slot),r.slot])),new Map(rowsB.map(r=>[norm(r.slot),r.slot])));}
function compareEvidence(rows=[],asinA='',asinB=''){
  const a=validAsin(asinA),b=validAsin(asinB),latest=latestPerAsinSlot(rows),rowsA=latest.filter(row=>row.asin===a),rowsB=latest.filter(row=>row.asin===b);
  if(!a||!b||a===b)return{available:false,asinA:a,asinB:b,reason:'Choose two different valid ASINs.',rowsA,rowsB};
  if(!rowsA.length||!rowsB.length)return{available:false,asinA:a,asinB:b,reason:'Both ASINs need captured creative evidence.',rowsA,rowsB};
  return{available:true,asinA:a,asinB:b,rowsA,rowsB,slots:slotCompare(rowsA,rowsB),visualTags:setCompare(setModel(rowsA,'visualTags'),setModel(rowsB,'visualTags')),sellingPoints:setCompare(setModel(rowsA,'sellingPoints'),setModel(rowsB,'sellingPoints')),latestDateA:rowsA.map(r=>r.date).sort().at(-1)||'',latestDateB:rowsB.map(r=>r.date).sort().at(-1)||''};
}
function uniqueAsins(rows=[]){return[...new Set((Array.isArray(rows)?rows:[]).map(row=>validAsin(row?.asin)).filter(Boolean))].sort();}
function currentPage(){return String(root?.location?.hash||'').replace(/^#page=/,'');}
function isPage(){return currentPage()==='competitor-snapshots'||clean(root?.document?.querySelector?.('#page-title')?.textContent)==='Competitor Snapshots';}
function readLocal(){try{const rows=JSON.parse(root?.localStorage?.getItem(STORAGE_KEY)||'[]');return Array.isArray(rows)?rows:[];}catch{return[];}}
async function readCreativeRows(){try{const record=await root?.KeywordOSDatasetRegistry?.get?.(DATASET_KIND,STORE_ID);if(Array.isArray(record?.rows))return record.rows;}catch(error){console.warn('KeywordOS creative evidence registry read skipped',error);}return readLocal();}
async function saveCreativeRows(rows,source='Manual competitor creative evidence'){
  const cleanRows=mergeRows([],rows);
  if(typeof root?.KeywordOSDatasetRegistry?.save==='function')await root.KeywordOSDatasetRegistry.save({kind:DATASET_KIND,storeId:STORE_ID,rows:cleanRows,source,validation:{status:'validated',validator:'manual creative evidence capture'}});
  try{root?.localStorage?.setItem(STORAGE_KEY,JSON.stringify(cleanRows));}catch{}
  await root?.KeywordOSUIBridge?.refreshDatasetRegistry?.();
  return cleanRows;
}
function importedCompetitorAsins(){const record=(root?.KeywordOSUIBridge?.datasetRegistry||[]).find(item=>item?.storeId===STORE_ID&&item?.kind==='competitor');return uniqueAsins(record?.rows||[]);}
function today(){return new Date().toISOString().slice(0,10);}
function list(values=[]){return values.length?values.map(v=>`<span class="keywordos-creative-pill">${esc(v)}</span>`).join(' '):'<span class="muted">None captured</span>';}
function comparisonHtml(model){
  if(!model.available)return`<div class="empty-state"><h3>Comparison unavailable</h3><p>${esc(model.reason)}</p></div>`;
  const section=(title,part)=>`<div class="keywordos-creative-compare-block"><h4>${esc(title)}</h4><div><b>Shared</b>${list(part.shared)}</div><div><b>${esc(model.asinA)} only</b>${list(part.onlyA)}</div><div><b>${esc(model.asinB)} only</b>${list(part.onlyB)}</div></div>`;
  return`<div class="keywordos-creative-summary"><span>${esc(model.asinA)} · ${esc(model.rowsA.length)} latest slot(s) · ${esc(model.latestDateA)}</span><span>${esc(model.asinB)} · ${esc(model.rowsB.length)} latest slot(s) · ${esc(model.latestDateB)}</span></div><div class="keywordos-creative-compare-grid">${section('Image-slot coverage',model.slots)}${section('Explicit visual tags',model.visualTags)}${section('Explicit selling-point labels',model.sellingPoints)}</div><p class="muted">Exact label matching only. Shared or unique labels are observations, not evidence of traffic, conversion, ranking, compliance or causality.</p>`;
}
function evidenceTable(rows){
  const latest=latestPerAsinSlot(rows);if(!latest.length)return'<div class="empty-state"><h3>No creative evidence captured</h3><p>Add a manual image reference and explicit tags to begin comparison.</p></div>';
  return`<div class="table-wrap"><table class="data-table"><thead><tr><th>ASIN</th><th>Date</th><th>Slot</th><th>Image reference</th><th>Visual tags</th><th>Selling points</th><th>Source note</th></tr></thead><tbody>${latest.map(row=>`<tr><td class="left"><b>${esc(row.asin)}</b></td><td>${esc(row.date)}</td><td>${esc(row.slot)}</td><td class="left" data-no-i18n>${esc(row.imageReference)}</td><td class="left" data-no-i18n>${esc(row.visualTags||'—')}</td><td class="left" data-no-i18n>${esc(row.sellingPoints||'—')}</td><td class="left" data-no-i18n>${esc(row.sourceNote||'—')}</td></tr>`).join('')}</tbody></table></div>`;
}
function panelHtml(rows,preferredA='',preferredB=''){
  const asins=uniqueAsins([...rows,...importedCompetitorAsins().map(asin=>({asin}))]),a=validAsin(preferredA)||asins[0]||'',b=validAsin(preferredB)||asins.find(x=>x!==a)||'';
  const options=value=>asins.map(asin=>`<option value="${esc(asin)}" ${asin===value?'selected':''}>${esc(asin)}</option>`).join('');
  return`<div class="card-head"><div class="card-title"><h3>Competitor image / selling-point evidence</h3><small>Manual evidence capture · no image understanding or inferred claims</small></div></div><div class="card-body"><div class="notice-banner"><b>Evidence only.</b> Add an image URL/file reference plus tags you explicitly observed. KeywordOS does not inspect the image, infer a selling point, or claim Amazon compliance.</div><details class="keywordos-creative-capture"><summary>Capture creative evidence · 录入证据</summary><form id="keywordos-creative-form"><div class="keywordos-creative-form-grid"><label>ASIN<input class="input" id="keywordos-creative-asin" list="keywordos-creative-asins" maxlength="10" required></label><label>Capture date<input class="input" id="keywordos-creative-date" type="date" value="${today()}" required></label><label>Image slot<select class="select" id="keywordos-creative-slot">${IMAGE_SLOTS.map(slot=>`<option>${esc(slot)}</option>`).join('')}</select></label><label>Image reference<input class="input" id="keywordos-creative-reference" placeholder="URL, filename or evidence ID" required></label><label>Explicit visual tags<textarea class="input" id="keywordos-creative-visual" placeholder="white background | dimension diagram | lifestyle"></textarea></label><label>Explicit selling points<textarea class="input" id="keywordos-creative-points" placeholder="spring hinge | blue light | lightweight"></textarea></label><label class="keywordos-creative-source">Source note<input class="input" id="keywordos-creative-source" placeholder="Observed Amazon listing image, licensed export, local file…"></label></div><button class="btn primary" type="submit">Save evidence · 保存证据</button><datalist id="keywordos-creative-asins">${asins.map(asin=>`<option value="${esc(asin)}"></option>`).join('')}</datalist></form></details><div class="keywordos-creative-compare-controls"><label>ASIN A<select class="select" id="keywordos-creative-a">${options(a)}</select></label><label>ASIN B<select class="select" id="keywordos-creative-b">${options(b)}</select></label></div><div id="keywordos-creative-comparison">${comparisonHtml(compareEvidence(rows,a,b))}</div><h4 class="top-gap">Latest captured evidence per ASIN / image slot</h4>${evidenceTable(rows)}</div>`;
}
function installStyles(){if(!root?.document||document.querySelector('#keywordos-creative-style'))return;const style=document.createElement('style');style.id='keywordos-creative-style';style.textContent=`.keywordos-creative-capture{margin:14px 0}.keywordos-creative-capture summary{cursor:pointer;font-weight:700}.keywordos-creative-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}.keywordos-creative-form-grid label,.keywordos-creative-compare-controls label{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:600}.keywordos-creative-form-grid textarea{min-height:70px;resize:vertical}.keywordos-creative-source{grid-column:1/-1}.keywordos-creative-compare-controls{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}.keywordos-creative-compare-controls label{min-width:210px}.keywordos-creative-summary{display:flex;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:10.5px;margin-bottom:10px}.keywordos-creative-compare-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.keywordos-creative-compare-block{border:1px solid var(--line);border-radius:8px;padding:10px}.keywordos-creative-compare-block h4{margin:0 0 8px}.keywordos-creative-compare-block>div{display:grid;grid-template-columns:110px 1fr;gap:6px;margin:7px 0;font-size:10.5px}.keywordos-creative-pill{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:2px 7px;margin:1px;font-size:10px}@media(max-width:820px){.keywordos-creative-form-grid,.keywordos-creative-compare-grid{grid-template-columns:1fr}.keywordos-creative-source{grid-column:auto}}`;document.head.appendChild(style);}
async function render(){scheduled=false;if(!isPage())return;const content=document.querySelector('#content');if(!content)return;let panel=document.querySelector('#keywordos-creative-panel');const a=document.querySelector('#keywordos-creative-a')?.value||'',b=document.querySelector('#keywordos-creative-b')?.value||'',rows=await readCreativeRows();if(!isPage())return;if(!panel){panel=document.createElement('section');panel.className='card top-gap';panel.id='keywordos-creative-panel';content.appendChild(panel);}panel.innerHTML=panelHtml(rows,a,b);}
function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(render);}
async function submit(event){if(event.target?.id!=='keywordos-creative-form')return;event.preventDefault();try{const evidence=normalizeEvidence({asin:document.querySelector('#keywordos-creative-asin')?.value,date:document.querySelector('#keywordos-creative-date')?.value,slot:document.querySelector('#keywordos-creative-slot')?.value,imageReference:document.querySelector('#keywordos-creative-reference')?.value,visualTags:document.querySelector('#keywordos-creative-visual')?.value,sellingPoints:document.querySelector('#keywordos-creative-points')?.value,sourceNote:document.querySelector('#keywordos-creative-source')?.value});const existing=await readCreativeRows(),merged=mergeRows(existing,[evidence]);await saveCreativeRows(merged);root?.KeywordOSUIBridge?.toast?.('Creative evidence saved','success');await render();}catch(error){root?.KeywordOSUIBridge?.toast?.(error.message||'Unable to save creative evidence','error');}}
function change(event){if(!['keywordos-creative-a','keywordos-creative-b'].includes(event.target?.id))return;readCreativeRows().then(rows=>{const target=document.querySelector('#keywordos-creative-comparison');if(target)target.innerHTML=comparisonHtml(compareEvidence(rows,document.querySelector('#keywordos-creative-a')?.value,document.querySelector('#keywordos-creative-b')?.value));});}
function own(node){return node?.nodeType===1&&(node.id==='keywordos-creative-panel'||node.closest?.('#keywordos-creative-panel'));}
function start(){if(!root?.document)return;const boot=()=>{installStyles();document.addEventListener('submit',submit);document.addEventListener('change',change);root.addEventListener?.('hashchange',schedule);const content=document.querySelector('#content');if(content){observer=new MutationObserver(records=>{if(records.some(record=>!record.target?.closest?.('#keywordos-creative-panel')&&[...record.addedNodes,...record.removedNodes].some(node=>!own(node))))schedule();});observer.observe(content,{childList:true,subtree:true});}schedule();};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();}
return{DATASET_KIND,STORE_ID,IMAGE_SLOTS,parseDate,validAsin,labels,normalizeEvidence,rowKey,mergeRows,latestPerAsinSlot,setCompare,compareEvidence,uniqueAsins,start};
});