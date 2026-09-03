(function(root,factory){
  const api=factory(root);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSKeywordLabTest=api;
  if(root){root.KeywordOSKeywordLab=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const BATCH_INPUT_LIMIT=200;
const MODE_CATALOG=Object.freeze({
  discovery:Object.freeze({id:'discovery',label:'Keyword Discovery',route:'cerebro',legacyResearchMode:'suggest',capability:'ready'}),
  batch:Object.freeze({id:'batch',label:'Batch Analysis',route:'cerebro',legacyResearchMode:'analyze',capability:'up-to-200',inputLimit:BATCH_INPUT_LIMIT}),
  asin:Object.freeze({id:'asin',label:'ASIN Import & Compare',route:'asin-comparison',legacyResearchMode:'',capability:'ready'})
});
const RESULT_FIELDS=Object.freeze(['id','keyword','mode','sources','metrics','asins','segment','provenance','matched','reason']);
const BATCH_HEADER_ALIASES=Object.freeze(new Set(['keyword','keywords','search term','search terms','customer search term','term','phrase','query','keyword phrase','keyword text']));
const INPUT_SOURCE_LABELS=Object.freeze({manual:'Manual batch input',csv:'Batch CSV input','keyword-library':'Keyword Library'});
const LABELS=Object.freeze({
  en:Object.freeze({
    title:'Keyword Lab',subtitle:'One keyword evidence contract across discovery, batch analysis and ASIN comparison.',discovery:'Keyword Discovery',batch:'Batch Analysis',asin:'ASIN Import & Compare',
    contract:'Shared result contract: keyword · source · metrics · ASINs · segment · provenance',
    batchLimit:'Up to 200 unique keywords. Paste line breaks/commas, import a keyword CSV, or load Keyword Library. Exact left join keeps unmatched inputs.',
    ads:'Loaded Amazon Ads search-term evidence',reverse:'Imported reverse-ASIN evidence',
    batchInputTitle:'Batch keyword input',batchInputHelp:'Paste one keyword per line, use a comma-separated list, import CSV with a Keyword/Search Term column, or load Keyword Library.',
    batchPlaceholder:'reading glasses women\nblue light readers\ncomputer reading glasses',importCsv:'Import CSV',useLibrary:'Use Keyword Library',analyze:'Analyze',
    noBatch:'No batch input analyzed yet.',inputChanged:'Input changed — select Analyze to refresh results.',limitExceeded:'More than 200 unique keywords are not accepted; narrow the input instead of truncating it.',
    emptyInput:'Enter at least one keyword.',malformedCsv:'Malformed CSV: unclosed quoted field.',csvHeaderRequired:'Multi-column CSV requires a Keyword or Search Term header.',
    libraryMissing:'Keyword Library has no validated keyword-assets dataset.',libraryEmpty:'Keyword Library contains no usable keyword text.',
    matched:'Matched',missing:'Missing',reason:'Reason',keyword:'Keyword',source:'Source',orders:'Orders',sales:'Sales',
    exactMissing:'No exact keyword match in loaded Amazon Ads search-term evidence.'
  }),
  zh:Object.freeze({
    title:'关键词实验室',subtitle:'关键词发现、批量分析与 ASIN 对比共用一套关键词证据结果契约。',discovery:'关键词发现',batch:'批量分析',asin:'ASIN 导入与对比',
    contract:'统一结果契约：关键词 · 来源 · 指标 · ASIN · 分组 · 证据来源',
    batchLimit:'最多 200 个去重关键词。支持换行、逗号、关键词 CSV 或 Keyword Library；使用精确 left join，未命中输入不会丢失。',
    ads:'已加载 Amazon Ads 搜索词证据',reverse:'已导入 reverse-ASIN 证据',
    batchInputTitle:'批量关键词输入',batchInputHelp:'可每行一个关键词、使用逗号列表、导入含 Keyword/Search Term 列的 CSV，或载入 Keyword Library。',
    batchPlaceholder:'reading glasses women\nblue light readers\ncomputer reading glasses',importCsv:'导入 CSV',useLibrary:'载入 Keyword Library',analyze:'分析',
    noBatch:'尚未分析批量关键词。',inputChanged:'输入已改变——点击“分析”刷新结果。',limitExceeded:'不接受超过 200 个去重关键词；请缩小输入，系统不会截断。',
    emptyInput:'请至少输入一个关键词。',malformedCsv:'CSV 格式错误：存在未闭合引号。',csvHeaderRequired:'多列 CSV 必须包含 Keyword 或 Search Term 表头。',
    libraryMissing:'Keyword Library 没有已验证的 keyword-assets 数据集。',libraryEmpty:'Keyword Library 中没有可用关键词文本。',
    matched:'已命中',missing:'未命中',reason:'原因',keyword:'关键词',source:'来源',orders:'订单',sales:'销售额',
    exactMissing:'已加载 Amazon Ads 搜索词证据中没有精确关键词匹配。'
  }),
  bi:Object.freeze({
    title:'关键词实验室 / Keyword Lab',subtitle:'关键词发现、批量分析与 ASIN 对比共用一套结果契约 / One result contract across keyword modes.',discovery:'关键词发现 / Keyword Discovery',batch:'批量分析 / Batch Analysis',asin:'ASIN 导入与对比 / ASIN Import & Compare',
    contract:'统一结果契约 / Shared result contract: keyword · source · metrics · ASINs · segment · provenance',
    batchLimit:'最多 200 个去重关键词 / Up to 200 unique keywords; line breaks, commas, CSV and Keyword Library are supported, with exact left join preserving missing inputs.',
    ads:'Amazon Ads 搜索词证据 / Loaded Ads search-term evidence',reverse:'reverse-ASIN 导入证据 / Imported reverse-ASIN evidence',
    batchInputTitle:'批量关键词输入 / Batch keyword input',batchInputHelp:'换行、逗号、CSV 或 Keyword Library / Use line breaks, commas, CSV or Keyword Library.',
    batchPlaceholder:'reading glasses women\nblue light readers\ncomputer reading glasses',importCsv:'导入 CSV / Import CSV',useLibrary:'载入 Keyword Library / Use Keyword Library',analyze:'分析 / Analyze',
    noBatch:'尚未分析 / No batch input analyzed yet.',inputChanged:'输入已改变，请重新分析 / Input changed — analyze to refresh.',limitExceeded:'超过 200 个去重关键词会被拒绝，不会截断 / More than 200 unique keywords are rejected, never truncated.',
    emptyInput:'至少输入一个关键词 / Enter at least one keyword.',malformedCsv:'CSV 引号未闭合 / Malformed CSV: unclosed quoted field.',csvHeaderRequired:'多列 CSV 需要 Keyword/Search Term 表头 / Multi-column CSV requires a Keyword/Search Term header.',
    libraryMissing:'Keyword Library 没有已验证数据 / No validated Keyword Library dataset.',libraryEmpty:'Keyword Library 没有可用关键词 / Keyword Library has no usable keywords.',
    matched:'已命中 / Matched',missing:'未命中 / Missing',reason:'原因 / Reason',keyword:'关键词 / Keyword',source:'来源 / Source',orders:'订单 / Orders',sales:'销售额 / Sales',
    exactMissing:'Amazon Ads 中无精确匹配 / No exact keyword match in loaded Amazon Ads evidence.'
  })
});

function clean(value){return String(value??'').replace(/\s+/g,' ').trim();}
function normalizedKeyword(value){return clean(value).toLowerCase();}
function languageMode(value){return ['en','zh','bi'].includes(value)?value:'en';}
function labels(mode='en'){return LABELS[languageMode(mode)];}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function metric(value,source,{available=true,quality='imported'}={}){
  return Object.freeze({value:available?value:null,source:clean(source),quality:available?quality:'missing',available:Boolean(available)});
}
function resultRow({keyword,mode,sources=[],metrics={},asins=[],segment='',provenance=[],matched=true,reason=''}={}){
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
    provenance:Object.freeze(provenance.map(item=>Object.freeze({...item}))),
    matched:Boolean(matched),
    reason:clean(reason)
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
  const tokens=q.split(/\s+/).filter(Boolean);
  return items.filter(item=>tokens.some(token=>normalizedKeyword(item?.name).includes(token)));
}
function parseCsvMatrix(value){
  const text=String(value??'').replace(/^\uFEFF/,'');
  const rows=[];let row=[],cell='',quoted=false;
  for(let index=0;index<text.length;index+=1){
    const char=text[index];
    if(quoted){
      if(char==='"'&&text[index+1]==='"'){cell+='"';index+=1;continue;}
      if(char==='"'){quoted=false;continue;}
      cell+=char;continue;
    }
    if(char==='"'){quoted=true;continue;}
    if(char===','){row.push(cell);cell='';continue;}
    if(char==='\n'){row.push(cell);rows.push(row);row=[];cell='';continue;}
    if(char==='\r')continue;
    cell+=char;
  }
  if(quoted)return{ok:false,rows:[],reason:'unclosed-quote'};
  row.push(cell);
  if(row.some(part=>String(part).length)||rows.length)rows.push(row);
  return{ok:true,rows};
}
function batchHeader(value){return clean(value).toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');}
function normalizeBatchKeywordList(values=[],{source='manual',format='text'}={}){
  const cleaned=(Array.isArray(values)?values:[]).map(clean).filter(Boolean);
  const seen=new Set(),keywords=[];
  for(const value of cleaned){const key=normalizedKeyword(value);if(!key||seen.has(key))continue;seen.add(key);keywords.push(value);}
  if(!keywords.length)return Object.freeze({ok:false,source,format,keywords:Object.freeze([]),inputCount:cleaned.length,duplicateCount:cleaned.length,reason:'empty-input'});
  if(keywords.length>BATCH_INPUT_LIMIT)return Object.freeze({ok:false,source,format,keywords:Object.freeze(keywords),inputCount:cleaned.length,duplicateCount:cleaned.length-keywords.length,reason:'limit-exceeded'});
  return Object.freeze({ok:true,source,format,keywords:Object.freeze(keywords),inputCount:cleaned.length,duplicateCount:cleaned.length-keywords.length,reason:''});
}
function parseBatchInput(value,{source='manual'}={}){
  const raw=String(value??'').replace(/^\uFEFF/,'').trim();
  if(!raw)return normalizeBatchKeywordList([],{source,format:'text'});
  const parsed=parseCsvMatrix(raw);
  if(!parsed.ok)return Object.freeze({ok:false,source,format:'csv',keywords:Object.freeze([]),inputCount:0,duplicateCount:0,reason:'malformed-csv'});
  const rows=parsed.rows.filter(row=>row.some(cell=>clean(cell)));
  if(!rows.length)return normalizeBatchKeywordList([],{source,format:'text'});
  const headerIndex=rows[0].findIndex(cell=>BATCH_HEADER_ALIASES.has(batchHeader(cell)));
  if(headerIndex>=0){
    return normalizeBatchKeywordList(rows.slice(1).map(row=>row[headerIndex]??''),{source,format:'csv'});
  }
  if(rows.length===1)return normalizeBatchKeywordList(rows[0],{source,format:rows[0].length>1?'comma':'text'});
  if(rows.every(row=>row.length===1))return normalizeBatchKeywordList(rows.map(row=>row[0]),{source,format:'lines'});
  return Object.freeze({ok:false,source,format:'csv',keywords:Object.freeze([]),inputCount:0,duplicateCount:0,reason:'csv-header-required'});
}
function keywordAssetValue(row){
  for(const key of ['keyword','displayKeyword','display_keyword','normalizedKeyword','normalized_keyword','name','term','searchTerm','search_term']){
    const value=clean(row?.[key]);if(value)return value;
  }
  return'';
}
function keywordLibraryInput(records=[]){
  const record=(Array.isArray(records)?records:[]).find(item=>item?.kind==='keyword-assets');
  const status=clean(record?.validation?.status).toLowerCase();
  if(!record||!['validated','migrated'].includes(status))return Object.freeze({ok:false,source:'keyword-library',format:'library',keywords:Object.freeze([]),inputCount:0,duplicateCount:0,reason:'library-missing'});
  const parsed=normalizeBatchKeywordList((record.rows||[]).map(keywordAssetValue),{source:'keyword-library',format:'library'});
  if(!parsed.ok&&parsed.reason==='empty-input')return Object.freeze({...parsed,reason:'library-empty'});
  return parsed;
}
function batchLeftJoin(inputs=[],evidenceRows=[],{inputSource='manual',missingReason='No exact keyword match in loaded Amazon Ads search-term evidence.'}={}){
  const index=new Map();
  for(const row of evidenceRows||[]){const key=normalizedKeyword(row?.keyword);if(key&&!index.has(key))index.set(key,row);}
  const inputLabel=INPUT_SOURCE_LABELS[inputSource]||clean(inputSource)||'Batch input';
  return (inputs||[]).map(value=>{
    const keyword=typeof value==='string'?clean(value):clean(value?.keyword);
    const evidence=index.get(normalizedKeyword(keyword));
    const inputProvenance={kind:'batch-input',label:inputLabel,quality:'input'};
    if(!evidence)return resultRow({keyword,mode:'batch',sources:[],metrics:{},provenance:[inputProvenance,{kind:'ads',label:'Amazon Ads Search Term',quality:'missing'}],matched:false,reason:missingReason});
    return resultRow({
      keyword,mode:'batch',sources:evidence.sources||[],metrics:evidence.metrics||{},asins:evidence.asins||[],segment:evidence.segment||'',
      provenance:[inputProvenance,...(evidence.provenance||[])],matched:true,reason:''
    });
  }).filter(Boolean);
}
function batchMatchSummary(rows=[]){
  const total=(rows||[]).length,matched=(rows||[]).filter(row=>row?.matched).length;
  return Object.freeze({total,matched,missing:total-matched});
}
function modelSummary(rows=[]){
  const sourceSet=new Set(),metricSet=new Set();
  for(const row of rows||[]){for(const source of row?.sources||[])sourceSet.add(source);for(const [key,evidence] of Object.entries(row?.metrics||{}))if(evidence?.available)metricSet.add(key);}
  return Object.freeze({rows:(rows||[]).length,sources:Object.freeze([...sourceSet]),metrics:Object.freeze([...metricSet])});
}
function sameResultShape(rows=[]){return (rows||[]).every(row=>RESULT_FIELDS.every(field=>Object.hasOwn(row||{},field)));}

if(!root?.document)return{
  BATCH_INPUT_LIMIT,MODE_CATALOG,RESULT_FIELDS,BATCH_HEADER_ALIASES,INPUT_SOURCE_LABELS,LABELS,
  clean,normalizedKeyword,languageMode,labels,escapeHtml,metric,resultRow,adsResultRows,asinResultRows,filterAdsByQuery,
  parseCsvMatrix,batchHeader,normalizeBatchKeywordList,parseBatchInput,keywordAssetValue,keywordLibraryInput,batchLeftJoin,batchMatchSummary,modelSummary,sameResultShape
};

const doc=root.document;
const $=(selector,scope=doc)=>scope.querySelector(selector);
let observer=null;
let auditTimer=0;
const batchState={rawText:'',parsed:null,source:'manual',error:'',dirty:false};
function currentPage(){return root.KeywordOSPageRegistry?.pageFromHash?.(root.location?.hash||'')||root.KeywordOSUIBridge?.page||'';}
function uiMode(){
  if(currentPage()==='asin-comparison')return'asin';
  if(currentPage()!=='cerebro')return'';
  return $('[data-research-mode="analyze"]')?.classList.contains('active')?'batch':'discovery';
}
function adsEvidenceRows(){
  const bridge=root.KeywordOSUIBridge;
  const aggregates=bridge?.aggregateLevel?.(bridge?.getRangeRows?.()||bridge?.adsRows||[],'searchterm')||[];
  return adsResultRows(aggregates,'batch');
}
function currentRows(mode=uiMode()){
  const bridge=root.KeywordOSUIBridge,growth=root.KeywordOSGrowth;
  if(mode==='asin'){
    const records=bridge?.datasetRegistry||[],reverse=records.find(record=>record.kind==='reverse-asin')?.rows||[],master=records.find(record=>record.kind==='product-master')?.rows||[],comparison=growth?.asinKeywordComparison?.(reverse,master.map(row=>row.asin))||[];
    return asinResultRows(comparison);
  }
  if(mode==='batch'){
    if(batchState.dirty||!batchState.parsed?.ok)return[];
    return batchLeftJoin(batchState.parsed.keywords,adsEvidenceRows(),{inputSource:batchState.source,missingReason:labels(root.KeywordOSI18N?.getLanguage?.()||'en').exactMissing});
  }
  const bridgeRows=bridge?.aggregateLevel?.(bridge?.getRangeRows?.()||bridge?.adsRows||[],'searchterm')||[];
  const query=$('#research-query')?.value||'';
  return adsResultRows(filterAdsByQuery(bridgeRows,query,'discovery'),'discovery');
}
function batchReasonText(reason,text){
  return({
    'empty-input':text.emptyInput,'limit-exceeded':text.limitExceeded,'malformed-csv':text.malformedCsv,'csv-header-required':text.csvHeaderRequired,
    'library-missing':text.libraryMissing,'library-empty':text.libraryEmpty
  })[reason]||clean(reason);
}
function modeStatus(mode,summary,text,rows=[]){
  if(mode==='batch'){
    if(batchState.error)return batchState.error;
    if(batchState.dirty)return text.inputChanged;
    if(!batchState.parsed?.ok)return text.batchLimit;
    const match=batchMatchSummary(rows);
    return `${batchState.parsed.keywords.length} inputs · ${match.matched} ${text.matched} · ${match.missing} ${text.missing} · exact left join`;
  }
  const source=mode==='asin'?text.reverse:text.ads;
  const metrics=summary.metrics.length?summary.metrics.join(', '):'no available metrics';
  return `${source} · ${summary.rows} keyword rows · ${metrics}`;
}
function shellSignature(active,summary,mode,rows=[]){
  const match=batchMatchSummary(rows);
  return[active,languageMode(mode),summary.rows,summary.sources.join(','),summary.metrics.join(','),match.matched,match.missing,batchState.parsed?.keywords?.length||0,batchState.dirty?'dirty':'clean',batchState.error].join('|');
}
function shellHtml(active,summary,text,signature,rows=[]){
  const button=(mode,label)=>`<button type="button" class="mode-tab ${active===mode?'active':''}" data-keyword-lab-mode="${mode}" aria-pressed="${active===mode?'true':'false'}">${label}</button>`;
  return `<div class="card" data-keyword-lab-shell data-keyword-lab-signature="${escapeHtml(signature)}"><div class="card-head"><div class="card-title"><h3 data-no-i18n>${text.title}</h3><small data-no-i18n>${text.subtitle}</small></div></div><div class="card-body"><div class="mode-tabs" role="tablist" aria-label="Keyword Lab modes">${button('discovery',text.discovery)}${button('batch',text.batch)}${button('asin',text.asin)}</div><div class="small muted" data-keyword-lab-status data-no-i18n>${escapeHtml(modeStatus(active,summary,text,rows))}</div><div class="small muted" data-no-i18n>${text.contract}</div></div></div>`;
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
    const nav=$('#sidebar-nav [data-page="asin-comparison"]');
    if(nav){nav.click();root.setTimeout(enhance,30);return;}
    root.location.hash='#page=asin-comparison';
    root.KeywordOSGrowth?.render?.('asin-comparison');
    root.setTimeout(enhance,0);
    return;
  }
  openCoreMode(mode);
}
function bindShell(shell){
  shell?.querySelectorAll('[data-keyword-lab-mode]').forEach(button=>{
    if(button.dataset.keywordLabBound==='1')return;
    button.dataset.keywordLabBound='1';
    button.addEventListener('click',()=>activate(button.dataset.keywordLabMode));
  });
}
function setLegacyBatchVisibility(active,content){
  for(const selector of ['.cerebro-search-card','.data-workspace']){
    for(const node of content.querySelectorAll(selector)){
      if(active){if(!node.hidden){node.hidden=true;node.dataset.keywordLabHidden='1';}}
      else if(node.dataset.keywordLabHidden==='1'){node.hidden=false;delete node.dataset.keywordLabHidden;}
    }
  }
}
function metricText(row,key){const evidence=row?.metrics?.[key];return evidence?.available?String(evidence.value):'—';}
function batchResultsHtml(rows,text){
  if(!batchState.parsed?.ok||batchState.dirty)return'';
  const body=rows.map(row=>`<tr><td><b>${escapeHtml(row.keyword)}</b></td><td>${row.matched?escapeHtml(text.matched):escapeHtml(text.missing)}</td><td>${escapeHtml(row.sources.join(', ')||'—')}</td><td>${escapeHtml(metricText(row,'orders'))}</td><td>${escapeHtml(metricText(row,'sales'))}</td><td>${escapeHtml(row.reason||'—')}</td></tr>`).join('');
  return `<div class="table-wrap" data-keyword-lab-batch-results><table><thead><tr><th>${text.keyword}</th><th>${text.matched}</th><th>${text.source}</th><th>${text.orders}</th><th>${text.sales}</th><th>${text.reason}</th></tr></thead><tbody>${body}</tbody></table></div>`;
}
function batchWorkspaceHtml(rows,text,signature){
  const status=batchState.error||(!batchState.parsed?.ok?text.noBatch:modeStatus('batch',modelSummary(rows),text,rows));
  return `<div data-keyword-lab-batch-host data-keyword-lab-batch-signature="${escapeHtml(signature)}"><div class="card" data-keyword-lab-batch><div class="card-head"><div class="card-title"><h3 data-no-i18n>${text.batchInputTitle}</h3><small data-no-i18n>${text.batchInputHelp}</small></div></div><div class="card-body"><textarea id="keyword-lab-batch-input" class="input" rows="7" style="width:100%;resize:vertical" data-no-i18n placeholder="${escapeHtml(text.batchPlaceholder)}">${escapeHtml(batchState.rawText)}</textarea><div class="toolbar" style="margin-top:10px"><button type="button" class="btn secondary" data-keyword-lab-action="csv">${text.importCsv}</button><button type="button" class="btn secondary" data-keyword-lab-action="library">${text.useLibrary}</button><button type="button" class="btn primary" data-keyword-lab-action="analyze">${text.analyze}</button><input type="file" accept=".csv,text/csv" data-keyword-lab-csv hidden></div><div class="small muted" data-keyword-lab-batch-status data-no-i18n>${escapeHtml(status)}</div></div></div>${batchResultsHtml(rows,text)}</div>`;
}
function batchWorkspaceSignature(rows,mode){
  const match=batchMatchSummary(rows);
  return[languageMode(mode),batchState.rawText,batchState.parsed?.source||'',batchState.parsed?.format||'',batchState.parsed?.keywords?.join('\u001f')||'',batchState.error,batchState.dirty?'dirty':'clean',match.matched,match.missing].join('|');
}
function applyBatchParsed(parsed,rawText,source){
  batchState.rawText=String(rawText??'');batchState.source=source||parsed?.source||'manual';batchState.parsed=parsed?.ok?parsed:null;batchState.dirty=false;
  batchState.error=parsed?.ok?'':batchReasonText(parsed?.reason,labels(root.KeywordOSI18N?.getLanguage?.()||'en'));
}
function bindBatchWorkspace(host,text){
  if(!host||host.dataset.keywordLabBatchBound==='1')return;
  host.dataset.keywordLabBatchBound='1';
  const textarea=$('#keyword-lab-batch-input',host),file=$('[data-keyword-lab-csv]',host);
  textarea?.addEventListener('input',()=>{
    batchState.rawText=textarea.value;batchState.dirty=true;batchState.error='';
    const status=$('[data-keyword-lab-batch-status]',host);if(status)status.textContent=text.inputChanged;
    const results=$('[data-keyword-lab-batch-results]',host);if(results)results.hidden=true;
  });
  $('[data-keyword-lab-action="analyze"]',host)?.addEventListener('click',()=>{
    const raw=textarea?.value||'';applyBatchParsed(parseBatchInput(raw,{source:'manual'}),raw,'manual');enhance();
  });
  $('[data-keyword-lab-action="csv"]',host)?.addEventListener('click',()=>file?.click());
  file?.addEventListener('change',async()=>{
    const selected=file.files?.[0];if(!selected)return;
    const raw=await selected.text();applyBatchParsed(parseBatchInput(raw,{source:'csv'}),raw,'csv');enhance();
  });
  $('[data-keyword-lab-action="library"]',host)?.addEventListener('click',()=>{
    const parsed=keywordLibraryInput(root.KeywordOSUIBridge?.datasetRegistry||[]),raw=parsed.ok?parsed.keywords.join('\n'):'';
    applyBatchParsed(parsed,raw,'keyword-library');enhance();
  });
}
function renderBatchWorkspace(){
  const content=$('#content');if(!content)return false;
  const active=uiMode()==='batch';setLegacyBatchVisibility(active,content);
  let host=$('[data-keyword-lab-batch-host]',content);
  if(!active){host?.remove();return false;}
  const text=labels(root.KeywordOSI18N?.getLanguage?.()||'en'),rows=currentRows('batch'),signature=batchWorkspaceSignature(rows,root.KeywordOSI18N?.getLanguage?.()||'en');
  if(!host){const shell=$('[data-keyword-lab-shell]',content);(shell||content.firstElementChild)?.insertAdjacentHTML(shell?'afterend':'beforebegin',batchWorkspaceHtml(rows,text,signature));host=$('[data-keyword-lab-batch-host]',content);}
  else if(host.dataset.keywordLabBatchSignature!==signature){host.outerHTML=batchWorkspaceHtml(rows,text,signature);host=$('[data-keyword-lab-batch-host]',content);}
  bindBatchWorkspace(host,text);return true;
}
function applyShell(){
  const page=currentPage();
  if(page!=='cerebro'&&page!=='asin-comparison')return false;
  const content=$('#content');if(!content)return false;
  const active=uiMode();if(!active)return false;
  if(page==='cerebro'){
    const legacyModes=$('.cerebro-search-card > .mode-tabs');
    if(legacyModes&&!legacyModes.hidden){legacyModes.hidden=true;legacyModes.setAttribute('aria-hidden','true');}
  }
  const language=root.KeywordOSI18N?.getLanguage?.()||'en',text=labels(language),rows=currentRows(active),summary=modelSummary(rows),signature=shellSignature(active,summary,language,rows);
  let shell=$('[data-keyword-lab-shell]',content);
  if(!shell){content.insertAdjacentHTML('afterbegin',shellHtml(active,summary,text,signature,rows));shell=$('[data-keyword-lab-shell]',content);}
  else if(shell.dataset.keywordLabSignature!==signature){shell.outerHTML=shellHtml(active,summary,text,signature,rows);shell=$('[data-keyword-lab-shell]',content);}
  bindShell(shell);
  return true;
}
function enhance(){auditTimer=0;applyShell();renderBatchWorkspace();}
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

return{
  BATCH_INPUT_LIMIT,MODE_CATALOG,RESULT_FIELDS,BATCH_HEADER_ALIASES,INPUT_SOURCE_LABELS,LABELS,
  clean,normalizedKeyword,languageMode,labels,escapeHtml,metric,resultRow,adsResultRows,asinResultRows,filterAdsByQuery,
  parseCsvMatrix,batchHeader,normalizeBatchKeywordList,parseBatchInput,keywordAssetValue,keywordLibraryInput,batchLeftJoin,batchMatchSummary,modelSummary,sameResultShape,
  shellSignature,currentRows,uiMode,applyShell,renderBatchWorkspace,activate,start
};
});
