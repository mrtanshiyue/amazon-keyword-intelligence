import test from 'node:test';
import assert from 'node:assert/strict';

await import('../growth-workspaces.js');
await import('../market-intelligence.js');
const growth = globalThis.KeywordOSGrowthTest;
const market = globalThis.KeywordOSMarketIntelligenceTest;

test('uses only the latest imported competitor snapshot per ASIN', () => {
  const rows = market.latestSnapshots([
    { asin: 'B1', date: '2026-08-01', price: 10 },
    { asin: 'B1', date: '2026-09-01', price: 20 },
    { asin: 'B2', date: '2026-09-01', price: 30 }
  ], growth.latestCompetitors);
  assert.equal(rows.length, 2);
  assert.equal(rows.find((row) => row.asin === 'B1').price, 20);
});

test('derives market concentration, price distribution and review barrier from imported evidence', () => {
  const summary = market.marketSnapshotSummary([
    { asin: 'B1', date: '2026-09-01', price: 10, reviewCount: 10, estimatedSales: 100 },
    { asin: 'B2', date: '2026-09-01', price: 20, reviewCount: 20, estimatedSales: 200 },
    { asin: 'B3', date: '2026-09-01', price: 30, reviewCount: 30, estimatedSales: 700 }
  ], growth.latestCompetitors);
  assert.equal(summary.prices.median, 20);
  assert.equal(summary.prices.q1, 15);
  assert.equal(summary.prices.q3, 25);
  assert.equal(summary.reviews.median, 20);
  assert.equal(summary.concentration.available, true);
  assert.ok(Math.abs(summary.concentration.top3Share - 1) < 1e-12);
  assert.ok(Math.abs(summary.concentration.hhi - 0.54) < 1e-12);
});

test('relative opportunity score requires at least three rows with sales and review evidence', () => {
  assert.deepEqual(market.opportunityRows([
    { asin: 'B1', estimatedSales: 100, reviewCount: 10 },
    { asin: 'B2', estimatedSales: 200, reviewCount: 20 }
  ]), []);

  const rows = market.opportunityRows([
    { asin: 'B1', estimatedSales: 100, reviewCount: 10 },
    { asin: 'B2', estimatedSales: 200, reviewCount: 20 },
    { asin: 'B3', estimatedSales: 700, reviewCount: 30 }
  ]);
  assert.deepEqual(rows.map((row) => [row.asin, row.opportunityScore]), [['B3', 65], ['B2', 50], ['B1', 35]]);
});

test('price bands are relative distribution context and missing estimated sales remain unavailable', () => {
  const stats = market.distribution([10, 20, 30]);
  assert.equal(market.priceBand(10, stats), 'Lower quartile');
  assert.equal(market.priceBand(20, stats), 'Interquartile band');
  assert.equal(market.priceBand(30, stats), 'Upper quartile');
  const concentration = market.concentration([
    { asin: 'B1', estimatedSales: 0 },
    { asin: 'B2', estimatedSales: 0 },
    { asin: 'B3', estimatedSales: 0 }
  ]);
  assert.equal(concentration.available, false);
});

test('rendered market screen discloses the relative score formula and no external benchmark', () => {
  const html = market.renderPanel([
    { asin: 'B1', date: '2026-09-01', price: 10, reviewCount: 10, estimatedSales: 100 },
    { asin: 'B2', date: '2026-09-01', price: 20, reviewCount: 20, estimatedSales: 200 },
    { asin: 'B3', date: '2026-09-01', price: 30, reviewCount: 30, estimatedSales: 700 }
  ], growth.latestCompetitors);
  assert.match(html, /Imported market structure & opportunity screen/);
  assert.match(html, /65% sales percentile \+ 35% inverse review-count percentile/);
  assert.match(html, /No external benchmark or concentration label is applied/);
});
