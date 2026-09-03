from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}')
    p.write_text(text.replace(old, new, 1))


alert_module = r'''(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(typeof globalThis!=='undefined')globalThis.KeywordOSAlertInboxTest=api;
  if(root)root.KeywordOSAlertInbox=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';

const VERSION='keywordos-alert-inbox-v1';
const MAX_STATE_IDS=2000;
function clean(value,max=500){return String(value??'').replace(/\s+/g,' ').trim().slice(0,max);}
function dateValue(value){const valueText=clean(value,20);return /^\d{4}-\d{2}-\d{2}$/.test(valueText)?valueText:'';}
function finite(value){const number=Number(value);return Number.isFinite(number)?number:null;}
function fnv1a(value){let hash=2166136261;for(let index=0;index<value.length;index+=1){hash^=value.charCodeAt(index);hash=Math.imul(hash,16777619);}return(hash>>>0).toString(36);}
function normalizedKeyword(value){return clean(value).toLowerCase();}
function latestTwoByIdentity(rows=[],identityFn=()=>'',dateFn=row=>row?.date){
  const groups=new Map();
  for(const row of Array.isArray(rows)?rows:[]){const identity=clean(identityFn(row),300),date=dateValue(dateFn(row));if(!identity||!date)continue;if(!groups.has(identity))groups.set(identity,new Map());groups.get(identity).set(date,row);}
  const out=[];for(const [identity,byDate] of groups){const dates=[...byDate.keys()].sort();if(dates.length<2)continue;const beforeDate=dates.at(-2),afterDate=dates.at(-1);out.push({identity,beforeDate,afterDate,before:byDate.get(beforeDate),after:byDate.get(afterDate)});}return out;
}
function alertId(input){return`alert_${fnv1a([input.category,input.sourceKind,input.entity,input.metric,input.beforeDate,input.afterDate,String(input.beforeValue),String(input.afterValue)].join('|'))}`;}
function makeAlert(input){const beforeValue=finite(input.beforeValue),afterValue=finite(input.afterValue);if(beforeValue==null||afterValue==null||beforeValue===afterValue)return null;const alert={category:clean(input.category,40),sourceKind:clean(input.sourceKind,40),sourceLabel:clean(input.sourceLabel,200),entity:clean(input.entity,300),metric:clean(input.metric,80),beforeDate:dateValue(input.beforeDate),afterDate:dateValue(input.afterDate),beforeValue,afterValue,delta:afterValue-beforeValue,unit:clean(input.unit,30),evidence:clean(input.evidence,500)};if(!alert.category||!alert.sourceKind||!alert.entity||!alert.metric||!alert.beforeDate||!alert.afterDate)return null;return Object.freeze({...alert,id:alertId(alert)});}
function competitorAlerts(rows=[]){const alerts=[];for(const pair of latestTwoByIdentity(rows,row=>String(row?.asin||'').toUpperCase())){const asin=pair.identity,priceBefore=finite(pair.before?.price),priceAfter=finite(pair.after?.price),ratingBefore=finite(pair.before?.rating),ratingAfter=finite(pair.after?.rating),reviewsBefore=finite(pair.before?.reviewCount),reviewsAfter=finite(pair.after?.reviewCount);if(priceBefore>0&&priceAfter>0){const item=makeAlert({category:'price',sourceKind:'competitor',sourceLabel:'Competitor snapshot',entity:asin,metric:'Price',beforeDate:pair.beforeDate,afterDate:pair.afterDate,beforeValue:priceBefore,afterValue:priceAfter,unit:'currency',evidence:'Same ASIN · latest two distinct dated imported competitor snapshots'});if(item)alerts.push(item);}if(ratingBefore>=1&&ratingBefore<=5&&ratingAfter>=1&&ratingAfter<=5){const item=makeAlert({category:'review',sourceKind:'competitor',sourceLabel:'Competitor snapshot',entity:asin,metric:'Rating',beforeDate:pair.beforeDate,afterDate:pair.afterDate,beforeValue:ratingBefore,afterValue:ratingAfter,unit:'rating',evidence:'Same ASIN · latest two distinct dated imported competitor snapshots'});if(item)alerts.push(item);}if(reviewsBefore>0&&reviewsAfter>0){const item=makeAlert({category:'review',sourceKind:'competitor',sourceLabel:'Competitor snapshot',entity:asin,metric:'Review Count',beforeDate:pair.beforeDate,afterDate:pair.afterDate,beforeValue:reviewsBefore,afterValue:reviewsAfter,unit:'count',evidence:'Same ASIN · latest two distinct dated imported competitor snapshots'});if(item)alerts.push(item);}}return alerts;}
function rankAlerts(rows=[]){const alerts=[];for(const pair of latestTwoByIdentity(rows,row=>{const asin=clean(row?.asin,40).toUpperCase(),keyword=normalizedKeyword(row?.keyword);return asin&&keyword?`${asin}|${keyword}`:'';})){const [asin,keywordKey]=pair.identity.split('|'),entity=`${asin} · ${clean(pair.after?.keyword||pair.before?.keyword||keywordKey,240)}`;for(const [field,metric] of [['organicRank','Organic Rank'],['sponsoredRank','Sponsored Rank']]){const before=finite(pair.before?.[field]),after=finite(pair.after?.[field]);if(!(before>0&&after>0))continue;const item=makeAlert({category:'rank',sourceKind:'ranks',sourceLabel:'Rank snapshot',entity,metric,beforeDate:pair.beforeDate,afterDate:pair.afterDate,beforeValue:before,afterValue:after,unit:'rank',evidence:'Same ASIN + exact normalized keyword · latest two distinct dated imported rank snapshots'});if(item)alerts.push(item);}}return alerts;}
function inventoryIdentity(row){const sku=clean(row?.sku,120);if(sku)return`SKU:${sku.toUpperCase()}`;const asin=clean(row?.asin,40);return asin?`ASIN:${asin.toUpperCase()}`:'';}
function inventoryAlerts(rows=[]){const alerts=[];for(const pair of latestTwoByIdentity(rows,inventoryIdentity)){const before=finite(pair.before?.available),after=finite(pair.after?.available);if(before==null||after==null)continue;const item=makeAlert({category:'inventory',sourceKind:'inventory',sourceLabel:'Inventory snapshot',entity:pair.identity,metric:'Available',beforeDate:pair.beforeDate,afterDate:pair.afterDate,beforeValue:before,afterValue:after,unit:'count',evidence:'Same SKU/ASIN · latest two distinct dated imported inventory snapshots'});if(item)alerts.push(item);}return alerts;}
function aggregateAdsByDate(rows=[]){const days=new Map();for(const row of Array.isArray(rows)?rows:[]){const date=dateValue(row?.date);if(!date)continue;const current=days.get(date)||{date,spend:0,orders:0,sales:0,clicks:0,impressions:0,rows:0};current.spend+=finite(row?.spend??row?.cost)??0;current.orders+=finite(row?.orders)??0;current.sales+=finite(row?.sales)??0;current.clicks+=finite(row?.clicks)??0;current.impressions+=finite(row?.impressions)??0;current.rows+=1;days.set(date,current);}return[...days.values()].sort((a,b)=>a.date.localeCompare(b.date));}
function adsAlerts(rows=[],sourceLabel='Validated Ads report'){const days=aggregateAdsByDate(rows);if(days.length<2)return[];const before=days.at(-2),after=days.at(-1),alerts=[];for(const [field,metric,unit] of [['spend','Spend','currency'],['orders','Orders','count'],['sales','Attributed Sales','currency'],['clicks','Clicks','count'],['impressions','Impressions','count']]){const item=makeAlert({category:'ads',sourceKind:'ads',sourceLabel,entity:'Store 01 Ads total',metric,beforeDate:before.date,afterDate:after.date,beforeValue:before[field],afterValue:after[field],unit,evidence:`Account-level aggregate · ${before.rows} rows on ${before.date} vs ${after.rows} rows on ${after.date} inside the current validated Ads report`});if(item)alerts.push(item);}return alerts;}
function buildAlerts(input={}){const alerts=[...competitorAlerts(input.competitorRows),...rankAlerts(input.rankRows),...inventoryAlerts(input.inventoryRows),...(input.adsEligible?adsAlerts(input.adsRows,input.adsSource):[])],seen=new Set(),deduped=[];for(const alert of alerts){if(seen.has(alert.id))continue;seen.add(alert.id);deduped.push(alert);}return deduped.sort((a,b)=>b.afterDate.localeCompare(a.afterDate)||a.category.localeCompare(b.category)||a.entity.localeCompare(b.entity)||a.metric.localeCompare(b.metric));}
function normalizeIds(values){const out=[];for(const value of Array.isArray(values)?values:[]){const id=clean(value,120);if(id&&!out.includes(id))out.push(id);if(out.length>=MAX_STATE_IDS)break;}return out;}
function normalizeState(input={}){const source=input&&typeof input==='object'&&!Array.isArray(input)?input:{};return{version:1,view:source.view==='all'?'all':'unread',readIds:normalizeIds(source.readIds),dismissedIds:normalizeIds(source.dismissedIds)};}
function reconcileState(state,alerts=[]){const current=normalizeState(state),ids=new Set((Array.isArray(alerts)?alerts:[]).map(alert=>alert.id));return{...current,readIds:current.readIds.filter(id=>ids.has(id)),dismissedIds:current.dismissedIds.filter(id=>ids.has(id))};}
function setRead(state,id,read=true){const current=normalizeState(state),target=clean(id,120),ids=new Set(current.readIds);if(target){if(read)ids.add(target);else ids.delete(target);}return{...current,readIds:[...ids].slice(-MAX_STATE_IDS)};}
function dismiss(state,id){const current=normalizeState(state),target=clean(id,120),ids=new Set(current.dismissedIds);if(target)ids.add(target);return{...current,dismissedIds:[...ids].slice(-MAX_STATE_IDS),readIds:current.readIds.filter(value=>value!==target)};}
function setView(state,view){return{...normalizeState(state),view:view==='all'?'all':'unread'};}
function visibleAlerts(alerts=[],state={}){const current=normalizeState(state),read=new Set(current.readIds),dismissed=new Set(current.dismissedIds);return(Array.isArray(alerts)?alerts:[]).filter(alert=>!dismissed.has(alert.id)&&(current.view==='all'||!read.has(alert.id)));}
function summary(alerts=[],state={}){const current=normalizeState(state),read=new Set(current.readIds),dismissed=new Set(current.dismissedIds),active=(Array.isArray(alerts)?alerts:[]).filter(alert=>!dismissed.has(alert.id)),out={total:active.length,unread:active.filter(alert=>!read.has(alert.id)).length,price:0,rank:0,inventory:0,review:0,ads:0};for(const alert of active)if(Object.prototype.hasOwnProperty.call(out,alert.category))out[alert.category]+=1;return Object.freeze(out);}
return{VERSION,MAX_STATE_IDS,clean,dateValue,finite,latestTwoByIdentity,makeAlert,competitorAlerts,rankAlerts,inventoryAlerts,aggregateAdsByDate,adsAlerts,buildAlerts,normalizeState,reconcileState,setRead,dismiss,setView,visibleAlerts,summary};
});
'''
Path('alert-inbox.js').write_text(alert_module)

