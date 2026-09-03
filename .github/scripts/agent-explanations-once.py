from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}')
    p.write_text(text.replace(old, new, 1))


module = r'''(function(root,factory){
  const api=factory();
  if(typeof globalThis!=='undefined'){globalThis.KeywordOSAgentExplanations=api;globalThis.KeywordOSAgentExplanationsTest=api;}
  if(root)root.KeywordOSAgentExplanations=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';

const STORE_ID='store-a';
const VALID_STATUS='validated';
const MAX_EVIDENCE_ROWS=20;
const clean=value=>String(value??'').trim().replace(/\s+/g,' ');
const lower=value=>clean(value).toLowerCase();
const normalizedKeyword=value=>clean(value).toLowerCase();
const finite=value=>{if(value==null||String(value).trim()==='')return null;const number=Number(value);return Number.isFinite(number)?number:null;};
const dateValue=value=>{const text=clean(value).slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(text)?text:'';};
function validationStatus(record){return lower(record?.validation?.status||record?.validationStatus);}
function validatedRecords(records=[],storeId=STORE_ID){return(Array.isArray(records)?records:[]).filter(record=>record?.storeId===storeId&&validationStatus(record)===VALID_STATUS&&Array.isArray(record?.rows));}
function recordFor(records,kind){return validatedRecords(records).find(record=>record.kind===kind)||null;}
function rowKeyword(kind,row){if(kind==='ads')return row?.searchTerm;if(kind==='sqp')return row?.query??row?.keyword??row?.searchTerm;if(kind==='reverse-asin')return row?.keyword??row?.query??row?.searchTerm;if(kind==='ranks')return row?.keyword;if(kind==='keyword-assets')return row?.keyword??row?.name;return'';}
function exactIndexedRows(record,kind,keyword){const key=normalizedKeyword(keyword);return(record?.rows||[]).map((row,index)=>({row,index})).filter(item=>normalizedKeyword(rowKeyword(kind,item.row))===key);}
function latestDated(items=[],dateFn=item=>item.row?.date){const dates=items.map(item=>dateValue(dateFn(item))).filter(Boolean).sort();if(!dates.length)return items;const latest=dates.at(-1);return items.filter(item=>dateValue(dateFn(item))===latest);}
function latestPerIdentity(items=[],identityFn=()=>'',dateFn=item=>item.row?.date){const groups=new Map();for(const item of items){const identity=clean(identityFn(item)).toUpperCase();if(!identity)continue;if(!groups.has(identity))groups.set(identity,[]);groups.get(identity).push(item);}const out=[];for(const group of groups.values())out.push(...latestDated(group,dateFn));return out;}
function sumMetric(items=[],fields=[]){let seen=false,total=0;for(const item of items){for(const field of fields){const value=finite(item.row?.[field]);if(value!=null){seen=true;total+=value;break;}}}return seen?total:null;}
function int(value){return value==null?'—':Number(value).toLocaleString('en-US',{maximumFractionDigits:0});}
function money(value){return value==null?'—':`$${Number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
function pct(value){return value==null?'—':`${(Number(value)*100).toFixed(1)}%`;}
function tokenList(value){return lower(value).match(/[\p{L}\p{N}]+/gu)||[];}
function phraseCount(text,phrase){const haystack=tokenList(text),needle=tokenList(phrase);if(!needle.length||haystack.length<needle.length)return 0;let count=0;for(let index=0;index<=haystack.length-needle.length;index+=1){let match=true;for(let offset=0;offset<needle.length;offset+=1)if(haystack[index+offset]!==needle[offset]){match=false;break;}if(match)count+=1;}return count;}
function extractKeyword(query){const raw=clean(query);if(!raw)return'';const quoted=raw.match(/["“']([^"”']{1,240})["”']/);if(quoted)return clean(quoted[1]);const labeled=raw.match(/(?:keyword|关键词|词)\s*[:：]\s*(.+?)(?:[?？]|$)/i);if(labeled)return clean(labeled[1]);const english=raw.match(/(?:why\s+(?:is|was|would\s+be)?\s*|why\s+prioriti[sz]e\s+)(.+?)\s+(?:a\s+)?(?:priority|prioriti[sz]ed|prioritised)(?:[?？]|$)/i);if(english)return clean(english[1]).replace(/^(?:this\s+keyword|the\s+keyword)\s*/i,'');const chinese=raw.match(/(?:为什么|为何)\s*(.+?)\s*(?:优先|优先级(?:更高)?)(?:[?？]|$)/);if(chinese)return clean(chinese[1]).replace(/^(?:这个词|该词|关键词)\s*/,'');const chineseAfter=raw.match(/(?:为什么|为何)\s*(?:优先|优先选择)\s*(.+?)(?:[?？]|$)/);if(chineseAfter)return clean(chineseAfter[1]);return'';}
function classifyExplanationIntent(query){const q=lower(query);if(!q)return'';if(/what\s+data.*missing|missing\s+data|data\s+gaps?|what.*missing|缺少什么数据|还缺什么数据|缺哪些数据|数据缺口/.test(q))return'missing-data';if(/priority|prioriti[sz]ed|prioritised|prioriti[sz]e|优先|优先级/.test(q)&&(/\bwhy\b|为什么|为何|priority/.test(q)))return'keyword-priority';return'';}
function reverseCurrentRows(record){const indexed=(record?.rows||[]).map((row,index)=>({row,index})),groups=new Map();for(const item of indexed){const asin=clean(item.row?.asin).toUpperCase();if(!asin)continue;if(!groups.has(asin))groups.set(asin,[]);groups.get(asin).push(item);}const out=[];for(const group of groups.values())out.push(...latestDated(group,item=>item.row?.snapshotDate||item.row?.date));return out;}
function rankCurrentRows(record,keyword){return latestPerIdentity(exactIndexedRows(record,'ranks',keyword),item=>item.row?.asin,item=>item.row?.date);}
function listingPlacement(record,keyword){const row=record?.rows?.[0]||{},fields=[['Title',row.title],['Bullets',row.bullets],['Description',row.description],['Backend',row.searchTerms]],placements=[];let uses=0;for(const [label,text] of fields){const count=phraseCount(text,keyword);if(count){placements.push(`${label} ×${count}`);uses+=count;}}return{placements,uses,row};}
function rawEvidence(kind,items=[]){return items.slice(0,MAX_EVIDENCE_ROWS).map(item=>({kind,sourceRow:item.index+1,row:item.row}));}
function sourceSpec(kind){return({
  ads:{needed:'Exact Search Term row with imported Ads metrics',why:'Shows observed paid engagement/conversion for the exact term.'},
  sqp:{needed:'Exact SQP/Search Query row',why:'Shows imported search-demand and purchase-funnel evidence.'},
  'reverse-asin':{needed:'Exact keyword rows with ASIN identity',why:'Shows how many current imported ASIN result sets contain the exact term.'},
  ranks:{needed:'Exact keyword + ASIN dated rank row',why:'Shows observed organic/sponsored/index evidence for the exact term.'},
  'keyword-assets':{needed:'Exact Keyword Library asset',why:'Shows local favorite/status/recycle-bin curation state.'},
  listing:{needed:'Validated local Listing draft',why:'Shows exact phrase placement across Title/Bullets/Description/Backend.'},
  inventory:{needed:'Validated inventory snapshot dataset',why:'Supports inventory evidence questions.'},
  reviews:{needed:'Validated review evidence dataset',why:'Supports explicit review evidence questions.'},
  competitor:{needed:'Validated competitor snapshot dataset',why:'Supports imported competitor evidence questions.'},
  finance:{needed:'Validated Unified finance dataset',why:'Supports finance/refund evidence questions.'},
  'product-master':{needed:'Validated Product Master dataset',why:'Provides explicit product identity joins.'},
  costs:{needed:'Validated cost dataset',why:'Provides imported unit/inbound cost inputs.'}
})[kind]||{needed:`Validated ${kind} dataset`,why:'Supports this local evidence domain.'};}
function missingEntry(kind,status,keyword=''){const spec=sourceSpec(kind);return{kind,status,needed:spec.needed,why:keyword?`${spec.why} Exact keyword: “${keyword}”.`:spec.why};}
function keywordMissingData(records,keyword,observedKinds=new Set()){const kinds=['ads','sqp','reverse-asin','ranks','keyword-assets','listing'],out=[];for(const kind of kinds){const record=recordFor(records,kind);if(!record){out.push(missingEntry(kind,'Missing dataset',keyword));continue;}if(kind==='listing')continue;if(!observedKinds.has(kind))out.push(missingEntry(kind,'No exact keyword evidence',keyword));}return out;}
function keywordPriority(query,records=[]){
  const keyword=extractKeyword(query);if(!keyword)return{available:false,intent:'keyword-priority',title:'Keyword priority explanation / 关键词优先解释',summary:'An exact keyword phrase is required in the question. / 问题中需要明确写出要解释的关键词。',deterministic:'The Agent has no hidden selected-row context and will not guess which keyword “this keyword” refers to.',sourceRecords:[],evidenceRows:[],columns:[],explanationRows:[],missingData:[{kind:'keyword',status:'Missing query input',needed:'Quote the exact keyword, for example: Why is “blue light readers” prioritized?',why:'Exact keyword identity is required before local evidence can be joined.'}],note:'No external keyword facts or relevance score are generated.'};
  const observedKinds=new Set(),sourceRecords=[],evidenceRows=[],explanationRows=[],reasons=[];
  const ads=recordFor(records,'ads');if(ads){const items=exactIndexedRows(ads,'ads',keyword);if(items.length){observedKinds.add('ads');sourceRecords.push(ads);evidenceRows.push(...rawEvidence('ads',items));const orders=sumMetric(items,['orders']),sales=sumMetric(items,['sales']),clicks=sumMetric(items,['clicks']),spend=sumMetric(items,['cost','spend']);explanationRows.push({signal:'Ads exact Search Term',observed:`${items.length} row(s) · orders ${int(orders)} · sales ${money(sales)} · clicks ${int(clicks)} · spend ${money(spend)}`,rule:'Loaded-period sum of explicit exact Search Term rows; missing metrics stay —.'});if(orders>0)reasons.push(`${int(orders)} imported Ads order(s)`);else if(clicks>0)reasons.push(`${int(clicks)} imported Ads click(s)`);}}
  const sqp=recordFor(records,'sqp');if(sqp){const items=latestDated(exactIndexedRows(sqp,'sqp',keyword),item=>item.row?.date||item.row?.snapshotDate);if(items.length){observedKinds.add('sqp');sourceRecords.push(sqp);evidenceRows.push(...rawEvidence('sqp',items));const volume=sumMetric(items,['volume','searches']),clicks=sumMetric(items,['clicks']),purchases=sumMetric(items,['purchases','orders']);explanationRows.push({signal:'SQP exact query',observed:`latest snapshot · volume/searches ${int(volume)} · clicks ${int(clicks)} · purchases ${int(purchases)}`,rule:'Uses only the latest dated exact-query snapshot when dates exist.'});if(purchases>0)reasons.push(`${int(purchases)} imported SQP purchase(s)`);else if(volume>0)reasons.push(`${int(volume)} imported SQP search volume/searches`);}}
  const reverse=recordFor(records,'reverse-asin');if(reverse){const current=reverseCurrentRows(reverse),matches=current.filter(item=>normalizedKeyword(rowKeyword('reverse-asin',item.row))===normalizedKeyword(keyword)),asins=[...new Set(matches.map(item=>clean(item.row?.asin).toUpperCase()).filter(Boolean))],total=[...new Set(current.map(item=>clean(item.row?.asin).toUpperCase()).filter(Boolean))].length;if(matches.length){observedKinds.add('reverse-asin');sourceRecords.push(reverse);evidenceRows.push(...rawEvidence('reverse-asin',matches));explanationRows.push({signal:'reverse-ASIN exact overlap',observed:`${asins.length} of ${total||asins.length} current imported ASIN result set(s) contain the exact term`,rule:'Each ASIN contributes only its latest imported result set when dated snapshots exist.'});if(asins.length>=2)reasons.push(`exact overlap across ${asins.length} current imported ASIN result sets`);}}
  const ranks=recordFor(records,'ranks');if(ranks){const items=rankCurrentRows(ranks,keyword);if(items.length){observedKinds.add('ranks');sourceRecords.push(ranks);evidenceRows.push(...rawEvidence('ranks',items));const samples=items.slice(0,4).map(item=>`${clean(item.row?.asin)||'ASIN —'}: organic ${int(finite(item.row?.organicRank))}, sponsored ${int(finite(item.row?.sponsoredRank))}`).join('; ');explanationRows.push({signal:'Rank/index exact keyword',observed:samples||`${items.length} current row(s)`,rule:'Uses each ASIN latest dated exact-keyword snapshot; missing/zero rank is not converted to evidence.'});}}
  const assets=recordFor(records,'keyword-assets');let recycled=false;if(assets){const items=exactIndexedRows(assets,'keyword-assets',keyword);if(items.length){observedKinds.add('keyword-assets');sourceRecords.push(assets);evidenceRows.push(...rawEvidence('keyword-assets',items));const asset=items[0].row||{};recycled=Boolean(clean(asset.deletedAt));explanationRows.push({signal:'Keyword Library state',observed:`status ${clean(asset.status)||'—'} · favorite ${asset.favorite===true?'Yes':'No'} · recycle bin ${recycled?'Yes':'No'}`,rule:'Local curation state only; it is not marketplace evidence.'});if(asset.favorite===true&&!recycled)reasons.push('locally favorited in Keyword Library');}}
  const listing=recordFor(records,'listing');if(listing&&listing.rows.length){const placement=listingPlacement(listing,keyword);sourceRecords.push(listing);if(placement.uses){observedKinds.add('listing');evidenceRows.push({kind:'listing',sourceRow:1,row:placement.row});explanationRows.push({signal:'Listing exact phrase placement',observed:placement.placements.join(' · '),rule:'Complete contiguous token-boundary phrase matches only; no stemming or substring match.'});}}
  const uniqueSources=[...new Map(sourceRecords.map(record=>[record.kind,record])).values()],missingData=keywordMissingData(records,keyword,observedKinds);
  if(!explanationRows.length)return{available:false,intent:'keyword-priority',title:`Keyword priority explanation · ${keyword}`,summary:`No exact local evidence is available for “${keyword}”. / 当前没有“${keyword}”的精确本地证据。`,deterministic:'Exact normalized keyword equality is required. The Agent does not use substring, stemming, inferred synonyms or external facts.',sourceRecords:uniqueSources,evidenceRows:[],columns:[],explanationRows:[],missingData,note:'No hidden priority score is created.'};
  const reasonText=recycled?'The Keyword Library asset is currently in Recycle Bin, so the Agent will not call it an active priority.':reasons.length?`Observed reasons that can support attention: ${reasons.join('; ')}.`:'Exact imported/local evidence exists, but no order, purchase, multi-ASIN overlap or favorite signal is currently observed.';
  return{available:true,intent:'keyword-priority',title:`Why this keyword can be prioritized · ${keyword}`,summary:`${reasonText} KeywordOS does not compute a hidden global keyword priority score; this answer only exposes current exact evidence. / ${recycled?'该词当前位于回收站。':'只解释当前本地精确证据，不生成隐藏优先级分数。'}`,deterministic:'Join key = exact normalized keyword. Ads = loaded-period exact Search Term aggregate; SQP = latest dated exact query; reverse-ASIN = each ASIN latest result set; Rank = each ASIN latest dated exact keyword; Listing = exact phrase placement. Page-specific ordering rules remain authoritative.',sourceRecords:uniqueSources,evidenceRows:evidenceRows.slice(0,MAX_EVIDENCE_ROWS),columns:['date','snapshotDate','searchTerm','query','keyword','asin','orders','sales','clicks','cost','spend','volume','purchases','organicRank','sponsoredRank','indexed','status','favorite','deletedAt','title','searchTerms'],explanationRows,missingData,note:'Read-only deterministic explanation only. No Amazon Relevancy, search volume, rank, conversion, recommendation or external fact is invented when its source is missing.'};
}
const MODE_REQUIREMENTS=Object.freeze({
  general:['ads','sqp','reverse-asin','ranks','inventory','reviews','competitor','finance','listing','keyword-assets','product-master','costs'],
  help:['ads','sqp','reverse-asin','ranks','inventory','reviews','competitor','finance','listing','keyword-assets','product-master','costs'],
  advertising:['ads'],
  keyword:['ads','sqp','reverse-asin','ranks','keyword-assets','listing'],
  listing:['listing','keyword-assets'],
  profitability:['product-master','ads','finance','costs'],
  inventory:['inventory']
});
function recordCoverage(record){const dates=(record?.rows||[]).map(row=>dateValue(row?.date||row?.snapshotDate)).filter(Boolean).sort();return dates.length?`${dates[0]} → ${dates.at(-1)}`:'No dated coverage';}
function missingData(query,records=[],mode='general'){
  const keyword=extractKeyword(query);if(keyword){const observed=new Set();for(const kind of ['ads','sqp','reverse-asin','ranks','keyword-assets']){const record=recordFor(records,kind);if(!record)continue;const items=kind==='reverse-asin'?reverseCurrentRows(record).filter(item=>normalizedKeyword(rowKeyword(kind,item.row))===normalizedKeyword(keyword)):exactIndexedRows(record,kind,keyword);if(items.length)observed.add(kind);}const listing=recordFor(records,'listing');if(listing&&listingPlacement(listing,keyword).uses)observed.add('listing');const missing=keywordMissingData(records,keyword,observed),present=['ads','sqp','reverse-asin','ranks','keyword-assets','listing'].map(kind=>recordFor(records,kind)).filter(Boolean);return{available:true,intent:'missing-data',title:`Missing keyword evidence · ${keyword}`,summary:`${missing.length} local evidence gap(s) remain for the exact keyword “${keyword}”. These are KeywordOS local evidence gaps, not Amazon data requirements. / “${keyword}” 当前有 ${missing.length} 项本地证据缺口。`,deterministic:'A gap means either the validated dataset is absent or it contains no exact normalized row for this keyword. No external lookup is performed.',sourceRecords:present,evidenceRows:present.map(record=>({kind:record.kind,sourceRow:'registry',row:{kind:record.kind,source:clean(record.source)||'Unknown source',rows:record.rows.length,coverage:recordCoverage(record),importedAt:clean(record.importedAt)||'—'}})),columns:['kind','source','rows','coverage','importedAt'],explanationRows:[],missingData:missing,note:'Removing a source immediately changes this answer because no derived result is persisted.'};}
  const selected=MODE_REQUIREMENTS[mode]?mode:'general',kinds=MODE_REQUIREMENTS[selected],present=[],missing=[];for(const kind of kinds){const record=recordFor(records,kind);if(record&&record.rows.length)present.push(record);else missing.push(missingEntry(kind,record?'Empty dataset':'Missing dataset'));}
  return{available:true,intent:'missing-data',title:`Missing local evidence · ${selected}`,summary:`${missing.length} of ${kinds.length} local evidence dataset(s) in the ${selected} Agent scope are currently absent or empty. This is a KeywordOS capability inventory, not an Amazon requirement. / ${selected} 模式当前有 ${missing.length} 项本地数据缺口。`,deterministic:`Mode requirement set: ${kinds.join(', ')}. Only validated Store 01 Dataset Registry records with rows count as present.`,sourceRecords:present,evidenceRows:present.map(record=>({kind:record.kind,sourceRow:'registry',row:{kind:record.kind,source:clean(record.source)||'Unknown source',rows:record.rows.length,coverage:recordCoverage(record),importedAt:clean(record.importedAt)||'—'}})),columns:['kind','source','rows','coverage','importedAt'],explanationRows:[],missingData:missing,note:'No external service is queried and no missing value is estimated.'};
}
function explain(query,records=[],mode='general'){const intent=classifyExplanationIntent(query);if(intent==='keyword-priority')return keywordPriority(query,records);if(intent==='missing-data')return missingData(query,records,mode);return null;}
return{STORE_ID,VALID_STATUS,MODE_REQUIREMENTS,clean,normalizedKeyword,validatedRecords,recordFor,rowKeyword,exactIndexedRows,latestDated,latestPerIdentity,sumMetric,phraseCount,extractKeyword,classifyExplanationIntent,reverseCurrentRows,rankCurrentRows,listingPlacement,keywordMissingData,keywordPriority,missingData,explain};
});
'''
Path('keywordos-agent-explanations.js').write_text(module)

