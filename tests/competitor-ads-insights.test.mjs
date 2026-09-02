import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

await import('../competitor-ads-insights.js');
const insights = globalThis.KeywordOSCompetitorAdsInsightsTest;

test('parses explicit competitor Ads observations and preserves supplied labels', () => {
  const rows = insights.parseCompetitorAdsCsv('Date,ASIN,Keyword,Placement,Ad Type,Campaign Label,Observed Position,Source Note\n2026-09-01,b0001,"reading, glasses",Top of Search,Sponsored Products,Brand A,2,"licensed, export"');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].asin, 'B0001');
  assert.equal(rows[0].keyword, 'reading, glasses');
  assert.equal(rows[0].campaignLabel, 'Brand A');
  assert.equal(rows[0].observedPosition, 2);
  assert.equal(rows[0].sourceNote, 'licensed, export');
});

test('requires dated ASIN evidence plus at least one observed advertising field', () => {
  assert.throws(() => insights.parseCompetitorAdsCsv('Date,ASIN,Keyword,Placement\n2026-09-01,B0001,,'), /No valid competitor Ads observation rows/);
  assert.throws(() => insights.parseCompetitorAdsCsv('Date,ASIN,Keyword,Observed Position\n2026-09-01,B0001,reader,0'), /invalid Observed Position/);
});

test('merge replaces the same observation key instead of duplicating reimports', () => {
  const existing = [{ date: '2026-09-01', asin: 'B1', keyword: 'Reader', placement: 'Top', adType: 'SP', campaignLabel: 'A', observedPosition: 1, sourceNote: 'old' }];
  const incoming = [{ ...existing[0], sourceNote: 'new' }];
  const merged = insights.mergeRows(existing, incoming);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].sourceNote, 'new');
});

test('summary uses each ASIN latest snapshot instead of mixing historical observations', () => {
  const summary = insights.summarizeCompetitorAds([
    { date: '2026-08-01', asin: 'B1', keyword: 'old keyword', placement: 'Top', adType: 'SP' },
    { date: '2026-09-01', asin: 'B1', keyword: 'current keyword', placement: 'Product Pages', adType: 'SP' },
    { date: '2026-08-20', asin: 'B2', keyword: 'current keyword', placement: 'Top', adType: 'SB' }
  ]);
  assert.equal(summary.uniqueAsins, 2);
  assert.equal(summary.uniqueKeywords, 1);
  assert.deepEqual(summary.asins.find(row => row.asin === 'B1').keywords, ['current keyword']);
  assert.ok(!summary.latestRows.some(row => row.keyword === 'old keyword'));
});

test('keyword overlap only reflects latest imported evidence across multiple ASINs', () => {
  const summary = insights.summarizeCompetitorAds([
    { date: '2026-08-01', asin: 'B1', keyword: 'shared' },
    { date: '2026-09-01', asin: 'B1', keyword: 'latest-only' },
    { date: '2026-09-01', asin: 'B2', keyword: 'latest-only' },
    { date: '2026-09-01', asin: 'B3', keyword: 'shared' }
  ]);
  assert.deepEqual(summary.keywordOverlap.map(row => row.keyword), ['latest-only']);
  assert.deepEqual(summary.keywordOverlap[0].asins, ['B1', 'B2']);
});

test('placement counts remain literal observation-row counts rather than shares', () => {
  const summary = insights.summarizeCompetitorAds([
    { date: '2026-09-01', asin: 'B1', keyword: 'a', placement: 'Top', adType: 'SP' },
    { date: '2026-09-01', asin: 'B1', keyword: 'b', placement: 'Top', adType: 'SP' },
    { date: '2026-09-01', asin: 'B2', keyword: 'c', placement: 'Top', adType: 'SP' }
  ]);
  assert.equal(summary.placements[0].observationRows, 3);
  assert.deepEqual(summary.placements[0].asins, ['B1', 'B2']);
});

test('registry and local backup whitelist the competitor-ads dataset kind', async () => {
  await import('../dataset-registry.js');
  const registry = globalThis.KeywordOSDatasetRegistryTest;
  assert.ok(registry.DATASET_KINDS.includes('competitor-ads'));
  const localOps = readFileSync(new URL('../local-operations-actions.js', import.meta.url), 'utf8');
  assert.match(localOps, /'competitor-ads'/);
});