# Dataset Registry: inventory becomes a dated append/correction snapshot kind.
replace_once('dataset-registry.js',
"const APPEND_MERGE_KINDS = new Set(['ranks', 'competitor']);",
"const APPEND_MERGE_KINDS = new Set(['inventory', 'ranks', 'competitor']);")
replace_once('dataset-registry.js',
"    if (kind === 'ranks') {\n      const date = text(row.date);\n      const asin = text(row.asin).toUpperCase();\n      const keyword = normalizedText(row.keyword);\n      return date && asin && keyword ? `${date}|${asin}|${keyword}` : '';\n    }\n    if (kind === 'competitor') {",
"    if (kind === 'inventory') {\n      const date = text(row.date) || 'UNDATED';\n      const sku = text(row.sku).toUpperCase();\n      const asin = text(row.asin).toUpperCase();\n      const identity = sku ? `SKU:${sku}` : asin ? `ASIN:${asin}` : '';\n      return identity ? `${date}|${identity}` : '';\n    }\n    if (kind === 'ranks') {\n      const date = text(row.date);\n      const asin = text(row.asin).toUpperCase();\n      const keyword = normalizedText(row.keyword);\n      return date && asin && keyword ? `${date}|${asin}|${keyword}` : '';\n    }\n    if (kind === 'competitor') {")

