(function(root,factory){
  const api=factory(root);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSReviewVoCTest=api;
  if(root){root.KeywordOSReviewVoC=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const STORAGE_KEY='keywordos_growth_reviews_v1';
const VOC_FIELDS=Object.freeze([
  ['positiveTheme','Positive theme'],
  ['negativeTheme','Negative theme'],
  ['complaint','Complaint'],
  ['purchaseMotivation','Purchase motivation'],
  ['useCase','Use case'],
  ['requestedFeature','Requested feature']
]);

function clean(value){return String(value??'').trim();}
function labelKey(value){return clean(value).toLowerCase().replace(/\s+/g,' ');}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function splitExplicitLabels(value){
  return clean(value).split('|').map(clean).filter(Boolean);
}
function summarizeVoc(rows=[]){
  const groups=new Map();
  let labelledRows=0,totalLabels=0;
  for(const row of Array.isArray(rows)?rows:[]){
    let rowHasLabel=false;
    for(const [field,type] of VOC_FIELDS){
      const seen=new Set();
      for(const label of splitExplicitLabels(row?.[field])){
        const normalized=labelKey(label);
        if(!normalized||seen.has(normalized))continue;
        seen.add(normalized);rowHasLabel=true;totalLabels+=1;
        const key=`${field}|${normalized}`;
        const current=groups.get(key)||{field,type,label,count:0,samples:[],asins:new Set(),marketplaces:new Set(),languages:new Set()};
        current.count+=1;
        const asin=clean(row?.asin).toUpperCase();if(asin)current.asins.add(asin);
        const marketplace=clean(row?.marketplace);if(marketplace)current.marketplaces.add(marketplace);
        const language=clean(row?.language);if(language)current.languages.add(language);
        if(current.samples.length<3)current.samples.push({date:clean(row?.date),asin,title:clean(row?.title),rating:Number(row?.rating)||null});
        groups.set(key,current);
      }
    }
    if(rowHasLabel)labelledRows+=1;
  }
  const items=[...groups.values()].map(item=>({...item,asins:[...item.asins].sort(),marketplaces:[...item.marketplaces].sort(),languages:[...item.languages].sort()})).sort((a,b)=>b.count-a.count||a.type.localeCompare(b.type)||a.label.localeCompare(b.label));
  const byType=VOC_FIELDS.map(([field,type])=>({field,type,labels:items.filter(item=>item.field===field),observations:items.filter(item=>item.field===field).reduce((sum,item)=>sum+item.count,0)}));
  return{rows:Array.isArray(rows)?rows.length:0,labelledRows,totalLabels,items,byType};
}
function sampleText(samples){
  if(!samples.length)return'—';
  return samples.map(sample=>[sample.date,sample.asin,sample.rating?`${sample.rating}★`:'',sample.title].filter(Boolean).join(' · ')).join(' | ');
}
function listText(values){return values.length?values.join(', '):'—';}
function panelHtml(rows=[]){
  const summary=summarizeVoc(rows);
  const sections=summary.byType.map(section=>{
    if(!section.labels.length)return `<div class="card-body"><b>${escapeHtml(section.type)}</b><div class="muted">No explicit ${escapeHtml(section.type.toLowerCase())} labels imported.</div></div>`;
    const body=section.labels.map(item=>`<tr><td class="left"><b>${escapeHtml(item.label)}</b></td><td>${item.count}</td><td class="left">${escapeHtml(listText(item.asins))}</td><td class="left">${escapeHtml(listText(item.marketplaces))}</td><td class="left">${escapeHtml(listText(item.languages))}</td><td class="left">${escapeHtml(sampleText(item.samples))}</td></tr>`).join('');
    return `<div class="card-body"><b>${escapeHtml(section.type)}</b></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Imported label</th><th>Review rows</th><th>ASINs</th><th>Marketplaces</th><th>Languages</th><th>Evidence samples</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }).join('');
  return `<div class="card top-gap" id="keywordos-review-voc-panel"><div class="card-head"><div class="card-title"><h3>Explicit voice-of-customer labels</h3><small>Imported human/authorized labels only; no theme, complaint or intent is inferred from review text.</small></div></div><div class="card-body"><div class="growth-kpis"><div class="growth-kpi"><span>Review samples</span><b>${summary.rows}</b><small>Raw imported rows</small></div><div class="growth-kpi"><span>Rows with VOC labels</span><b>${summary.labelledRows}</b><small>At least one explicit label</small></div><div class="growth-kpi"><span>Label observations</span><b>${summary.totalLabels}</b><small>Pipe-delimited imported labels counted once per row/type</small></div></div><div class="notice-banner"><b>Evidence boundary.</b> Positive/negative themes, complaints, purchase motivations, use cases and requested features appear only when explicitly supplied in the review CSV. KeywordOS does not derive them from star rating, title, body, marketplace or language. Multiple labels in one field may be separated with <code>|</code>; original review text and imported label strings remain unchanged in the stored row.</div></div>${sections}</div>`;
}
function isReviewPage(){return root?.location?.hash==='#page=review-evidence'||clean(document.querySelector('#page-title')?.textContent)==='Review Evidence';}
async function readRows(){
  try{const record=await root?.KeywordOSDatasetRegistry?.get?.('reviews','store-a');if(Array.isArray(record?.rows))return record.rows;}catch(error){console.warn('KeywordOS review VOC registry read skipped',error);}
  try{const rows=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(rows)?rows:[];}catch{return[];}
}
async function inject(){
  if(!isReviewPage())return;
  const content=document.querySelector('#content');
  if(!content||document.querySelector('#keywordos-review-voc-panel'))return;
  const rows=await readRows();
  if(!isReviewPage()||document.querySelector('#keywordos-review-voc-panel'))return;
  const holder=document.createElement('div');holder.innerHTML=panelHtml(rows);const panel=holder.firstElementChild;if(panel)content.appendChild(panel);
}
function start(){
  if(!root?.document)return;
  const run=()=>inject().catch(error=>console.warn('KeywordOS review VOC panel skipped',error));
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',run,{once:true}):run();
  root.addEventListener?.('hashchange',run);
  const content=document.querySelector('#content');if(content)new MutationObserver(run).observe(content,{childList:true});
}

return{VOC_FIELDS,splitExplicitLabels,summarizeVoc,panelHtml,start};
});