# Diagnostics: "why priority" is not a time-series change diagnosis.
replace_once('keywordos-agent-diagnostics.js',
"function isDiagnosticQuery(query){return /\\bwhy\\b|what caused|reason.*change|cause.*change|为什么|为何|原因|怎么.*(变|变化)|上涨.*原因|下降.*原因/.test(lower(query));}",
"function isDiagnosticQuery(query){const q=lower(query);if(/priority|prioriti[sz]ed|prioritised|prioriti[sz]e|优先|优先级|missing data|data gaps?|缺少什么数据|缺哪些数据|数据缺口/.test(q))return false;return /\\bwhy\\b|what caused|reason.*change|cause.*change|为什么|为何|原因|怎么.*(变|变化)|上涨.*原因|下降.*原因/.test(q);}")

# Specialist layer resolves explanation queries first, for every read-only mode.
replace_once('keywordos-agent-modes.js',
"  const base=(typeof globalThis!=='undefined'&&globalThis.KeywordOSAgentTest)||root?.KeywordOSAgent;\n  const api=factory(root,base);",
"  const base=(typeof globalThis!=='undefined'&&globalThis.KeywordOSAgentTest)||root?.KeywordOSAgent;\n  const explanations=(typeof globalThis!=='undefined'&&globalThis.KeywordOSAgentExplanationsTest)||root?.KeywordOSAgentExplanations;\n  const api=factory(root,base,explanations);")
replace_once('keywordos-agent-modes.js',
"})(typeof window!=='undefined'?window:null,function(root,base){",
"})(typeof window!=='undefined'?window:null,function(root,base,explanations){")
replace_once('keywordos-agent-modes.js',
"  general:{label:'General · 综合',defaultQuery:'What data is loaded?',examples:['What data is loaded?','Which search terms spent money with zero orders?','Show latest competitor snapshots']},",
"  general:{label:'General · 综合',defaultQuery:'What data is loaded?',examples:['What data is loaded?','Why is “blue light readers” prioritized?','What data is missing?','Which search terms spent money with zero orders?']},")
replace_once('keywordos-agent-modes.js',
"  keyword:{label:'Keyword · 关键词',defaultQuery:'Show search query evidence',examples:['Show search query evidence','Show rank evidence']},",
"  keyword:{label:'Keyword · 关键词',defaultQuery:'Show search query evidence',examples:['Show search query evidence','Why is “blue light readers” prioritized?','What data is missing?','Show rank evidence']},")
replace_once('keywordos-agent-modes.js',
"function resolve(mode,query,records=[]){\n  const selected=MODES[mode]?mode:'general',intent=base?.classifyIntent?.(query)||'help';",
"function resolve(mode,query,records=[]){\n  const selected=MODES[mode]?mode:'general',explanation=explanations?.explain?.(query,records,selected);if(explanation)return explanation;\n  const intent=base?.classifyIntent?.(query)||'help';")
old_answer = "function answerHtml(answer,mode){return`<section class=\"keywordos-agent-answer\"><div class=\"keywordos-agent-answer-head\"><div><span>${answer.available?'EVIDENCE ANSWER · 证据回答':'UNAVAILABLE · 不可用'} · ${esc(MODES[mode]?.label||MODES.general.label)}</span><h3>${esc(answer.title)}</h3></div></div><p class=\"keywordos-agent-summary\">${esc(answer.summary)}</p><div class=\"keywordos-agent-block\"><h4>Source provenance · 数据来源</h4>${provenanceHtml(answer.sourceRecords)}</div><div class=\"keywordos-agent-block\"><h4>Evidence rows · 证据行</h4>${evidenceHtml(answer)}</div><p class=\"keywordos-agent-note\">${esc(answer.note||'')}</p></section>`;}"
new_answer = "function explanationHtml(answer){const explanation=Array.isArray(answer.explanationRows)?answer.explanationRows:[],missing=Array.isArray(answer.missingData)?answer.missingData:[];let html='';if(answer.deterministic)html+=`<div class=\"keywordos-agent-block\"><h4>Deterministic rule · 确定性规则</h4><p>${esc(answer.deterministic)}</p></div>`;if(explanation.length)html+=`<div class=\"keywordos-agent-block\"><h4>Why this keyword · 为什么这个词</h4><div class=\"keywordos-agent-table-wrap\" tabindex=\"0\" aria-label=\"Agent deterministic explanation\"><table class=\"data-table\"><thead><tr><th class=\"left\">Signal</th><th class=\"left\">Observed</th><th class=\"left\">Rule</th></tr></thead><tbody>${explanation.map(row=>`<tr><td class=\"left\">${esc(row.signal)}</td><td class=\"left\">${esc(row.observed)}</td><td class=\"left\">${esc(row.rule)}</td></tr>`).join('')}</tbody></table></div></div>`;if(missing.length)html+=`<div class=\"keywordos-agent-block\"><h4>Missing data · 缺少的数据</h4><div class=\"keywordos-agent-table-wrap\" tabindex=\"0\" aria-label=\"Agent missing data\"><table class=\"data-table\"><thead><tr><th class=\"left\">Dataset</th><th class=\"left\">Status</th><th class=\"left\">Needed</th><th class=\"left\">Why</th></tr></thead><tbody>${missing.map(row=>`<tr><td class=\"left\">${esc(row.kind)}</td><td class=\"left\">${esc(row.status)}</td><td class=\"left\">${esc(row.needed)}</td><td class=\"left\">${esc(row.why)}</td></tr>`).join('')}</tbody></table></div></div>`;return html;}\nfunction answerHtml(answer,mode){return`<section class=\"keywordos-agent-answer\"><div class=\"keywordos-agent-answer-head\"><div><span>${answer.available?'EVIDENCE ANSWER · 证据回答':'UNAVAILABLE · 不可用'} · ${esc(MODES[mode]?.label||MODES.general.label)}</span><h3>${esc(answer.title)}</h3></div></div><p class=\"keywordos-agent-summary\">${esc(answer.summary)}</p>${explanationHtml(answer)}<div class=\"keywordos-agent-block\"><h4>Source provenance · 数据来源</h4>${provenanceHtml(answer.sourceRecords)}</div><div class=\"keywordos-agent-block\"><h4>Evidence rows · 证据行</h4>${evidenceHtml(answer)}</div><p class=\"keywordos-agent-note\">${esc(answer.note||'')}</p></section>`;}"
replace_once('keywordos-agent-modes.js', old_answer, new_answer)
replace_once('keywordos-agent-modes.js',
"return{MODES,utf8Bytes,matchesMaster,profitabilityRows,answerListing,answerProfitability,resolve,start};",
"return{MODES,utf8Bytes,matchesMaster,profitabilityRows,answerListing,answerProfitability,resolve,explanationHtml,answerHtml,start};")

