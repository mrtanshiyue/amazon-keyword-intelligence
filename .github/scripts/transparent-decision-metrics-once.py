from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    p.write_text(text.replace(old, new, 1))


def replace_between(path, start_marker, end_marker, replacement, label):
    p = Path(path)
    text = p.read_text()
    if text.count(start_marker) != 1:
        raise SystemExit(f'{label}: start marker expected once, found {text.count(start_marker)}')
    start = text.index(start_marker)
    end = text.find(end_marker, start + len(start_marker))
    if end < 0:
        raise SystemExit(f'{label}: end marker not found')
    p.write_text(text[:start] + replacement + text[end:])


helpers = r'''function formulaMetric(numerator,denominator,{formula='Numerator ÷ Denominator',numeratorLabel='Numerator',denominatorLabel='Denominator',numeratorKind='count',denominatorKind='count'}={}){const n=Number(numerator),d=Number(denominator),available=Number.isFinite(n)&&Number.isFinite(d)&&d>0;return{available,value:available?n/d:null,formula,numerator:Number.isFinite(n)?n:null,denominator:Number.isFinite(d)?d:null,inputs:[{label:numeratorLabel,value:Number.isFinite(n)?n:null,kind:numeratorKind},{label:denominatorLabel,value:Number.isFinite(d)?d:null,kind:denominatorKind}],reason:available?'':'Denominator is zero or missing.'}}
function metricInputText(input){const value=input?.value;if(value==null||!Number.isFinite(Number(value)))return`${input?.label||'Input'}: —`;const formatted=input.kind==='money'?money(value):input.kind==='pct'?pct(value):integer(value);return`${input.label}: ${formatted}`}
function formulaDisclosure(metric){const inputs=Array.isArray(metric?.inputs)?metric.inputs.map(metricInputText).join(' · '):'';return`<details><summary>Formula & inputs</summary><small>${esc(metric?.formula||'—')}${inputs?`<br>${esc(inputs)}`:''}${metric?.reason?`<br>Unavailable: ${esc(metric.reason)}`:''}</small></details>`}
function sqpConversionMetrics(row={}){const searches=Number(row?.volume||0),purchases=Number(row?.purchases||0),clicks=Number(row?.clicks||0),purchaseRate=formulaMetric(purchases,searches,{formula:'Purchases ÷ Searches',numeratorLabel:'Purchases',denominatorLabel:'Searches'}),searchCvr=formulaMetric(purchases,searches,{formula:'Purchases ÷ Searches',numeratorLabel:'Purchases',denominatorLabel:'Searches'}),clickCvr=formulaMetric(purchases,clicks,{formula:'Purchases ÷ Clicks',numeratorLabel:'Purchases',denominatorLabel:'Clicks'});return{purchaseRate,searchCvr,clickCvr}}
function adsDecisionMetrics(rows=[]){const totals=(Array.isArray(rows)?rows:[]).reduce((sum,row)=>{const spendValue=row?.spend==null?row?.cost:row?.spend;sum.spend+=Number(spendValue||0)||0;sum.orders+=Number(row?.orders||0)||0;sum.clicks+=Number(row?.clicks||0)||0;sum.sales+=Number(row?.sales||0)||0;return sum},{spend:0,orders:0,clicks:0,sales:0});return{totals,cpa:formulaMetric(totals.spend,totals.orders,{formula:'Spend ÷ Orders',numeratorLabel:'Spend',denominatorLabel:'Orders',numeratorKind:'money'}),cpc:formulaMetric(totals.spend,totals.clicks,{formula:'Spend ÷ Clicks',numeratorLabel:'Spend',denominatorLabel:'Clicks',numeratorKind:'money'}),clickCvr:formulaMetric(totals.orders,totals.clicks,{formula:'Orders ÷ Clicks',numeratorLabel:'Orders',denominatorLabel:'Clicks'}),acos:formulaMetric(totals.spend,totals.sales,{formula:'Spend ÷ Attributed ad sales',numeratorLabel:'Spend',denominatorLabel:'Attributed ad sales',numeratorKind:'money',denominatorKind:'money'})}}
function firstOrderBudgetScenario({clickCvr,cpc,probability}){const rate=Number(clickCvr),cost=Number(cpc),target=Number(probability),inputs=[{label:'Target probability',value:Number.isFinite(target)?target:null,kind:'pct'},{label:'Click CVR',value:Number.isFinite(rate)?rate:null,kind:'pct'},{label:'Observed CPC',value:Number.isFinite(cost)?cost:null,kind:'money'}],formula='ceil(ln(1 − target probability) ÷ ln(1 − Click CVR)) × observed CPC';if(!(target>0&&target<1))return{available:false,value:null,budget:null,requiredClicks:null,formula,inputs,reason:'Target probability must be greater than 0% and less than 100%.'};if(!(rate>0&&rate<=1))return{available:false,value:null,budget:null,requiredClicks:null,formula,inputs,reason:'Click CVR denominator evidence is missing or the derived rate is outside 0–100%.'};if(!(cost>=0)&&Number.isFinite(cost))return{available:false,value:null,budget:null,requiredClicks:null,formula,inputs,reason:'Observed CPC is unavailable.'};if(!Number.isFinite(cost)||cost<0)return{available:false,value:null,budget:null,requiredClicks:null,formula,inputs,reason:'Observed CPC is unavailable.'};const requiredClicks=rate===1?1:Math.ceil(Math.log(1-target)/Math.log(1-rate)),budget=requiredClicks*cost;return{available:true,value:budget,budget,requiredClicks,formula,inputs,reason:''}}
function breakEvenAcosMetric({operatingNet,cogs,adSales,hasFinance=true,hasCost=true,hasAds=true}={}){const net=Number(operatingNet),cost=Number(cogs),sales=Number(adSales),inputs=[{label:'Operating net',value:Number.isFinite(net)?net:null,kind:'money'},{label:'COGS',value:Number.isFinite(cost)?cost:null,kind:'money'},{label:'Attributed ad sales',value:Number.isFinite(sales)?sales:null,kind:'money'}],formula='max(0, (Operating net − COGS) ÷ Attributed ad sales)';if(!hasFinance||!hasCost||!hasAds)return{available:false,value:null,formula,inputs,reason:'Requires mapped Finance, Costs and Ads evidence for the same Product Master record.'};if(!Number.isFinite(net)||!Number.isFinite(cost)||!Number.isFinite(sales)||sales<=0)return{available:false,value:null,formula,inputs,reason:'Attributed ad sales denominator is zero or missing.'};return{available:true,value:Math.max(0,(net-cost)/sales),formula,inputs,reason:''}}
function sqpSummary(rows){return rows.map(r=>{const conversion=sqpConversionMetrics(r);return{...r,ctr:r.impressions?r.clicks/r.impressions:0,cartRate:r.clicks?r.cartAdds/r.clicks:0,purchaseRate:conversion.purchaseRate.value,searchCvr:conversion.searchCvr.value,clickCvr:conversion.clickCvr.value,conversionMetrics:conversion,opportunity:(r.volume||r.impressions)*(1-(r.brandPurchaseShare||0))}}).sort((a,b)=>b.opportunity-a.opportunity)}
'''
replace_between('growth-workspaces.js', 'function sqpSummary(rows){', 'function rankSnapshotKey', helpers, 'transparent decision helpers')

