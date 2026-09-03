(function(root,factory){
  const api=factory(root);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSEvidenceTrendsTest=api;
  if(root){root.KeywordOSEvidenceTrends=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const PAGE_CONFIG=Object.freeze({
  'search-funnel':Object.freeze({title:'Search Funnel evidence trend',kinds:['sqp'],scopeField:'asin',series:[['volume','Query demand','sum'],['purchases','Purchases','sum']],fields:['date','query','asin','volume','impressions','clicks','cartAdds','purchases','brandPurchaseShare']}),
  'rank-intelligence':Object.freeze({title:'Rank evidence trend',kinds:['ranks'],scopeField:'asin',series:[['organicRank','Median organic rank','medianPositive'],['sponsoredRank','Median sponsored rank','medianPositive']],fields:['date','keyword','asin','organicRank','sponsoredRank','indexed'],lowerIsBetter:true}),
  'inventory-risk':Object.freeze({title:'Inventory evidence trend',kinds:['inventory'],scopeField:'sku',series:[['available','Available units','sum'],['inbound','Inbound units','sum']],fields:['date','sku','asin','product','available','inbound','reserved','unfulfillable']}),
  'action-outcomes':Object.freeze({title:'Outcome context trend',kinds:['ads','action-outcomes'],trendKinds:['ads'],series:[['spend','Imported Ads spend','sum'],['sales','Imported Ads sales','sum']],fields:['date','campaign','adGroup','target','searchTerm','spend','sales','orders','clicks','impressions'],note:'Imported Ads context only; the chart does not attribute changes to local actions.'}),
  'anomaly-center':Object.freeze({title:'Anomaly evidence coverage trend',kinds:['ads','finance','inventory'],mode:'coverage',series:[['rowCount','Dated evidence rows','sum'],['sourceCount','Distinct sources','max']],fields:['date','sourceKind','product','sku','asin','spend','sales','orders','total','available'],note:'Coverage counts imported dated evidence rows; they are not anomaly counts or severity scores.'})
});
const STORE_ID='store-a';
let observer=null,scheduled=false;

const clean=v=>String(v??'').trim();
function validDate(v){const s=clean(v).slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:'';}
function median(values){const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!sorted.length)return null;const m=Math.floor(sorted.length/2);return sorted.length%2?sorted[m]:(sorted[m-1]+sorted[m])/2;}
function recordFor(records=[],kind){return(Array.isArray(records)?records:[]).find(r=>r?.storeId===STORE_ID&&r?.kind===kind)||null;}
function rowsFor(records=[],kind){const record=recordFor(records,kind);return Array.isArray(record?.rows)?record.rows:[];}
function scopeRows(rows,field,selection){if(!field||!selection)return rows;return rows.filter(row=>clean(row?.[field])===clean(selection));}
function aggregate(values,mode){
  const nums=values.map(Number).filter(Number.isFinite);
  if(mode==='medianPositive')return median(nums.filter(v=>v>0));
  if(mode==='max')return nums.length?Math.max(...nums):null;
  return nums.reduce((sum,v)=>sum+v,0);
}
function coverageRows(records,kinds){
  const byDate=new Map();
  for(const kind of kinds){
    for(const row of rowsFor(records,kind)){
      const date=validDate(row?.date);if(!date)continue;
      const item=byDate.get(date)||{date,rowCount:0,sources:new Set()};
      item.rowCount+=1;item.sources.add(kind);byDate.set(date,item);
    }
  }
  return[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(item=>({date:item.date,rowCount:item.rowCount,sourceCount:item.sources.size}));
}
function trendModel(page,records=[],selection=''){
  const cfg=PAGE_CONFIG[page];if(!cfg)return{available:false,page,points:[],reason:'Unsupported page'};
  let source=[];
  if(cfg.mode==='coverage')source=coverageRows(records,cfg.kinds);
  else{
    const kind=(cfg.trendKinds||cfg.kinds)[0];
    source=scopeRows(rowsFor(records,kind),cfg.scopeField,selection).filter(row=>validDate(row?.date));
  }
  if(!source.length)return{available:false,page,points:[],reason:'No dated imported evidence',selection};
  const byDate=new Map();
  for(const row of source){const date=validDate(row.date);if(!date)continue;const bucket=byDate.get(date)||[];bucket.push(row);byDate.set(date,bucket);}
  const points=[...byDate].sort(([a],[b])=>a.localeCompare(b)).map(([date,rows])=>{
    const point={date};
    for(const [field,,mode] of cfg.series)point[field]=aggregate(rows.map(row=>row[field]),mode);
    return point;
  });
  const hasValue=points.some(point=>cfg.series.some(([field])=>Number.isFinite(point[field])));
  return{available:hasValue,page,points,selection,reason:hasValue?'':'No numeric trend evidence',series:cfg.series,lowerIsBetter:Boolean(cfg.lowerIsBetter),note:cfg.note||''};
}
function provenance(records=[],page){
  const cfg=PAGE_CONFIG[page];if(!cfg)return[];
  return cfg.kinds.map(kind=>recordFor(records,kind)).filter(Boolean).map(record=>({kind:record.kind,source:clean(record.source)||'Unknown source',rows:Array.isArray(record.rows)?record.rows.length:Number(record.rowCount)||0,coverage:record.coverage?.min?`${record.coverage.min} → ${record.coverage.max||record.coverage.min}`:'No dated coverage',importedAt:clean(record.importedAt)||'Import time unavailable',validation:clean(record.validation?.status)||'unknown',checksum:clean(record.checksum)}));
}
function evidenceRows(page,records=[],selection='',limit=100){
  const cfg=PAGE_CONFIG[page];if(!cfg)return[];const rows=[];
  for(const kind of cfg.kinds){for(const row of scopeRows(rowsFor(records,kind),cfg.scopeField,selection))rows.push({...row,sourceKind:kind});}
  return rows.sort((a,b)=>validDate(b.date).localeCompare(validDate(a.date))).slice(0,limit);
}
function chartGeometry(points,field,width=640,height=180){
  const values=points.map(p=>p[field]).filter(Number.isFinite);if(!values.length)return{path:'',min:null,max:null};
  let min=Math.min(...values),max=Math.max(...values);if(min===max){min-=1;max+=1;}
  const x=i=>points.length===1?width/2:(i/(points.length-1))*width;
  const y=v=>height-((v-min)/(max-min))*height;
  const path=points.map((p,i)=>Number.isFinite(p[field])?`${i?'L':'M'} ${x(i).toFixed(1)} ${y(p[field]).toFixed(1)}`:'').filter(Boolean).join(' ');
  return{path,min,max};
}
function formatValue(value){if(!Number.isFinite(value))return'—';return Math.abs(value)>=1000?value.toLocaleString('en-US',{maximumFractionDigits:1}):Number(value.toFixed(2)).toLocaleString('en-US');}
function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function seriesSvg(model){
  if(!model.available)return`<div class="keywordos-evidence-empty">${esc(model.reason)}</div>`;
  const width=640,height=180,paths=model.series.map(([field,label],index)=>{const g=chartGeometry(model.points,field,width,height);return`<path class="keywordos-evidence-line line-${index+1}" d="${g.path}" vector-effect="non-scaling-stroke"><title>${esc(label)}</title></path>`;}).join('');
  const first=model.points[0],last=model.points.at(-1);
  return`<svg class="keywordos-evidence-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(PAGE_CONFIG[model.page].title)}">${paths}</svg><div class="keywordos-evidence-axis"><span>${esc(first.date)}</span><span>${esc(last.date)}</span></div>`;
}
function panelHtml(page,model,prov=[]){
  const cfg=PAGE_CONFIG[page],latest=model.available?model.points.at(-1):null;
  const legend=(model.series||cfg.series).map(([field,label],index)=>`<span><i class="line-${index+1}"></i>${esc(label)}${latest?` · ${esc(formatValue(latest[field]))}`:''}</span>`).join('');
  const scope=model.selection?` · exact scope ${esc(model.selection)}`:'';
  return`<section class="card keywordos-evidence-trends" data-page="${esc(page)}"><div class="card-head"><div class="card-title"><h3>${esc(cfg.title)}</h3><small>${model.points.length||0} dated points${scope}</small></div><button class="btn sm" type="button" data-keywordos-evidence-open="${esc(page)}">Evidence details · 证据详情</button></div><div class="card-body"><div class="keywordos-evidence-legend">${legend}</div>${seriesSvg(model)}<p class="keywordos-evidence-note">${esc(model.note||'Derived only from explicit imported rows; missing dates or metrics are not estimated.')} ${prov.length?`${prov.length} persisted source dataset(s).`:''}</p></div></section>`;
}
function rowTable(page,rows){const cfg=PAGE_CONFIG[page];if(!rows.length)return'<div class="keywordos-evidence-empty">No matching evidence rows.</div>';const fields=[...new Set(['sourceKind',...cfg.fields])].filter(field=>rows.some(row=>row[field]!==undefined&&row[field]!==''));return`<div class="table-scroll"><table class="data-table"><thead><tr>${fields.map(f=>`<th class="left">${esc(f)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${fields.map(f=>`<td class="left">${esc(typeof row[f]==='boolean'?(row[f]?'Yes':'No'):row[f]??'—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function drawerHtml(page,records,selection=''){
  const cfg=PAGE_CONFIG[page],prov=provenance(records,page),rows=evidenceRows(page,records,selection,100);
  return`<div class="keywordos-evidence-drawer-backdrop" data-keywordos-evidence-close></div><aside class="keywordos-evidence-drawer" role="dialog" aria-modal="true" aria-labelledby="keywordos-evidence-title"><div class="keywordos-evidence-drawer-head"><div><h2 id="keywordos-evidence-title">${esc(cfg.title)} · Evidence</h2><small>${selection?`Exact scope: ${esc(selection)} · `:''}Raw imported/local evidence, newest dated rows first</small></div><button class="drawer-close" type="button" data-keywordos-evidence-close aria-label="Close evidence details">×</button></div><div class="keywordos-evidence-drawer-body"><div class="keywordos-evidence-provenance">${prov.map(p=>`<div><b>${esc(p.kind)}</b><span>${esc(p.source)}</span><small>${esc(p.rows)} rows · ${esc(p.coverage)} · ${esc(p.validation)} · ${esc(p.importedAt)}${p.checksum?` · checksum ${esc(p.checksum.slice(0,12))}…`:''}</small></div>`).join('')||'<div>No persisted provenance record.</div>'}</div>${rowTable(page,rows)}<p class="keywordos-evidence-note">No missing value is estimated. Outcome context does not establish causality, and anomaly coverage rows are not anomaly counts.</p></div></aside>`;
}
function currentPage(locationLike=root?.location){const m=String(locationLike?.hash||'').match(/^#page=(.+)$/);return m?decodeURIComponent(m[1]):'';}
function currentSelection(page){const cfg=PAGE_CONFIG[page];if(!cfg?.scopeField)return'';return clean(root?.document?.querySelector?.('#keywordos-csv-context-control select')?.value);}
function registry(){return root?.KeywordOSUIBridge?.datasetRegistry||[];}
function insertionPoint(content){return content.querySelector('.source-chip-row')||content.querySelector('.growth-actions')||content.firstElementChild;}
function render(){
  scheduled=false;const page=currentPage(),cfg=PAGE_CONFIG[page],content=root?.document?.querySelector?.('#content');if(page==='search-funnel'||page==='rank-intelligence')return;
  root?.document?.querySelector?.('.keywordos-evidence-trends')?.remove();if(!cfg||!content)return;
  const selection=currentSelection(page),records=registry(),model=trendModel(page,records,selection),html=panelHtml(page,model,provenance(records,page));
  const holder=document.createElement('div');holder.innerHTML=html;const panel=holder.firstElementChild,point=insertionPoint(content);point?point.insertAdjacentElement('afterend',panel):content.prepend(panel);
}
function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(render);}
function ownMutationNode(node){return node?.nodeType===1&&(node.matches?.('.keywordos-evidence-trends')||node.closest?.('.keywordos-evidence-trends'));}
function handleClick(event){const open=event.target.closest?.('[data-keywordos-evidence-open]');if(open){const page=open.getAttribute('data-keywordos-evidence-open'),drawer=document.querySelector('#drawer-root');if(drawer)drawer.innerHTML=drawerHtml(page,registry(),currentSelection(page));return;}if(event.target.closest?.('[data-keywordos-evidence-close]')){const drawer=document.querySelector('#drawer-root');if(drawer)drawer.innerHTML='';}}
function start(){
  if(!root?.document)return;const boot=()=>{document.addEventListener('click',handleClick);document.addEventListener('change',e=>{if(e.target.closest?.('#keywordos-csv-context-control'))schedule();});root.addEventListener?.('hashchange',schedule);const content=document.querySelector('#content');if(content){observer=new MutationObserver(records=>{const relevant=records.some(record=>[...record.addedNodes,...record.removedNodes].some(node=>!ownMutationNode(node)));if(relevant)schedule();});observer.observe(content,{childList:true,subtree:true});}schedule();};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
}
return{PAGE_CONFIG,validDate,median,recordFor,rowsFor,scopeRows,aggregate,coverageRows,trendModel,provenance,evidenceRows,chartGeometry,currentPage,panelHtml,drawerHtml,start};
});
