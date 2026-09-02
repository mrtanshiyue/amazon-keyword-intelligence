import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../suite-home-intelligence.js');
const suite = globalThis.KeywordOSSuiteHomeIntelligenceTest;

const rec = (kind, rows, extra = {}) => ({ kind, rows: Array.from({ length: rows }, (_, index) => ({ index })), validation: { status: 'validated' }, ...extra });

test('covers the five real suite-home routes and intentionally excludes Listing', () => {
  assert.deepEqual(Object.keys(suite.SUITES), ['products','keywords','marketing','operations','analytics']);
  assert.equal(suite.suiteFromContext('#page=suite-products', ''), 'products');
  assert.equal(suite.suiteFromContext('#page=listing-optimizer', 'Listing Optimizer 2.0'), '');
});

test('suite KPIs are literal persisted/imported row counts', () => {
  const summary = suite.suiteSummary('products', [rec('product-master', 3), rec('competitor', 7), rec('reviews', 11)]);
  assert.deepEqual(summary.kpis.map(item => item.value), [3,7,11]);
  assert.equal(summary.totalRows, 21);
});

test('data health is READY only when essential sources are present and not explicitly invalid', () => {
  assert.equal(suite.suiteSummary('keywords', [rec('sqp', 2), rec('ranks', 2)]).health, 'READY');
  assert.equal(suite.suiteSummary('keywords', [rec('sqp', 2)]).health, 'PARTIAL');
  assert.equal(suite.suiteSummary('keywords', []).health, 'EMPTY');
  assert.equal(suite.suiteSummary('keywords', [rec('sqp', 2), rec('ranks', 2, { validation: { status: 'invalid' } })]).health, 'PARTIAL');
});

test('explicit coverage span uses only imported YYYY-MM-DD coverage values', () => {
  const span = suite.coverageSpan([
    rec('ads', 1, { coverage: { min: '2026-06-01', max: '2026-06-30' } }),
    rec('finance', 1, { coverage: { min: 'not-a-date', max: '2026-07-04' } })
  ], ['ads','finance']);
  assert.deepEqual(span, { min: '2026-06-01', max: '2026-07-04' });
});

test('next tasks are deterministic from missing evidence and use existing page ids', () => {
  assert.deepEqual(suite.nextTasks('operations', []).map(item => item.page), ['import','inventory-risk','product-360']);
  assert.deepEqual(suite.nextTasks('operations', [rec('finance', 1), rec('inventory', 1), rec('costs', 1)]).map(item => item.page), ['data-health']);
});

test('marketing evidence-source KPI counts loaded sources rather than inventing performance', () => {
  const summary = suite.suiteSummary('marketing', [rec('ads', 50), rec('action-outcomes', 4)]);
  assert.equal(summary.kpis[2].label, 'Evidence sources');
  assert.equal(summary.kpis[2].value, 2);
});

test('explicit invalid datasets are not counted as loaded evidence sources', () => {
  const summary = suite.suiteSummary('analytics', [rec('ads', 3), rec('finance', 2, { validation: { status: 'error' } })]);
  assert.equal(summary.loaded, 1);
  assert.equal(summary.totalRows, 5);
});

test('Analytics home keeps its distinct workflows instead of aliasing scopes', () => {
  const pages = suite.SUITES.analytics.tasks.map(task => task[1]);
  assert.ok(pages.includes('anomaly-center'));
  assert.equal(suite.suiteFromContext('#page=portfolio-overview', 'Portfolio Overview'), '');
});

test('suite intelligence script loads after productivity suite-home renderer', async () => {
  const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const productivity = index.indexOf('<script src="productivity-actions.js"></script>');
  const intelligence = index.indexOf('<script src="suite-home-intelligence.js"></script>');
  assert.ok(productivity >= 0);
  assert.ok(intelligence > productivity);
});

test('suite intelligence stays evidence-first, not predictive', async () => {
  const source = await readFile(new URL('../suite-home-intelligence.js', import.meta.url), 'utf8');
  assert.match(source, /Persisted\/imported rows only/);
  assert.match(source, /Deterministic from missing evidence; no AI inference/);
  assert.doesNotMatch(source, /forecast|market share|opportunity score/i);
});