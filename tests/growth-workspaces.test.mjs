import test from 'node:test';
import assert from 'node:assert/strict';

await import('../growth-workspaces.js');
const growth = globalThis.KeywordOSGrowthTest;

test('parses quoted SQP CSV and normalizes percent or decimal shares', () => {
  const csv = 'Search Query,Search Query Volume,Impressions,Clicks,Purchases,Brand Purchase Share\n"shoe, rack",1000,500,50,10,25%\nmat,200,100,20,4,0.2';
  const rows = growth.parseKind('sqp', csv);
  assert.equal(rows[0].query, 'shoe, rack');
  assert.equal(rows[0].brandPurchaseShare, 0.25);
  assert.equal(rows[1].brandPurchaseShare, 0.2);
});

test('rejects malformed growth CSV with an unclosed quoted field', () => {
  const csv = 'Search Query,Search Query Volume\n"unfinished,100';
  assert.throws(() => growth.parseKind('sqp', csv), /unclosed quoted field/);
});

test('defines the growth-import browser safety limit', () => {
  assert.equal(growth.MAX_GROWTH_IMPORT_BYTES, 16 * 1024 * 1024);
});

test('derives search funnel rates and sorts opportunity', () => {
  const rows = growth.sqpSummary([
    { query: 'a', volume: 100, impressions: 50, clicks: 10, cartAdds: 4, purchases: 2, brandPurchaseShare: 0.8 },
    { query: 'b', volume: 200, impressions: 100, clicks: 25, cartAdds: 10, purchases: 5, brandPurchaseShare: 0.1 }
  ]);
  assert.equal(rows[0].query, 'b');
  assert.equal(rows[0].ctr, 0.25);
  assert.equal(rows[0].purchaseRate, 0.2);
});

test('keeps latest rank snapshot per ASIN and keyword', () => {
  const rows = growth.latestRanks([
    { asin: 'B1', keyword: 'Rack', date: '2026-01-01', organicRank: 20 },
    { asin: 'B1', keyword: 'rack', date: '2026-01-02', organicRank: 12 }
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].organicRank, 12);
});

test('inventory risk only derives cover when sales evidence exists', () => {
  const rows = growth.inventoryRisk([
    { sku: 'A', product: 'P1', available: 10, unfulfillable: 0 },
    { sku: 'B', product: 'P2', available: 10, unfulfillable: 0 }
  ], { P1: 30 });
  assert.equal(rows.find((row) => row.sku === 'A').daysCover, 10);
  assert.equal(rows.find((row) => row.sku === 'A').risk, 'Critical');
  assert.equal(rows.find((row) => row.sku === 'B').risk, 'No sales evidence');
});

test('inventory review priority remains explicit when sales evidence is unavailable', () => {
  const rows = growth.inventoryPriority([{ sku: 'A', risk: 'No sales evidence', daysCover: null }, { sku: 'B', risk: 'Critical', daysCover: 3 }]);
  assert.equal(rows[0].sku, 'B');
  assert.match(rows[1].priority, /Import sales evidence/);
});

test('sales velocity uses observed dated rows instead of assuming full window coverage', () => {
  const velocity = growth.salesVelocity([
    { date: '2026-08-01', units: 4, orders: 3 },
    { date: '2026-08-03', units: 6, orders: 5 }
  ], [7])[0];
  assert.equal(velocity.start, '2026-07-28');
  assert.equal(velocity.end, '2026-08-03');
  assert.equal(velocity.observedDays, 2);
  assert.equal(velocity.unitsPerDay, 5);
});

test('product sales velocity keeps products separate and uses literal dated labels', () => {
  const rows = growth.productSalesVelocity([
    { date: '2026-08-01', product: 'Blue', units: 4 },
    { date: '2026-08-02', product: 'Blue', units: 6 },
    { date: '2026-08-02', product: 'Red', units: 8 }
  ], 30);
  assert.equal(rows.find(row => row.product === 'Blue').unitsPerDay, 5);
  assert.equal(rows.find(row => row.product === 'Red').observedDays, 1);
});

