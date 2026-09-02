import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const uiSource = await readFile(new URL('../ui-actions.js', import.meta.url), 'utf8');
const productivitySource = await readFile(new URL('../productivity-actions.js', import.meta.url), 'utf8');
const cssSource = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
const mobileCssSource = await readFile(new URL('../ui-hardening.css', import.meta.url), 'utf8');

test('negative approval rechecks both protected terms and cross-product conflicts', () => {
  assert.match(source, /function negativeApprovalBlocked\(a\).*isProtected\(a\.term\).*negativeConflict\(a\.term,getRangeRows\(\)\)/);
  assert.match(source, /status==='Approved'&&negativeApprovalBlocked\(a\)/);
});

test('rule execution applies its own lookback and campaign scope', () => {
  const start = source.indexOf('function runRules(){');
  const end = source.indexOf('function queueAction(', start);
  const runRules = source.slice(start, end);
  assert.match(runRules, /Number\.parseInt\(r\.lookback,10\)/);
  assert.match(runRules, /getRangeRows\(false,days\)/);
  assert.match(runRules, /row\.campaign===r\.scope/);
  assert.match(runRules, /aggregateSearchTermContexts\(ruleRows\)/);
  assert.match(runRules, /actionScope=t\.campaign\|\|r\.scope/);
});

test('finance and Ads reconciliation share one date boundary', () => {
  assert.match(source, /function financeComparisonBounds\(\)/);
  assert.match(source, /function getFinanceRangeRows\(\).*financeComparisonBounds\(\)/);
  assert.match(source, /function getFinanceAdsRows\(\).*financeComparisonBounds\(\)/);
});

test('protected negative KPI counts protected threshold candidates', () => {
  assert.match(uiSource, /item\.orders === 0.*isProtected\(item\.name\)/);
  assert.match(uiSource, /setText\(\$\('\.metric-value', card\), blocked\)/);
});

test('suggestions do not invent campaign budgets and preserve campaign scope', () => {
  const start = source.indexOf('function suggestionData(){');
  const end = source.indexOf('function suggestionDatasetKey(){', start);
  const suggestions = source.slice(start, end);
  assert.doesNotMatch(suggestions, /currentBudget|recommendedBudget|'Budget':/);
  assert.match(suggestions, /aggregateSearchTermContexts\(rows\)/);
  assert.match(source, /scope:x\.campaign\|\|'Campaign review'/);
});

test('suite navigation uses stable registry suite ids instead of translated labels', () => {
  assert.match(productivitySource, /registry\.SUITE_ORDER\[i\]/);
  assert.match(productivitySource, /b\.dataset\.suite=s/);
  assert.match(productivitySource, /registry\.suite\(s\)/);
  assert.doesNotMatch(productivitySource, /Object\.keys\(SUITE_WORKSPACES\)\[index\]/);
});

test('responsive shell keeps suites available and uses a narrow accessible mobile rail', () => {
  assert.doesNotMatch(cssSource, /@media\(max-width:1350px\)\{\.suite-nav\{display:none\}\}/);
  assert.match(mobileCssSource, /--sidebar:64px/);
  assert.match(uiSource, /button\.setAttribute\('aria-label', label\)/);
});

test('rules use a campaign selector and hide unavailable bid limits', () => {
  assert.match(uiSource, /function upgradeRuleScopeInput\(\)/);
  assert.match(uiSource, /bridge\.aggregateLevel\(bridge\.getRangeRows\(\), 'campaign'\)/);
  assert.match(uiSource, /Min Bid · unavailable/);
  assert.match(uiSource, /Delete this local schedule draft\?/);
});
