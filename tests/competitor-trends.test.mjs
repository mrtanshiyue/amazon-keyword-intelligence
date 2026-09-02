import test from 'node:test';
import assert from 'node:assert/strict';

await import('../competitor-trends.js');
const trends = globalThis.KeywordOSCompetitorTrendsTest;

test('keeps explicit dated competitor snapshots in ASIN order', () => {
  const series = trends.competitorTrendSeries([
    { asin: 'B1', date: '2026-08-02', price: 20 },
    { asin: 'B1', date: '2026-08-01', price: 22 },
    { asin: 'B2', date: '2026-08-01', price: 30 }
  ]);
  assert.equal(series.length, 1);
  assert.deepEqual(series[0].points.map((point) => point.date), ['2026-08-01', '2026-08-02']);
});

test('does not infer seasonality from a single year', () => {
  assert.deepEqual(trends.competitorSeasonality([
    { asin: 'B1', date: '2025-12-01', price: 20 },
    { asin: 'B1', date: '2025-12-15', price: 22 }
  ]), []);

  const rows = trends.competitorSeasonality([
    { asin: 'B1', date: '2025-12-01', price: 20 },
    { asin: 'B1', date: '2026-12-01', price: 30 }
  ]);
  assert.equal(rows[0].month, '12');
  assert.deepEqual(rows[0].years, ['2025', '2026']);
  assert.equal(rows[0].price, 25);
});

test('renders a dated trend panel without inventing missing metrics', () => {
  const html = trends.renderTrendPanel([
    { asin: 'B1', date: '2026-08-01', price: 20 },
    { asin: 'B1', date: '2026-08-02', price: 22 }
  ]);
  assert.match(html, /Snapshot trends & seasonality evidence/);
  assert.match(html, /2026-08-01/);
  assert.match(html, /BSR: not enough imported values/);
});