test('replenishment plan requires actual sales and lead-time inputs', () => {
  assert.equal(growth.replenishmentPlan({ available: 20, dailySales: 0, leadTimeDays: 7 }).available, false);
  assert.equal(growth.replenishmentPlan({ available: 20, dailySales: 2 }).available, false);
  const plan = growth.replenishmentPlan({ available: 10, inbound: 4, reserved: 2, dailySales: 2, leadTimeDays: 7, safetyDays: 3 });
  assert.equal(plan.sellable, 12);
  assert.equal(plan.target, 20);
  assert.equal(plan.recommendedQuantity, 8);
  assert.equal(plan.daysUntilReorder, 0);
});

test('inventory capital risk keeps cost and dated sales evidence explicit', () => {
  const rows = growth.inventoryCapitalRows(
    [{ sku: 'A', product: 'Blue', available: 20, inbound: 5, unfulfillable: 2 }, { sku: 'B', product: 'No cost', available: 10 }],
    [{ product: 'Blue', unitCost: 3 }],
    [{ product: 'Blue', unitsPerDay: 0.2 }]
  );
  assert.equal(rows.find(row => row.sku === 'A').availableValue, 60);
  assert.equal(rows.find(row => row.sku === 'A').risk, 'Unfulfillable inventory');
  assert.equal(rows.find(row => row.sku === 'B').risk, 'Cost unavailable');
});

test('profit scenario exposes entered costs and rejects invalid inputs', () => {
  const scenario = growth.profitScenario({ price: 100, unitCost: 20, fees: 15, adCost: 10, freight: 5, tariff: 2, promotion: 3, refundRate: 0.1, refundCost: 4 });
  assert.equal(scenario.expectedRefund, 10.4);
  assert.equal(scenario.nonAdCosts, 55.4);
  assert.equal(scenario.contribution, 34.6);
  assert.equal(scenario.breakEvenAcos, 0.446);
  assert.equal(growth.profitScenario({ price: 10, refundRate: 1.1 }).available, false);
});

test('counts UTF-8 backend search-term bytes', () => {
  assert.equal(growth.utf8Bytes('abc'), 3);
  assert.equal(growth.utf8Bytes('中文'), 6);
});

test('listing coverage checks complete phrases by field and keeps partial roots distinct', () => {
  const coverage = growth.listingCoverage({ title: 'Blue shoe rack', bullets: 'Stackable rack', description: '', searchTerms: '' }, ['shoe rack', 'rack shoe']);
  assert.equal(coverage[0].byField.title.phrase, true);
  assert.equal(coverage[1].byField.title.phrase, false);
  assert.deepEqual(coverage[1].byField.title.roots.sort(), ['rack', 'shoe']);
});

test('listing quality excludes configured brands and flags backend brands plus repeated roots', () => {
  const quality = growth.listingQuality({ title: 'Rack rack rack rack', bullets: '', description: '', searchTerms: 'Example Brand rack' }, 'Example Brand');
  assert.deepEqual(quality.backendBrands, ['Example Brand']);
  assert.deepEqual(quality.repeated, [['rack', 5]]);
});

test('listing field validation counts title characters and backend UTF-8 bytes against editable limits', () => {
  const validation = growth.listingFieldValidation({ title: 'hello', bullets: 'bullet', description: 'detail', searchTerms: '中文' }, { titleLimit: 4, searchTermsLimit: 5 });
  assert.equal(validation.title.status, 'Over limit');
  assert.equal(validation.backend.used, 6);
  assert.equal(validation.backend.status, 'Over limit');
  assert.equal(validation.bullets.used, 6);
  assert.equal(growth.listingFieldValidation({}, { titleLimit: 0 }).available, false);
});

test('listing versions preserve tracked fields and diff only changed fields', () => {
  const first = growth.listingSnapshot({ title: 'Blue rack', bullets: 'Steel', searchTerms: 'rack' }, 'baseline', '2026-09-01T00:00:00.000Z');
  const next = growth.listingSnapshot({ title: 'Blue shoe rack', bullets: 'Steel', searchTerms: 'rack shoe' }, 'add phrase', '2026-09-02T00:00:00.000Z');
  const diff = growth.listingVersionDiff(first, next);
  assert.equal(first.note, 'baseline');
  assert.deepEqual(diff.map(row => row.field), ['title', 'searchTerms']);
});

