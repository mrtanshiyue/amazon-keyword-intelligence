import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

await import('../growth-workspaces.js');
const growth = globalThis.KeywordOSGrowthTest;

test('ASIN comparison chooses a primary only from Product Master and reuses a saved competitor group', () => {
  const rows = [
    { asin:'OWN-1', keyword:'reader' },
    { asin:'OWN-2', keyword:'reader' },
    { asin:'COMP-1', keyword:'reader' },
    { asin:'COMP-2', keyword:'blue reader' }
  ];
  const scope = growth.asinComparisonScope(rows, [{ asin:'OWN-1' }, { asin:'OWN-2' }], [{ id:'g1', name:'Core', asins:['COMP-2','OWN-2','MISSING'] }], { primaryOwnedAsin:'OWN-2', competitorGroupId:'g1' });
  assert.equal(scope.primaryOwnedAsin, 'OWN-2');
  assert.deepEqual(scope.competitorAsins, ['COMP-2']);
  assert.deepEqual(scope.missingGroupAsins, ['MISSING']);
  assert.deepEqual(scope.scopeAsins, ['OWN-2','COMP-2']);
});

test('ASIN comparison defaults to the first explicitly owned imported ASIN and all non-owned imports', () => {
  const scope = growth.asinComparisonScope(
    [{ asin:'OWN-1', keyword:'a' }, { asin:'COMP-1', keyword:'b' }, { asin:'COMP-2', keyword:'c' }],
    [{ asin:'OWN-1' }, { asin:'NOT-IMPORTED' }],
    [],
    { primaryOwnedAsin:'NOT-IMPORTED', competitorGroupId:'missing-group' }
  );
  assert.equal(scope.primaryOwnedAsin, 'OWN-1');
  assert.equal(scope.competitorGroupId, '');
  assert.deepEqual(scope.competitorAsins, ['COMP-1','COMP-2']);
});

test('primary scoped comparison classifies shared, own-only and competitor-only gap without ownership inference', () => {
  const source = [
    { asin:'OWN', keyword:'shared term', volume:100 },
    { asin:'COMP', keyword:'shared term', volume:100 },
    { asin:'OWN', keyword:'own term', volume:50 },
    { asin:'COMP', keyword:'gap term', volume:80 }
  ];
  const scope = growth.asinComparisonScope(source, [{ asin:'OWN' }], [], {});
  const rows = growth.asinScopedComparison(source, scope);
  assert.equal(rows.find(row=>row.keyword==='shared term').segment, 'Shared');
  assert.equal(rows.find(row=>row.keyword==='own term').segment, 'Own only');
  assert.equal(rows.find(row=>row.keyword==='gap term').segment, 'Competitor only / missing');
});

test('matrix metric catalog exposes only imported standard or vendor fields and preserves proprietary names', () => {
  const catalog = growth.asinMatrixMetricCatalog([
    { asin:'OWN', keyword:'reader', volume:900, organicRank:4, provider:'SellerSprite', sourceColumns:{SPR:'22',DSR:'4.5'} },
    { asin:'COMP', keyword:'reader', volume:900, provider:'SellerSprite', sourceColumns:{SPR:'18'} }
  ]);
  assert.ok(catalog.find(metric=>metric.id==='volume'));
  assert.ok(catalog.find(metric=>metric.id==='organicRank'));
  assert.equal(catalog.some(metric=>metric.id==='sponsoredRank'), false);
  const spr = catalog.find(metric=>metric.originalName==='SPR');
  assert.equal(spr.provider, 'SellerSprite');
  assert.match(spr.label, /^SPR · SellerSprite$/);
  assert.equal(catalog.some(metric=>metric.originalName==='KPS'), false);
});

test('coverage and vendor metric matrix cells stay aligned to exact ASIN + keyword observations', () => {
  const source = [
    { asin:'OWN', keyword:'shared term', provider:'SellerSprite', sourceColumns:{SPR:'22'} },
    { asin:'COMP-1', keyword:'shared term', provider:'SellerSprite', sourceColumns:{SPR:'18'} },
    { asin:'COMP-2', keyword:'gap term', provider:'SellerSprite', sourceColumns:{SPR:'11'} }
  ];
  const scope = growth.asinComparisonScope(source, [{ asin:'OWN' }], [], {});
  const catalog = growth.asinMatrixMetricCatalog(source);
  const spr = catalog.find(metric=>metric.originalName==='SPR');
  const coverage = growth.asinComparisonMatrix(source, scope, 'coverage');
  assert.equal(coverage.rows.find(row=>row.keyword==='gap term').cells.OWN.available, false);
  assert.equal(coverage.rows.find(row=>row.keyword==='gap term').cells['COMP-2'].available, true);
  const matrix = growth.asinComparisonMatrix(source, scope, spr.id);
  assert.equal(matrix.rows.find(row=>row.keyword==='shared term').cells.OWN.value, '22');
  assert.equal(matrix.rows.find(row=>row.keyword==='shared term').cells['COMP-1'].value, '18');
  assert.equal(matrix.rows.find(row=>row.keyword==='gap term').cells.OWN.available, false);
});

