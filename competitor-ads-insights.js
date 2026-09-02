(function(root,factory){
  const api=factory(root);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSCompetitorAdsInsightsTest=api;
  if(root){root.KeywordOSCompetitorAdsInsights=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const DATASET_KIND='competitor-ads';
const STORAGE_KEY='keywordos_growth_competitor_ads_v1';
const MAX_IMPORT_BYTES=16*1024*1024;
const TEMPLATE='Date,ASIN,Keyword,Placement,Ad Type,Campaign Label,Observed Position,Source Note\n2026-09-01,B000000000,reading glasses,Top of Search,Sponsored Products,Imported campaign label,2,Licensed research export';

function clean(value){return String(value??'').trim();}
function norm(value){return clean(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function parseDate(value){
  const raw=clean(value),match=raw.match(/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)$/);
  if(!match)return'';
  const date=`${match[1]}-${String(match[2]).padStart(2,'0')}-${String(match[3]).padStart(2,'0')}`;
  const parsed=new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf())||parsed.toISOString().slice(0,10)!==date?'':date;
}
function parsePositiveInteger(value,rowNumber){
  const raw=clean(value);
  if(!raw)return null;
  if(!/^\d+$/.test(raw)||Number(raw)<1)throw new Error(`Row ${rowNumber} has an invalid Observed Position.`);
  return Number(raw);
}
function parseCsv(text){
  const source=String(text||'').replace(/^\uFEFF/,''),rows=[];
  let row=[],field='',quoted=false;
  for(let index=0;index<source.length;index+=1){
    const char=source[index],next=source[index+1];
    if(char==='"'&&quoted&&next==='"'){field+='"';index+=1;continue;}
    if(char==='"'){quoted=!quoted;continue;}
    if(char===','&&!quoted){row.push(field);field='';continue;}
    if((char==='\n'||char==='\r')&&!quoted){
      if(char==='\r'&&next==='\n')index+=1;
      row.push(field);
      if(row.some(value=>clean(value)))rows.push(row);
      row=[];field='';continue;
    }
    field+=char;
  }
  if(quoted)throw new Error('CSV contains an unclosed quoted field');
  row.push(field);
  if(row.some(value=>clean(value)))rows.push(row);
  if(rows.length<2)throw new Error('CSV contains no data rows');
  return rows;
}
function headerMap(headers){const map={};headers.forEach((header,index)=>{map[norm(header)]=index;});return map;}
function pick(row,map,aliases){for(const alias of aliases){const index=map[norm(alias)];if(index!=null)return row[index]??'';}return'';}

function parseCompetitorAdsCsv(text){
  const parsed=parseCsv(text),map=headerMap(parsed[0]),out=[];
  for(let index=1;index<parsed.length;index+=1){
    const row=parsed[index];
    if(!row.some(value=>clean(value)))continue;
    const rowNumber=index+1;
    const date=parseDate(pick(row,map,['Date','Snapshot Date','Observed Date']));
    const asin=clean(pick(row,map,['ASIN','Child ASIN','Product ASIN'])).toUpperCase();
    const keyword=clean(pick(row,map,['Keyword','Search Term','Observed Keyword']));
    const placement=clean(pick(row,map,['Placement','Ad Placement','Observed Placement']));
    const adType=clean(pick(row,map,['Ad Type','Sponsored Ad Type','Advertising Type']));
    const campaignLabel=clean(pick(row,map,['Campaign Label','Campaign','Campaign Name','Observed Campaign Label']));
    const sourceNote=clean(pick(row,map,['Source Note','Evidence Note','Source']));
    if(!date||!asin)continue;
    if(!keyword&&!placement&&!adType&&!campaignLabel)continue;
    out.push({
      date,
      asin,
      keyword,
      placement,
      adType,
      campaignLabel,
      observedPosition:parsePositiveInteger(pick(row,map,['Observed Position','Position','Ad Position']),rowNumber),
      sourceNote
    });
  }
  if(!out.length)throw new Error('No valid competitor Ads observation rows found. Required: Date, ASIN and at least one observed Keyword, Placement, Ad Type or Campaign Label.');
  return out;
}

function rowKey(row){
  return [clean(row?.date),clean(row?.asin).toUpperCase(),norm(row?.keyword),norm(row?.placement),norm(row?.adType),norm(row?.campaignLabel),row?.observedPosition??''].join('|');
}
function mergeRows(existing=[],incoming=[]){
  const rows=[],positions=new Map();
  const add=(row,prefer)=>{
    const key=rowKey(row);
    if(!clean(row?.date)||!clean(row?.asin)){rows.push(row);return;}
    if(!positions.has(key)){positions.set(key,rows.length);rows.push(row);return;}
    if(prefer)rows[positions.get(key)]=row;
  };
  for(const row of Array.isArray(existing)?existing:[])add(row,false);
  for(const row of Array.isArray(incoming)?incoming:[])add(row,true);
  return rows;
}
function uniqueValues(rows,key){
  const seen=new Map();
  for(const row of rows){
    const value=clean(row?.[key]);
    if(!value)continue;
    const normalized=norm(value);
    if(!seen.has(normalized))seen.set(normalized,value);
  }
  return [...seen.values()].sort((a,b)=>a.localeCompare(b));
}
function latestRowsByAsin(rows){
  const grouped=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const asin=clean(row?.asin).toUpperCase(),date=parseDate(row?.date);
    if(!asin||!date)continue;
    if(!grouped.has(asin))grouped.set(asin,[]);
    grouped.get(asin).push({...row,asin,date});
  }
  const out=[];
  for(const [asin,history] of grouped){
    const latestDate=history.map(row=>row.date).sort().at(-1);
    out.push(...history.filter(row=>row.date===latestDate).map(row=>({...row,asin,date:latestDate})));
  }
  return out;
}
function summarizeCompetitorAds(rows){
  const valid=(Array.isArray(rows)?rows:[]).filter(row=>clean(row?.asin)&&parseDate(row?.date));
  const dates=valid.map(row=>parseDate(row.date)).sort();
  const latestRows=latestRowsByAsin(valid);
  const byAsin=new Map();
  for(const row of latestRows){
    if(!byAsin.has(row.asin))byAsin.set(row.asin,[]);
    byAsin.get(row.asin).push(row);
  }
  const asins=[...byAsin.entries()].map(([asin,asinRows])=>({
    asin,
    date:asinRows[0]?.date||'',
    observationRows:asinRows.length,
    keywords:uniqueValues(asinRows,'keyword'),
    placements:uniqueValues(asinRows,'placement'),
    adTypes:uniqueValues(asinRows,'adType'),
    campaignLabels:uniqueValues(asinRows,'campaignLabel')
  })).sort((a,b)=>a.asin.localeCompare(b.asin));
  const keywordMap=new Map();
  for(const row of latestRows){
    const keyword=clean(row.keyword),key=norm(keyword);
    if(!keyword||!key)continue;
    if(!keywordMap.has(key))keywordMap.set(key,{keyword,asins:new Set()});
    keywordMap.get(key).asins.add(row.asin);
  }
  const keywordOverlap=[...keywordMap.values()].filter(item=>item.asins.size>1).map(item=>({keyword:item.keyword,asins:[...item.asins].sort()})).sort((a,b)=>b.asins.length-a.asins.length||a.keyword.localeCompare(b.keyword));
  const placementMap=new Map();
  for(const row of latestRows){
    const placement=clean(row.placement)||'Unspecified',adType=clean(row.adType)||'Unspecified';
    const key=`${norm(placement)}|${norm(adType)}`;
    if(!placementMap.has(key))placementMap.set(key,{placement,adType,observationRows:0,asins:new Set()});
    const item=placementMap.get(key);item.observationRows+=1;item.asins.add(row.asin);
  }
  const placements=[...placementMap.values()].map(item=>({...item,asins:[...item.asins].sort()})).sort((a,b)=>b.observationRows-a.observationRows||a.placement.localeCompare(b.placement));
  return{
    coverage:{min:dates[0]||'',max:dates.at(-1)||''},
    importedRows:valid.length,
    latestObservationRows:latestRows.length,
    uniqueAsins:asins.length,
    uniqueKeywords:uniqueValues(latestRows,'keyword').length,
    uniquePlacements:uniqueValues(latestRows,'placement').length,
    asins,
    keywordOverlap,
    placements,
    latestRows
  };
}

function csvDownload(name,content){
  const url=URL.createObjectURL(new Blob(['\uFEFF',content],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
}
function readLocalRows(){try{const rows=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(rows)?rows:[];}catch{return[];}}
async function readRows(){
  try{const record=await root?.KeywordOSDatasetRegistry?.get?.(DATASET_KIND,'store-a');if(Array.isArray(record?.rows))return record.rows;}catch(error){console.warn('KeywordOS competitor Ads registry read skipped',error);}
  return readLocalRows();
}
async function saveRows(rows,source){
  const save=root?.KeywordOSDatasetRegistry?.save;
  if(typeof save==='function')await save.call(root.KeywordOSDatasetRegistry,{kind:DATASET_KIND,storeId:'store-a',rows,source,validation:{status:'validated',validator:'competitor Ads observation CSV adapter'}});
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(rows));}catch{}
  await root?.KeywordOSUIBridge?.refreshDatasetRegistry?.();
}
function listText(values,limit=5){if(!values.length)return'—';const shown=values.slice(0,limit).join(', ');return values.length>limit?`${shown} +${values.length-limit}`:shown;}
function summaryHtml(summary){
  const asinRows=summary.asins.map(item=>`<tr><td class="left"><b>${escapeHtml(item.asin)}</b></td><td>${escapeHtml(item.date)}</td><td>${item.observationRows}</td><td class="left">${escapeHtml(listText(item.keywords))}</td><td class="left">${escapeHtml(listText(item.placements))}</td><td class="left">${escapeHtml(listText(item.adTypes))}</td><td class="left">${escapeHtml(listText(item.campaignLabels))}</td></tr>`).join('');
  const placementRows=summary.placements.slice(0,30).map(item=>`<tr><td class="left">${escapeHtml(item.placement)}</td><td class="left">${escapeHtml(item.adType)}</td><td>${item.observationRows}</td><td class="left">${escapeHtml(listText(item.asins))}</td></tr>`).join('');
  const overlapRows=summary.keywordOverlap.slice(0,30).map(item=>`<tr><td class="left"><b>${escapeHtml(item.keyword)}</b></td><td>${item.asins.length}</td><td class="left">${escapeHtml(listText(item.asins,8))}</td></tr>`).join('');
  return `<div class="growth-kpis"><div class="kpi"><span>Imported rows</span><b>${summary.importedRows}</b><small>${escapeHtml(summary.coverage.min||'Undated')} → ${escapeHtml(summary.coverage.max||'Undated')}</small></div><div class="kpi"><span>Latest ASIN snapshots</span><b>${summary.uniqueAsins}</b><small>${summary.latestObservationRows} observation rows</small></div><div class="kpi"><span>Observed keywords</span><b>${summary.uniqueKeywords}</b><small>Latest snapshot per ASIN</small></div><div class="kpi"><span>Observed placements</span><b>${summary.uniquePlacements}</b><small>Latest snapshot per ASIN</small></div></div><h3>Latest observed evidence by ASIN</h3>${asinRows?`<div class="table-wrap"><table class="data-table"><thead><tr><th>ASIN</th><th>Latest date</th><th>Rows</th><th>Keywords</th><th>Placements</th><th>Ad types</th><th>Campaign labels</th></tr></thead><tbody>${asinRows}</tbody></table></div>`:'<div class="card-body"><span class="muted">No imported competitor Ads observations yet.</span></div>'}<h3>Placement / ad-type observations</h3>${placementRows?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Placement</th><th>Ad type</th><th>Observed rows</th><th>ASINs</th></tr></thead><tbody>${placementRows}</tbody></table></div>`:'<div class="card-body"><span class="muted">No placement evidence in the imported rows.</span></div>'}<h3>Keywords observed across multiple ASINs</h3>${overlapRows?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Keyword</th><th>ASIN count</th><th>ASINs</th></tr></thead><tbody>${overlapRows}</tbody></table></div>`:'<div class="card-body"><span class="muted">No keyword is present in the latest imported snapshot of 2+ ASINs.</span></div>'}`;
}
function isCompetitorPage(){return root?.location?.hash==='#page=competitor-snapshots'||clean(document.querySelector('#page-title')?.textContent)==='Competitor Snapshots';}
async function importFile(file){
  if(!file)return;
  if(file.size>MAX_IMPORT_BYTES)throw new Error('Import file is too large; maximum size is 16 MiB.');
  const incoming=parseCompetitorAdsCsv(await file.text()),existing=await readRows(),merged=mergeRows(existing,incoming);
  await saveRows(merged,`${file.name} · competitor Ads observation import`);
  document.querySelector('#keywordos-competitor-ads-panel')?.remove();
  await inject();
  root?.KeywordOSUIBridge?.toast?.(`${incoming.length} competitor Ads observation rows imported`,'success');
}
function openImport(){
  let input=document.querySelector('#keywordos-competitor-ads-file');
  if(!input){
    input=document.createElement('input');input.type='file';input.accept='.csv,text/csv';input.hidden=true;input.id='keywordos-competitor-ads-file';document.body.appendChild(input);
    input.addEventListener('change',async()=>{const file=input.files?.[0];try{await importFile(file);}catch(error){root?.KeywordOSUIBridge?.toast?.(error.message||'Competitor Ads import failed','error');}input.value='';});
  }
  input.click();
}
async function inject(){
  if(!isCompetitorPage())return;
  const content=document.querySelector('#content');
  if(!content||document.querySelector('#keywordos-competitor-ads-panel'))return;
  const rows=await readRows();
  if(!isCompetitorPage()||document.querySelector('#keywordos-competitor-ads-panel'))return;
  const summary=summarizeCompetitorAds(rows),panel=document.createElement('div');
  panel.className='card top-gap';panel.id='keywordos-competitor-ads-panel';
  panel.innerHTML=`<div class="card-head"><div class="card-title"><h3>Imported competitor Ads Insights</h3><small>Observed CSV evidence only; no campaign-structure inference.</small></div><div><button class="btn primary" id="keywordos-competitor-ads-import">Import Ads Insights CSV</button> <button class="btn" id="keywordos-competitor-ads-template">Download Ads Insights Template</button></div></div><div class="card-body"><div class="notice-banner"><b>Evidence boundary.</b> KeywordOS counts imported observation rows and unique supplied labels only. Observation-row counts are not impression share, traffic share or spend. Campaign labels are shown verbatim and are never used to infer campaign, ad-group or targeting structure.</div></div>${summaryHtml(summary)}`;
  content.appendChild(panel);
  panel.querySelector('#keywordos-competitor-ads-import')?.addEventListener('click',openImport);
  panel.querySelector('#keywordos-competitor-ads-template')?.addEventListener('click',()=>csvDownload('KeywordOS_competitor_ads_insights_template.csv',TEMPLATE));
}
function start(){
  if(!root?.document)return;
  const run=()=>{inject().catch(error=>console.warn('KeywordOS competitor Ads Insights panel skipped',error));};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',run,{once:true}):run();
  root.addEventListener?.('hashchange',run);
  const content=document.querySelector('#content');if(content)new MutationObserver(run).observe(content,{childList:true});
}

return{DATASET_KIND,STORAGE_KEY,MAX_IMPORT_BYTES,TEMPLATE,parseCompetitorAdsCsv,mergeRows,latestRowsByAsin,summarizeCompetitorAds,start};
});