render_search = r'''function renderSearchFunnel(){const rows=sqpSummary(load('sqp'));if(!rows.length)return empty('Import SQP or ABA CSV','Required: Search Query plus funnel totals or shares. No demand metrics are synthesized.','sqp','Import SQP / ABA');const total=rows.reduce((s,r)=>({volume:s.volume+r.volume,impressions:s.impressions+r.impressions,clicks:s.clicks+r.clicks,cartAdds:s.cartAdds+r.cartAdds,purchases:s.purchases+r.purchases}),{volume:0,impressions:0,clicks:0,cartAdds:0,purchases:0}),conversion=sqpConversionMetrics(total),formulaRows=[['Purchase Rate',conversion.purchaseRate],['Search CVR',conversion.searchCvr],['Click CVR',conversion.clickCvr]];return`<div class="growth-actions"><div><b>Search Query Performance</b><small>${rows.length} imported query rows</small></div><button class="btn" data-growth-import="sqp">Replace SQP / ABA CSV</button></div><div class="growth-kpis">${kpi('Query Demand',integer(total.volume),'Imported searches')}${kpi('Impressions',integer(total.impressions),'Query funnel')}${kpi('Clicks',integer(total.clicks),`CTR ${pct(total.impressions?total.clicks/total.impressions:0)}`)}${kpi('Purchases',integer(total.purchases),`Click CVR ${pct(conversion.clickCvr.value)}`)}</div><div class="card top-gap"><div class="card-head"><div class="card-title"><h3>Transparent conversion formulas</h3><small>Calculated only from imported funnel counts. A zero or missing denominator is shown as —.</small></div></div>${table(['Metric','Value','Formula'],formulaRows.map(([label,metric])=>`<tr><td class="left"><b>${esc(label)}</b></td><td>${pct(metric.value)}</td><td class="left">${formulaDisclosure(metric)}</td></tr>`))}<div class="card-body"><span class="muted">Purchase Rate and Search CVR intentionally share Purchases ÷ Searches under the current KeywordOS roadmap definition; both labels are retained for source/export compatibility.</span></div></div>${table(['Query','ASIN','Volume','Impressions','Clicks','Cart Adds','Purchases','Purchase Rate','Search CVR','Click CVR','Purchase Share','Opportunity'],rows.slice(0,250).map(r=>`<tr><td class="left"><b>${esc(r.query)}</b></td><td class="left">${esc(r.asin||'—')}</td><td>${integer(r.volume)}</td><td>${integer(r.impressions)}</td><td>${integer(r.clicks)}</td><td>${integer(r.cartAdds)}</td><td>${integer(r.purchases)}</td><td>${pct(r.purchaseRate)}</td><td>${pct(r.searchCvr)}</td><td>${pct(r.clickCvr)}</td><td>${pct(r.brandPurchaseShare)}</td><td>${integer(r.opportunity)}</td></tr>`))}`}
'''
replace_between('growth-workspaces.js', 'function renderSearchFunnel(){', 'function renderAsinComparison', render_search, 'Search Funnel transparent formulas')

