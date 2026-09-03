import test from 'node:test';
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