# App bridge: expose actual Ads provenance to the alert gate; refresh indicator after Ads import/reset.
replace_once('app.js',
"window.KeywordOSUIBridge={get page(){return state.page},get settings(){return state.settings},get adsRows(){return state.currentRows},get financeRows(){return state.financeRows},",
"window.KeywordOSUIBridge={get page(){return state.page},get settings(){return state.settings},get adsRows(){return state.currentRows},get adsSource(){return state.adsSource},get adsImportedAt(){return state.adsImportedAt},get adsPersistent(){return state.adsPersistent},get financeRows(){return state.financeRows},")
replace_once('app.js',
"toast(persisted?'Amazon Ads report imported and saved in this browser':'Amazon Ads report imported for this session; browser persistence is unavailable',persisted?'success':'warn');state.page='overview';render();}",
"toast(persisted?'Amazon Ads report imported and saved in this browser':'Amazon Ads report imported for this session; browser persistence is unavailable',persisted?'success':'warn');state.page='overview';render();window.KeywordOSGrowth?.refreshAlertIndicator?.();}")
replace_once('app.js',
"toast('Amazon Ads workspace reset to Cloudflare seed','success');state.page='import';render();return;}",
"toast('Amazon Ads workspace reset to Cloudflare seed','success');state.page='import';render();window.KeywordOSGrowth?.refreshAlertIndicator?.();return;}")