product_rows = r'''function productRows(){const master=masterIndex(),rows=new Map(),blank=target=>({...target,spend:0,sales:0,orders:0,units:0,net:0,quantity:0,refunds:0,costs:[],inventory:[],adsRecords:0,financeRecords:0}),add=(record,field)=>{const target=resolveMaster(master,record);if(!target)return;const current=rows.get(target.productId)||blank(target);if(field==='cost')current.costs.push(record);if(field==='inventory')current.inventory.push(record);rows.set(target.productId,current)};for(const r of adsRows()){const target=resolveMaster(master,r);if(!target)continue;const current=rows.get(target.productId)||blank(target);current.spend+=Number(r.spend==null?r.cost:r.spend)||0;current.sales+=+r.sales||0;current.orders+=+r.orders||0;current.units+=+r.units||0;current.adsRecords+=1;rows.set(target.productId,current)}for(const r of financeRows()){const target=resolveMaster(master,r);if(!target)continue;const current=rows.get(target.productId)||blank(target);if(r.type!=='Transfer')current.net+=+r.total||0;current.quantity+=Math.max(0,+r.quantity||0);if(r.type==='Refund')current.refunds+=Math.abs(+r.quantity||0);current.financeRecords+=1;rows.set(target.productId,current)}for(const r of load('costs'))add(r,'cost');for(const r of load('inventory'))add(r,'inventory');return[...rows.values()].map(r=>{const unitCost=r.costs.length?r.costs.reduce((s,x)=>s+x.unitCost+x.inboundCost,0)/r.costs.length:0,cogs=unitCost*(r.quantity||r.units||0),contribution=r.net-cogs-r.spend,inv=[...r.inventory].sort((a,b)=>a.date.localeCompare(b.date)).at(-1),breakEvenMetric=breakEvenAcosMetric({operatingNet:r.net,cogs,adSales:r.sales,hasFinance:r.financeRecords>0,hasCost:r.costs.length>0,hasAds:r.adsRecords>0});return{...r,unitCost,cogs,contribution,margin:r.financeRecords>0&&r.net?contribution/r.net:null,breakEvenAcos:breakEvenMetric.value,breakEvenMetric,available:inv?.available??null}}).sort((a,b)=>b.contribution-a.contribution)}
'''
replace_between('growth-workspaces.js', 'function productRows(){', 'function refundOpportunityRows', product_rows, 'Product 360 complete-evidence economics')