# Runtime/build wiring. Keep the established agent -> diagnostics -> modes adjacency intact.
replace_once('index.html',
"  <script src=\"keyword-lab-view.js\"></script>\n  <script src=\"keywordos-agent.js\"></script>",
"  <script src=\"keyword-lab-view.js\"></script>\n  <script src=\"keywordos-agent-explanations.js\"></script>\n  <script src=\"keywordos-agent.js\"></script>")
replace_once('package.json',
"node --check market-intelligence.js && node --check keywordos-agent.js && node --check keywordos-agent-diagnostics.js && node --check keywordos-agent-modes.js",
"node --check market-intelligence.js && node --check keywordos-agent-explanations.js && node --check keywordos-agent.js && node --check keywordos-agent-diagnostics.js && node --check keywordos-agent-modes.js")
replace_once('package.json',
"purchase-order-planning.js market-intelligence.js keywordos-agent.js keywordos-agent-diagnostics.js keywordos-agent-modes.js",
"purchase-order-planning.js market-intelligence.js keywordos-agent-explanations.js keywordos-agent.js keywordos-agent-diagnostics.js keywordos-agent-modes.js")

# Focused tests.
tests = r'''import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

await import('../keywordos-agent-explanations.js');
await import('../keywordos-agent.js');
await import('../keywordos-agent-diagnostics.js');
await import('../keywordos-agent-modes.js');
const explanations=globalThis.KeywordOSAgentExplanationsTest;
const diagnostics=globalThis.KeywordOSAgentDiagnosticsTest;
const specialists=globalThis.KeywordOSAgentSpecialistsTest;
const validated=(kind,rows)=>({kind,storeId:'store-a',source:`${kind}.csv`,importedAt:'2026-09-03T00:00:00Z',validation:{status:'validated'},rows});

const records=[
  validated('ads',[
    {date:'2026-08-01',searchTerm:'blue light readers',orders:2,sales:40,clicks:10,cost:8},
    {date:'2026-08-02',searchTerm:'blue light readers',orders:1,sales:20,clicks:5,cost:4},
    {date:'2026-08-02',searchTerm:'blue light readers women',orders:9,sales:200,clicks:30,cost:20}
  ]),
  validated('sqp',[
    {date:'2026-08-01',query:'blue light readers',volume:100,clicks:20,purchases:2},
    {date:'2026-08-31',query:'blue light readers',volume:150,clicks:30,purchases:3}
  ]),
  validated('reverse-asin',[
    {snapshotDate:'2026-08-01',asin:'B000000001',keyword:'blue light readers'},
    {snapshotDate:'2026-08-31',asin:'B000000001',keyword:'blue light readers'},
    {snapshotDate:'2026-08-31',asin:'B000000002',keyword:'blue light readers'},
    {snapshotDate:'2026-08-31',asin:'B000000003',keyword:'blue light readers women'}
  ]),
  validated('ranks',[
    {date:'2026-08-01',asin:'B000000001',keyword:'blue light readers',organicRank:15},
    {date:'2026-08-31',asin:'B000000001',keyword:'blue light readers',organicRank:9,sponsoredRank:4}
  ]),
  validated('keyword-assets',[{id:'kw_blue',keyword:'blue light readers',status:'Active',favorite:true}]),
  validated('listing',[{title:'Blue Light Readers for Women',bullets:'Spring hinge',description:'Comfortable readers',searchTerms:'reading glasses blue light'}])
];

test('classifies explanation prompts without stealing ordinary why-change diagnostics',()=>{
  assert.equal(explanations.classifyExplanationIntent('Why is “blue light readers” prioritized?'),'keyword-priority');
  assert.equal(explanations.classifyExplanationIntent('缺少什么数据？'),'missing-data');
  assert.equal(explanations.classifyExplanationIntent('Why did ACoS change?'),'');
  assert.equal(diagnostics.isDiagnosticQuery('Why is “blue light readers” prioritized?'),false);
  assert.equal(diagnostics.isDiagnosticQuery('Why did ACoS change?'),true);
});

test('extracts an explicit exact keyword and refuses ambiguous this-keyword context',()=>{
  assert.equal(explanations.extractKeyword('Why is “blue light readers” prioritized?'),'blue light readers');
  assert.equal(explanations.extractKeyword('为什么 blue light readers 优先？'),'blue light readers');
  const answer=explanations.keywordPriority('Why is this keyword prioritized?',records);
  assert.equal(answer.available,false);
  assert.match(answer.deterministic,/no hidden selected-row context/i);
});

test('priority explanation joins exact local evidence only and creates no hidden score',()=>{
  const answer=explanations.keywordPriority('Why is “blue light readers” prioritized?',records);
  assert.equal(answer.available,true);
  assert.match(answer.summary,/3 imported Ads order/);
  assert.match(answer.summary,/3 imported SQP purchase/);
  assert.match(answer.summary,/2 current imported ASIN result sets/);
  assert.match(answer.summary,/does not compute a hidden global keyword priority score/i);
  assert.ok(answer.explanationRows.some(row=>row.signal==='Ads exact Search Term'&&/orders 3/.test(row.observed)));
  assert.ok(answer.explanationRows.some(row=>row.signal==='SQP exact query'&&/150/.test(row.observed)&&/purchases 3/.test(row.observed)));
  assert.ok(answer.explanationRows.some(row=>row.signal==='reverse-ASIN exact overlap'&&/2 of 3/.test(row.observed)));
  assert.ok(answer.explanationRows.some(row=>row.signal==='Listing exact phrase placement'&&/Title/.test(row.observed)));
  assert.equal('score' in answer,false);
  assert.ok(answer.evidenceRows.filter(row=>row.kind==='ads').every(row=>row.row.searchTerm==='blue light readers'));
});

test('SQP and rank explanations use latest dated exact observations rather than old or substring rows',()=>{
  const answer=explanations.keywordPriority('keyword: blue light readers',records);
  const sqp=answer.evidenceRows.filter(item=>item.kind==='sqp');
  const ranks=answer.evidenceRows.filter(item=>item.kind==='ranks');
  assert.deepEqual(sqp.map(item=>item.row.date),['2026-08-31']);
  assert.deepEqual(ranks.map(item=>item.row.date),['2026-08-31']);
  assert.ok(answer.evidenceRows.every(item=>item.kind!=='ads'||item.row.searchTerm!=='blue light readers women'));
});

test('keyword missing-data explanation distinguishes missing dataset from no exact keyword evidence',()=>{
  const partial=[validated('ads',[{date:'2026-08-01',searchTerm:'other term',orders:2}]),validated('sqp',[{date:'2026-08-01',query:'blue light readers',volume:100}])];
  const answer=explanations.missingData('What data is missing for keyword: blue light readers',partial,'keyword');
  assert.equal(answer.available,true);
  assert.ok(answer.missingData.some(row=>row.kind==='ads'&&row.status==='No exact keyword evidence'));
  assert.ok(answer.missingData.some(row=>row.kind==='reverse-asin'&&row.status==='Missing dataset'));
  assert.match(answer.summary,/local evidence gap/);
  assert.match(answer.summary,/not Amazon data requirements/i);
});

test('generic missing-data inventory is deterministic per specialist mode',()=>{
  const profitability=[validated('product-master',[{sku:'SKU-1'}]),validated('ads',[{searchTerm:'reader'}])];
  const answer=explanations.missingData('What data is missing?',profitability,'profitability');
  assert.deepEqual(answer.missingData.map(row=>row.kind),['finance','costs']);
  assert.match(answer.deterministic,/product-master, ads, finance, costs/);
});

test('removing a source removes its explanation and turns it into a current gap',()=>{
  const before=explanations.keywordPriority('Why is “blue light readers” prioritized?',records);
  const afterRecords=records.filter(record=>record.kind!=='sqp');
  const after=explanations.keywordPriority('Why is “blue light readers” prioritized?',afterRecords);
  assert.ok(before.explanationRows.some(row=>row.signal==='SQP exact query'));
  assert.ok(!after.explanationRows.some(row=>row.signal==='SQP exact query'));
  assert.ok(after.missingData.some(row=>row.kind==='sqp'&&row.status==='Missing dataset'));
});

test('specialist resolver routes explanation prompts before normal domain answers',()=>{
  const priority=specialists.resolve('keyword','Why is “blue light readers” prioritized?',records);
  const missing=specialists.resolve('profitability','What data is missing?',records);
  assert.equal(priority.intent,'keyword-priority');
  assert.equal(missing.intent,'missing-data');
  assert.match(specialists.explanationHtml(priority),/Deterministic rule/);
  assert.match(specialists.explanationHtml(priority),/Missing data/);
});

test('runtime wiring loads the explanation engine before the existing contiguous Agent stack',async()=>{
  const [index,pkg,modes,diagnostic]=await Promise.all([
    readFile(new URL('../index.html',import.meta.url),'utf8'),
    readFile(new URL('../package.json',import.meta.url),'utf8'),
    readFile(new URL('../keywordos-agent-modes.js',import.meta.url),'utf8'),
    readFile(new URL('../keywordos-agent-diagnostics.js',import.meta.url),'utf8')
  ]);
  const explanationIndex=index.indexOf('keywordos-agent-explanations.js'),agentIndex=index.indexOf('keywordos-agent.js'),diagnosticIndex=index.indexOf('keywordos-agent-diagnostics.js'),modesIndex=index.indexOf('keywordos-agent-modes.js');
  assert.ok(explanationIndex>=0&&explanationIndex<agentIndex&&agentIndex<diagnosticIndex&&diagnosticIndex<modesIndex);
  assert.match(pkg,/node --check keywordos-agent-explanations\.js && node --check keywordos-agent\.js && node --check keywordos-agent-diagnostics\.js && node --check keywordos-agent-modes\.js/);
  assert.match(pkg,/market-intelligence\.js keywordos-agent-explanations\.js keywordos-agent\.js keywordos-agent-diagnostics\.js keywordos-agent-modes\.js/);
  assert.match(modes,/KeywordOSAgentExplanationsTest/);
  assert.match(diagnostic,/prioriti\[sz\]ed/);
});
'''
Path('tests/keywordos-agent-explanations.test.mjs').write_text(tests)