# Growth workspace integration.
replace_once('growth-workspaces.js',
"const relevanceReviewEngine=root?.KeywordOSKeywordRelevanceReview;\n",
"const relevanceReviewEngine=root?.KeywordOSKeywordRelevanceReview;\nconst alertInboxEngine=root?.KeywordOSAlertInbox;\nconst ALERT_INBOX_STORAGE_KEY='keywordos_v9_alert_inbox';\n")

alert_runtime = r'''function alertInboxState(){try{return alertInboxEngine?.normalizeState(JSON.parse(localStorage.getItem(ALERT_INBOX_STORAGE_KEY)||'{}'))||{version:1,view:'unread',readIds:[],dismissedIds:[]}}catch{return alertInboxEngine?.normalizeState({})||{version:1,view:'unread',readIds:[],dismissedIds:[]}}}
function saveAlertInboxState(next){const state=alertInboxEngine?.normalizeState(next)||next;try{localStorage.setItem(ALERT_INBOX_STORAGE_KEY,JSON.stringify(state))}catch{}return state}
function alertInboxModel(){if(!alertInboxEngine)return{alerts:[],state:{version:1,view:'unread',readIds:[],dismissedIds:[]},visible:[],summary:{total:0,unread:0,price:0,rank:0,inventory:0,review:0,ads:0}};const bridge=root.KeywordOSUIBridge,adsEligible=Boolean(bridge?.adsPersistent),alerts=alertInboxEngine.buildAlerts({competitorRows:load('competitor'),rankRows:load('ranks'),inventoryRows:load('inventory'),adsRows:adsEligible?adsRows():[],adsEligible,adsSource:bridge?.adsSource||'Validated Ads report'}),stored=alertInboxState(),state=alertInboxEngine.reconcileState(stored,alerts);if(JSON.stringify(stored)!==JSON.stringify(state))saveAlertInboxState(state);return{alerts,state,visible:alertInboxEngine.visibleAlerts(alerts,state),summary:alertInboxEngine.summary(alerts,state)}}
function alertValue(alert,value){if(alert.unit==='currency')return money(value);if(alert.unit==='rating')return Number(value).toFixed(2).replace(/\.00$/,'');return integer(value)}
function alertDelta(alert){const value=alert.delta;if(alert.unit==='currency')return`${value>=0?'+':''}${money(value).replace('$','$')}`;if(alert.unit==='rating')return`${value>=0?'+':''}${Number(value).toFixed(2).replace(/\.00$/,'')}`;return`${value>=0?'+':''}${integer(value)}`}
function alertCategoryLabel(category){return({price:'Price',rank:'Rank',inventory:'Inventory',review:'Review',ads:'Ads'})[category]||category}
function renderAlertInbox(){const model=alertInboxModel(),read=new Set(model.state.readIds),rows=model.visible.slice(0,250).map(alert=>`<tr><td>${read.has(alert.id)?'<span class="badge gray">Read</span>':'<span class="badge blue">Unread</span>'}</td><td><span class="badge gray">${esc(alertCategoryLabel(alert.category))}</span></td><td class="left"><b>${esc(alert.entity)}</b><small>${esc(alert.sourceLabel)}</small></td><td class="left"><b>${esc(alert.metric)}</b></td><td>${esc(alertValue(alert,alert.beforeValue))} → ${esc(alertValue(alert,alert.afterValue))}<small>Δ ${esc(alertDelta(alert))}</small></td><td>${esc(alert.beforeDate)} → ${esc(alert.afterDate)}</td><td class="left"><details><summary>Evidence</summary><small>${esc(alert.evidence)}<br>Source kind: ${esc(alert.sourceKind)}<br>Only this exact snapshot pair is compared; no live monitoring or external fact is implied.</small></details></td><td><button class="btn sm" data-alert-read="${esc(alert.id)}" data-alert-read-value="${read.has(alert.id)?'0':'1'}">${read.has(alert.id)?'Mark unread':'Mark read'}</button> <button class="btn danger sm" data-alert-dismiss="${esc(alert.id)}">Dismiss</button></td></tr>`).join('');return`<div class="card" data-local-alert-inbox><div class="card-head"><div class="card-title"><h3>Local Alert Inbox</h3><small>Derived only from the latest two distinct dated observations for the same exact entity. Inbox state stores read/dismissed IDs only; alert results are recomputed from current evidence.</small></div><div><button class="btn sm ${model.state.view==='unread'?'primary':''}" data-alert-view="unread">Unread</button> <button class="btn sm ${model.state.view==='all'?'primary':''}" data-alert-view="all">All active</button></div></div><div class="growth-kpis">${kpi('Unread',integer(model.summary.unread),`${model.summary.total} active alerts`)}${kpi('Price + Review',integer(model.summary.price+model.summary.review),'Competitor snapshots')}${kpi('Rank',integer(model.summary.rank),'ASIN + keyword snapshots')}${kpi('Inventory + Ads',integer(model.summary.inventory+model.summary.ads),'Dated imported observations')}</div><div class="notice-banner">Price and review alerts use competitor snapshot Price / Rating / Review Count. Rank alerts use the same ASIN + exact normalized keyword. Inventory uses dated Available snapshots. Ads compares only the latest two dates inside the current validated Ads report; different report imports are never stitched together as if they were one time series.</div>${rows?table(['State','Type','Entity','Metric','Observed change','Snapshot pair','Trace','Action'],rows):`<div class="card-body"><span class="muted">${model.state.view==='unread'?'No unread snapshot alerts.':'No active snapshot alerts.'} A category remains silent until the same exact entity has two distinct dated observations and the supported value actually changes.</span></div>`}</div>`}
function updateAlertState(mutator){const model=alertInboxModel(),next=mutator(model.state);saveAlertInboxState(next);render('anomaly-center')}
function refreshAlertIndicator(){const model=alertInboxModel(),button=$('#alert-inbox-trigger'),dot=button?.querySelector('.notification-dot');if(dot)dot.hidden=model.summary.unread===0;if(button)button.title=model.summary.unread?`Notifications · ${model.summary.unread} unread local alerts`:'Notifications · no unread local alerts';return model.summary}
function bindAlertTrigger(){const button=$('#alert-inbox-trigger');if(!button||button.dataset.alertBound)return;button.dataset.alertBound='1';button.addEventListener('click',()=>render('anomaly-center'))}
'''
replace_once('growth-workspaces.js','function renderInventory(){',alert_runtime+'function renderInventory(){')
replace_once('growth-workspaces.js',
"function renderAnomalies(){const rows=anomalies();return rows.length?`<div class=\"notice-banner\">Deterministic checks only. No anomaly is generated without loaded evidence.</div>${table(['Signal','Entity / Value','Evidence','Severity'],rows.map(r=>`<tr><td class=\"left\"><b>${esc(r[0])}</b></td><td class=\"left\">${esc(r[1])}</td><td class=\"left\">${esc(r[2])}</td><td><span class=\"badge ${r[3]==='High'?'red':'amber'}\">${r[3]}</span></td></tr>`))}`:empty('No supported anomalies detected','Import current Ads and inventory snapshots to expand deterministic checks.')}",
"function renderAnomalies(){const rows=anomalies(),checks=rows.length?`<div class=\"card top-gap\"><div class=\"card-head\"><div class=\"card-title\"><h3>Deterministic checks</h3><small>Existing threshold checks remain separate from the snapshot-only Alert Inbox.</small></div></div><div class=\"notice-banner\">Deterministic checks only. No anomaly is generated without loaded evidence.</div>${table(['Signal','Entity / Value','Evidence','Severity'],rows.map(r=>`<tr><td class=\"left\"><b>${esc(r[0])}</b></td><td class=\"left\">${esc(r[1])}</td><td class=\"left\">${esc(r[2])}</td><td><span class=\"badge ${r[3]==='High'?'red':'amber'}\">${r[3]}</span></td></tr>`))}</div>`:`<div class=\"card top-gap\"><div class=\"card-body\"><span class=\"muted\">No supported deterministic threshold checks detected.</span></div></div>`;return renderAlertInbox()+checks}")
replace_once('growth-workspaces.js',
"const rows=parseKind(kind,await file.text()),next=kind==='ranks'?mergeRankSnapshots(load(kind),rows):kind==='competitor'?[...load(kind),...rows]:kind==='reverse-asin'?mergeReverseAsinSnapshots(load(kind),rows):rows;",
"const rows=parseKind(kind,await file.text()),next=kind==='ranks'?mergeRankSnapshots(load(kind),rows):kind==='inventory'?(root?.KeywordOSDatasetRegistry?.mergeAppendRows?.('inventory',[...load(kind),...rows])||rows):kind==='competitor'?[...load(kind),...rows]:kind==='reverse-asin'?mergeReverseAsinSnapshots(load(kind),rows):rows;")
replace_once('growth-workspaces.js',
"<div class=\"growth-actions\"><div><b>Inventory risk</b><small>Days of cover uses the loaded Ads report as a 30-day unit-sales proxy; action priority is a review order, not a purchase-order recommendation.</small></div><button class=\"btn\" data-growth-import=\"inventory\">Replace Inventory CSV</button></div>",
"<div class=\"growth-actions\"><div><b>Inventory risk</b><small>Days of cover uses the loaded Ads report as a 30-day unit-sales proxy; dated inventory imports are retained as idempotent snapshots for local change alerts.</small></div><button class=\"btn\" data-growth-import=\"inventory\">Import Inventory Snapshot</button></div>")
replace_once('growth-workspaces.js',
"function bind(rootNode){$$('[data-growth-import]',rootNode).forEach(b=>b.addEventListener('click',()=>openImport(b.dataset.growthImport)));",
"function bind(rootNode){$$('[data-growth-import]',rootNode).forEach(b=>b.addEventListener('click',()=>openImport(b.dataset.growthImport)));$$('[data-alert-view]',rootNode).forEach(button=>button.addEventListener('click',()=>updateAlertState(state=>alertInboxEngine.setView(state,button.dataset.alertView))));$$('[data-alert-read]',rootNode).forEach(button=>button.addEventListener('click',()=>updateAlertState(state=>alertInboxEngine.setRead(state,button.dataset.alertRead,button.dataset.alertReadValue==='1'))));$$('[data-alert-dismiss]',rootNode).forEach(button=>button.addEventListener('click',()=>updateAlertState(state=>alertInboxEngine.dismiss(state,button.dataset.alertDismiss))));")
replace_once('growth-workspaces.js',
"function render(page){const meta=PAGE_META[page],content=$('#content');if(!meta||!content)return false;",
"function render(page){const meta=PAGE_META[page],content=$('#content');if(!meta||!content)return false;")
replace_once('growth-workspaces.js',
"root.KeywordOSI18N?.apply(document);history.replaceState(null,'',`#page=${encodeURIComponent(page)}`);return true}",
"root.KeywordOSI18N?.apply(document);history.replaceState(null,'',`#page=${encodeURIComponent(page)}`);refreshAlertIndicator();return true}")
replace_once('growth-workspaces.js',
"const boot=async()=>{await hydrateGrowthDatasets();injectNav();document.addEventListener('click',e=>{",
"const boot=async()=>{await hydrateGrowthDatasets();injectNav();bindAlertTrigger();refreshAlertIndicator();document.addEventListener('click',e=>{")
replace_once('growth-workspaces.js',
"productRows,start,render};",
"productRows,alertInboxModel,refreshAlertIndicator,start,render};")