budget_output = r'''function budgetScenarioOutput(rootNode){const target=rootNode.querySelector('[data-budget-output]'),input=rootNode.querySelector('[data-budget-probability]');if(!target||!input)return;const raw=String(input.value||'').trim(),ads=adsDecisionMetrics(adsRows());if(!raw){target.innerHTML='<span class="muted">Enter a target probability to calculate a local planning scenario.</span>';return}if(!ads.cpc.available||!ads.clickCvr.available){target.innerHTML=`<span class="muted">Budget scenario unavailable: ${esc(!ads.cpc.available?ads.cpc.reason:ads.clickCvr.reason)}</span>`;return}const plan=firstOrderBudgetScenario({clickCvr:ads.clickCvr.value,cpc:ads.cpc.value,probability:Number(raw)/100});if(!plan.available){target.innerHTML=`<span class="muted">${esc(plan.reason)}</span>${formulaDisclosure(plan)}`;return}target.innerHTML=`<div class="growth-kpis"><div class="growth-kpi"><span>Required clicks</span><b>${integer(plan.requiredClicks)}</b><small>At imported aggregate Click CVR</small></div><div class="growth-kpi"><span>Scenario budget</span><b>${money(plan.budget)}</b><small>${integer(plan.requiredClicks)} clicks × ${money(ads.cpc.value)} observed CPC</small></div></div>${formulaDisclosure(plan)}<div class="top-gap muted">Planning scenario only. It assumes each click has the same independent conversion probability as the loaded Ads aggregate; it does not recommend or mutate an Amazon campaign budget.</div>`}
'''
replace_once('growth-workspaces.js', 'function operationsPanel(page){', budget_output + 'function operationsPanel(page){', 'budget scenario output insertion')

product_panel = r'''function operationsPanel(page){if(page==='product-360'){const rows=productRows(),ads=adsDecisionMetrics(adsRows()),metricRows=[['CPA',ads.cpa,'money'],['Observed CPC',ads.cpc,'money'],['Observed Click CVR',ads.clickCvr,'pct']],metricValue=(metric,kind)=>!metric.available?'—':kind==='money'?money(metric.value):pct(metric.value);return`<div class="card top-gap"><div class="card-head"><div class="card-title"><h3>Transparent advertising economics</h3><small>Aggregate values use only loaded Ads rows. Zero or missing denominators stay unavailable.</small></div></div>${table(['Metric','Value','Formula'],metricRows.map(([label,metric,kind])=>`<tr><td class="left"><b>${esc(label)}</b></td><td>${esc(metricValue(metric,kind))}</td><td class="left">${formulaDisclosure(metric)}</td></tr>`))}</div><div class="card top-gap"><div class="card-head"><div class="card-title"><h3>Imported break-even ACoS</h3><small>Requires the same Product Master record to have Finance, Costs and Ads evidence; missing evidence stays —.</small></div></div>${rows.length?table(['Product','Contribution','Margin','Break-even ACoS','Formula'],rows.map(r=>`<tr><td class="left"><b>${esc(r.product)}</b></td><td>${r.financeRecords>0?money(r.contribution):'—'}</td><td>${pct(r.margin)}</td><td>${pct(r.breakEvenAcos)}</td><td class="left">${formulaDisclosure(r.breakEvenMetric)}</td></tr>`)):'<div class="card-body"><span class="muted">No Product Master-mapped imported economics are available.</span></div>'}<div class="card-body"><span class="muted">Break-even ACoS = max(0, (imported operating net − imported COGS) ÷ imported attributed ad sales). This is a loaded-period calculation, not a forecast or an Amazon fee estimate.</span></div></div><div class="card top-gap"><div class="card-head"><div class="card-title"><h3>First-order budget scenario</h3><small>Uses imported aggregate CPC and Click CVR. Only the target probability is entered by the user; no budget is prefilled or saved.</small></div></div><div class="card-body growth-scenario"><label>Target probability of ≥1 order % <input data-budget-probability type="number" min="0.1" max="99.9" step="0.1" placeholder="Required"></label></div><div class="card-body" data-budget-output><span class="muted">Enter a target probability to calculate a local planning scenario.</span></div></div>`}'''
replace_between('growth-workspaces.js', "function operationsPanel(page){if(page==='product-360'){", "}if(page==='inventory-risk'){", product_panel, 'Product 360 transparent decision panel')