test('competitor listing gaps compare only imported title phrases to the local draft', () => {
  const gaps = growth.competitorListingGaps({ title: 'Blue shoe rack', bullets: '', description: '', searchTerms: '' }, [{ asin: 'B1', title: 'Blue shoe rack with storage shelf' }]);
  assert.equal(gaps.length, 1);
  assert.ok(gaps[0].phrases.includes('with storage'));
  assert.ok(!gaps[0].phrases.includes('blue shoe rack'));
});

test('review phrase evidence groups literal phrases by imported star rating', () => {
  const phrases = growth.reviewPhraseEvidence([{ rating: 1, title: 'Too small', body: 'too small for use' }, { rating: 5, title: 'Very useful', body: 'very useful shelf' }]);
  assert.equal(phrases.find(item => item.phrase === 'too small').low, 1);
  assert.equal(phrases.find(item => item.phrase === 'very useful').high, 1);
});

test('review evidence backlog links literal phrases to imported sample references', () => {
  const backlog = growth.reviewEvidenceBacklog([
    { date: '2026-08-01', asin: 'B1', rating: 1, title: 'Too small', body: 'too small for my shelf' },
    { date: '2026-08-02', asin: 'B2', rating: 5, title: 'Very useful', body: 'very useful shelf' }
  ]);
  const issue = backlog.find(item => item.kind === 'Investigate low-star evidence' && item.phrase === 'too small');
  assert.equal(issue.samples[0].asin, 'B1');
  assert.match(issue.next, /no cause is inferred/);
});

test('review breakdown compares variants and explicit own-ASIN membership only', () => {
  const rows = growth.reviewBreakdown([{ asin: 'OWN', variant: 'Blue', marketplace: 'US', rating: 5 }, { asin: 'COMP', variant: 'Blue', marketplace: 'US', rating: 1 }], ['OWN']);
  assert.equal(rows.find(item => item.key === 'Variant: Blue').average, 3);
  assert.equal(rows.find(item => item.key === 'Marketplace: US').rows, 2);
  assert.equal(rows.find(item => item.key === 'Ownership: own ASIN').rows, 1);
});

test('listing placement suggestions rank only imported evidence and preserve its metrics', () => {
  const evidence = growth.listingEvidenceTerms([{ query: 'shoe rack', purchases: 3, volume: 500 }], [{ searchTerm: 'shoe rack', orders: 4 }, { searchTerm: 'rack organiser', orders: 2 }]);
  const suggestions = growth.listingPlacementSuggestions({ title: '', bullets: '', description: '', searchTerms: '' }, evidence);
  assert.equal(suggestions[0].keyword, 'shoe rack');
  assert.equal(suggestions[0].orders, 4);
  assert.equal(suggestions[0].purchases, 3);
  assert.equal(suggestions[0].volume, 500);
});

test('ships parseable templates for every local growth import', () => {
  for (const kind of ['sqp', 'costs', 'inventory', 'ranks', 'product-master', 'competitor', 'reviews', 'reverse-asin']) {
    const rows = growth.parseKind(kind, growth.TEMPLATES[kind]);
    assert.equal(rows.length, 1, `${kind} template should parse`);
  }
});

test('compares imported reverse-ASIN keywords without inferring ASIN ownership', () => {
  const rows = growth.asinKeywordComparison([
    { asin: 'OWN-1', keyword: 'shoe rack', volume: 100 },
    { asin: 'COMP-1', keyword: 'shoe rack', volume: 200 },
    { asin: 'COMP-1', keyword: 'rack organiser', volume: 50 }
  ], ['OWN-1']);
  assert.equal(rows.find(row => row.keyword === 'shoe rack').segment, 'Shared');
  assert.equal(rows.find(row => row.keyword === 'rack organiser').segment, 'Competitor only / missing');
});

test('ASIN overlap score is based only on the imported comparison sets', () => {
  const score = growth.asinOverlapScore([{ segment: 'Shared' }, { segment: 'Own only' }, { segment: 'Competitor only / missing' }]);
  assert.equal(score.score, 1 / 3);
  assert.equal(score.shared, 1);
});