# Header notification becomes a real inbox entrypoint; runtime loaded before Growth.
replace_once('index.html',
'<button class="header-action" title="Notifications">♢<span class="notification-dot"></span></button>',
'<button class="header-action" id="alert-inbox-trigger" title="Notifications">♢<span class="notification-dot" hidden></span></button>')
replace_once('index.html',
'  <script src="keyword-relevance-review.js"></script>\n  <script src="growth-workspaces.js"></script>',
'  <script src="keyword-relevance-review.js"></script>\n  <script src="alert-inbox.js"></script>\n  <script src="growth-workspaces.js"></script>')

# Backup whitelist: state is object-shaped and contains UI/read-dismiss ids only.
replace_once('local-operations-actions.js',
"    'keywordos_v9_local_filter_builder',\n",
"    'keywordos_v9_local_filter_builder',\n    'keywordos_v9_alert_inbox',\n")

# package check/build closure.
p = Path('package.json')
text = p.read_text()
text = text.replace('node --check keyword-relevance-review.js && node --check growth-import-gate.js', 'node --check keyword-relevance-review.js && node --check alert-inbox.js && node --check growth-import-gate.js')
text = text.replace('growth-import-validation.js keyword-relevance-review.js growth-import-gate.js', 'growth-import-validation.js keyword-relevance-review.js alert-inbox.js growth-import-gate.js')
p.write_text(text)