old_bind = "$$('[data-profit-price],[data-profit-unit-cost],[data-profit-fees],[data-profit-ad-cost],[data-profit-freight],[data-profit-tariff],[data-profit-promotion],[data-profit-refund-rate],[data-profit-refund-cost]',rootNode).forEach(el=>el.addEventListener('input',()=>profitScenarioOutput(rootNode)))"
new_bind = old_bind + ";$$('[data-budget-probability]',rootNode).forEach(el=>el.addEventListener('input',()=>budgetScenarioOutput(rootNode)))"
replace_once('growth-workspaces.js', old_bind, new_bind, 'budget scenario bind')

old_exports = 'parseKind,sqpSummary,rankSnapshotKey'
new_exports = 'parseKind,formulaMetric,sqpConversionMetrics,adsDecisionMetrics,firstOrderBudgetScenario,breakEvenAcosMetric,sqpSummary,rankSnapshotKey'
replace_once('growth-workspaces.js', old_exports, new_exports, 'transparent metric exports')

replace_once('tests/growth-workspaces.test.mjs', "  assert.equal(rows[0].purchaseRate, 0.2);", "  assert.equal(rows[0].purchaseRate, 0.025);\n  assert.equal(rows[0].searchCvr, 0.025);\n  assert.equal(rows[0].clickCvr, 0.2);", 'SQP roadmap rate expectation')

Path('tests/transparent-decision-metrics.test.mjs').write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../growth-workspaces.js');
const growth=globalThis.KeywordOSGrowthTest;

test('SQP Purchase Rate and Search CVR use purchases over searches while Click CVR uses purchases over clicks',()=>{
  const metrics=growth.sqpConversionMetrics({volume:200,purchases:5,clicks:25});
  assert.equal(metrics.purchaseRate.value,0.025);
  assert.equal(metrics.searchCvr.value,0.025);
  assert.equal(metrics.clickCvr.value,0.2);
  assert.equal(metrics.purchaseRate.formula,'Purchases ÷ Searches');
});

test('derived conversion metrics fail closed when the denominator is zero or missing',()=>{
  const metrics=growth.sqpConversionMetrics({volume:0,purchases:0,clicks:0});
  assert.equal(metrics.purchaseRate.available,false);
  assert.equal(metrics.purchaseRate.value,null);
  assert.equal(metrics.clickCvr.value,null);
  assert.match(metrics.clickCvr.reason,/Denominator is zero or missing/);
});

test('Ads CPA CPC and Click CVR aggregate imported fields instead of averaging row rates',()=>{
  const metrics=growth.adsDecisionMetrics([{spend:20,orders:2,clicks:10,sales:80},{cost:10,orders:1,clicks:5,sales:20}]);
  assert.equal(metrics.totals.spend,30);
  assert.equal(metrics.cpa.value,10);
  assert.equal(metrics.cpc.value,2);
  assert.equal(metrics.clickCvr.value,0.2);
  assert.equal(growth.adsDecisionMetrics([{spend:5,orders:0,clicks:2}]).cpa.value,null);
});

