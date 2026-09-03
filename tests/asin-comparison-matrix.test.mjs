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