# Dataset Registry regression: inventory now retains dated history and treats same-date identity as correction.
p = Path('tests/dataset-registry.test.mjs')
text = p.read_text()
needle = "test('rank snapshots append new dates and replace corrections with the same stable key', () => {\n"
insert = r'''test('inventory snapshots append dated history and replace same-date SKU corrections', () => {
  const rows = registry.mergeAppendRows('inventory', [
    { date: '2026-08-30', sku: 'SKU-1', asin: 'B000000001', available: 20 },
    { date: '2026-08-31', sku: 'SKU-1', asin: 'B000000001', available: 15 },
    { date: '2026-08-31', sku: 'sku-1', asin: 'B000000001', available: 12 }
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].available, 12);
  assert.ok(registry.APPEND_MERGE_KINDS.has('inventory'));
});

'''
if text.count(needle) != 1: raise SystemExit('dataset registry test anchor mismatch')
p.write_text(text.replace(needle, insert + needle, 1))

# Alert inbox tests.
tests = r'''import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../alert-inbox.js');
const alerts = globalThis.KeywordOSAlertInboxTest;

test('competitor alerts compare only the latest two distinct snapshots for price and review evidence', () => {
  const rows = [
    { date: '2026-09-01', asin: 'B000000001', price: 20, rating: 4.2, reviewCount: 100 },
    { date: '2026-09-02', asin: 'B000000001', price: 19, rating: 4.3, reviewCount: 105 },
    { date: '2026-09-03', asin: 'B000000001', price: 18, rating: 4.4, reviewCount: 110 }
  ];
  const out = alerts.competitorAlerts(rows);
  assert.equal(out.length, 3);
  assert.ok(out.every(item => item.beforeDate === '2026-09-02' && item.afterDate === '2026-09-03'));
  assert.deepEqual(out.map(item => item.metric).sort(), ['Price', 'Rating', 'Review Count']);
});

test('all alert categories fail closed with only one dated observation', () => {
  assert.equal(alerts.competitorAlerts([{ date: '2026-09-03', asin: 'B000000001', price: 18 }]).length, 0);
  assert.equal(alerts.rankAlerts([{ date: '2026-09-03', asin: 'B000000001', keyword: 'reader', organicRank: 10 }]).length, 0);
  assert.equal(alerts.inventoryAlerts([{ date: '2026-09-03', sku: 'SKU-1', available: 10 }]).length, 0);
  assert.equal(alerts.adsAlerts([{ date: '2026-09-03', spend: 10, orders: 1, sales: 20, clicks: 5, impressions: 100 }]).length, 0);
});

test('rank alerts stay scoped to exact ASIN plus normalized keyword and require observed positive ranks', () => {
  const out = alerts.rankAlerts([
    { date: '2026-09-02', asin: 'B000000001', keyword: 'Reading Glasses', organicRank: 20, sponsoredRank: 0 },
    { date: '2026-09-03', asin: 'b000000001', keyword: 'reading glasses', organicRank: 15, sponsoredRank: 0 },
    { date: '2026-09-02', asin: 'B000000001', keyword: 'Reading Glass', organicRank: 8 },
    { date: '2026-09-03', asin: 'B000000001', keyword: 'Reading Glass', organicRank: 8 }
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].metric, 'Organic Rank');
  assert.equal(out[0].beforeValue, 20);
  assert.equal(out[0].afterValue, 15);
});

test('inventory alerts use latest two dated Available snapshots and ignore undated rows', () => {
  const out = alerts.inventoryAlerts([
    { date: '', sku: 'SKU-1', available: 99 },
    { date: '2026-09-01', sku: 'SKU-1', available: 20 },
    { date: '2026-09-03', sku: 'SKU-1', available: 11 }
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].entity, 'SKU:SKU-1');
  assert.equal(out[0].beforeValue, 20);
  assert.equal(out[0].afterValue, 11);
});

test('Ads alerts compare account aggregates on the latest two dates inside one validated report input', () => {
  const rows = [
    { date: '2026-09-01', spend: 2, orders: 1, sales: 5, clicks: 2, impressions: 20 },
    { date: '2026-09-02', spend: 3, orders: 1, sales: 6, clicks: 3, impressions: 30 },
    { date: '2026-09-02', spend: 2, orders: 1, sales: 4, clicks: 2, impressions: 20 },
    { date: '2026-09-03', spend: 7, orders: 3, sales: 14, clicks: 6, impressions: 60 }
  ];
  const out = alerts.adsAlerts(rows, 'ads.csv');
  assert.equal(out.length, 5);
  assert.ok(out.every(item => item.beforeDate === '2026-09-02' && item.afterDate === '2026-09-03'));
  assert.equal(out.find(item => item.metric === 'Spend').beforeValue, 5);
  assert.equal(out.find(item => item.metric === 'Spend').afterValue, 7);
});

test('read and dismiss state stores IDs only and is reconciled when evidence disappears', () => {
  const source = alerts.makeAlert({ category: 'inventory', sourceKind: 'inventory', entity: 'SKU:ONE', metric: 'Available', beforeDate: '2026-09-01', afterDate: '2026-09-02', beforeValue: 10, afterValue: 5, unit: 'count' });
  let state = alerts.setRead({}, source.id, true);
  state = alerts.dismiss(state, source.id);
  assert.deepEqual(Object.keys(state).sort(), ['dismissedIds', 'readIds', 'version', 'view']);
  assert.equal(JSON.stringify(state).includes('Available'), false);
  assert.equal(alerts.summary([source], state).total, 0);
  assert.deepEqual(alerts.reconcileState(state, []), { version: 1, view: 'unread', readIds: [], dismissedIds: [] });
});

test('runtime wires a backup-safe local inbox into Anomaly Center and gates Ads on actual persisted imports', async () => {
  const [index, pkg, growth, localOps, registry, readme] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
    readFile(new URL('../growth-workspaces.js', import.meta.url), 'utf8'),
    readFile(new URL('../local-operations-actions.js', import.meta.url), 'utf8'),
    readFile(new URL('../dataset-registry.js', import.meta.url), 'utf8'),
    readFile(new URL('../README.md', import.meta.url), 'utf8')
  ]);
  assert.ok(index.indexOf('alert-inbox.js') < index.indexOf('growth-workspaces.js'));
  assert.match(index, /id="alert-inbox-trigger"/);
  assert.match(pkg, /node --check alert-inbox\.js/);
  assert.match(pkg, /keyword-relevance-review\.js alert-inbox\.js growth-import-gate\.js/);
  assert.match(growth, /adsEligible=Boolean\(bridge\?\.adsPersistent\)/);
  assert.match(growth, /Local Alert Inbox/);
  assert.match(growth, /latest two dates inside the current validated Ads report/);
  assert.match(localOps, /keywordos_v9_alert_inbox/);
  assert.match(registry, /new Set\(\['inventory', 'ranks', 'competitor'\]\)/);
  assert.match(readme, /本地 alert inbox/);
});
'''
Path('tests/alert-inbox.test.mjs').write_text(tests)

