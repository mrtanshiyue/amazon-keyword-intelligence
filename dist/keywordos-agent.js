(function(root,factory){
  const api=factory(root);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSAgentTest=api;
  if(root){root.KeywordOSAgent=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const STORE_ID='store-a';
const MAX_EVIDENCE_ROWS=20;
const VALID_STATUS='validated';
const EXAMPLES=[
  'What data is loaded?',
  'Which search terms spent money with zero orders?',
  'Show latest inventory evidence',
  'Show rank evidence',
  'Show low-star review evidence',
  'Show latest competitor snapshots'
];
let observer=null;

const clean=value=>String(value??'').trim();
const num=value=>{const n=Number(value);return Number.isFinite(n)?n:0;};
function validDate(value){const text=clean(value).slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(text)?text:'';}
function validationStatus(record){return clean(record?.validation?.status||record?.validationStatus).toLowerCase();}
function validatedRecords(records=[],storeId=STORE_ID){
  return (Array.isArray(records)?records:[]).filter(record=>record?.storeId===storeId&&validationStatus(record)===VALID_STATUS&&Array.isArray(record?.rows));
}
function coverage(record){
  const min=validDate(record?.coverage?.min),max=validDate(record?.coverage?.max);
  if(min)return{min,max:max||min};
  const dates=(record?.rows||[]).map(row=>validDate(row?.date)).filter(Boolean).sort();
  return{min:dates[0]||'',max:dates.at(-1)||''};
}
function coverageText(record){const value=coverage(record);return value.min?`${value.min} → ${value.max}`:'No dated coverage';}
function recordFor(records,kind){return validatedRecords(records).find(record=>record.kind===kind)||null;}
function sourceRow(kind,row,index){return{kind,sourceRow:index+1,row};}
function lower(value){return clean(value).toLowerCase();}
function classifyIntent(query){
  const q=lower(query);
  if(!q)return'help';
  if(/what data|data loaded|dataset|source|coverage|数据源|有什么数据|哪些数据|覆盖/.test(q))return'datasets';
  if(/zero[ -]?order|no orders?|waste|wasted|浪费|零订单|无订单/.test(q))return'ads-waste';
  if(/winner|best search|best keyword|top search|高转化|赢家|表现最好|高订单/.test(q))return'ads-winners';
  if(/inventory|stock|库存|补货|可售|入库/.test(q))return'inventory';
  if(/rank|indexed|index status|排名|收录|索引/.test(q))return'ranks';
  if(/review|\bvoc\b|差评|评价|评论/.test(q))return'reviews';
  if(/competitor|\bbsr\b|竞品|竞争对手/.test(q))return'competitor';
  if(/refund|finance|settlement|fee|profit|revenue|退款|结算|费用|财务|利润/.test(q))return'finance';
  if(/\bsqp\b|search query|search volume|funnel|搜索量|搜索查询|漏斗/.test(q))return'sqp';
  if(/\bacos\b|\broas\b|advertising|search term|广告|搜索词/.test(q))return'ads-summary';
  return'help';
}
function extractAsin(query){return clean(query).toUpperCase().match(/\bB0[A-Z0-9]{8}\b/)?.[0]||'';}
function latestDate(rows=[]){return rows.map(row=>validDate(row?.date)).filter(Boolean).sort().at(-1)||'';}
function money(value){return'$'+num(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function integer(value){return num(value).toLocaleString('en-US',{maximumFractionDigits:0});}
function pct(value){return Number.isFinite(value)?`${(value*100).toFixed(1)}%`:'—';}
function aggregateAds(rows=[]){
  const byTerm=new Map();
  rows.forEach((row,index)=>{
    const term=clean(row?.searchTerm);if(!term)return;
    const key=term.toLowerCase(),item=byTerm.get(key)||{term,cost:0,sales:0,orders:0,clicks:0,impressions:0,rows:[]};
    item.cost+=num(row.cost??row.spend);item.sales+=num(row.sales);item.orders+=num(row.orders);item.clicks+=num(row.clicks);item.impressions+=num(row.impressions);item.rows.push(index);byTerm.set(key,item);
  });
  return[...byTerm.values()].map(item=>({...item,acos:item.sales>0?item.cost/item.sales:null,cvr:item.clicks>0?item.orders/item.clicks:null}));
}
function rawEvidence(record,indexes=[],limit=MAX_EVIDENCE_ROWS){
  const unique=[...new Set(indexes)].filter(index=>Number.isInteger(index)&&index>=0&&index<record.rows.length).slice(0,limit);
  return unique.map(index=>sourceRow(record.kind,record.rows[index],index));
}
function unavailable(kind,title){return{available:false,intent:kind,title,summary:'No validated Store 01 dataset is available for this question. / 当前没有可用于此问题的 Store 01 已验证数据。',sourceRecords:[],evidenceRows:[],columns:[],note:'KeywordOS Agent does not fall back to bundled/demo data or estimate missing evidence.'};}
function answerDatasets(records){
  const valid=validatedRecords(records);
  const rows=valid.map(record=>({kind:record.kind,sourceRow:'registry',row:{kind:record.kind,source:clean(record.source)||'Unknown source',rows:Array.isArray(record.rows)?record.rows.length:num(record.rowCount),coverage:coverageText(record),importedAt:clean(record.importedAt)||'Unavailable',validation:validationStatus(record),checksum:clean(record.checksum)||'Unavailable'}}));
  return{available:true,intent:'datasets',title:'Validated data inventory / 已验证数据清单',summary:`${valid.length} validated Store 01 dataset(s) are available to the Agent. / Agent 当前可读取 ${valid.length} 个 Store 01 已验证数据集。`,sourceRecords:valid,evidenceRows:rows,columns:['kind','source','rows','coverage','importedAt','validation','checksum'],note:'Only Dataset Registry records with validation status “validated” are included.'};
}
function answerAds(query,records,mode){
  const record=recordFor(records,'ads');if(!record)return unavailable(mode,'Advertising evidence / 广告证据');
  const grouped=aggregateAds(record.rows);
  let selected=[];
  if(mode==='ads-waste')selected=grouped.filter(item=>item.cost>0&&item.orders===0).sort((a,b)=>b.cost-a.cost||b.clicks-a.clicks).slice(0,8);
  else if(mode==='ads-winners')selected=grouped.filter(item=>item.orders>0).sort((a,b)=>b.orders-a.orders||b.sales-a.sales||a.cost-b.cost).slice(0,8);
  else selected=grouped.sort((a,b)=>b.sales-a.sales||b.orders-a.orders).slice(0,8);
  const indexes=selected.flatMap(item=>item.rows);
  const spend=record.rows.reduce((sum,row)=>sum+num(row.cost??row.spend),0),sales=record.rows.reduce((sum,row)=>sum+num(row.sales),0),orders=record.rows.reduce((sum,row)=>sum+num(row.orders),0),clicks=record.rows.reduce((sum,row)=>sum+num(row.clicks),0);
  let summary;
  if(mode==='ads-waste')summary=selected.length?`Top zero-order waste candidate: “${selected[0].term}” spent ${money(selected[0].cost)} with 0 orders. ${selected.length} top term(s) are shown from explicit imported rows. / 零订单浪费最高词：“${selected[0].term}”，花费 ${money(selected[0].cost)}，订单 0。`:'No imported search term has positive spend and zero orders in the validated Ads dataset. / 已验证广告数据中没有“有花费且零订单”的搜索词。';
  else if(mode==='ads-winners')summary=selected.length?`Top order-producing term: “${selected[0].term}” with ${integer(selected[0].orders)} orders, ${money(selected[0].sales)} sales and ${pct(selected[0].acos)} ACoS. / 当前订单最高搜索词：“${selected[0].term}”，${integer(selected[0].orders)} 单，销售额 ${money(selected[0].sales)}。`:'No order-producing search terms are present in the validated Ads dataset. / 已验证广告数据中没有产生订单的搜索词。';
  else summary=`Validated Ads totals: ${integer(clicks)} clicks, ${integer(orders)} orders, ${money(spend)} spend, ${money(sales)} sales${sales>0?`, ${pct(spend/sales)} ACoS`:''}. / 已验证广告汇总：${integer(clicks)} 点击，${integer(orders)} 订单，花费 ${money(spend)}，销售额 ${money(sales)}。`;
  return{available:true,intent:mode,title:'Advertising evidence / 广告证据',summary,sourceRecords:[record],evidenceRows:rawEvidence(record,indexes),columns:['date','campaignName','adGroupName','searchTerm','matchType','clicks','orders','cost','sales','acos'],note:'Rows are evidence only. The Agent creates no bid, negative, budget or campaign action.'};
}
function answerInventory(records){
  const record=recordFor(records,'inventory');if(!record)return unavailable('inventory','Inventory evidence / 库存证据');
  const date=latestDate(record.rows),indexes=record.rows.map((row,index)=>({row,index})).filter(item=>!date||validDate(item.row.date)===date).sort((a,b)=>num(a.row.available)-num(b.row.available)||num(b.row.unfulfillable)-num(a.row.unfulfillable)).slice(0,MAX_EVIDENCE_ROWS).map(item=>item.index);
  const evidence=rawEvidence(record,indexes),available=evidence.reduce((sum,item)=>sum+num(item.row.available),0),inbound=evidence.reduce((sum,item)=>sum+num(item.row.inbound),0);
  return{available:true,intent:'inventory',title:'Latest inventory evidence / 最新库存证据',summary:`${date||'Undated'} snapshot: ${evidence.length} displayed SKU row(s), ${integer(available)} available units and ${integer(inbound)} inbound units across the displayed evidence. / ${date||'无日期'} 快照：展示 ${evidence.length} 个 SKU 证据行，可售 ${integer(available)}，入库 ${integer(inbound)}。`,sourceRecords:[record],evidenceRows:evidence,columns:['date','sku','asin','product','available','inbound','reserved','unfulfillable'],note:'No demand forecast, reorder quantity or supplier commitment is inferred here.'};
}
function answerRanks(query,records){
  const record=recordFor(records,'ranks');if(!record)return unavailable('ranks','Rank evidence / 排名证据');
  const asin=extractAsin(query),date=latestDate(record.rows);
  const candidates=record.rows.map((row,index)=>({row,index})).filter(item=>(!asin||clean(item.row.asin).toUpperCase()===asin)&&(!date||validDate(item.row.date)===date)).sort((a,b)=>(num(a.row.organicRank)||999999)-(num(b.row.organicRank)||999999)).slice(0,MAX_EVIDENCE_ROWS);
  const evidence=rawEvidence(record,candidates.map(item=>item.index));
  return{available:true,intent:'ranks',title:'Latest rank/index evidence / 最新排名与收录证据',summary:`${date||'Undated'}${asin?` · ${asin}`:''}: ${evidence.length} imported keyword rank row(s) shown. / ${date||'无日期'}${asin?` · ${asin}`:''}：展示 ${evidence.length} 条导入关键词排名证据。`,sourceRecords:[record],evidenceRows:evidence,columns:['date','keyword','asin','organicRank','sponsoredRank','indexed'],note:'Missing rank or index values are not inferred.'};
}
function answerReviews(records){
  const record=recordFor(records,'reviews');if(!record)return unavailable('reviews','Review evidence / 评论证据');
  const low=record.rows.map((row,index)=>({row,index})).filter(item=>num(item.row.rating)>0&&num(item.row.rating)<=2).sort((a,b)=>validDate(b.row.date).localeCompare(validDate(a.row.date))).slice(0,MAX_EVIDENCE_ROWS),latest=latestDate(record.rows);
  return{available:true,intent:'reviews',title:'Low-star review evidence / 低星评论证据',summary:`${low.length} explicit 1–2 star imported review row(s) are shown${latest?`; latest dataset date ${latest}`:''}. / 展示 ${low.length} 条明确导入的 1–2 星评论${latest?`；数据最新日期 ${latest}`:''}。`,sourceRecords:[record],evidenceRows:rawEvidence(record,low.map(item=>item.index)),columns:['date','asin','rating','variant','title','body','negativeTheme','complaint','requestedFeature'],note:'The Agent does not infer sentiment, root cause or product claims from review text.'};
}
function answerCompetitor(query,records){
  const record=recordFor(records,'competitor');if(!record)return unavailable('competitor','Competitor evidence / 竞品证据');
  const asin=extractAsin(query),latest=new Map();
  record.rows.forEach((row,index)=>{const key=clean(row.asin).toUpperCase();if(!key||asin&&key!==asin)return;const previous=latest.get(key);if(!previous||validDate(row.date)>=validDate(previous.row.date))latest.set(key,{row,index});});
  const selected=[...latest.values()].sort((a,b)=>num(b.row.estimatedSales)-num(a.row.estimatedSales)||num(a.row.bsr)-num(b.row.bsr)).slice(0,MAX_EVIDENCE_ROWS);
  return{available:true,intent:'competitor',title:'Latest competitor snapshots / 最新竞品快照',summary:`${selected.length} latest-per-ASIN imported competitor snapshot(s) are shown${asin?` for ${asin}`:''}. / 展示 ${selected.length} 条按 ASIN 取最新的竞品导入快照${asin?`（${asin}）`:''}。`,sourceRecords:[record],evidenceRows:rawEvidence(record,selected.map(item=>item.index)),columns:['date','asin','title','price','bsr','rating','reviewCount','estimatedSales','variants','availability'],note:'No live Amazon monitoring, traffic estimate or missing competitor metric is invented.'};
}
function answerFinance(query,records){
  const record=recordFor(records,'finance');if(!record)return unavailable('finance','Finance evidence / 财务证据');
  const wantsRefund=/refund|退款/.test(lower(query));let indexes=[];
  if(wantsRefund)indexes=record.rows.map((row,index)=>({row,index})).filter(item=>/refund/i.test(clean(item.row.type))).sort((a,b)=>validDate(b.row.date).localeCompare(validDate(a.row.date))).slice(0,MAX_EVIDENCE_ROWS).map(item=>item.index);
  else indexes=record.rows.map((row,index)=>({row,index})).sort((a,b)=>validDate(b.row.date).localeCompare(validDate(a.row.date))).slice(0,MAX_EVIDENCE_ROWS).map(item=>item.index);
  const total=record.rows.reduce((sum,row)=>sum+num(row.total),0),fees=record.rows.reduce((sum,row)=>sum+num(row.sellingFees)+num(row.fbaFees)+num(row.otherTxnFees),0),refundRows=record.rows.filter(row=>/refund/i.test(clean(row.type)));
  return{available:true,intent:'finance',title:wantsRefund?'Refund transaction evidence / 退款交易证据':'Finance transaction evidence / 财务交易证据',summary:`Validated finance rows: ${integer(record.rows.length)}; net imported Total ${money(total)}; explicit selling/FBA/other transaction fee fields sum to ${money(fees)}; ${refundRows.length} row(s) have a Refund type. / 已验证财务行 ${integer(record.rows.length)}；导入 Total 净额 ${money(total)}；明确费用字段合计 ${money(fees)}；Refund 类型 ${refundRows.length} 行。`,sourceRecords:[record],evidenceRows:rawEvidence(record,indexes),columns:['date','type','orderId','sku','quantity','productSales','sellingFees','fbaFees','otherTxnFees','other','total'],note:'This is imported transaction evidence, not a profitability forecast or reimbursement eligibility decision.'};
}
function answerSqp(query,records){
  const record=recordFor(records,'sqp');if(!record)return unavailable('sqp','Search Query evidence / 搜索查询证据');
  const asin=extractAsin(query);const selected=record.rows.map((row,index)=>({row,index})).filter(item=>!asin||clean(item.row.asin).toUpperCase()===asin).sort((a,b)=>num(b.row.volume)-num(a.row.volume)||num(b.row.purchases)-num(a.row.purchases)).slice(0,MAX_EVIDENCE_ROWS);
  return{available:true,intent:'sqp',title:'Search Query evidence / 搜索查询证据',summary:`Top ${selected.length} imported query row(s) by supplied Search Query Volume${asin?` for ${asin}`:''}. / 按已导入 Search Query Volume 展示前 ${selected.length} 条查询证据${asin?`（${asin}）`:''}。`,sourceRecords:[record],evidenceRows:rawEvidence(record,selected.map(item=>item.index)),columns:['date','query','asin','volume','impressions','clicks','cartAdds','purchases','brandImpressionShare','brandClickShare','brandPurchaseShare'],note:'Search volume and share values are shown only when explicitly supplied by the imported dataset.'};
}
function answerHelp(records){
  const valid=validatedRecords(records);
  return{available:true,intent:'help',title:'KeywordOS Agent · Read-only / 只读助手',summary:'Ask about loaded data, advertising search-term evidence, inventory, rank/index, reviews, competitor snapshots, finance transactions or SQP evidence. / 可询问已加载数据、广告搜索词、库存、排名/收录、评论、竞品快照、财务交易或 SQP 证据。',sourceRecords:valid,evidenceRows:[],columns:[],note:'This deterministic local Agent does not call an external AI service and cannot execute Amazon actions.'};
}
function answerQuery(query,records=[]){
  const intent=classifyIntent(query);
  if(intent==='datasets')return answerDatasets(records);
  if(intent==='ads-waste'||intent==='ads-winners'||intent==='ads-summary')return answerAds(query,records,intent);
  if(intent==='inventory')return answerInventory(records);
  if(intent==='ranks')return answerRanks(query,records);
  if(intent==='reviews')return answerReviews(records);
  if(intent==='competitor')return answerCompetitor(query,records);
  if(intent==='finance')return answerFinance(query,records);
  if(intent==='sqp')return answerSqp(query,records);
  return answerHelp(records);
}
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function display(value){if(value===true)return'Yes';if(value===false)return'No';if(value==null||value==='')return'—';if(typeof value==='number')return Number.isInteger(value)?value.toLocaleString('en-US'):Number(value.toFixed(4)).toLocaleString('en-US');return String(value);}
function provenanceHtml(records=[]){
  if(!records.length)return'<div class="keywordos-agent-empty">No validated source record is attached to this answer.</div>';
  return records.map(record=>`<div class="keywordos-agent-source"><b>${esc(record.kind)}</b><span>${esc(clean(record.source)||'Unknown source')}</span><small>${esc(Array.isArray(record.rows)?record.rows.length:num(record.rowCount))} rows · ${esc(coverageText(record))} · ${esc(validationStatus(record))} · ${esc(clean(record.importedAt)||'Import time unavailable')}${clean(record.checksum)?` · ${esc(clean(record.checksum).slice(0,16))}…`:''}</small></div>`).join('');
}
function evidenceHtml(answer){
  if(!answer.evidenceRows?.length)return'<div class="keywordos-agent-empty">No evidence rows are needed for this answer.</div>';
  const columns=answer.columns||[];
  return`<div class="keywordos-agent-table-wrap" tabindex="0" aria-label="Agent evidence table"><table class="data-table"><thead><tr><th class="left">Dataset</th><th class="left">Source row</th>${columns.map(column=>`<th class="left">${esc(column)}</th>`).join('')}</tr></thead><tbody>${answer.evidenceRows.map(item=>`<tr><td class="left">${esc(item.kind)}</td><td class="left">${esc(item.sourceRow)}</td>${columns.map(column=>`<td class="left" data-no-i18n>${esc(display(item.row?.[column]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function answerHtml(answer){return`<section class="keywordos-agent-answer"><div class="keywordos-agent-answer-head"><div><span>${answer.available?'EVIDENCE ANSWER · 证据回答':'UNAVAILABLE · 不可用'}</span><h3>${esc(answer.title)}</h3></div></div><p class="keywordos-agent-summary">${esc(answer.summary)}</p><div class="keywordos-agent-block"><h4>Source provenance · 数据来源</h4>${provenanceHtml(answer.sourceRecords)}</div><div class="keywordos-agent-block"><h4>Evidence rows · 证据行</h4>${evidenceHtml(answer)}</div><p class="keywordos-agent-note">${esc(answer.note||'')}</p></section>`;}
function drawerHtml(answer){return`<div class="keywordos-agent-backdrop" data-keywordos-agent-close></div><aside class="keywordos-agent-drawer" role="dialog" aria-modal="true" aria-labelledby="keywordos-agent-title"><header><div><span class="keywordos-agent-kicker">READ ONLY · 只读</span><h2 id="keywordos-agent-title">KeywordOS Agent</h2><p>Validated Store 01 evidence only · 仅使用 Store 01 已验证数据</p></div><button class="drawer-close" type="button" data-keywordos-agent-close aria-label="Close Agent">×</button></header><div class="keywordos-agent-body"><div class="notice-banner"><b>No execution / 不执行操作。</b> The Agent reads validated browser-local Dataset Registry records only. It does not call Amazon APIs, mutate campaigns, publish Listings or infer missing data.</div><form id="keywordos-agent-form" class="keywordos-agent-form"><label for="keywordos-agent-input">Ask a data question · 输入数据问题</label><div><input id="keywordos-agent-input" class="input" maxlength="240" autocomplete="off" placeholder="e.g. Which search terms spent money with zero orders?"><button class="btn primary" type="submit">Ask · 查询</button></div></form><div class="keywordos-agent-examples">${EXAMPLES.map(example=>`<button class="btn secondary sm" type="button" data-keywordos-agent-example="${esc(example)}">${esc(example)}</button>`).join('')}</div><div id="keywordos-agent-result">${answerHtml(answer)}</div></div></aside>`;}
function installStyles(){
  if(!root?.document||document.querySelector('#keywordos-agent-style'))return;
  const style=document.createElement('style');style.id='keywordos-agent-style';style.textContent=`
  .keywordos-agent-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.24);z-index:920}
  .keywordos-agent-drawer{position:fixed;z-index:921;top:0;right:0;width:min(760px,94vw);height:100vh;background:#fff;border-left:1px solid var(--line);box-shadow:-16px 0 48px rgba(15,23,42,.14);display:flex;flex-direction:column}
  .keywordos-agent-drawer>header{display:flex;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid var(--line)}
  .keywordos-agent-drawer h2{margin:3px 0 2px;font-size:22px}.keywordos-agent-drawer header p{margin:0;color:var(--muted);font-size:11px}.keywordos-agent-kicker{font-size:10px;font-weight:700;letter-spacing:.08em;color:var(--muted)}
  .keywordos-agent-body{padding:18px 22px 32px;overflow:auto}.keywordos-agent-form{display:flex;flex-direction:column;gap:6px;margin:16px 0 10px}.keywordos-agent-form label{font-size:11px;font-weight:700}.keywordos-agent-form>div{display:flex;gap:8px}.keywordos-agent-form input{flex:1;min-width:0}
  .keywordos-agent-examples{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:16px}.keywordos-agent-answer{border-top:1px solid var(--line);padding-top:16px}.keywordos-agent-answer-head span{font-size:10px;font-weight:700;letter-spacing:.06em;color:var(--muted)}.keywordos-agent-answer-head h3{margin:4px 0 0;font-size:17px}.keywordos-agent-summary{font-size:12.5px;line-height:1.65;color:var(--text-strong);background:var(--surface-subtle,#f8fafc);border:1px solid var(--line);border-radius:8px;padding:12px;margin:12px 0}
  .keywordos-agent-block{margin-top:14px}.keywordos-agent-block h4{margin:0 0 7px;font-size:11px}.keywordos-agent-source{display:grid;gap:2px;border:1px solid var(--line);border-radius:7px;padding:9px 10px;margin-bottom:6px}.keywordos-agent-source b{font-size:11px}.keywordos-agent-source span{font-size:11px;color:var(--text-strong)}.keywordos-agent-source small{font-size:9.5px;color:var(--muted);overflow-wrap:anywhere}.keywordos-agent-empty{padding:12px;border:1px dashed var(--line);border-radius:7px;color:var(--muted);font-size:11px}
  .keywordos-agent-table-wrap{overflow:auto;border:1px solid var(--line);border-radius:7px;max-height:330px}.keywordos-agent-table-wrap table{min-width:720px}.keywordos-agent-note{margin:10px 0 0;color:var(--muted);font-size:10.5px;line-height:1.5}.keywordos-agent-nav-section .nav-item{width:100%}
  @media(max-width:640px){.keywordos-agent-drawer{width:100vw}.keywordos-agent-drawer>header,.keywordos-agent-body{padding-left:14px;padding-right:14px}.keywordos-agent-form>div{flex-direction:column}}
  `;document.head.appendChild(style);
}
function ensureNavEntry(){
  if(!root?.document)return;const nav=document.querySelector('#sidebar-nav');if(!nav||nav.querySelector('[data-keywordos-agent-open]'))return;
  const section=document.createElement('div');section.className='nav-section keywordos-agent-nav-section';section.innerHTML='<div class="nav-section-title">ASSISTANCE · 助手</div><button class="nav-item" type="button" data-keywordos-agent-open><span class="nav-icon">✦</span><span class="nav-label">Agent · 只读助手</span></button>';
  const settings=nav.querySelector('[data-page="settings"]')?.closest('.nav-section');settings?nav.insertBefore(section,settings):nav.appendChild(section);
}
async function readRecords(){try{return await root?.KeywordOSDatasetRegistry?.list?.(STORE_ID)||[];}catch(error){console.warn('KeywordOS Agent registry read failed',error);return[];}}
async function renderQuery(query){const result=document.querySelector('#keywordos-agent-result');if(!result)return;result.innerHTML='<div class="keywordos-agent-empty">Reading validated local evidence… / 正在读取已验证本地证据…</div>';const records=await readRecords();result.innerHTML=answerHtml(answerQuery(query,records));}
async function openAgent(){installStyles();const records=await readRecords(),drawer=document.querySelector('#drawer-root');if(!drawer)return;drawer.innerHTML=drawerHtml(answerDatasets(records));setTimeout(()=>document.querySelector('#keywordos-agent-input')?.focus(),0);}
function closeAgent(){const drawer=document.querySelector('#drawer-root');if(drawer?.querySelector('.keywordos-agent-drawer'))drawer.innerHTML='';}
function handleClick(event){const target=event.target instanceof Element?event.target:null;if(!target)return;if(target.closest('[data-keywordos-agent-open]')){event.preventDefault();openAgent();return;}if(target.closest('[data-keywordos-agent-close]')){closeAgent();return;}const example=target.closest('[data-keywordos-agent-example]');if(example){const value=example.getAttribute('data-keywordos-agent-example')||'';const input=document.querySelector('#keywordos-agent-input');if(input)input.value=value;renderQuery(value);}}
function handleSubmit(event){if(event.target?.id!=='keywordos-agent-form')return;event.preventDefault();const input=document.querySelector('#keywordos-agent-input'),query=clean(input?.value);renderQuery(query||'What data is loaded?');}
function start(){if(!root?.document)return;const boot=()=>{installStyles();ensureNavEntry();document.addEventListener('click',handleClick);document.addEventListener('submit',handleSubmit);const nav=document.querySelector('#sidebar-nav');if(nav){observer=new MutationObserver(()=>ensureNavEntry());observer.observe(nav,{childList:true,subtree:true});}};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();}

return{STORE_ID,MAX_EVIDENCE_ROWS,EXAMPLES,validDate,validationStatus,validatedRecords,coverage,coverageText,recordFor,classifyIntent,extractAsin,aggregateAds,rawEvidence,answerQuery,answerDatasets,answerAds,answerInventory,answerRanks,answerReviews,answerCompetitor,answerFinance,answerSqp,start};
});