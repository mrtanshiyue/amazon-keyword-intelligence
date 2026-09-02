(function(root,factory){
  const base=(typeof globalThis!=='undefined'&&globalThis.KeywordOSAgentTest)||root?.KeywordOSAgent;
  const api=factory(root,base);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSAgentSpecialistsTest=api;
  if(root){root.KeywordOSAgentSpecialists=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root,base){
'use strict';

const MODES={
  general:{label:'General · 综合',defaultQuery:'What data is loaded?',examples:['What data is loaded?','Which search terms spent money with zero orders?','Show latest competitor snapshots']},
  help:{label:'Knowledge / Help · 帮助',defaultQuery:'What can this Agent answer?',examples:['What can this Agent answer?','What data is loaded?']},
  advertising:{label:'Advertising · 广告',defaultQuery:'Show advertising summary',examples:['Show advertising summary','Which search terms spent money with zero orders?','Show best search terms by orders']},
  keyword:{label:'Keyword · 关键词',defaultQuery:'Show search query evidence',examples:['Show search query evidence','Show rank evidence']},
  listing:{label:'Listing',defaultQuery:'Show Listing draft evidence',examples:['Show Listing draft evidence']},
  profitability:{label:'Profitability · 利润',defaultQuery:'Show profitability evidence',examples:['Show profitability evidence','Show refund transaction evidence']},
  inventory:{label:'Inventory · 库存',defaultQuery:'Show latest inventory evidence',examples:['Show latest inventory evidence']}
};
let activeMode='general';
let observer=null;
const clean=value=>String(value??'').trim();
const num=value=>{const n=Number(value);return Number.isFinite(n)?n:0;};
const norm=value=>clean(value).toLowerCase();
const money=value=>'$'+num(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const pct=value=>value==null||!Number.isFinite(value)?'—':`${(value*100).toFixed(1)}%`;
function utf8Bytes(value){if(typeof TextEncoder!=='undefined')return new TextEncoder().encode(String(value??'')).length;if(typeof Buffer!=='undefined')return Buffer.byteLength(String(value??''),'utf8');return unescape(encodeURIComponent(String(value??''))).length;}
function unavailable(intent,title,sourceRecords=[],reason='Required validated Store 01 evidence is unavailable. / 缺少所需的 Store 01 已验证证据。'){return{available:false,intent,title,summary:reason,sourceRecords,evidenceRows:[],columns:[],note:'The specialist fails closed and does not estimate missing data.'};}
function record(records,kind){return base?.recordFor?.(records,kind)||null;}
function answerListing(records){
  const listing=record(records,'listing');
  if(!listing||!listing.rows.length)return unavailable('listing','Listing evidence / Listing 证据');
  const draft=listing.rows[0]||{},assets=record(records,'keyword-assets');
  const title=clean(draft.title),bullets=clean(draft.bullets),description=clean(draft.description),searchTerms=clean(draft.searchTerms);
  return{available:true,intent:'listing',title:'Listing draft evidence / Listing 草稿证据',summary:`Local draft: title ${title.length} characters, bullets ${bullets.length}, description ${description.length}, backend ${utf8Bytes(searchTerms)} UTF-8 bytes${assets?`; ${assets.rows.length} validated keyword asset(s) available separately`:''}. / 本地草稿：标题 ${title.length} 字符，五点 ${bullets.length}，描述 ${description.length}，后台词 ${utf8Bytes(searchTerms)} UTF-8 字节。`,sourceRecords:[listing,...(assets?[assets]:[])],evidenceRows:[{kind:'listing',sourceRow:1,row:draft}],columns:['title','bullets','description','searchTerms','brandTerms','marketplace','titleLimit','searchTermsLimit'],note:'This mode reads the local draft only. It does not draft copy, claim compliance, publish to Amazon or infer keyword relevance.'};
}
function aliases(master){return new Set([master?.productId,master?.product,master?.sku,master?.asin,master?.fnsku].map(norm).filter(Boolean));}
function rowIdentifiers(row){return[row?.productId,row?.product,row?.sku,row?.asin,row?.fnsku,row?.productCode].map(norm).filter(Boolean);}
function matchesMaster(row,master){const set=aliases(master);return rowIdentifiers(row).some(value=>set.has(value));}
function profitabilityRows(records){
  const master=record(records,'product-master'),ads=record(records,'ads'),finance=record(records,'finance'),costs=record(records,'costs');
  if(!master||!ads||!finance||!costs)return[];
  return master.rows.map((product,masterIndex)=>{
    const adRows=ads.rows.map((row,index)=>({row,index})).filter(item=>matchesMaster(item.row,product));
    const financeRows=finance.rows.map((row,index)=>({row,index})).filter(item=>matchesMaster(item.row,product)&&clean(item.row.type)!=='Transfer');
    const costRows=costs.rows.map((row,index)=>({row,index})).filter(item=>matchesMaster(item.row,product));
    if(!costRows.length||(!adRows.length&&!financeRows.length))return null;
    const spend=adRows.reduce((sum,item)=>sum+num(item.row.cost??item.row.spend),0),adSales=adRows.reduce((sum,item)=>sum+num(item.row.sales),0),adUnits=adRows.reduce((sum,item)=>sum+num(item.row.units||item.row.orders),0);
    const net=financeRows.reduce((sum,item)=>sum+num(item.row.total),0),quantity=financeRows.reduce((sum,item)=>sum+Math.max(0,num(item.row.quantity)),0);
    const unitCost=costRows.reduce((sum,item)=>sum+num(item.row.unitCost)+num(item.row.inboundCost),0)/costRows.length,units=quantity||adUnits,cogs=unitCost*units,contribution=net-cogs-spend,margin=net?contribution/net:null,breakEvenAcos=adSales?Math.max(0,(net-cogs)/adSales):null;
    return{product,masterIndex,adRows,financeRows,costRows,spend,adSales,net,units,unitCost,cogs,contribution,margin,breakEvenAcos};
  }).filter(Boolean).sort((a,b)=>b.contribution-a.contribution);
}
function answerProfitability(records){
  const required=['product-master','ads','finance','costs'].map(kind=>record(records,kind));
  const present=required.filter(Boolean);
  if(present.length!==required.length)return unavailable('profitability','Profitability evidence / 利润证据',present,'Profitability mode requires validated Product Master, Ads, Unified finance and cost datasets. / 利润模式需要已验证的 Product Master、Ads、Unified 财务和成本数据。');
  const rows=profitabilityRows(records);
  if(!rows.length)return unavailable('profitability','Profitability evidence / 利润证据',present,'No exact Product Master join has both cost and operating evidence. / 没有同时具备成本与经营证据的精确 Product Master 匹配。');
  const top=rows[0],evidence=[...top.adRows.map(item=>({kind:'ads',sourceRow:item.index+1,row:item.row})),...top.financeRows.map(item=>({kind:'finance',sourceRow:item.index+1,row:item.row})),...top.costRows.map(item=>({kind:'costs',sourceRow:item.index+1,row:item.row}))].slice(0,20);
  return{available:true,intent:'profitability',title:'Imported-period profitability evidence / 导入期间利润证据',summary:`${clean(top.product.product)||clean(top.product.sku)||clean(top.product.asin)||'Mapped product'}: contribution ${money(top.contribution)}, margin ${pct(top.margin)}, break-even ACoS ${pct(top.breakEvenAcos)}. Formula: operating net − imported COGS − Ads spend. / 贡献利润 ${money(top.contribution)}，利润率 ${pct(top.margin)}，盈亏平衡 ACoS ${pct(top.breakEvenAcos)}。`,sourceRecords:present,evidenceRows:evidence,columns:['date','product','productCode','sku','asin','type','quantity','units','orders','cost','sales','total','unitCost','inboundCost'],note:'Only exact Product Master identifiers are joined. This is loaded-period evidence, not a forecast; omitted Amazon fees are never estimated.'};
}
function resolve(mode,query,records=[]){
  const selected=MODES[mode]?mode:'general',intent=base?.classifyIntent?.(query)||'help';
  if(selected==='general')return base?.answerQuery?.(query,records)||unavailable('help','Agent unavailable');
  if(selected==='help')return intent==='datasets'?base.answerDatasets(records):base.answerQuery('help',records);
  if(selected==='advertising')return base.answerAds(query,records,['ads-waste','ads-winners'].includes(intent)?intent:'ads-summary');
  if(selected==='keyword')return intent==='ranks'?base.answerRanks(query,records):base.answerSqp(query,records);
  if(selected==='listing')return answerListing(records);
  if(selected==='profitability')return /refund|退款/.test(norm(query))?base.answerFinance(query,records):answerProfitability(records);
  if(selected==='inventory')return base.answerInventory(records);
  return base.answerQuery(query,records);
}
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function display(value){if(value===true)return'Yes';if(value===false)return'No';if(value==null||value==='')return'—';if(typeof value==='number')return Number.isInteger(value)?value.toLocaleString('en-US'):Number(value.toFixed(4)).toLocaleString('en-US');return String(value);}
function provenanceHtml(records=[]){if(!records.length)return'<div class="keywordos-agent-empty">No validated source record is attached to this answer.</div>';return records.map(item=>`<div class="keywordos-agent-source"><b>${esc(item.kind)}</b><span>${esc(clean(item.source)||'Unknown source')}</span><small>${esc(Array.isArray(item.rows)?item.rows.length:num(item.rowCount))} rows · ${esc(base?.coverageText?.(item)||'No dated coverage')} · validated · ${esc(clean(item.importedAt)||'Import time unavailable')}</small></div>`).join('');}
function evidenceHtml(answer){if(!answer.evidenceRows?.length)return'<div class="keywordos-agent-empty">No evidence rows are needed for this answer.</div>';const columns=answer.columns||[];return`<div class="keywordos-agent-table-wrap" tabindex="0" aria-label="Agent evidence table"><table class="data-table"><thead><tr><th class="left">Dataset</th><th class="left">Source row</th>${columns.map(column=>`<th class="left">${esc(column)}</th>`).join('')}</tr></thead><tbody>${answer.evidenceRows.map(item=>`<tr><td class="left">${esc(item.kind)}</td><td class="left">${esc(item.sourceRow)}</td>${columns.map(column=>`<td class="left" data-no-i18n>${esc(display(item.row?.[column]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function answerHtml(answer,mode){return`<section class="keywordos-agent-answer"><div class="keywordos-agent-answer-head"><div><span>${answer.available?'EVIDENCE ANSWER · 证据回答':'UNAVAILABLE · 不可用'} · ${esc(MODES[mode]?.label||MODES.general.label)}</span><h3>${esc(answer.title)}</h3></div></div><p class="keywordos-agent-summary">${esc(answer.summary)}</p><div class="keywordos-agent-block"><h4>Source provenance · 数据来源</h4>${provenanceHtml(answer.sourceRecords)}</div><div class="keywordos-agent-block"><h4>Evidence rows · 证据行</h4>${evidenceHtml(answer)}</div><p class="keywordos-agent-note">${esc(answer.note||'')}</p></section>`;}
function examplesHtml(mode){return(MODES[mode]?.examples||MODES.general.examples).map(example=>`<button class="btn secondary sm" type="button" data-keywordos-specialist-example="${esc(example)}">${esc(example)}</button>`).join('');}
function modesHtml(){return Object.entries(MODES).map(([key,value])=>`<button type="button" class="btn secondary sm${key===activeMode?' active':''}" data-keywordos-specialist-mode="${key}" aria-pressed="${key===activeMode?'true':'false'}">${esc(value.label)}</button>`).join('');}
function installStyle(){if(!root?.document||document.querySelector('#keywordos-agent-specialist-style'))return;const style=document.createElement('style');style.id='keywordos-agent-specialist-style';style.textContent='.keywordos-agent-modes{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 8px}.keywordos-agent-modes .active{font-weight:700;border-color:var(--text-strong)}';document.head.appendChild(style);}
function ensureControls(){const drawer=document.querySelector('.keywordos-agent-drawer');if(!drawer)return;installStyle();let modes=drawer.querySelector('.keywordos-agent-modes');const form=drawer.querySelector('#keywordos-agent-form');if(!modes&&form){modes=document.createElement('div');modes.className='keywordos-agent-modes';modes.setAttribute('aria-label','Agent specialist modes');form.before(modes);}if(modes)modes.innerHTML=modesHtml();const examples=drawer.querySelector('.keywordos-agent-examples');if(examples)examples.innerHTML=examplesHtml(activeMode);}
async function records(){try{return await root?.KeywordOSDatasetRegistry?.list?.('store-a')||[];}catch{return[];}}
async function render(query){const result=document.querySelector('#keywordos-agent-result');if(!result)return;result.innerHTML='<div class="keywordos-agent-empty">Reading specialist evidence… / 正在读取专业模式证据…</div>';const data=await records(),answer=resolve(activeMode,query||MODES[activeMode].defaultQuery,data);result.innerHTML=answerHtml(answer,activeMode);}
function click(event){const target=event.target instanceof Element?event.target:null;if(!target)return;const mode=target.closest('[data-keywordos-specialist-mode]');if(mode){event.preventDefault();event.stopImmediatePropagation();activeMode=mode.dataset.keywordosSpecialistMode||'general';ensureControls();const input=document.querySelector('#keywordos-agent-input');if(input)input.value=MODES[activeMode].defaultQuery;render(MODES[activeMode].defaultQuery);return;}const example=target.closest('[data-keywordos-specialist-example]');if(example){event.preventDefault();event.stopImmediatePropagation();const value=example.dataset.keywordosSpecialistExample||'';const input=document.querySelector('#keywordos-agent-input');if(input)input.value=value;render(value);}}
function submit(event){if(event.target?.id!=='keywordos-agent-form')return;event.preventDefault();event.stopImmediatePropagation();const query=clean(document.querySelector('#keywordos-agent-input')?.value)||MODES[activeMode].defaultQuery;render(query);}
function start(){if(!root?.document||!base)return;const boot=()=>{installStyle();document.addEventListener('click',click,true);document.addEventListener('submit',submit,true);const drawer=document.querySelector('#drawer-root');if(drawer){observer=new MutationObserver(ensureControls);observer.observe(drawer,{childList:true,subtree:true});ensureControls();}};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();}
return{MODES,utf8Bytes,matchesMaster,profitabilityRows,answerListing,answerProfitability,resolve,start};
});