# README closeout with verification placeholders finalized by workflow.
old = '- [ ] 增加本地 alert inbox，只对两次真实快照间的价格、排名、库存、评论或广告变化发提示。'
new = '''- [x] 增加本地 alert inbox，只对两次真实快照间的价格、排名、库存、评论或广告变化发提示。
  - 2026-09-03：新增纯函数 `alert-inbox.js`，复用现有 `anomaly-center` 作为唯一入口，并把页头 Notifications 图标接到同一 Local Alert Inbox，不新建实时监控服务。每条 alert 都要求同一 exact entity 至少有两个 **distinct dated** 真实观察：Price / Review 来自同 ASIN 最新两次 imported competitor snapshots（Price、Rating、Review Count）；Rank 来自同 ASIN + exact normalized keyword 最新两次 imported rank snapshots，0 / missing rank 不参与；Inventory 只比较同 SKU（无 SKU 时 ASIN）最新两次 dated `Available` snapshots；Ads 只在当前 `adsPersistent=true` 的 validated Ads report 内聚合最新两个 distinct dates 的 Spend / Orders / Attributed Sales / Clicks / Impressions，绝不把 Cloudflare seed 或两个不同 report imports 拼成时间序列。为让库存真正具备跨导入的第二快照，Dataset Registry 的 append/correction policy 从 ranks + competitor 扩展到 inventory，稳定键为 date + SKU（无 SKU 时 ASIN），同日同实体后导入视为 correction，历史日期保留。Inbox 的 `keywordos_v9_alert_inbox` 只保存 `{view, readIds, dismissedIds}`，进入现有 Local Data Operations v3 backup whitelist；alert id 由 category / source / entity / metric / 前后日期 / 前后值确定性生成，来源删除、scope 证据消失或 snapshot pair 改变后会重新计算并清掉失效 read/dismiss metadata，不保存派生 alert payload。现有 `anomalies()` 的 7-day threshold checks 继续独立显示，不再与 snapshot alerts 混为一谈。CI 为 **__TEST_COUNT__ passed / 0 failed**；`npm run build` 验证 **__JS_COUNT__ 个 JS + 9 个 CSS，__PUBLISH_COUNT__ 个发布文件**，source/dist byte identity 与 committed-dist parity gate 全部通过。'''
replace_once('README.md', old, new)
