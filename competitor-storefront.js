(function(root,factory){
  const api=factory(root);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSCompetitorStorefrontTest=api;
  if(root){root.KeywordOSCompetitorStorefront=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const STORAGE_KEY='keywordos_growth_competitor_v1';
const MAX_IMPORT_BYTES=16*1024*1024;
const TEMPLATE='Snapshot Date,Storefront,ASIN,Title,First Seen Date,Price,BSR,Rating,Review Count,Estimated Sales,Variants,Availability\n2026-09-01,Example Storefront,B000000000,Example competitor,2026-08-20,29.99,1250,4.4,320,500,3,In stock';
const PERIODS=Object.freeze([7,15,30,60]);

function clean(value){return String(value??'').trim();}
function norm(value){return clean(value).toLowerCase().replace(/[^a-z0-9]+/g,' ');}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function parseDate(value){
  const raw=clean(value);
  const match=raw.match(/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)$/);
  if(!match)return'';
  const date=`${match[1]}-${String(match[2]).padStart(2,'0')}-${String(match[3]).padStart(2,'0')}`;
  const parsed=new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf())||parsed.toISOString().slice(0,10)!==date?'':date;
}
function numberOrNull(value){
  const raw=clean(value);
  if(!raw)return null;
  const parsed=Number(raw.replace(/[$,%\s,]/g,''));
  return Number.isFinite(parsed)?parsed:null;
}
function parseCsv(text){
  const source=String(text||'').replace(/^\uFEFF/,'');
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<source.length;i+=1){
    const char=source[i],next=source[i+1];
    if(char==='"'&&quoted&&next==='"'){field+='"';i+=1;continue;}
    if(char==='"'){quoted=!quoted;continue;}
    if(char===','&&!quoted){row.push(field);field='';continue;}
    if((char==='\n'||char==='\r')&&!quoted){
      if(char==='\r'&&next==='\n')i+=1;
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

function parseStorefrontCsv(text){
  const parsed=parseCsv(text),map=headerMap(parsed[0]),out=[];
  for(let index=1;index<parsed.length;index+=1){
    const row=parsed[index];
    if(!row.some(value=>clean(value)))continue;
    const snapshotRaw=pick(row,map,['Snapshot Date','Date','Observed Date']);
    const storefront=clean(pick(row,map,['Storefront','Storefront Name','Seller','Seller Name']));
    const asin=clean(pick(row,map,['ASIN','Child ASIN'])).toUpperCase();
    const snapshotDate=parseDate(snapshotRaw);
    if(!snapshotDate||!storefront||!asin)continue;
    const firstSeenRaw=clean(pick(row,map,['First Seen Date','First Seen','Listing First Seen','Listing Date']));
    const firstSeenDate=firstSeenRaw?parseDate(firstSeenRaw):'';
    if(firstSeenRaw&&!firstSeenDate)throw new Error(`Row ${index+1} has an invalid First Seen Date.`);
    if(firstSeenDate&&firstSeenDate>snapshotDate)throw new Error(`Row ${index+1} has First Seen Date after Snapshot Date.`);
    out.push({
      date:snapshotDate,
      storefront,
      asin,
      title:clean(pick(row,map,['Title','Product Title'])),
      firstSeenDate,
      price:numberOrNull(pick(row,map,['Price','Current Price'])),
      bsr:numberOrNull(pick(row,map,['BSR','Best Sellers Rank'])),
      rating:numberOrNull(pick(row,map,['Rating','Star Rating'])),
      reviewCount:numberOrNull(pick(row,map,['Review Count','Reviews'])),
      estimatedSales:numberOrNull(pick(row,map,['Estimated Sales','Sales Estimate'])),
      variants:numberOrNull(pick(row,map,['Variants','Variant Count'])),
      availability:clean(pick(row,map,['Availability','Stock Status']))
    });
  }
  if(!out.length)throw new Error('No valid storefront snapshot rows found. Required: Snapshot Date, Storefront and ASIN.');
  return out;
}

function mergeRows(existing=[],incoming=[]){
  const out=[],positions=new Map();
  const add=(row,prefer)=>{
    const storefront=clean(row?.storefront);
    const asin=clean(row?.asin).toUpperCase();
    const date=clean(row?.date);
    if(!storefront||!asin||!date){out.push(row);return;}
    const key=`${storefront.toLowerCase()}|${asin}|${date}`;
    if(!positions.has(key)){positions.set(key,out.length);out.push(row);return;}
    if(prefer)out[positions.get(key)]=row;
  };
  for(const row of Array.isArray(existing)?existing:[])add(row,false);
  for(const row of Array.isArray(incoming)?incoming:[])add(row,true);
  return out;
}

function shiftDate(dateValue,days){
  const date=new Date(`${dateValue}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate()-days);
  return date.toISOString().slice(0,10);
}
function storefrontChangeSummaries(rows,periods=PERIODS){
  const groups=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const storefront=clean(row?.storefront),asin=clean(row?.asin).toUpperCase(),date=parseDate(row?.date);
    if(!storefront||!asin||!date)continue;
    const key=storefront.toLowerCase();
    if(!groups.has(key))groups.set(key,{storefront,rows:[]});
    groups.get(key).rows.push({...row,storefront,asin,date,firstSeenDate:parseDate(row?.firstSeenDate)});
  }
  const out=[];
  for(const group of groups.values()){
    const dates=[...new Set(group.rows.map(row=>row.date))].sort();
    const latestDate=dates.at(-1);
    if(!latestDate)continue;
    const latestRows=group.rows.filter(row=>row.date===latestDate);
    const latestSet=new Set(latestRows.map(row=>row.asin));
    const firstSeenByAsin=new Map();
    for(const row of group.rows){
      if(!row.firstSeenDate)continue;
      if(!firstSeenByAsin.has(row.asin))firstSeenByAsin.set(row.asin,new Set());
      firstSeenByAsin.get(row.asin).add(row.firstSeenDate);
    }
    for(const rawDays of periods){
      const days=Number(rawDays);
      if(!Number.isInteger(days)||days<=0)continue;
      const cutoff=shiftDate(latestDate,days);
      const baselineDate=[...dates].reverse().find(date=>date<=cutoff);
      if(!baselineDate)continue;
      const baselineSet=new Set(group.rows.filter(row=>row.date===baselineDate).map(row=>row.asin));
      const addedAsins=[...latestSet].filter(asin=>!baselineSet.has(asin)).sort();
      const removedAsins=[...baselineSet].filter(asin=>!latestSet.has(asin)).sort();
      const newListingAsins=[...latestSet].filter(asin=>{
        const evidence=firstSeenByAsin.get(asin);
        if(!evidence||evidence.size!==1)return false;
        const firstSeen=[...evidence][0];
        return firstSeen>baselineDate&&firstSeen<=latestDate;
      }).sort();
      out.push({
        storefront:group.storefront,
        days,
        baselineDate,
        latestDate,
        baselineListings:baselineSet.size,
        latestListings:latestSet.size,
        netChange:latestSet.size-baselineSet.size,
        addedAsins,
        removedAsins,
        newListingAsins
      });
    }
  }
  return out.sort((a,b)=>a.storefront.localeCompare(b.storefront)||a.days-b.days);
}

function csvDownload(name,content){
  const url=URL.createObjectURL(new Blob(['\uFEFF',content],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),0);
}
function readLocalRows(){
  try{const rows=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(rows)?rows:[];}catch{return[];}
}
async function readRows(){
  try{
    const record=await root?.KeywordOSDatasetRegistry?.get?.('competitor','store-a');
    if(Array.isArray(record?.rows)&&record.rows.length)return record.rows;
  }catch(error){console.warn('KeywordOS storefront snapshot registry read skipped',error);}
  return readLocalRows();
}
async function saveRows(rows,source){
  const registrySave=root?.KeywordOSDatasetRegistry?.save;
  if(typeof registrySave==='function'){
    await registrySave.call(root.KeywordOSDatasetRegistry,{
      kind:'competitor',
      storeId:'store-a',
      rows,
      source,
      validation:{status:'validated',validator:'storefront snapshot CSV adapter'}
    });
  }
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(rows));}catch{}
  await root?.KeywordOSUIBridge?.refreshDatasetRegistry?.();
}
function asinsText(values){
  if(!values.length)return'—';
  const shown=values.slice(0,5).join(', ');
  return values.length>5?`${shown} +${values.length-5}`:shown;
}
function summaryTable(rows){
  if(!rows.length)return '<div class="card-body"><span class="muted">No 7/15/30/60-day storefront baseline is available yet. Import at least two dated snapshots far enough apart.</span></div>';
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Storefront</th><th>Window</th><th>Baseline → latest</th><th>Listings</th><th>Net</th><th>Added to snapshot</th><th>Removed from snapshot</th><th>Explicit new listings</th></tr></thead><tbody>${rows.map(row=>`<tr><td class="left"><b>${escapeHtml(row.storefront)}</b></td><td>${row.days} days</td><td>${escapeHtml(row.baselineDate)} → ${escapeHtml(row.latestDate)}</td><td>${row.baselineListings} → ${row.latestListings}</td><td>${row.netChange>0?'+':''}${row.netChange}</td><td class="left">${escapeHtml(asinsText(row.addedAsins))}</td><td class="left">${escapeHtml(asinsText(row.removedAsins))}</td><td class="left">${escapeHtml(asinsText(row.newListingAsins))}<small>${row.newListingAsins.length} with one unambiguous imported First Seen Date inside the window</small></td></tr>`).join('')}</tbody></table></div>`;
}
function isCompetitorPage(){
  return root?.location?.hash==='#page=competitor-snapshots'||clean(document.querySelector('#page-title')?.textContent)==='Competitor Snapshots';
}
async function importFile(file){
  if(!file)return;
  if(file.size>MAX_IMPORT_BYTES)throw new Error('Import file is too large; maximum size is 16 MiB.');
  const incoming=parseStorefrontCsv(await file.text());
  const existing=await readRows();
  const merged=mergeRows(existing,incoming);
  await saveRows(merged,`${file.name} · storefront snapshot import`);
  root?.KeywordOSGrowth?.render?.('competitor-snapshots');
  root?.KeywordOSUIBridge?.toast?.(`${incoming.length} storefront snapshot rows imported`,'success');
}
function openImport(){
  let input=document.querySelector('#keywordos-storefront-snapshot-file');
  if(!input){
    input=document.createElement('input');input.type='file';input.accept='.csv,text/csv';input.hidden=true;input.id='keywordos-storefront-snapshot-file';document.body.appendChild(input);
    input.addEventListener('change',async()=>{
      const file=input.files?.[0];
      try{await importFile(file);}catch(error){root?.KeywordOSUIBridge?.toast?.(error.message||'Storefront import failed','error');}
      input.value='';
    });
  }
  input.click();
}
async function inject(){
  if(!isCompetitorPage())return;
  const content=document.querySelector('#content');
  if(!content||document.querySelector('#keywordos-storefront-snapshot-panel'))return;
  const rows=await readRows();
  if(!isCompetitorPage()||document.querySelector('#keywordos-storefront-snapshot-panel'))return;
  const summaries=storefrontChangeSummaries(rows);
  const panel=document.createElement('div');
  panel.className='card top-gap';
  panel.id='keywordos-storefront-snapshot-panel';
  panel.innerHTML=`<div class="card-head"><div class="card-title"><h3>Storefront & new-listing snapshots</h3><small>CSV-first imported evidence; no scraping or live storefront monitoring.</small></div><div><button class="btn primary" id="keywordos-storefront-import">Import Storefront Snapshot CSV</button> <button class="btn" id="keywordos-storefront-template">Download Storefront Template</button></div></div><div class="card-body"><div class="notice-banner"><b>Evidence boundary.</b> Snapshot additions/removals compare only ASINs present in each imported storefront snapshot. “Explicit new listings” requires one unambiguous imported First Seen Date; KeywordOS never treats first observation as launch date. Partial exports produce partial snapshot counts.</div></div>${summaryTable(summaries)}`;
  content.appendChild(panel);
  panel.querySelector('#keywordos-storefront-import')?.addEventListener('click',openImport);
  panel.querySelector('#keywordos-storefront-template')?.addEventListener('click',()=>csvDownload('KeywordOS_competitor_storefront_snapshot_template.csv',TEMPLATE));
}
function start(){
  if(!root?.document)return;
  const run=()=>{inject().catch(error=>console.warn('KeywordOS storefront snapshot panel skipped',error));};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',run,{once:true}):run();
  root.addEventListener?.('hashchange',run);
  const content=document.querySelector('#content');
  if(content)new MutationObserver(run).observe(content,{childList:true});
}

return{TEMPLATE,MAX_IMPORT_BYTES,parseStorefrontCsv,mergeRows,storefrontChangeSummaries,start};
});
