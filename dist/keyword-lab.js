(function(root,factory){
  const api=factory(root);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSKeywordLabTest=api;
  if(root){root.KeywordOSKeywordLab=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const BATCH_INPUT_LIMIT=200;
const VALID_RECORD_STATES=new Set(['validated','migrated']);
const SOURCE_ORDER=Object.freeze(['ads','sqp','reverse-asin','ranks','keyword-assets']);
const MODE_CATALOG=Object.freeze({
  discovery:Object.freeze({id:'discovery',label:'Keyword Discovery',route:'cerebro',legacyResearchMode:'suggest',capability:'ready'}),
  batch:Object.freeze({id:'batch',label:'Batch Analysis',route:'cerebro',legacyResearchMode:'analyze',capability:'up-to-200',inputLimit:BATCH_INPUT_LIMIT}),
  asin:Object.freeze({id:'asin',label:'ASIN Import & Compare',route:'asin-comparison',legacyResearchMode:'',capability:'ready'})
});
const RESULT_FIELDS=Object.freeze(['id','keyword','mode','sources','metrics','asins','segment','provenance','matched','reason']);
const BATCH_HEADER_ALIASES=Object.freeze(new Set(['keyword','keywords','search term','search terms','customer search term','term','phrase','query','keyword phrase','keyword text']));
const INPUT_SOURCE_LABELS=Object.freeze({manual:'Manual batch input',csv:'Batch CSV input','keyword-library':'Keyword Library'});
const NGRAM_MODES=Object.freeze(['1','2','3+']);
const STOP_WORDS=Object.freeze(new Set(['a','an','the','and','or','but','for','to','of','in','on','with','by','from','at','as','is','are','be']));
const LABELS=Object.freeze({
  en:Object.freeze({
    title:'Keyword Lab',subtitle:'One keyword evidence contract across discovery, batch analysis and ASIN comparison.',discovery:'Keyword Discovery',batch:'Batch Analysis',asin:'ASIN Import & Compare',
    contract:'Shared result contract: keyword · source · metrics · ASINs · segment · provenance',
    batchLimit:'Up to 200 unique keywords. Paste line breaks/commas, import a keyword CSV, or load Keyword Library. Exact left join keeps unmatched inputs.',
    evidence:'Loaded Ads / SQP / reverse-ASIN / rank / Keyword Library evidence',reverse:'Imported reverse-ASIN evidence enriched by exact keyword evidence',
    batchInputTitle:'Batch keyword input',batchInputHelp:'Paste one keyword per line, use a comma-separated list, import CSV with a Keyword/Search Term column, or load Keyword Library.',
    batchPlaceholder:'reading glasses women\nblue light readers\ncomputer reading glasses',importCsv:'Import CSV',useLibrary:'Use Keyword Library',analyze:'Analyze',
    noBatch:'No batch input analyzed yet.',inputChanged:'Input changed — select Analyze to refresh results.',limitExceeded:'More than 200 unique keywords are not accepted; narrow the input instead of truncating it.',
    emptyInput:'Enter at least one keyword.',malformedCsv:'Malformed CSV: unclosed quoted field.',csvHeaderRequired:'Multi-column CSV requires a Keyword or Search Term header.',
    libraryMissing:'Keyword Library has no validated keyword-assets dataset.',libraryEmpty:'Keyword Library contains no usable keyword text.',
    matched:'Matched',missing:'Missing',reason:'Reason',keyword:'Keyword',source:'Source',orders:'Orders',sales:'Sales',
    exactMissing:'No exact keyword match across loaded Ads, SQP/ABA, reverse-ASIN, rank or Keyword Library evidence.',
    rootTitle:'N-grams & Common Words',rootHelp:'Click a root to filter and highlight the linked result table. Exclusions and deletions only affect this Keyword Lab view.',stopwords:'Ignore edge stopwords',excludeRoot:'Exclude',excludedRoots:'Common Words exclusions',deletedRows:'Deleted keywords',restore:'Restore',deleteRow:'Delete',clearRoot:'Clear root filter',showing:'Showing',emptyRoots:'No n-grams are available for the current result set.'
  }),
  zh:Object.freeze({
    title:'关键词实验室',subtitle:'关键词发现、批量分析与 ASIN 对比共用一套关键词证据结果契约。',discovery:'关键词发现',batch:'批量分析',asin:'ASIN 导入与对比',
    contract:'统一结果契约：关键词 · 来源 · 指标 · ASIN · 分组 · 证据来源',
    batchLimit:'最多 200 个去重关键词。支持换行、逗号、关键词 CSV 或 Keyword Library；使用精确 left join，未命中输入不会丢失。',
    evidence:'已加载 Ads / SQP / reverse-ASIN / 排名 / Keyword Library 证据',reverse:'reverse-ASIN 导入证据，并按精确关键词补充其他来源',
    batchInputTitle:'批量关键词输入',batchInputHelp:'可每行一个关键词、使用逗号列表、导入含 Keyword/Search Term 列的 CSV，或载入 Keyword Library。',
    batchPlaceholder:'reading glasses women\nblue light readers\ncomputer reading glasses',importCsv:'导入 CSV',useLibrary:'载入 Keyword Library',analyze:'分析',
    noBatch:'尚未分析批量关键词。',inputChanged:'输入已改变——点击“分析”刷新结果。',limitExceeded:'不接受超过 200 个去重关键词；请缩小输入，系统不会截断。',
    emptyInput:'请至少输入一个关键词。',malformedCsv:'CSV 格式错误：存在未闭合引号。',csvHeaderRequired:'多列 CSV 必须包含 Keyword 或 Search Term 表头。',
    libraryMissing:'Keyword Library 没有已验证的 keyword-assets 数据集。',libraryEmpty:'Keyword Library 中没有可用关键词文本。',
    matched:'已命中',missing:'未命中',reason:'原因',keyword:'关键词',source:'来源',orders:'订单',sales:'销售额',
    exactMissing:'已加载 Ads、SQP/ABA、reverse-ASIN、排名或 Keyword Library 证据中没有精确关键词匹配。',
    rootTitle:'N-gram 与常用词',rootHelp:'点击词根即可筛选并高亮联动结果表；排除和删除只影响当前关键词实验室视图，不修改原始证据。',stopwords:'忽略首尾停用词',excludeRoot:'排除',excludedRoots:'Common Words 排除',deletedRows:'已删除关键词',restore:'恢复',deleteRow:'删除',clearRoot:'清除词根筛选',showing:'显示',emptyRoots:'当前结果没有可用的 n-gram。'
  }),
  bi:Object.freeze({
    title:'关键词实验室 / Keyword Lab',subtitle:'关键词发现、批量分析与 ASIN 对比共用一套结果契约 / One result contract across keyword modes.',discovery:'关键词发现 / Keyword Discovery',batch:'批量分析 / Batch Analysis',asin:'ASIN 导入与对比 / ASIN Import & Compare',
    contract:'统一结果契约 / Shared result contract: keyword · source · metrics · ASINs · segment · provenance',
    batchLimit:'最多 200 个去重关键词 / Up to 200 unique keywords; line breaks, commas, CSV and Keyword Library are supported, with exact left join preserving missing inputs.',
    evidence:'多来源关键词证据 / Loaded Ads, SQP, reverse-ASIN, rank and Keyword Library evidence',reverse:'reverse-ASIN + 精确关键词证据 / reverse-ASIN enriched by exact keyword evidence',
    batchInputTitle:'批量关键词输入 / Batch keyword input',batchInputHelp:'换行、逗号、CSV 或 Keyword Library / Use line breaks, commas, CSV or Keyword Library.',
    batchPlaceholder:'reading glasses women\nblue light readers\ncomputer reading glasses',importCsv:'导入 CSV / Import CSV',useLibrary:'载入 Keyword Library / Use Keyword Library',analyze:'分析 / Analyze',
    noBatch:'尚未分析 / No batch input analyzed yet.',inputChanged:'输入已改变，请重新分析 / Input changed — analyze to refresh.',limitExceeded:'超过 200 个去重关键词会被拒绝，不会截断 / More than 200 unique keywords are rejected, never truncated.',
    emptyInput:'至少输入一个关键词 / Enter at least one keyword.',malformedCsv:'CSV 引号未闭合 / Malformed CSV: unclosed quoted field.',csvHeaderRequired:'多列 CSV 需要 Keyword/Search Term 表头 / Multi-column CSV requires a Keyword/Search Term header.',
    libraryMissing:'Keyword Library 没有已验证数据 / No validated Keyword Library dataset.',libraryEmpty:'Keyword Library 没有可用关键词 / Keyword Library has no usable keywords.',
    matched:'已命中 / Matched',missing:'未命中 / Missing',reason:'原因 / Reason',keyword:'关键词 / Keyword',source:'来源 / Source',orders:'订单 / Orders',sales:'销售额 / Sales',
    exactMissing:'所有已加载关键词证据中均无精确匹配 / No exact match across loaded keyword evidence.',
    rootTitle:'N-gram 与常用词 / N-grams & Common Words',rootHelp:'点击词根筛选并高亮联动结果 / Click a root to filter and highlight linked results; exclusions and deletions are view-only.',stopwords:'忽略首尾停用词 / Ignore edge stopwords',excludeRoot:'排除 / Exclude',excludedRoots:'Common Words 排除 / Exclusions',deletedRows:'已删除关键词 / Deleted keywords',restore:'恢复 / Restore',deleteRow:'删除 / Delete',clearRoot:'清除词根筛选 / Clear root filter',showing:'显示 / Showing',emptyRoots:'当前没有可用 n-gram / No n-grams are available.'
  })
});

function clean(value){return String(value??'').replace(/\s+/g,' ').trim();}
function normalizedKeyword(value){return clean(value).toLowerCase();}
function languageMode(value){return ['en','zh','bi'].includes(value)?value:'en';}
function labels(mode='en'){return LABELS[languageMode(mode)];}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function metric(value,source,{available=true,quality='imported'}={}){return Object.freeze({value:available?value:null,source:clean(source),quality:available?quality:'missing',available:Boolean(available)});}
function sourceRank(source){const index=SOURCE_ORDER.indexOf(clean(source));return index<0?SOURCE_ORDER.length:index;}
function resultRow({keyword,mode,sources=[],metrics={},asins=[],segment='',provenance=[],matched=true,reason=''}={}){
  const normalized=normalizedKeyword(keyword);if(!normalized)return null;
  const modeId=MODE_CATALOG[mode]?mode:'discovery';
  const sourceList=[...new Set(sources.map(clean).filter(Boolean))].sort((a,b)=>sourceRank(a)-sourceRank(b)||a.localeCompare(b));
  const asinList=[...new Set(asins.map(value=>clean(value).toUpperCase()).filter(Boolean))];
  return Object.freeze({id:`${modeId}:${normalized}`,keyword:clean(keyword),mode:modeId,sources:Object.freeze(sourceList),metrics:Object.freeze({...metrics}),asins:Object.freeze(asinList),segment:clean(segment),provenance:Object.freeze(provenance.map(item=>Object.freeze({...item}))),matched:Boolean(matched),reason:clean(reason)});
}
function validRecord(record,kind){return record?.kind===kind&&VALID_RECORD_STATES.has(clean(record?.validation?.status).toLowerCase())&&Array.isArray(record?.rows);}
function recordFor(records,kind){return (Array.isArray(records)?records:[]).find(record=>validRecord(record,kind))||null;}
function provenanceFor(kind,label,quality='imported',record=null){const item={kind,label,quality};if(clean(record?.source))item.source=clean(record.source);if(clean(record?.importedAt))item.importedAt=clean(record.importedAt);return item;}
function fieldAvailable(value){return value!==null&&value!==undefined&&value!=='';}
function observationValue(rows,field,{source,quality='imported'}={}){
  const observations=[];
  for(const row of rows||[]){const value=row?.[field];if(!fieldAvailable(value))continue;observations.push(Object.freeze({value,date:clean(row?.date),asin:clean(row?.asin).toUpperCase()}));}
  if(!observations.length)return metric(null,source,{available:false,quality});
  const values=observations.map(item=>item.value),same=values.every(value=>Object.is(value,values[0]));
  return metric(observations.length===1||same?values[0]:Object.freeze(observations),source,{quality});
}
function groupByKeyword(rows=[],field='keyword'){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){const display=clean(row?.[field]);const key=normalizedKeyword(display);if(!key)continue;if(!map.has(key))map.set(key,{keyword:display,rows:[]});map.get(key).rows.push(row);}
  return [...map.values()];
}
function latestPerAsinKeyword(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){const keyword=normalizedKeyword(row?.keyword),asin=clean(row?.asin).toUpperCase();if(!keyword||!asin)continue;const key=`${asin}\u001f${keyword}`,current=map.get(key),date=clean(row?.date);if(!current||date>=clean(current?.date))map.set(key,row);}
  return [...map.values()];
}
function adsResultRows(items=[],mode='discovery'){
  const modeId=mode==='batch'?'batch':'discovery';
  return (Array.isArray(items)?items:[]).map(item=>resultRow({keyword:item?.name,mode:modeId,sources:['ads'],metrics:{
    adImpressions:metric(Number(item?.impressions)||0,'ads'),clicks:metric(Number(item?.clicks)||0,'ads'),orders:metric(Number(item?.orders)||0,'ads'),spend:metric(Number(item?.spend)||0,'ads'),sales:metric(Number(item?.sales)||0,'ads'),cvr:metric(Number(item?.cvr)||0,'ads'),acos:metric(item?.acos==null?null:Number(item.acos),'ads',{available:item?.acos!=null}),roas:metric(Number(item?.roas)||0,'ads'),products:metric(Number(item?.products)||0,'ads')
  },provenance:[provenanceFor('ads','Amazon Ads Search Term')]})).filter(Boolean);
}
function sqpResultRows(rows=[],mode='discovery',record=null){
  return groupByKeyword(rows,'query').map(group=>resultRow({keyword:group.keyword,mode,sources:['sqp'],metrics:{
    queryRank:observationValue(group.rows,'rank',{source:'sqp'}),searchVolume:observationValue(group.rows,'volume',{source:'sqp'}),impressions:observationValue(group.rows,'impressions',{source:'sqp'}),clicks:observationValue(group.rows,'clicks',{source:'sqp'}),cartAdds:observationValue(group.rows,'cartAdds',{source:'sqp'}),purchases:observationValue(group.rows,'purchases',{source:'sqp'}),brandImpressionShare:observationValue(group.rows,'brandImpressionShare',{source:'sqp'}),brandClickShare:observationValue(group.rows,'brandClickShare',{source:'sqp'}),brandPurchaseShare:observationValue(group.rows,'brandPurchaseShare',{source:'sqp'})
  },asins:group.rows.map(row=>row?.asin),provenance:[provenanceFor('sqp','Imported SQP / ABA query evidence','imported',record)]})).filter(Boolean);
}
function thirdPartyColumnMetrics(rows=[]){
  const byLabel=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const provider=clean(row?.provider),columns=row?.sourceColumns&&typeof row.sourceColumns==='object'&&!Array.isArray(row.sourceColumns)?row.sourceColumns:null;
    if(!provider||!columns)continue;
    for(const [rawLabel,rawValue] of Object.entries(columns)){
      const label=clean(rawLabel);if(!label||!fieldAvailable(rawValue))continue;
      const observation=Object.freeze({value:rawValue,provider,reportType:clean(row?.reportType),reportVersion:clean(row?.reportVersion),snapshotDate:clean(row?.snapshotDate),sourceFile:clean(row?.sourceFile),marketplace:clean(row?.marketplace),asin:clean(row?.asin).toUpperCase()});
      if(!byLabel.has(label))byLabel.set(label,[]);byLabel.get(label).push(observation);
    }
  }
  const out={};
  const shared=(observations,field)=>{const values=[...new Set(observations.map(item=>clean(item?.[field])).filter(Boolean))];return values.length===1?values[0]:'';};
  for(const [label,observations] of byLabel){
    const values=observations.map(item=>item.value),same=values.every(value=>Object.is(value,values[0])),provider=shared(observations,'provider');
    out[label]=Object.freeze({value:observations.length===1||same?values[0]:Object.freeze(observations),source:provider||'Multiple third-party providers',quality:'third-party-estimate',available:true,originalName:label,provider,reportType:shared(observations,'reportType'),reportVersion:shared(observations,'reportVersion'),snapshotDate:shared(observations,'snapshotDate'),sourceFile:shared(observations,'sourceFile'),observations:Object.freeze(observations)});
  }
  return Object.freeze(out);
}
function thirdPartyProvenance(rows=[]){
  const seen=new Set(),out=[];
  for(const row of Array.isArray(rows)?rows:[]){
    const provider=clean(row?.provider),columns=row?.sourceColumns&&typeof row.sourceColumns==='object'&&!Array.isArray(row.sourceColumns)?Object.keys(row.sourceColumns).map(clean).filter(Boolean):[];
    if(!provider||!columns.length)continue;
    const item={kind:'third-party-metric',label:`${provider}${clean(row?.reportType)?` · ${clean(row.reportType)}`:''} proprietary metrics`,quality:'third-party-estimate',provider,reportType:clean(row?.reportType),reportVersion:clean(row?.reportVersion),snapshotDate:clean(row?.snapshotDate),sourceFile:clean(row?.sourceFile),marketplace:clean(row?.marketplace),asin:clean(row?.asin).toUpperCase(),columns:Object.freeze(columns)};
    const key=[item.provider,item.reportType,item.reportVersion,item.snapshotDate,item.sourceFile,item.marketplace,item.asin,columns.join('\u001f')].join('\u001e');if(seen.has(key))continue;seen.add(key);out.push(Object.freeze(item));
  }
  return Object.freeze(out);
}
function reverseAsinEvidenceRows(rows=[],mode='discovery',record=null){
  return groupByKeyword(rows,'keyword').map(group=>resultRow({keyword:group.keyword,mode,sources:['reverse-asin'],metrics:{
    searchVolume:observationValue(group.rows,'volume',{source:'reverse-asin'}),organicRank:observationValue(group.rows,'organicRank',{source:'reverse-asin'}),sponsoredRank:observationValue(group.rows,'sponsoredRank',{source:'reverse-asin'}),trafficShare:observationValue(group.rows,'trafficShare',{source:'reverse-asin'}),conversionRate:observationValue(group.rows,'conversionRate',{source:'reverse-asin'}),...thirdPartyColumnMetrics(group.rows)
  },asins:group.rows.map(row=>row?.asin),provenance:[provenanceFor('reverse-asin','Imported reverse-ASIN keyword evidence','imported',record),...thirdPartyProvenance(group.rows)]})).filter(Boolean);
}
function rankResultRows(rows=[],mode='discovery',record=null){
  return groupByKeyword(latestPerAsinKeyword(rows),'keyword').map(group=>resultRow({keyword:group.keyword,mode,sources:['ranks'],metrics:{
    organicRank:observationValue(group.rows,'organicRank',{source:'ranks'}),sponsoredRank:observationValue(group.rows,'sponsoredRank',{source:'ranks'}),indexed:observationValue(group.rows,'indexed',{source:'ranks'})
  },asins:group.rows.map(row=>row?.asin),provenance:[provenanceFor('ranks','Imported rank snapshot evidence','imported',record)]})).filter(Boolean);
}
function keywordAssetValue(row){for(const key of ['keyword','displayKeyword','display_keyword','normalizedKeyword','normalized_keyword','name','term','searchTerm','search_term']){const value=clean(row?.[key]);if(value)return value;}return'';}
function keywordAssetResultRows(rows=[],mode='discovery',record=null){
  const prepared=(Array.isArray(rows)?rows:[]).map(row=>({...row,__keyword:keywordAssetValue(row)}));
  return groupByKeyword(prepared,'__keyword').map(group=>resultRow({keyword:group.keyword,mode,sources:['keyword-assets'],metrics:{
    assetStatus:observationValue(group.rows,'status',{source:'keyword-assets',quality:'calculated'}),assetIntent:observationValue(group.rows,'intent',{source:'keyword-assets',quality:'calculated'}),assetFolder:observationValue(group.rows,'folder',{source:'keyword-assets',quality:'calculated'}),assetTags:observationValue(group.rows,'tags',{source:'keyword-assets',quality:'calculated'}),assetProtected:observationValue(group.rows,'protected',{source:'keyword-assets',quality:'calculated'})
  },provenance:[provenanceFor('keyword-assets','Derived Keyword Library asset','calculated',record)]})).filter(Boolean);
}
function asinResultRows(comparison=[]){
  return (Array.isArray(comparison)?comparison:[]).map(item=>resultRow({keyword:item?.keyword,mode:'asin',sources:['reverse-asin'],asins:item?.asins||[],segment:item?.segment||'',metrics:{
    searchVolume:metric(Number(item?.volume)||0,'reverse-asin',{available:Number(item?.volume)>0}),organicRank:metric(item?.organicGap||null,'reverse-asin',{available:Boolean(item?.organicGap)}),sponsoredRank:metric(item?.sponsoredGap||null,'reverse-asin',{available:Boolean(item?.sponsoredGap)}),trafficShare:metric(item?.trafficGap||null,'reverse-asin',{available:Boolean(item?.trafficGap)}),conversionRate:metric(item?.conversionGap||null,'reverse-asin',{available:Boolean(item?.conversionGap)})
  },provenance:[provenanceFor('reverse-asin','Imported reverse-ASIN keyword evidence')]})).filter(Boolean);
}
function dedupeProvenance(items=[]){const seen=new Set(),out=[];for(const item of items){const key=[item?.kind,item?.label,item?.quality,item?.source,item?.importedAt,item?.provider,item?.reportType,item?.reportVersion,item?.snapshotDate,item?.sourceFile,item?.marketplace,item?.asin].map(clean).join('\u001f');if(seen.has(key))continue;seen.add(key);out.push(item);}return out;}
function mergeMetricEvidence(rows=[]){
  const byKey=new Map();
  for(const row of rows){for(const [key,evidence] of Object.entries(row?.metrics||{})){if(!evidence)continue;if(!byKey.has(key))byKey.set(key,[]);byKey.get(key).push(evidence);}}
  const out={};
  for(const [key,evidenceList] of byKey){
    const bySource=new Map();
    for(const evidence of evidenceList){const source=clean(evidence?.source)||'unknown';if(!bySource.has(source))bySource.set(source,[]);bySource.get(source).push(evidence);}
    if(bySource.size===1){const [source,list]=[...bySource.entries()][0];out[key]=list.length===1?list[0]:metric(Object.freeze(list.map(item=>item.value)),source,{available:list.some(item=>item.available),quality:list[0]?.quality||'imported'});continue;}
    for(const [source,list] of bySource){const target=`${source}.${key}`;out[target]=list.length===1?list[0]:metric(Object.freeze(list.map(item=>item.value)),source,{available:list.some(item=>item.available),quality:list[0]?.quality||'imported'});}
  }
  return Object.freeze(out);
}
function mergeKeywordRows(rows=[],mode='discovery'){
  const valid=(Array.isArray(rows)?rows:[]).filter(Boolean);if(!valid.length)return null;
  const keyword=valid[0].keyword,sources=valid.flatMap(row=>row.sources||[]),asins=valid.flatMap(row=>row.asins||[]),segments=[...new Set(valid.map(row=>clean(row.segment)).filter(Boolean))];
  return resultRow({keyword,mode,sources,metrics:mergeMetricEvidence(valid),asins,segment:segments.join(' | '),provenance:dedupeProvenance(valid.flatMap(row=>row.provenance||[])),matched:valid.some(row=>row.matched),reason:valid.find(row=>row.reason)?.reason||''});
}
function mergeEvidenceRows(collections=[],mode='discovery'){
  const groups=new Map();
  for(const row of (Array.isArray(collections)?collections:[]).flat()){if(!row)continue;const key=normalizedKeyword(row.keyword);if(!key)continue;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
  return [...groups.values()].map(rows=>mergeKeywordRows(rows,mode)).filter(Boolean);
}
function combinedKeywordEvidence(adsItems=[],records=[],mode='discovery',{excludeSources=[]}={}){
  const excluded=new Set(excludeSources),sqp=recordFor(records,'sqp'),reverse=recordFor(records,'reverse-asin'),ranks=recordFor(records,'ranks'),assets=recordFor(records,'keyword-assets');
  return mergeEvidenceRows([
    excluded.has('ads')?[]:adsResultRows(adsItems,mode),
    excluded.has('sqp')||!sqp?[]:sqpResultRows(sqp.rows,mode,sqp),
    excluded.has('reverse-asin')||!reverse?[]:reverseAsinEvidenceRows(reverse.rows,mode,reverse),
    excluded.has('ranks')||!ranks?[]:rankResultRows(ranks.rows,mode,ranks),
    excluded.has('keyword-assets')||!assets?[]:keywordAssetResultRows(assets.rows,mode,assets)
  ],mode);
}
function enrichBaseRows(baseRows=[],evidenceRows=[],mode='asin'){
  const index=new Map((evidenceRows||[]).map(row=>[normalizedKeyword(row?.keyword),row]));
  return (baseRows||[]).map(base=>{const extra=index.get(normalizedKeyword(base?.keyword));return mergeKeywordRows(extra?[base,extra]:[base],mode);}).filter(Boolean);
}
function filterAdsByQuery(items=[],query=''){const q=normalizedKeyword(query);if(!q)return[...items];const tokens=q.split(/\s+/).filter(Boolean);return items.filter(item=>tokens.some(token=>normalizedKeyword(item?.name).includes(token)));}
function filterResultRowsByQuery(rows=[],query=''){const q=normalizedKeyword(query);if(!q)return[...rows];const tokens=q.split(/\s+/).filter(Boolean);return rows.filter(row=>tokens.some(token=>normalizedKeyword(row?.keyword).includes(token)));}
function keywordTokens(value){return clean(value).toLocaleLowerCase().match(/[\p{L}\p{N}]+(?:[+.-][\p{L}\p{N}]+)*/gu)||[];}
function rowKeyword(row){return clean(row?.keyword??row?.name);}
function containsGram(keyword,gram){const source=keywordTokens(keyword),target=keywordTokens(gram);if(!target.length||target.length>source.length)return false;for(let start=0;start<=source.length-target.length;start+=1){let match=true;for(let index=0;index<target.length;index+=1)if(source[start+index]!==target[index]){match=false;break;}if(match)return true;}return false;}
function extractNgrams(value,gramMode='1',{ignoreStopwords=false}={}){const mode=NGRAM_MODES.includes(gramMode)?gramMode:'1',tokens=keywordTokens(value);if(!tokens.length)return[];const sizes=mode==='3+'?Array.from({length:Math.max(0,tokens.length-2)},(_,index)=>index+3):[Number(mode)],out=[];for(const size of sizes){if(size>tokens.length)continue;for(let start=0;start<=tokens.length-size;start+=1){const parts=tokens.slice(start,start+size);if(ignoreStopwords&&(STOP_WORDS.has(parts[0])||STOP_WORDS.has(parts[parts.length-1])))continue;out.push(parts.join(' '));}}return[...new Set(out)];}
function ngramFrequency(rows=[],gramMode='1',{ignoreStopwords=false,limit=40}={}){const counts=new Map();for(const row of Array.isArray(rows)?rows:[]){for(const gram of extractNgrams(rowKeyword(row),gramMode,{ignoreStopwords}))counts.set(gram,(counts.get(gram)||0)+1);}const sorted=[...counts].map(([gram,count])=>Object.freeze({gram,count})).sort((a,b)=>b.count-a.count||a.gram.localeCompare(b.gram));return Number.isFinite(Number(limit))&&Number(limit)>=0?sorted.slice(0,Number(limit)):sorted;}
function normalizeRootWorkspaceState(state={}){const unique=values=>[...new Set((Array.isArray(values)?values:[]).map(normalizedKeyword).filter(Boolean))],gramMode=NGRAM_MODES.includes(state?.gramMode)?state.gramMode:'1',excludedRoots=unique(state?.excludedRoots),deletedKeywords=unique(state?.deletedKeywords);let activeRoot=normalizedKeyword(state?.activeRoot);if(activeRoot&&excludedRoots.includes(activeRoot))activeRoot='';return Object.freeze({gramMode,ignoreStopwords:state?.ignoreStopwords!==false,activeRoot,excludedRoots:Object.freeze(excludedRoots),deletedKeywords:Object.freeze(deletedKeywords)});}
function reduceRootWorkspaceState(state={},action={}){const current=normalizeRootWorkspaceState(state),type=clean(action?.type),value=normalizedKeyword(action?.value);if(type==='set-gram')return normalizeRootWorkspaceState({...current,gramMode:NGRAM_MODES.includes(action?.value)?action.value:current.gramMode});if(type==='set-stopwords')return normalizeRootWorkspaceState({...current,ignoreStopwords:Boolean(action?.value)});if(type==='select-root')return normalizeRootWorkspaceState({...current,activeRoot:current.activeRoot===value?'':value});if(type==='clear-root')return normalizeRootWorkspaceState({...current,activeRoot:''});if(type==='exclude-root'&&value)return normalizeRootWorkspaceState({...current,activeRoot:current.activeRoot===value?'':current.activeRoot,excludedRoots:[...current.excludedRoots,value]});if(type==='include-root'&&value)return normalizeRootWorkspaceState({...current,excludedRoots:current.excludedRoots.filter(item=>item!==value)});if(type==='delete-keyword'&&value)return normalizeRootWorkspaceState({...current,deletedKeywords:[...current.deletedKeywords,value]});if(type==='restore-keyword'&&value)return normalizeRootWorkspaceState({...current,deletedKeywords:current.deletedKeywords.filter(item=>item!==value)});return current;}
function applyKeywordWorkspace(rows=[],state={}, {respectActive=true}={}){const view=normalizeRootWorkspaceState(state),deleted=new Set(view.deletedKeywords);return(Array.isArray(rows)?rows:[]).filter(row=>{const keyword=rowKeyword(row),key=normalizedKeyword(keyword);if(!key||deleted.has(key))return false;if(view.excludedRoots.some(root=>containsGram(keyword,root)))return false;if(respectActive&&view.activeRoot&&!containsGram(keyword,view.activeRoot))return false;return true;});}
function highlightKeywordHtml(keyword,gram){const source=clean(keyword),target=normalizedKeyword(gram);if(!source||!target)return escapeHtml(source);const pattern=target.split(/\s+/).map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s+');try{return escapeHtml(source).replace(new RegExp(`(${pattern})`,'ig'),'<mark>$1</mark>');}catch{return escapeHtml(source);}}
function parseCsvMatrix(value){
  const text=String(value??'').replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false;
  for(let index=0;index<text.length;index+=1){const char=text[index];if(quoted){if(char==='"'&&text[index+1]==='"'){cell+='"';index+=1;continue;}if(char==='"'){quoted=false;continue;}cell+=char;continue;}if(char==='"'){quoted=true;continue;}if(char===','){row.push(cell);cell='';continue;}if(char==='\n'){row.push(cell);rows.push(row);row=[];cell='';continue;}if(char==='\r')continue;cell+=char;}
  if(quoted)return{ok:false,rows:[],reason:'unclosed-quote'};row.push(cell);if(row.some(part=>String(part).length)||rows.length)rows.push(row);return{ok:true,rows};
}
function batchHeader(value){return clean(value).toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');}
function normalizeBatchKeywordList(values=[],{source='manual',format='text'}={}){
  const cleaned=(Array.isArray(values)?values:[]).map(clean).filter(Boolean),seen=new Set(),keywords=[];
  for(const value of cleaned){const key=normalizedKeyword(value);if(!key||seen.has(key))continue;seen.add(key);keywords.push(value);}
  if(!keywords.length)return Object.freeze({ok:false,source,format,keywords:Object.freeze([]),inputCount:cleaned.length,duplicateCount:cleaned.length,reason:'empty-input'});
  if(keywords.length>BATCH_INPUT_LIMIT)return Object.freeze({ok:false,source,format,keywords:Object.freeze(keywords),inputCount:cleaned.length,duplicateCount:cleaned.length-keywords.length,reason:'limit-exceeded'});
  return Object.freeze({ok:true,source,format,keywords:Object.freeze(keywords),inputCount:cleaned.length,duplicateCount:cleaned.length-keywords.length,reason:''});
}
function parseBatchInput(value,{source='manual'}={}){
  const raw=String(value??'').replace(/^\uFEFF/,'').trim();if(!raw)return normalizeBatchKeywordList([],{source,format:'text'});
  const parsed=parseCsvMatrix(raw);if(!parsed.ok)return Object.freeze({ok:false,source,format:'csv',keywords:Object.freeze([]),inputCount:0,duplicateCount:0,reason:'malformed-csv'});
  const rows=parsed.rows.filter(row=>row.some(cell=>clean(cell)));if(!rows.length)return normalizeBatchKeywordList([],{source,format:'text'});
  const headerIndex=rows[0].findIndex(cell=>BATCH_HEADER_ALIASES.has(batchHeader(cell)));
  if(headerIndex>=0)return normalizeBatchKeywordList(rows.slice(1).map(row=>row[headerIndex]??''),{source,format:'csv'});
  if(rows.length===1)return normalizeBatchKeywordList(rows[0],{source,format:rows[0].length>1?'comma':'text'});
  if(rows.every(row=>row.length===1))return normalizeBatchKeywordList(rows.map(row=>row[0]),{source,format:'lines'});
  return Object.freeze({ok:false,source,format:'csv',keywords:Object.freeze([]),inputCount:0,duplicateCount:0,reason:'csv-header-required'});
}
function keywordLibraryInput(records=[]){
  const record=recordFor(records,'keyword-assets');if(!record)return Object.freeze({ok:false,source:'keyword-library',format:'library',keywords:Object.freeze([]),inputCount:0,duplicateCount:0,reason:'library-missing'});
  const parsed=normalizeBatchKeywordList((record.rows||[]).map(keywordAssetValue),{source:'keyword-library',format:'library'});if(!parsed.ok&&parsed.reason==='empty-input')return Object.freeze({...parsed,reason:'library-empty'});return parsed;
}
function batchLeftJoin(inputs=[],evidenceRows=[],{inputSource='manual',missingReason='No exact keyword match across loaded keyword evidence.'}={}){
  const index=new Map();for(const row of evidenceRows||[]){const key=normalizedKeyword(row?.keyword);if(key&&!index.has(key))index.set(key,row);}const inputLabel=INPUT_SOURCE_LABELS[inputSource]||clean(inputSource)||'Batch input';
  return (inputs||[]).map(value=>{const keyword=typeof value==='string'?clean(value):clean(value?.keyword),evidence=index.get(normalizedKeyword(keyword)),inputProvenance={kind:'batch-input',label:inputLabel,quality:'input'};
    if(!evidence)return resultRow({keyword,mode:'batch',sources:[],metrics:{},provenance:[inputProvenance,...SOURCE_ORDER.map(kind=>({kind,label:`${kind} keyword evidence`,quality:'missing'}))],matched:false,reason:missingReason});
    return resultRow({keyword,mode:'batch',sources:evidence.sources||[],metrics:evidence.metrics||{},asins:evidence.asins||[],segment:evidence.segment||'',provenance:[inputProvenance,...(evidence.provenance||[])],matched:true,reason:''});
  }).filter(Boolean);
}
function batchMatchSummary(rows=[]){const total=(rows||[]).length,matched=(rows||[]).filter(row=>row?.matched).length;return Object.freeze({total,matched,missing:total-matched});}
function modelSummary(rows=[]){const sourceSet=new Set(),metricSet=new Set();for(const row of rows||[]){for(const source of row?.sources||[])sourceSet.add(source);for(const [key,evidence] of Object.entries(row?.metrics||{}))if(evidence?.available)metricSet.add(key);}return Object.freeze({rows:(rows||[]).length,sources:Object.freeze([...sourceSet].sort((a,b)=>sourceRank(a)-sourceRank(b)||a.localeCompare(b))),metrics:Object.freeze([...metricSet])});}
function sameResultShape(rows=[]){return (rows||[]).every(row=>RESULT_FIELDS.every(field=>Object.hasOwn(row||{},field)));}

const PUBLIC_API={BATCH_INPUT_LIMIT,VALID_RECORD_STATES,SOURCE_ORDER,MODE_CATALOG,RESULT_FIELDS,BATCH_HEADER_ALIASES,INPUT_SOURCE_LABELS,NGRAM_MODES,STOP_WORDS,LABELS,clean,normalizedKeyword,languageMode,labels,escapeHtml,metric,resultRow,validRecord,recordFor,observationValue,groupByKeyword,latestPerAsinKeyword,adsResultRows,sqpResultRows,thirdPartyColumnMetrics,thirdPartyProvenance,reverseAsinEvidenceRows,rankResultRows,keywordAssetValue,keywordAssetResultRows,asinResultRows,mergeMetricEvidence,mergeKeywordRows,mergeEvidenceRows,combinedKeywordEvidence,enrichBaseRows,filterAdsByQuery,filterResultRowsByQuery,keywordTokens,rowKeyword,containsGram,extractNgrams,ngramFrequency,normalizeRootWorkspaceState,reduceRootWorkspaceState,applyKeywordWorkspace,highlightKeywordHtml,parseCsvMatrix,batchHeader,normalizeBatchKeywordList,parseBatchInput,keywordLibraryInput,batchLeftJoin,batchMatchSummary,modelSummary,sameResultShape};
if(!root?.document)return PUBLIC_API;

const doc=root.document,$=(selector,scope=doc)=>scope.querySelector(selector);let observer=null,auditTimer=0;const batchState={rawText:'',parsed:null,source:'manual',error:'',dirty:false};let rootWorkspaceState=normalizeRootWorkspaceState({gramMode:'1',ignoreStopwords:true});
function currentPage(){return root.KeywordOSPageRegistry?.pageFromHash?.(root.location?.hash||'')||root.KeywordOSUIBridge?.page||'';}
function uiMode(){if(currentPage()==='asin-comparison')return'asin';if(currentPage()!=='cerebro')return'';return $('[data-research-mode="analyze"]')?.classList.contains('active')?'batch':'discovery';}
function adsAggregates(){const bridge=root.KeywordOSUIBridge;return bridge?.aggregateLevel?.(bridge?.getRangeRows?.()||bridge?.adsRows||[],'searchterm')||[];}
function combinedRows(mode='discovery'){return combinedKeywordEvidence(adsAggregates(),root.KeywordOSUIBridge?.datasetRegistry||[],mode);}
function currentRows(mode=uiMode()){
  const bridge=root.KeywordOSUIBridge,growth=root.KeywordOSGrowth,records=bridge?.datasetRegistry||[];
  if(mode==='asin'){
    const reverse=recordFor(records,'reverse-asin')?.rows||[],master=recordFor(records,'product-master')?.rows||[],comparison=growth?.asinKeywordComparison?.(reverse,master.map(row=>row.asin))||[],base=asinResultRows(comparison);
    return enrichBaseRows(base,combinedKeywordEvidence(adsAggregates(),records,'asin',{excludeSources:['reverse-asin']}),'asin');
  }
  if(mode==='batch'){if(batchState.dirty||!batchState.parsed?.ok)return[];return batchLeftJoin(batchState.parsed.keywords,combinedRows('batch'),{inputSource:batchState.source,missingReason:labels(root.KeywordOSI18N?.getLanguage?.()||'en').exactMissing});}
  return filterResultRowsByQuery(combinedRows('discovery'),$('#research-query')?.value||'');
}
function batchReasonText(reason,text){return({'empty-input':text.emptyInput,'limit-exceeded':text.limitExceeded,'malformed-csv':text.malformedCsv,'csv-header-required':text.csvHeaderRequired,'library-missing':text.libraryMissing,'library-empty':text.libraryEmpty})[reason]||clean(reason);}
function modeStatus(mode,summary,text,rows=[]){if(mode==='batch'){if(batchState.error)return batchState.error;if(batchState.dirty)return text.inputChanged;if(!batchState.parsed?.ok)return text.batchLimit;const match=batchMatchSummary(rows);return `${batchState.parsed.keywords.length} inputs · ${match.matched} ${text.matched} · ${match.missing} ${text.missing} · exact left join · ${summary.sources.length} sources`;}const source=mode==='asin'?text.reverse:text.evidence,metrics=summary.metrics.length?summary.metrics.join(', '):'no available metrics';return `${source} · ${summary.rows} keyword rows · ${metrics}`;}
function shellSignature(active,summary,mode,rows=[]){const match=batchMatchSummary(rows);return[active,languageMode(mode),summary.rows,summary.sources.join(','),summary.metrics.join(','),match.matched,match.missing,batchState.parsed?.keywords?.length||0,batchState.dirty?'dirty':'clean',batchState.error].join('|');}
function shellHtml(active,summary,text,signature,rows=[]){const button=(mode,label)=>`<button type="button" class="mode-tab ${active===mode?'active':''}" data-keyword-lab-mode="${mode}" aria-pressed="${active===mode?'true':'false'}">${label}</button>`;return `<div class="card" data-keyword-lab-shell data-keyword-lab-signature="${escapeHtml(signature)}"><div class="card-head"><div class="card-title"><h3 data-no-i18n>${text.title}</h3><small data-no-i18n>${text.subtitle}</small></div></div><div class="card-body"><div class="mode-tabs" role="tablist" aria-label="Keyword Lab modes">${button('discovery',text.discovery)}${button('batch',text.batch)}${button('asin',text.asin)}</div><div class="small muted" data-keyword-lab-status data-no-i18n>${escapeHtml(modeStatus(active,summary,text,rows))}</div><div class="small muted" data-no-i18n>${text.contract}</div></div></div>`;}
function openCoreMode(mode){const run=()=>{const target=mode==='batch'?'analyze':'suggest',tab=$(`[data-research-mode="${target}"]`);if(tab){tab.click();root.setTimeout(enhance,0);return true;}return false;};if(currentPage()==='cerebro'&&run())return;const nav=$('#sidebar-nav [data-page="cerebro"]');if(nav){nav.click();root.setTimeout(()=>{run();enhance();},30);return;}root.location.hash='#page=cerebro';}
function activate(mode){if(mode==='asin'){const nav=$('#sidebar-nav [data-page="asin-comparison"]');if(nav){nav.click();root.setTimeout(enhance,30);return;}root.location.hash='#page=asin-comparison';root.KeywordOSGrowth?.render?.('asin-comparison');root.setTimeout(enhance,0);return;}openCoreMode(mode);}
function bindShell(shell){shell?.querySelectorAll('[data-keyword-lab-mode]').forEach(button=>{if(button.dataset.keywordLabBound==='1')return;button.dataset.keywordLabBound='1';button.addEventListener('click',()=>activate(button.dataset.keywordLabMode));});}
function setLegacyBatchVisibility(active,content){for(const selector of ['.cerebro-search-card','.data-workspace'])for(const node of content.querySelectorAll(selector)){if(active){if(!node.hidden){node.hidden=true;node.dataset.keywordLabHidden='1';}}else if(node.dataset.keywordLabHidden==='1'){node.hidden=false;delete node.dataset.keywordLabHidden;}}}
function metricText(row,key){const evidence=row?.metrics?.[key]||row?.metrics?.[`ads.${key}`];return evidence?.available?String(evidence.value):'—';}
function batchResultsHtml(rows,text){if(!batchState.parsed?.ok||batchState.dirty)return'';const body=rows.map(row=>`<tr data-keyword-lab-keyword="${encodeURIComponent(row.keyword)}"><td><b class="keyword-lab-keyword-text">${highlightKeywordHtml(row.keyword,rootWorkspaceState.activeRoot)}</b> <button type="button" class="btn sm" data-keyword-lab-delete="${encodeURIComponent(row.keyword)}">${text.deleteRow}</button></td><td>${row.matched?escapeHtml(text.matched):escapeHtml(text.missing)}</td><td>${escapeHtml(row.sources.join(', ')||'—')}</td><td>${escapeHtml(metricText(row,'orders'))}</td><td>${escapeHtml(metricText(row,'sales'))}</td><td>${escapeHtml(row.reason||'—')}</td></tr>`).join('');return `<div class="table-wrap" data-keyword-lab-batch-results><table><thead><tr><th>${text.keyword}</th><th>${text.matched}</th><th>${text.source}</th><th>${text.orders}</th><th>${text.sales}</th><th>${text.reason}</th></tr></thead><tbody>${body}</tbody></table></div>`;}
function batchWorkspaceHtml(rows,text,signature){const status=batchState.error||(!batchState.parsed?.ok?text.noBatch:modeStatus('batch',modelSummary(rows),text,rows));return `<div data-keyword-lab-batch-host data-keyword-lab-batch-signature="${escapeHtml(signature)}"><div class="card" data-keyword-lab-batch><div class="card-head"><div class="card-title"><h3 data-no-i18n>${text.batchInputTitle}</h3><small data-no-i18n>${text.batchInputHelp}</small></div></div><div class="card-body"><textarea id="keyword-lab-batch-input" class="input" rows="7" style="width:100%;resize:vertical" data-no-i18n placeholder="${escapeHtml(text.batchPlaceholder)}">${escapeHtml(batchState.rawText)}</textarea><div class="toolbar" style="margin-top:10px"><button type="button" class="btn secondary" data-keyword-lab-action="csv">${text.importCsv}</button><button type="button" class="btn secondary" data-keyword-lab-action="library">${text.useLibrary}</button><button type="button" class="btn primary" data-keyword-lab-action="analyze">${text.analyze}</button><input type="file" accept=".csv,text/csv" data-keyword-lab-csv hidden></div><div class="small muted" data-keyword-lab-batch-status data-no-i18n>${escapeHtml(status)}</div></div></div>${batchResultsHtml(rows,text)}</div>`;}
function batchWorkspaceSignature(rows,mode){const match=batchMatchSummary(rows),view=normalizeRootWorkspaceState(rootWorkspaceState);return[languageMode(mode),batchState.rawText,batchState.parsed?.source||'',batchState.parsed?.format||'',batchState.parsed?.keywords?.join('\u001f')||'',batchState.error,batchState.dirty?'dirty':'clean',match.matched,match.missing,modelSummary(rows).sources.join(','),view.activeRoot,view.excludedRoots.join(','),view.deletedKeywords.join(',')].join('|');}
function applyBatchParsed(parsed,rawText,source){batchState.rawText=String(rawText??'');batchState.source=source||parsed?.source||'manual';batchState.parsed=parsed?.ok?parsed:null;batchState.dirty=false;batchState.error=parsed?.ok?'':batchReasonText(parsed?.reason,labels(root.KeywordOSI18N?.getLanguage?.()||'en'));}
function bindBatchWorkspace(host,text){if(!host||host.dataset.keywordLabBatchBound==='1')return;host.dataset.keywordLabBatchBound='1';const textarea=$('#keyword-lab-batch-input',host),file=$('[data-keyword-lab-csv]',host);textarea?.addEventListener('input',()=>{batchState.rawText=textarea.value;batchState.dirty=true;batchState.error='';const status=$('[data-keyword-lab-batch-status]',host);if(status)status.textContent=text.inputChanged;const results=$('[data-keyword-lab-batch-results]',host);if(results)results.hidden=true;});$('[data-keyword-lab-action="analyze"]',host)?.addEventListener('click',()=>{const raw=textarea?.value||'';applyBatchParsed(parseBatchInput(raw,{source:'manual'}),raw,'manual');enhance();});$('[data-keyword-lab-action="csv"]',host)?.addEventListener('click',()=>file?.click());file?.addEventListener('change',async()=>{const selected=file.files?.[0];if(!selected)return;const raw=await selected.text();applyBatchParsed(parseBatchInput(raw,{source:'csv'}),raw,'csv');enhance();});$('[data-keyword-lab-action="library"]',host)?.addEventListener('click',()=>{const parsed=keywordLibraryInput(root.KeywordOSUIBridge?.datasetRegistry||[]),raw=parsed.ok?parsed.keywords.join('\n'):'';applyBatchParsed(parsed,raw,'keyword-library');enhance();});}
function renderBatchWorkspace(){const content=$('#content');if(!content)return false;const active=uiMode()==='batch';setLegacyBatchVisibility(active,content);let host=$('[data-keyword-lab-batch-host]',content);if(!active){host?.remove();return false;}const text=labels(root.KeywordOSI18N?.getLanguage?.()||'en'),allRows=currentRows('batch'),rows=applyKeywordWorkspace(allRows,rootWorkspaceState),signature=batchWorkspaceSignature(rows,root.KeywordOSI18N?.getLanguage?.()||'en');if(!host){const shell=$('[data-keyword-lab-shell]',content);(shell||content.firstElementChild)?.insertAdjacentHTML(shell?'afterend':'beforebegin',batchWorkspaceHtml(rows,text,signature));host=$('[data-keyword-lab-batch-host]',content);}else if(host.dataset.keywordLabBatchSignature!==signature){host.outerHTML=batchWorkspaceHtml(rows,text,signature);host=$('[data-keyword-lab-batch-host]',content);}bindBatchWorkspace(host,text);return true;}
function rootWorkspaceSignature(rows,language){const view=normalizeRootWorkspaceState(rootWorkspaceState),base=applyKeywordWorkspace(rows,view,{respectActive:false}),visible=applyKeywordWorkspace(rows,view),freq=ngramFrequency(base,view.gramMode,{ignoreStopwords:view.ignoreStopwords});return[languageMode(language),view.gramMode,view.ignoreStopwords?'1':'0',view.activeRoot,view.excludedRoots.join(','),view.deletedKeywords.join(','),base.length,visible.length,freq.map(item=>`${item.gram}:${item.count}`).join(',')].join('|');}
function rootWorkspaceHtml(rows,text,signature){const view=normalizeRootWorkspaceState(rootWorkspaceState),base=applyKeywordWorkspace(rows,view,{respectActive:false}),visible=applyKeywordWorkspace(rows,view),freq=ngramFrequency(base,view.gramMode,{ignoreStopwords:view.ignoreStopwords}),gramTabs=NGRAM_MODES.map(mode=>`<button type="button" class="mode-tab ${view.gramMode===mode?'active':''}" data-keyword-lab-gram-mode="${mode}" aria-pressed="${view.gramMode===mode?'true':'false'}">${mode}-gram</button>`).join(''),chips=freq.map(item=>`<span class="word-chip"><button type="button" class="utility-link" data-keyword-lab-root="${encodeURIComponent(item.gram)}">${escapeHtml(item.gram)} <b>${item.count}</b></button><button type="button" class="utility-link" data-keyword-lab-exclude-root="${encodeURIComponent(item.gram)}" title="${escapeHtml(text.excludeRoot)}">×</button></span>`).join('')||`<span class="small muted">${escapeHtml(text.emptyRoots)}</span>`,excluded=view.excludedRoots.map(value=>`<span class="word-chip">${escapeHtml(value)} <button type="button" class="utility-link" data-keyword-lab-include-root="${encodeURIComponent(value)}">${escapeHtml(text.restore)}</button></span>`).join('')||'—',deleted=view.deletedKeywords.map(value=>`<span class="word-chip">${escapeHtml(value)} <button type="button" class="utility-link" data-keyword-lab-restore="${encodeURIComponent(value)}">${escapeHtml(text.restore)}</button></span>`).join('')||'—';return `<div class="card" data-keyword-lab-roots data-keyword-lab-roots-signature="${escapeHtml(signature)}"><div class="card-head"><div class="card-title"><h3 data-no-i18n>${text.rootTitle}</h3><small data-no-i18n>${text.rootHelp}</small></div></div><div class="card-body"><div class="mode-tabs" style="margin-bottom:10px">${gramTabs}</div><label class="small"><input type="checkbox" data-keyword-lab-stopwords ${view.ignoreStopwords?'checked':''}> ${text.stopwords}</label><div class="small muted" style="margin:8px 0" data-no-i18n>${text.showing} ${visible.length} / ${base.length}${view.activeRoot?` · ${escapeHtml(view.activeRoot)}`:''} ${view.activeRoot?`<button type="button" class="utility-link" data-keyword-lab-clear-root>${text.clearRoot}</button>`:''}</div><div class="wordcloud">${chips}</div><div class="small muted" style="margin-top:12px">${text.excludedRoots}</div><div class="wordcloud">${excluded}</div><div class="small muted" style="margin-top:12px">${text.deletedRows}</div><div class="wordcloud">${deleted}</div></div></div>`;}
function getRootWorkspaceState(){return normalizeRootWorkspaceState(rootWorkspaceState);}
function replaceRootWorkspaceState(next){rootWorkspaceState=normalizeRootWorkspaceState(next);if(currentPage()==='cerebro'&&typeof root.KeywordOSUIBridge?.render==='function'){root.KeywordOSUIBridge.render();root.setTimeout(enhance,0);}else enhance();return rootWorkspaceState;}
function setRootWorkspaceState(action){return replaceRootWorkspaceState(reduceRootWorkspaceState(rootWorkspaceState,action));}
function bindRootWorkspace(host){if(!host||host.dataset.keywordLabRootsBound==='1')return;host.dataset.keywordLabRootsBound='1';host.querySelectorAll('[data-keyword-lab-gram-mode]').forEach(button=>button.addEventListener('click',()=>setRootWorkspaceState({type:'set-gram',value:button.dataset.keywordLabGramMode})));host.querySelector('[data-keyword-lab-stopwords]')?.addEventListener('change',event=>setRootWorkspaceState({type:'set-stopwords',value:event.target.checked}));host.querySelectorAll('[data-keyword-lab-root]').forEach(button=>button.addEventListener('click',()=>setRootWorkspaceState({type:'select-root',value:decodeURIComponent(button.dataset.keywordLabRoot)})));host.querySelectorAll('[data-keyword-lab-exclude-root]').forEach(button=>button.addEventListener('click',()=>setRootWorkspaceState({type:'exclude-root',value:decodeURIComponent(button.dataset.keywordLabExcludeRoot)})));host.querySelectorAll('[data-keyword-lab-include-root]').forEach(button=>button.addEventListener('click',()=>setRootWorkspaceState({type:'include-root',value:decodeURIComponent(button.dataset.keywordLabIncludeRoot)})));host.querySelectorAll('[data-keyword-lab-restore]').forEach(button=>button.addEventListener('click',()=>setRootWorkspaceState({type:'restore-keyword',value:decodeURIComponent(button.dataset.keywordLabRestore)})));host.querySelector('[data-keyword-lab-clear-root]')?.addEventListener('click',()=>setRootWorkspaceState({type:'clear-root'}));}
function renderRootWorkspace(){const page=currentPage(),active=uiMode();if(page!=='cerebro'&&page!=='asin-comparison')return false;const content=$('#content');if(!content||!active)return false;if(page==='cerebro'){const legacy=$('.research-summary',content);if(legacy&&!legacy.hidden){legacy.hidden=true;legacy.dataset.keywordLabHidden='1';}}const language=root.KeywordOSI18N?.getLanguage?.()||'en',text=labels(language),rows=currentRows(active),signature=rootWorkspaceSignature(rows,language);let host=$('[data-keyword-lab-roots]',content);if(!host){const batch=$('[data-keyword-lab-batch-host]',content),shell=$('[data-keyword-lab-shell]',content);(batch||shell||content.firstElementChild)?.insertAdjacentHTML(batch||shell?'afterend':'beforebegin',rootWorkspaceHtml(rows,text,signature));host=$('[data-keyword-lab-roots]',content);}else if(host.dataset.keywordLabRootsSignature!==signature){host.outerHTML=rootWorkspaceHtml(rows,text,signature);host=$('[data-keyword-lab-roots]',content);}bindRootWorkspace(host);return true;}
function filterLegacyAdsItems(items=[]){return applyKeywordWorkspace(items,rootWorkspaceState);}
function linkedKeyword(row){const encoded=row?.dataset?.keywordLabKeyword;if(encoded){try{return decodeURIComponent(encoded);}catch{return encoded;}}const link=row?.querySelector?.('[data-r-detail]');if(link?.dataset?.rDetail){try{return decodeURIComponent(link.dataset.rDetail);}catch{return clean(link.textContent);}}return clean(link?.textContent);}
function bindDeleteButton(button){if(!button||button.dataset.keywordLabDeleteBound==='1')return;button.dataset.keywordLabDeleteBound='1';button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();let value='';try{value=decodeURIComponent(button.dataset.keywordLabDelete||'');}catch{value=button.dataset.keywordLabDelete||'';}setRootWorkspaceState({type:'delete-keyword',value});});}
function syncLinkedTables(){const content=$('#content');if(!content)return;const active=normalizeRootWorkspaceState(rootWorkspaceState).activeRoot;content.querySelectorAll('.data-workspace .data-table tbody tr,[data-keyword-lab-batch-results] tbody tr').forEach(row=>{const keyword=linkedKeyword(row);if(!keyword)return;row.hidden=!applyKeywordWorkspace([{keyword}],rootWorkspaceState).length;const label=row.querySelector('.keyword-lab-keyword-text,[data-r-detail]');if(label)label.innerHTML=highlightKeywordHtml(keyword,active);let button=row.querySelector('[data-keyword-lab-delete]');if(!button&&label){label.insertAdjacentHTML('afterend',` <button type="button" class="btn sm" data-keyword-lab-delete="${encodeURIComponent(keyword)}">${escapeHtml(labels(root.KeywordOSI18N?.getLanguage?.()||'en').deleteRow)}</button>`);button=row.querySelector('[data-keyword-lab-delete]');}bindDeleteButton(button);});}
function applyShell(){const page=currentPage();if(page!=='cerebro'&&page!=='asin-comparison')return false;const content=$('#content');if(!content)return false;const active=uiMode();if(!active)return false;if(page==='cerebro'){const legacyModes=$('.cerebro-search-card > .mode-tabs');if(legacyModes&&!legacyModes.hidden){legacyModes.hidden=true;legacyModes.setAttribute('aria-hidden','true');}}const language=root.KeywordOSI18N?.getLanguage?.()||'en',text=labels(language),rows=currentRows(active),summary=modelSummary(rows),signature=shellSignature(active,summary,language,rows);let shell=$('[data-keyword-lab-shell]',content);if(!shell){content.insertAdjacentHTML('afterbegin',shellHtml(active,summary,text,signature,rows));shell=$('[data-keyword-lab-shell]',content);}else if(shell.dataset.keywordLabSignature!==signature){shell.outerHTML=shellHtml(active,summary,text,signature,rows);shell=$('[data-keyword-lab-shell]',content);}bindShell(shell);return true;}
function enhance(){auditTimer=0;applyShell();renderBatchWorkspace();renderRootWorkspace();syncLinkedTables();}
function schedule(){if(auditTimer)return;auditTimer=root.setTimeout(enhance,20);}
function start(){const boot=()=>{schedule();const content=$('#content');if(content&&typeof MutationObserver!=='undefined'){observer=new MutationObserver(schedule);observer.observe(content,{childList:true,subtree:true});}root.addEventListener('hashchange',schedule);root.addEventListener('popstate',schedule);doc.addEventListener('click',event=>{if(event.target instanceof root.Element&&event.target.closest('[data-lang]'))root.setTimeout(enhance,0);},true);};doc.readyState==='loading'?doc.addEventListener('DOMContentLoaded',boot,{once:true}):boot();}

return Object.assign(PUBLIC_API,{shellSignature,currentRows,uiMode,applyShell,renderBatchWorkspace,renderRootWorkspace,filterLegacyAdsItems,getRootWorkspaceState,replaceRootWorkspaceState,activate,start});
});