test('ASIN comparison view state is backup-safe and UI controls are wired without a new evidence store', () => {
  const localOps = fs.readFileSync(new URL('../local-operations-actions.js', import.meta.url), 'utf8');
  const source = fs.readFileSync(new URL('../growth-workspaces.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../growth-workspaces.css', import.meta.url), 'utf8');
  assert.match(localOps, /keywordos_growth_asin_comparison_state_v1/);
  assert.match(source, /data-asin-primary/);
  assert.match(source, /data-asin-group/);
  assert.match(source, /data-asin-metric/);
  assert.match(source, /load\('competitor-groups'\)/);
  assert.match(css, /asin-matrix-cell\.has-evidence/);
  assert.doesNotMatch(source, /keywordos_growth_asin_comparison_evidence/);
});


test('dated reverse-ASIN imports append history and same-date same-source rows act as corrections', () => {
  const existing = [
    { asin:'OWN', keyword:'Reader', snapshotDate:'2026-09-01', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:12 },
    { asin:'OWN', keyword:'Reader', snapshotDate:'', organicRank:99 }
  ];
  const incoming = [
    { asin:'own', keyword:'reader', snapshotDate:'2026-09-02', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:9 },
    { asin:'OWN', keyword:'Reader', snapshotDate:'2026-09-01', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:10 },
    { asin:'OWN', keyword:'Reader', snapshotDate:'2026-09-01', provider:'SellerSprite', reportType:'Reverse ASIN', marketplace:'US', organicRank:7 }
  ];
  const merged = growth.mergeReverseAsinSnapshots(existing, incoming);
  assert.equal(merged.length, 3);
  assert.equal(merged.find(row=>row.provider==='Helium 10'&&row.snapshotDate==='2026-09-01').organicRank, 10);
  assert.equal(merged.some(row=>row.snapshotDate===''), false);
  assert.ok(merged.find(row=>row.provider==='SellerSprite'));
});

test('an undated reverse-ASIN import keeps conservative replace semantics', () => {
  const existing = [{ asin:'OWN', keyword:'reader', snapshotDate:'2026-09-01', organicRank:12 }];
  const incoming = [{ asin:'OWN', keyword:'reader', organicRank:8 }];
  assert.deepEqual(growth.mergeReverseAsinSnapshots(existing, incoming), incoming);
});

test('metric trend requires two distinct dates for the exact ASIN keyword and comparable source series', () => {
  const rows = [
    { asin:'OWN', keyword:'reader', snapshotDate:'2026-09-01', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:12 },
    { asin:'OTHER', keyword:'reader', snapshotDate:'2026-09-02', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:6 },
    { asin:'OWN', keyword:'other', snapshotDate:'2026-09-02', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:5 },
    { asin:'OWN', keyword:'reader', snapshotDate:'2026-09-01', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:11 }
  ];
  const trend = growth.asinMetricTrend(rows, 'OWN', 'reader', 'organicRank');
  assert.equal(trend.available, false);
  assert.match(trend.reason, /two dated snapshots/i);
});

test('metric trend uses the latest two same-source dates and reports raw rank or percentage-point delta', () => {
  const rows = [
    { asin:'OWN', keyword:'reader', snapshotDate:'2026-09-01', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:12, trafficShare:0.08 },
    { asin:'OWN', keyword:'reader', snapshotDate:'2026-09-02', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:9, trafficShare:0.10 },
    { asin:'OWN', keyword:'reader', snapshotDate:'2026-09-03', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:7, trafficShare:0.13 }
  ];
  const rank = growth.asinMetricTrend(rows, 'OWN', 'reader', 'organicRank');
  assert.equal(rank.available, true);
  assert.equal(rank.previous.date, '2026-09-02');
  assert.equal(rank.latest.date, '2026-09-03');
  assert.equal(rank.delta, -2);
  assert.equal(growth.formatAsinTrendDelta(rank), '−2');
  const traffic = growth.asinMetricTrend(rows, 'OWN', 'reader', 'trafficShare');
  assert.equal(traffic.delta, 0.03);
  assert.equal(growth.formatAsinTrendDelta(traffic), '+3 pp');
});

test('matrix exposes a trend only for qualifying standard metric cells and the UI discloses the two-snapshot gate', () => {
  const source = [
    { asin:'OWN', keyword:'reader', snapshotDate:'2026-09-01', organicRank:12 },
    { asin:'OWN', keyword:'reader', snapshotDate:'2026-09-03', organicRank:8 },
    { asin:'COMP', keyword:'reader', snapshotDate:'2026-09-03', organicRank:5 }
  ];
  const scope = growth.asinComparisonScope(source, [{ asin:'OWN' }], [], {});
  const matrix = growth.asinComparisonMatrix(source, scope, 'organicRank');
  const row = matrix.rows.find(item=>item.keyword==='reader');
  assert.equal(row.cells.OWN.value, 8);
  assert.equal(row.cells.OWN.trend.available, true);
  assert.equal(row.cells.COMP.trend.available, false);
  const file = fs.readFileSync(new URL('../growth-workspaces.js', import.meta.url), 'utf8');
  assert.match(file, /at least two dated snapshots exist in one comparable source series/);
  assert.match(file, /mergeReverseAsinSnapshots\(load\(kind\),rows\)/);
});
