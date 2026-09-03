(function(root,factory){
  const api=factory(root);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSKeywordLabTest=api;
  if(root){root.KeywordOSKeywordLab=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const MODE_CATALOG=Object.freeze({
  discovery:Object.freeze({id:'discovery',label:'Keyword Discovery',route:'cerebro',legacyResearchMode:'suggest',capability:'ready'}),
  batch:Object.freeze({id:'batch',label:'Batch Analysis',route:'cerebro',legacyResearchMode:'analyze',capability:'single-phrase',inputLimit:1}),
  asin:Object.freeze({id:'asin',label:'ASIN Import & Compare',route:'asin-comparison',legacyResearchMode:'',capability:'ready'})
});
const RESULT_FIELDS=Object.freeze(['id','keyword','mode','sources','metrics','asins','segment','provenance']);
const LABELS=Object.freeze({
  en:Object.freeze({title:'Keyword Lab',subtitle:'One keyword evidence contract across discovery, batch analysis and ASIN comparison.',discovery:'Keyword Discovery',batch:'Batch Analysis',asin:'ASIN Import & Compare',contract:'Shared result contract: keyword · source · metrics · ASINs · segment · provenance',batchLimit:'Current batch boundary: one phrase. The ≤200-keyword input workflow is the next P1 item.',ads:'Loaded Amazon Ads search-term evidence',reverse:'Imported reverse-ASIN evidence'}),
  zh:Object.freeze({title:'关键词实验室',subtitle:'关键词发现、批量分析与 ASIN 对比共用一套关键词证据结果契约。',discovery:'关键词发现',batch:'批量分析',asin:'ASIN 导入与对比',contract:'统一结果契约：关键词 · 来源 · 指标 · ASIN · 分组 · 证据来源',batchLimit:'当前批量输入边界仍为 1 个短语；≤200 词输入工作流是下一条 P1。',ads:'已加载 Amazon Ads 搜索词证据',reverse:'已导入 reverse-ASIN 证据'}),
  bi:Object.freeze({title:'关键词实验室 / Keyword Lab',subtitle:'关键词发现、批量分析与 ASIN 对比共用一套结果契约 / One result contract across keyword modes.',discovery:'关键词发现 / Keyword Discovery',batch:'批量分析 / Batch Analysis',asin:'ASIN 导入与对比 / ASIN Import & Compare',contract:'统一结果契约 / Shared result contract: keyword · source · metrics · ASINs · segment · provenance',batchLimit:'当前仅支持 1 个短语 / Current batch boundary: one phrase; ≤200 input is the next P1 item.',ads:'Amazon Ads 搜索词证据 / Loaded Ads search-term evidence',reverse:'reverse-ASIN 导入证据 / Imported reverse-ASIN evidence'})
});

function clean(value){return String(value??'').replace(/\s+/g,' ').trim();}
function normalizedKeyword(value){return clean(value).toLowerCase();}
function languageMode(value){return ['en','zh','bi'].includes(value)?value:'en';}
function labels(mode='en'){return LABELS[languageMode(mode)];}
function metric(value,source,{available=true,quality='imported'}={}){
  return Object.freeze({value:available?value:null,source:clean(source),quality:available?quality:'missing',available:Boolean(available)});
}
function resultRow({keyword,mode,sources=[],metrics={},asins=[],segment='',provenance=[]}={}){
  const normalized=normalizedKeyword(keyword);
  if(!normalized)return null;
  const modeId=MODE_CATALOG[mode]?mode:'discovery';
  const sourceList=[...new Set(sources.map(clean).filter(Boolean))];
  const asinList=[...new Set(asins.map(value=>clean(value).toUpperCase()).filter(Boolean))];
  return Object.freeze({
    id:`${modeId}:${normalized}`,
    keyword:clean(keyword),
    mode:modeId,
    sources:Object.freeze(sourceList),
    metrics:Object.freeze({...metrics}),
    asins:Object.freeze(asinList),
    segment:clean(segment),
    provenance:Object.freeze(provenance.map(item=>Object.freeze({...item})))
  });
}
function adsResultRows(items=[],mode='discovery'){
  const modeId=mode==='batch'?'batch':'discovery';
  return (Array.isArray(items)?items:[]).map(item=>resultRow({
    keyword:item?.name,
    mode:modeId,
    sources:['ads'],
    metrics:{
      adImpressions:metric(Number(item?.impressions)||0,'ads'),
      clicks:metric(Number(item?.clicks)||0,'ads'),
      orders:metric(Number(item?.orders)||0,'ads'),
      spend:metric(Number(item?.spend)||0,'ads'),
      sales:metric(Number(item?.sales)||0,'ads'),
      cvr:metric(Number(item?.cvr)||0,'ads'),
      acos:metric(item?.acos==null?null:Number(item.acos),'ads',{available:item?.acos!=null}),
      roas:metric(Number(item?.roas)||0,'ads'),
      products:metric(Number(item?.products)||0,'ads')
    },
    provenance:[{kind:'ads',label:'Amazon Ads Search Term',quality:'imported'}]
  })).filter(Boolean);
}
function asinResultRows(comparison=[]){
  return (Array.isArray(comparison)?comparison:[]).map(item=>resultRow({
    keyword:item?.keyword,
    mode:'asin',
    sources:['reverse-asin'],
    asins:item?.asins||[],
    segment:item?.segment||'',
    metrics:{
      searchVolume:metric(Number(item?.volume)||0,'reverse-asin',{available:Number(item?.volume)>0}),
      organicRank:metric(item?.organicGap||null,'reverse-asin',{available:Boolean(item?.organicGap)}),
      sponsoredRank:metric(item?.sponsoredGap||null,'reverse-asin',{available:Boolean(item?.sponsoredGap)}),
      trafficShare:metric(item?.trafficGap||null,'reverse-asin',{available:Boolean(item?.trafficGap)}),
      conversionRate:metric(item?.conversionGap||null,'reverse-asin',{available:Boolean(item?.conversionGap)})
    },
    provenance:[{kind:'reverse-asin',label:'Imported reverse-ASIN keyword evidence',quality:'imported'}]
  })).filter(Boolean);
}
function filterAdsByQuery(items=[],query='',mode='discovery'){
  const q=normalizedKeyword(query);
  if(!q)return [...items];
  if(mode==='batch')return items.filter(item=>normalizedKeyword(item?.name).includes(q));
  const tokens=q.split(/\s+/).filter(Boolean);
  return items.filter(item=>tokens.some(token=>normalizedKeyword(item?.name).includes(token)));
}
function modelSummary(rows=[]){
  const sourceSet=new Set(),metricSet=new Set();
  for(const row of rows||[]){for(const source of row?.sources||[])sourceSet.add(source);for(const [key,evidence] of Object.entries(row?.metrics||{}))if(evidence?.available)metricSet.add(key);}
  return Object.freeze({rows:(rows||[]).length,sources:Object.freeze([...sourceSet]),metrics:Object.freeze([...metricSet])});
}
function sameResultShape(rows=[]){return (rows||[]).every(row=>RESULT_FIELDS.every(field=>Object.hasOwn(row||{},field)));}

if(!root?.document)return{MODE_CATALOG,RESULT_FIELDS,LABELS,clean,normalizedKeyword,languageMode,labels,metric,resultRow,adsResultRows,asinResultRows,filterAdsByQuery,modelSummary,sameResultShape};

const doc=root.document;
const $=(selector,scope=doc)=>scope.querySelector(selector);
let observer=null;
let auditTimer=0;
function currentPage(){return root.KeywordOSPageRegistry?.pageFromHash?.(root.location?.hash||'')||root.KeywordOSUIBridge?.page||'';}
function uiMode(){
  if(currentPage()==='asin-comparison')return'asin';
  if(currentPage()!=='cerebro')return'';
  return $('[data-research-mode="analyze"]')?.classList.contains('active')?'batch':'discovery';
}
function currentRows(mode=uiMode()){
  const bridge=root.KeywordOSUIBridge,growth=root.KeywordOSGrowth;
  if(mode==='asin'){
    const records=bridge?.datasetRegistry||[],reverse=records.find(record=>record.kind==='reverse-asin')?.rows||[],master=records.find(record=>record.kind==='product-master')?.rows||[],comparison=growth?.asinKeywordComparison?.(reverse,master.map(row=>row.asin))||[];
    return asinResultRows(comparison);
  }
  const aggregates=bridge?.aggregateLevel?.(bridge?.getRangeRows?.()||bridge?.adsRows||[],'searchterm')||[];
  const query=$('#research-query')?.value||'';
  return adsResultRows(filterAdsByQuery(aggregates,query,mode),mode);
}
function modeStatus(mode,summary,text){
  if(mode==='batch')return text.batchLimit;
  const source=mode==='asin'?text.reverse:text.ads;
  const metrics=summary.metrics.length?summary.metrics.join(', '):'no available metrics';
  return `${source} · ${summary.rows} keyword rows · ${metrics}`;
}
function shellHtml(active,summary,text){
  const button=(mode,label)=>`<button type="button" class="mode-tab ${active===mode?'active':''}" data-keyword-lab-mode="${mode}" aria-pressed="${active===mode?'true':'false'}">${label}</button>`;
  return `<div class="card" data-keyword-lab-shell><div class="card-head"><div class="card-title"><h3 data-no-i18n>${text.title}</h3><small data-no-i18n>${text.subtitle}</small></div></div><div class="card-body"><div class="mode-tabs" role="tablist" aria-label="Keyword Lab modes">${button('discovery',text.discovery)}${button('batch',text.batch)}${button('asin',text.asin)}</div><div class="small muted" data-keyword-lab-status data-no-i18n>${modeStatus(active,summary,text)}</div><div class="small muted" data-no-i18n>${text.contract}</div></div></div>`;
}
function openCoreMode(mode){
  const run=()=>{
    const target=mode==='batch'?'analyze':'suggest',tab=$(`[data-research-mode="${target}"]`);
    if(tab){tab.click();root.setTimeout(enhance,0);return true;}
    return false;
  };
  if(currentPage()==='cerebro'&&run())return;
  const nav=$('#sidebar-nav [data-page="cerebro"]');
  if(nav){nav.click();root.setTimeout(()=>{run();enhance();},30);return;}
  root.location.hash='#page=cerebro';
}
function activate(mode){
  if(mode==='asin'){
    root.KeywordOSGrowth?.render?.('asin-comparison');
    root.setTimeout(enhance,0);
    return;
  }
  openCoreMode(mode);
}
function bindShell(shell){
  shell.querySelectorAll('[data-keyword-lab-mode]').forEach(button=>{
    if(button.dataset.keywordLabBound==='1')return;
    button.dataset.keywordLabBound='1';
    button.addEventListener('click',()=>activate(button.dataset.keywordLabMode));
  });
}
function applyShell(){
  const page=currentPage();
  if(page!=='cerebro'&&page!=='asin-comparison')return false;
  const content=$('#content');if(!content)return false;
  const active=uiMode();if(!active)return false;
  if(page==='cerebro'){
    const legacyModes=$('.cerebro-search-card > .mode-tabs');
    if(legacyModes){legacyModes.hidden=true;legacyModes.setAttribute('aria-hidden','true');}
  }
  const text=labels(root.KeywordOSI18N?.getLanguage?.()||'en'),summary=modelSummary(currentRows(active));
  let shell=$('[data-keyword-lab-shell]',content);
  if(!shell){content.insertAdjacentHTML('afterbegin',shellHtml(active,summary,text));shell=$('[data-keyword-lab-shell]',content);}
  else shell.outerHTML=shellHtml(active,summary,text),shell=$('[data-keyword-lab-shell]',content);
  bindShell(shell);
  return true;
}
function enhance(){auditTimer=0;applyShell();}
function schedule(){if(auditTimer)return;auditTimer=root.setTimeout(enhance,20);}
function start(){
  const boot=()=>{
    schedule();
    const content=$('#content');
    if(content&&typeof MutationObserver!=='undefined'){observer=new MutationObserver(schedule);observer.observe(content,{childList:true,subtree:true});}
    root.addEventListener('hashchange',schedule);
    root.addEventListener('popstate',schedule);
    doc.addEventListener('click',event=>{if(event.target instanceof root.Element&&event.target.closest('[data-lang]'))root.setTimeout(enhance,0);},true);
  };
  doc.readyState==='loading'?doc.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
}

return{MODE_CATALOG,RESULT_FIELDS,LABELS,clean,normalizedKeyword,languageMode,labels,metric,resultRow,adsResultRows,asinResultRows,filterAdsByQuery,modelSummary,sameResultShape,currentRows,uiMode,applyShell,activate,start};
});
