import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const uiSource = await readFile(new URL('../ui-actions.js', import.meta.url), 'utf8');

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