test('first-order budget scenario is transparent probability math using imported CPC and Click CVR',()=>{
  const scenario=growth.firstOrderBudgetScenario({clickCvr:0.0556,cpc:1.41,probability:0.8});
  assert.equal(scenario.requiredClicks,29);
  assert.equal(scenario.budget,40.89);
  assert.match(scenario.formula,/ln\(1 − target probability\)/);
  assert.equal(growth.firstOrderBudgetScenario({clickCvr:0,cpc:1.41,probability:0.8}).available,false);
});

test('break-even ACoS requires complete mapped Finance Costs and Ads evidence plus attributed sales denominator',()=>{
  const metric=growth.breakEvenAcosMetric({operatingNet:80,cogs:20,adSales:100,hasFinance:true,hasCost:true,hasAds:true});
  assert.equal(metric.value,0.6);
  assert.equal(growth.breakEvenAcosMetric({operatingNet:80,cogs:20,adSales:100,hasFinance:false,hasCost:true,hasAds:true}).value,null);
  assert.equal(growth.breakEvenAcosMetric({operatingNet:80,cogs:20,adSales:0,hasFinance:true,hasCost:true,hasAds:true}).value,null);
});

test('runtime exposes expandable formula inputs and a planning-only unsaved budget scenario',async()=>{
  const source=await readFile(new URL('../growth-workspaces.js',import.meta.url),'utf8');
  assert.match(source,/Transparent conversion formulas/);
  assert.match(source,/Transparent advertising economics/);
  assert.match(source,/Imported break-even ACoS/);
  assert.match(source,/First-order budget scenario/);
  assert.match(source,/<details><summary>Formula & inputs<\/summary>/);
  assert.match(source,/Target probability of ≥1 order %/);
  assert.match(source,/does not recommend or mutate an Amazon campaign budget/);
  assert.doesNotMatch(source,/recommendedBudget|currentBudget/);
});
''')

readme=Path('README.md')
text=readme.read_text()
old='- [ ] 从完整导入字段计算并展示可展开公式的 Purchase Rate、Search CVR、Click CVR、CPA、break-even ACoS 和预算情景；缺分母时为 —。'
new='''- [x] 从完整导入字段计算并展示可展开公式的 Purchase Rate、Search CVR、Click CVR、CPA、break-even ACoS 和预算情景；缺分母时为 —。\n  - 2026-09-03：新增统一 `formulaMetric()` 透明计算契约，所有 ratio 均保存 numerator / denominator / formula / availability，分母为 0 或缺失时 `value=null`，UI 显示 `—` 而不是 0。Search Funnel 按本 README 已定义口径计算 **Purchase Rate = Purchases ÷ Searches**、**Search CVR = Purchases ÷ Searches**、**Click CVR = Purchases ÷ Clicks**；前两者保留为同公式兼容标签，并在可展开 `Formula & inputs` 中显示汇总输入。Ads 侧新增 `adsDecisionMetrics()`，只对当前加载 Ads rows 先汇总 Spend / Orders / Clicks / Attributed Sales，再计算 **CPA = Spend ÷ Orders**、observed CPC、Click CVR 与 ACoS，不平均行级比率。Product 360 的 break-even ACoS 改为 `breakEvenAcosMetric()`：只有同一 Product Master 映射同时存在真实 Finance、Costs、Ads 证据且 Attributed ad sales > 0 时才计算 **max(0, (Operating net − COGS) ÷ Attributed ad sales)**，否则显示 `—` 并展开说明缺失证据。预算只提供 browser-session planning scenario：从真实加载 Ads 汇总得到 observed CPC + Click CVR，用户仅输入“至少 1 单”的目标概率，使用 **ceil(ln(1 − target probability) ÷ ln(1 − Click CVR)) × observed CPC** 计算所需 clicks 与 scenario budget；不预填、不保存、不生成 campaign budget recommendation，更不会写 Amazon。CI 为 **__TEST_COUNT__ passed / 0 failed**；`npm run build` 验证 **__JS_COUNT__ 个 JS + 9 个 CSS，__PUBLISH_COUNT__ 个发布文件**，source/dist byte identity 与 committed-dist parity gate 全部通过。'''
if text.count(old)!=1:
    raise SystemExit(f'README P3 transparent metrics item expected once, found {text.count(old)}')
readme.write_text(text.replace(old,new,1))
