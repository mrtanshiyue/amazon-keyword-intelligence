import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../alert-inbox.js');
const alerts = globalThis.KeywordOSAlertInboxTest;

test('competitor alerts compare only the latest two distinct snapshots for price and review evidence', () => {
  const rows = [
    { date: '2026-09-01', asin: 'B000000001', price: 20, rating: 4.2, reviewCount: 100 },
    { date: '2026-09-02', asin: 'B000000001', price: 19, rating: 4.3, reviewCount: 105 },
    { date: '2026-09-03', asin: 'B000000001', price: 18, rating: 4.4, reviewCount: 110 }
  ];
  const out = alerts.competitorAlerts(rows);
  assert.equal(out.length, 3);
  assert.ok(out.every(item => item.beforeDate === '2026-09-02' && item.afterDate === '2026-09-03'));
  assert.deepEqual(out.map(item => item.metric).sort(), ['Price', 'Rating', 'Review Count']);
});

test('all alert categories fail closed with only one dated observation', () => {
  assert.equal(alerts.competitorAlerts([{ date: '2026-09-03', asin: 'B000000001', price: 18 }]).length, 0);
  assert.equal(alerts.rankAlerts([{ date: '2026-09-03', asin: 'B000000001', keyword: 'reader', organicRank: 10 }]).length, 0);
  assert.equal(alerts.inventoryAlerts([{ date: '2026-09-03', sku: 'SKU-1', available: 10 }]).length, 0);
  assert.equal(alerts.adsAlerts([{ date: '2026-09-03', spend: 10, orders: 1, sales: 20, clicks: 5, impressions: 100 }]).length, 0);
});

test('rank alerts stay scoped to exact ASIN plus normalized keyword and require observed positive ranks', () => {
  const out = alerts.rankAlerts([
    { date: '2026-09-02', asin: 'B000000001', keyword: 'Reading Glasses', organicRank: 20, sponsoredRank: 0 },
    { date: '2026-09-03', asin: 'b000000001', keyword: 'reading glasses', organicRank: 15, sponsoredRank: 0 },
    { date: '2026-09-02', asin: 'B000000001', keyword: 'Reading Glass', organicRank: 8 },
    { date: '2026-09-03', asin: 'B000000001', keyword: 'Reading Glass', organicRank: 8 }
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].metric, 'Organic Rank');
  assert.equal(out[0].beforeValue, 20);
  assert.equal(out[0].afterValue, 15);
});

test('inventory alerts use latest two dated Available snapshots and ignore undated rows', () => {
  const out = alerts.inventoryAlerts([
    { date: '', sku: 'SKU-1', available: 99 },
    { date: '2026-09-01', sku: 'SKU-1', available: 20 },
    { date: '2026-09-03', sku: 'SKU-1', available: 11 }
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].entity, 'SKU:SKU-1');
  assert.equal(out[0].beforeValue, 20);
  assert.equal(out[0].afterValue, 11);
});

test('Ads alerts compare account aggregates on the latest two dates inside one validated report input', () => {
  const rows = [
    { date: '2026-09-01', spend: 2, orders: 1, sales: 5, clicks: 2, impressions: 20 },
    { date: '2026-09-02', spend: 3, orders: 1, sales: 6, clicks: 3, impressions: 30 },
    { date: '2026-09-02', spend: 2, orders: 1, sales: 4, clicks: 2, impressions: 20 },
    { date: '2026-09-03', spend: 7, orders: 3, sales: 14, clicks: 6, impressions: 60 }
  ];
  const out = alerts.adsAlerts(rows, 'ads.csv');
  assert.equal(out.length, 5);
  assert.ok(out.every(item => item.beforeDate === '2026-09-02' && item.afterDate === '2026-09-03'));
  assert.equal(out.find(item => item.metric === 'Spend').beforeValue, 5);
  assert.equal(out.find(item => item.metric === 'Spend').afterValue, 7);
});

test('read and dismiss state stores IDs only and is reconciled when evidence disappears', () => {
  const source = alerts.makeAlert({ category: 'inventory', sourceKind: 'inventory', entity: 'SKU:ONE', metric: 'Available', beforeDate: '2026-09-01', afterDate: '2026-09-02', beforeValue: 10, afterValue: 5, unit: 'count' });
  let state = alerts.setRead({}, source.id, true);
  state = alerts.dismiss(state, source.id);
  assert.deepEqual(Object.keys(state).sort(), ['dismissedIds', 'readIds', 'version', 'view']);
  assert.equal(JSON.stringify(state).includes('Available'), false);
  assert.equal(alerts.summary([source], state).total, 0);
  assert.deepEqual(alerts.reconcileState(state, []), { version: 1, view: 'unread', readIds: [], dismissedIds: [] });
});

test('runtime wires a backup-safe local inbox into Anomaly Center and gates Ads on actual persisted imports', async () => {
  const [index, pkg, growth, localOps, registry, readme] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
    readFile(new URL('../growth-workspaces.js', import.meta.url), 'utf8'),
    readFile(new URL('../local-operations-actions.js', import.meta.url), 'utf8'),
    readFile(new URL('../dataset-registry.js', import.meta.url), 'utf8'),
    readFile(new URL('../README.md', import.meta.url), 'utf8')
  ]);
  assert.ok(index.indexOf('alert-inbox.js') < index.indexOf('growth-workspaces.js'));
  assert.match(index, /id="alert-inbox-trigger"/);
  assert.match(pkg, /node --check alert-inbox\.js/);
  assert.match(pkg, /alert-inbox\.js keyword-relevance-review\.js growth-import-gate\.js/);
  assert.match(growth, /adsEligible=Boolean\(bridge\?\.adsPersistent\)/);
  assert.match(growth, /Local Alert Inbox/);
  assert.match(growth, /latest two dates inside the current validated Ads report/);
  assert.match(localOps, /keywordos_v9_alert_inbox/);
  assert.match(registry, /new Set\(\['inventory', 'ranks', 'competitor'\]\)/);
  assert.match(readme, /本地 alert inbox/);
});