test('rejects reverse-ASIN imports above the 20-ASIN comparison limit', () => {
  const header = 'ASIN,Keyword';
  const rows = Array.from({ length: 21 }, (_, index) => `B${index},keyword ${index}`);
  assert.throws(() => growth.parseKind('reverse-asin', [header, ...rows].join('\n')), /at most 20 ASINs/);
});

test('imports review evidence only when required identity, date, rating, title and text are present', () => {
  const rows = growth.parseKind('reviews', 'Date,ASIN,Rating,Title,Body\n2026-08-01,B1,2,Small,"too small"\n2026-08-01,B2,5,Great,\n2026-08-01,B3,6,Invalid,Rating');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].asin, 'B1');
  assert.equal(rows[0].rating, 2);
});

test('keeps the newest imported competitor snapshot for each ASIN', () => {
  const rows = growth.latestCompetitors([
    { asin: 'B1', date: '2026-08-01', price: 25, bsr: 200 },
    { asin: 'B1', date: '2026-08-02', price: 23, bsr: 100 },
    { asin: 'B2', date: '2026-08-01', price: 30, bsr: 300 }
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows.find(row => row.asin === 'B1').price, 23);
});

test('reports changes only when an ASIN has consecutive dated snapshots', () => {
  const changes = growth.competitorChanges([
    { asin: 'B1', date: '2026-08-01', price: 25, bsr: 200, rating: 4.5, reviewCount: 10, variants: 1, availability: 'In stock' },
    { asin: 'B1', date: '2026-08-08', price: 20, bsr: 150, rating: 4.5, reviewCount: 12, variants: 1, availability: 'In stock' },
    { asin: 'B2', date: '2026-08-08', price: 30, bsr: 300 }
  ]);
  assert.equal(changes.length, 1);
  assert.match(changes[0].changes.join(' '), /Price: 25 → 20/);
  assert.match(changes[0].changes.join(' '), /Reviews: 10 → 12/);
});

test('uses only imported historical baselines for competitor lookback windows', () => {
  const periods = growth.competitorPeriodChanges([
    { asin: 'B1', date: '2026-07-01', price: 25, bsr: 200, reviewCount: 10 },
    { asin: 'B1', date: '2026-08-01', price: 20, bsr: 150, reviewCount: 12 }
  ], [30]);
  assert.equal(periods.length, 1);
  assert.equal(periods[0].before.date, '2026-07-01');
  assert.equal(periods[0].priceDelta, -5);
});

test('product master resolves only explicit identifiers', () => {
  const master = growth.masterIndex([{ productId: 'P1', product: 'Example', sku: 'SKU-1', asin: 'B000000001' }]);
  assert.equal(growth.resolveMaster(master, { sku: 'SKU-1' }).productId, 'P1');
  assert.equal(growth.resolveMaster(master, { product: 'unrelated label' }), null);
});

test('keyword asset ids are stable across keyword workspace consumers', () => {
  assert.equal(growth.keywordAssetId('Reading  Glasses'), growth.keywordAssetId('reading glasses'));
  assert.notEqual(growth.keywordAssetId('reading glasses'), growth.keywordAssetId('reading glasses women'));
});

test('workflow assets do not invent action records when no Store action state exists', () => {
  assert.deepEqual(growth.actionForAsset('kw_example'), []);
});

test('source chips stay explicit when a workspace has no persisted sources', () => {
  assert.match(growth.pageSourceChips('rank-intelligence'), /No persisted source dataset/);
});

test('source chips expose imported source, coverage and import date', () => {
  const chip = growth.pageSourceChips('rank-intelligence', [{
    kind: 'ranks', source: 'rank-snapshot.csv', importedAt: '2026-09-01T12:00:00.000Z',
    coverage: { min: '2026-08-01', max: '2026-08-31' }, validation: { status: 'validated' }, checksum: 'fnv1a32:1234'
  }]);
  assert.match(chip, /rank-snapshot\.csv/);
  assert.match(chip, /2026-08-01 → 2026-08-31/);
  assert.match(chip, /imported 2026-09-01/);
  assert.match(chip, /imported evidence/);
  assert.match(chip, /validated/);
});