# README only becomes complete in the same guarded business commit.
replace_once('README.md',
'- [ ] 在现有只读 Agent 上补充“为什么这个词优先”“缺少什么数据”的确定性解释，不生成外部事实。',
'- [x] 在现有只读 Agent 上补充“为什么这个词优先”“缺少什么数据”的确定性解释，不生成外部事实。\n  - 2026-09-03：新增纯函数 `keywordos-agent-explanations.js`，继续复用现有只读 Agent 与 Store 01 validated Dataset Registry，不新增 storage、结果缓存、外部 API 或隐藏关键词分数。`Why is “keyword” prioritized? / 为什么 keyword 优先？` 必须明确给出 exact keyword；Agent 只按 exact normalized keyword 连接本地证据：Ads 汇总当前 validated report 内 exact Search Term 的显式指标，SQP 只看最新 dated exact query，reverse-ASIN 对每个 ASIN 只用最新 imported result set，Rank 对每个 ASIN 只用最新 dated exact-keyword snapshot，Keyword Library 只展示本地 favorite/status/recycle-bin 状态，Listing 只做完整 token-boundary phrase placement。回答明确声明没有 global hidden priority score，页面自己的排序规则仍是权威；只把订单、SQP purchase、multi-ASIN exact overlap、favorite 等已观察信号作为“可支持关注”的证据说明。`What data is missing? / 缺少什么数据？` 按当前 Specialist mode 列出 absent / empty validated datasets；若问题同时给出 exact keyword，则进一步区分 **Missing dataset** 与 **No exact keyword evidence**，并明确这些只是 KeywordOS 本地能力缺口，不是 Amazon 数据要求。`keywordos-agent-diagnostics.js` 会主动让 priority/missing-data 问题绕过 why-change 时序诊断；Specialist answer 增加 Deterministic rule / Why this keyword / Missing data 可展开表。所有解释都在查询时从当前来源重算，删除数据集后对应证据立即消失并转为 gap，不持久化派生结论、不做 substring/stemming/synonym、不生成 Amazon Relevancy 或外部事实。CI 为 **__TEST_COUNT__ passed / 0 failed**；`npm run build` 验证 **__JS_COUNT__ 个 JS + 9 个 CSS，__PUBLISH_COUNT__ 个发布文件**，source/dist byte identity 与 committed-dist parity gate 全部通过。')
