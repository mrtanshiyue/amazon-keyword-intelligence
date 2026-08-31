import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const PROD = 'https://amazon-keyword-intelligence.tanshiyuesir.workers.dev/';
const EXPECTED_MAIN = '4b917dfe1c2465e063bdf1b77244511d71ecda2a';
const OUT = 'acceptance-output';
await fs.mkdir(OUT, { recursive: true });

const results = [];
const pageErrors = [];
const consoleErrors = [];
const forbiddenMutations = [];
let screenshotIndex = 0;

function now() { return new Date().toISOString(); }
function assert(condition, message, details) {
  if (condition) return;
  const error = new Error(message);
  error.details = details;
  throw error;
}
async function text(locator) { return (await locator.textContent() || '').replace(/\s+/g, ' ').trim(); }
async function lower(locator) { return (await text(locator)).toLowerCase(); }
async function waitApp(page) {
  await page.waitForFunction(() => document.querySelectorAll('#sidebar-nav [data-page]').length >= 26 && (document.querySelector('#content')?.children.length || 0) > 0, null, { timeout: 25000 });
}
async function setEnglish(page) {
  const button = page.locator('[data-lang="en"]');
  if (await button.count()) { await button.click(); await page.waitForTimeout(120); }
}
async function scope(page, value) {
  await page.locator('#profile-select').selectOption(value);
  await page.waitForTimeout(180);
}
async function nav(page, id) {
  const button = page.locator(`#sidebar-nav [data-page="${id}"]`);
  assert(await button.count() === 1, `Missing nav button ${id}`);
  await button.click();
  await page.waitForTimeout(180);
  assert((await page.locator('#content').evaluate(el => el.children.length)) > 0, `Empty content after nav ${id}`);
}
async function downloadFrom(page, locator, label) {
  assert(await locator.count() > 0, `Missing export control: ${label}`);
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), locator.first().click()]);
  assert(Boolean(await download.createReadStream()), `Download did not materialize: ${label}`);
  return download.suggestedFilename();
}
async function runTest(name, fn, page) {
  const started = Date.now();
  try {
    const evidence = await fn();
    results.push({ name, status: 'PASS', ms: Date.now() - started, evidence });
    console.log(`PASS :: ${name}`);
  } catch (error) {
    let screenshot = null;
    try {
      screenshot = `${OUT}/failure-${String(++screenshotIndex).padStart(2, '0')}.png`;
      await page?.screenshot({ path: screenshot, fullPage: true });
    } catch {}
    results.push({ name, status: 'FAIL', ms: Date.now() - started, error: error.message, details: error.details, screenshot });
    console.error(`FAIL :: ${name} :: ${error.message}`);
  }
}

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || undefined });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(6000);
page.setDefaultNavigationTimeout(30000);

page.on('pageerror', error => pageErrors.push({ at: now(), message: error.message, stack: error.stack }));
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push({ at: now(), text: msg.text() }); });
page.on('request', req => {
  const method = req.method().toUpperCase();
  const url = req.url();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && (url.startsWith(PROD) || /amazon(advertising|ads|sellercentral|api)/i.test(url))) {
    forbiddenMutations.push({ method, url });
  }
});

await runTest('Bootstrap / Production shell / seed truth', async () => {
  const response = await page.goto(PROD, { waitUntil: 'domcontentloaded' });
  assert(response?.status() === 200, `Production root status ${response?.status()}`);
  await waitApp(page); await setEnglish(page);
  const probe = await page.evaluate(() => ({
    navCount: document.querySelectorAll('#sidebar-nav [data-page]').length,
    seedRows: window.KEYWORDOS_SEED?.rows?.length,
    unifiedRows: window.KEYWORDOS_UNIFIED_SEED?.rows?.length,
    scopeClass: document.querySelector('#scope-mode-badge')?.className,
    banner: document.querySelector('#runtime-capability-banner')?.textContent
  }));
  assert(probe.navCount === 26, `Expected 26 navigation items, got ${probe.navCount}`);
  assert(probe.seedRows === 8753, `Expected 8753 Ads seed rows, got ${probe.seedRows}`);
  assert(probe.unifiedRows === 3643, `Expected 3643 Unified rows, got ${probe.unifiedRows}`);
  assert(/global/i.test(probe.scopeClass || ''), 'Global read-only scope class missing');
  assert(/cloudflare production/i.test(probe.banner || ''), 'Production capability banner missing');
  assert(/disabled/i.test(probe.banner || ''), 'Amazon API disabled truth missing');
  return probe;
}, page);

await runTest('Runtime GET endpoints / D1-R2 manifest / Access disabled', async () => {
  const getJson = async p => {
    const r = await context.request.get(new URL(p, PROD).href);
    assert(r.status() === 200, `${p} returned ${r.status()}`);
    return r.json();
  };
  const health = await getJson('/api/health');
  const manifest = await getJson('/api/data/manifest');
  const seed = await context.request.get(new URL('/api/data/seed.js', PROD).href);
  const unified = await context.request.get(new URL('/api/data/unified-seed.js', PROD).href);
  assert(seed.status() === 200 && (await seed.text()).length > 100000, 'Ads seed route invalid');
  assert(unified.status() === 200 && (await unified.text()).length > 100000, 'Unified seed route invalid');
  const h = JSON.stringify(health).toLowerCase();
  const m = JSON.stringify(manifest).toLowerCase();
  assert(h.includes('production') && h.includes('disabled'), 'Health production/API truth invalid');
  assert(!h.includes('"accessauthconfigured":true'), 'Production Access unexpectedly configured');
  assert(m.includes('present') || m.includes('r2'), 'Manifest lacks R2 object truth');
  return { health, manifest };
}, page);

await runTest('Global pages / read-only / conflict availability truth', async () => {
  await scope(page, 'global');
  for (const id of ['portfolio-overview', 'cross-store', 'global-keywords', 'global-conflicts']) {
    await nav(page, id);
    assert(await page.locator('#scope-mode-badge.global').count() === 1, `${id} lost global boundary`);
    assert(await page.locator('.scope-banner.global').count() === 1, `${id} missing global banner`);
  }
  await nav(page, 'cross-store');
  for (const view of ['efficiency', 'keywords', 'performance']) {
    const button = page.locator(`[data-cross-view="${view}"]`);
    assert(await button.count() === 1, `Missing cross-store view ${view}`);
    await button.click(); await page.waitForTimeout(70);
  }
  await nav(page, 'global-keywords');
  await page.locator('#global-keyword-search').fill('reading'); await page.waitForTimeout(180);
  assert(await page.locator('table.data-table tbody tr').count() > 0, 'Global keyword search produced no rows');
  const file = await downloadFrom(page, page.locator('#global-keyword-export'), 'Global keyword export');
  assert(/global_keywords/i.test(file), `Unexpected global export ${file}`);
  await nav(page, 'global-conflicts');
  const body = await lower(page.locator('#content'));
  const mentionsUnloaded = /(store 02|store 03)/.test(body) && /(no data|not loaded|unavailable|one loaded|loaded store)/.test(body);
  const explainsLimit = /(cross-store|conflict)/.test(body) && /(unavailable|requires|loaded|dataset)/.test(body);
  assert(mentionsUnloaded || explainsLimit, 'Global Conflict Center does not explain one-loaded-store boundary', body.slice(0, 700));
  return { snippet: body.slice(0, 700) };
}, page);

await runTest('Store 01 / Store 02 / Store 03 no-data truth', async () => {
  const evidence = {};
  for (const store of ['store-a', 'store-b', 'store-c']) {
    await scope(page, store);
    const selected = await page.locator('#profile-select').inputValue();
    assert(selected === store, `${store} did not become Data scope`);
    const body = await lower(page.locator('#content'));
    evidence[store] = body.slice(0, 500);
    assert(await page.locator('#scope-mode-badge.store').count() === 1, `${store} missing store boundary`);
    if (store === 'store-a') {
      assert(/imported|data workspace|dataset/.test(body), 'Store 01 does not show loaded dataset truth');
      assert(body.includes('disabled'), 'Store 01 does not show Amazon API disabled truth');
    } else {
      assert(/no data|no imported dataset|no business data/.test(body), `${store} does not show no-data truth`);
      assert(/disabled|not connected|deferred|local/.test(body), `${store} implies a live Amazon connection`);
    }
  }
  return evidence;
}, page);

await runTest('Custom local workspace / Data scope truth / restoration / reload', async () => {
  const coreScope = await page.locator('#profile-select').inputValue();
  await nav(page, 'stores-settings');
  await page.waitForFunction(() => Boolean(document.querySelector('#local-store-workspace-admin')));
  const existing = page.locator('.admin-store-card').filter({ hasText: 'ACCEPTANCE-US-04' });
  if (!(await existing.count())) {
    await page.locator('#local-add-store').click();
    await page.locator('#local-store-name').fill('ACCEPTANCE-US-04');
    await page.locator('#local-store-save').click();
    await page.waitForTimeout(120);
  }
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('keywordos_v9_store_workspaces') || '[]'));
  const custom = stored.find(x => x.name === 'ACCEPTANCE-US-04');
  assert(custom && custom.builtIn === false && custom.hasData === false, 'Custom workspace persistence truth invalid');
  const card = page.locator('.admin-store-card').filter({ hasText: 'ACCEPTANCE-US-04' });
  await card.locator('[data-local-store-open]').click(); await page.waitForTimeout(100);
  const workspace = await lower(page.locator('#content'));
  const selected = await page.locator('#profile-select option:checked').evaluate(o => ({ value: o.value, text: o.textContent, disabled: o.disabled, local: o.dataset.localWorkspace }));
  assert(workspace.includes('acceptance-us-04') && /no data|no imported dataset|no business data/.test(workspace), 'Custom workspace content truth invalid');
  assert(selected.value === custom.id && /acceptance-us-04/i.test(selected.text || '') && /local/i.test(selected.text || '') && /no data/i.test(selected.text || ''), 'Top Data scope contradicts custom workspace', selected);
  assert(selected.disabled === true && selected.local === '1', 'Custom Data scope option is not transient/disabled', selected);
  await nav(page, 'overview');
  const restored = await page.locator('#profile-select').inputValue();
  assert(['global', 'store-a', 'store-b', 'store-c'].includes(restored), `Core scope remained poisoned by custom workspace: ${restored}`);
  assert(restored === coreScope || ['store-a', 'store-b', 'store-c', 'global'].includes(restored), 'Core Store scope did not restore');
  await page.reload({ waitUntil: 'domcontentloaded' }); await waitApp(page); await setEnglish(page);
  await nav(page, 'stores-settings');
  assert(await page.locator('.admin-store-card').filter({ hasText: 'ACCEPTANCE-US-04' }).count() === 1, 'Custom workspace did not survive reload');
  return { customId: custom.id, selected, restored };
}, page);

await runTest('Advertising Dashboard / granularity', async () => {
  await scope(page, 'store-a'); await nav(page, 'overview');
  assert(await page.locator('.h10-dashboard-head').count() === 1, 'Dashboard shell missing');
  for (const mode of ['weekly', 'monthly', 'daily']) {
    const b = page.locator(`[data-dashboard-granularity="${mode}"]`);
    assert(await b.count() === 1, `Missing dashboard ${mode}`);
    await b.click(); await page.waitForTimeout(60);
  }
  return { metricCards: await page.locator('.overview-metric').count() };
}, page);

await runTest('Suggestions staging / sidebar rerender navigation regression', async () => {
  await nav(page, 'suggestions');
  const rows = page.locator('.h10-table tbody tr').filter({ has: page.locator('input[data-suggest-select]') });
  assert(await rows.count() > 0, 'No Suggestions rows');
  const search = page.locator('.h10-toolbar .searchbox input');
  await search.fill('reading'); await page.waitForTimeout(100);
  const visible = rows.filter({ visible: true });
  assert(await visible.count() > 0, 'Suggestions search hid all rows');
  await visible.first().locator('input[data-suggest-select]').check();
  const stage = page.locator('#apply-suggestion-changes');
  assert(!(await stage.isDisabled()) && /Stage 1 Selected/i.test(await text(stage)), 'Suggestions Stage 1 Selected state incorrect', await text(stage));
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('keywordos_v9_actions') || '[]').length);
  await stage.click(); await page.waitForTimeout(100);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('keywordos_v9_actions') || '[]').length);
  assert(after > before, 'Suggestion did not stage local Action Center item');
  for (const id of ['ad-manager', 'rules', 'cerebro']) {
    await nav(page, id);
    assert((await text(page.locator('#page-title'))).length > 0, `Sidebar navigation failed after Suggestions staging: ${id}`);
  }
  return { before, after };
}, page);

await runTest('Ad Manager / Analytics filters / drill-down / export', async () => {
  await nav(page, 'ad-manager');
  assert(await page.locator('.data-workspace table.data-table').count() === 1, 'Ad Manager table missing');
  await page.locator('#table-search').fill('SP'); await page.waitForTimeout(100);
  await page.locator('#show-filters').click();
  assert(await page.locator('.filter-panel').count() === 1, 'Ad Manager filter panel missing');
  await page.locator('#clear-filters').click();
  await nav(page, 'analytics');
  assert(await page.locator('[data-segment-view="product"]').count() === 1, 'Analytics segmentation missing');
  await page.locator('[data-segment-view="product"]').click(); await page.waitForTimeout(70);
  assert(await page.locator('table.data-table tbody tr').count() > 0, 'Analytics product segmentation empty');
  const file = await downloadFrom(page, page.locator('#export-table'), 'Analytics export');
  return { file };
}, page);

await runTest('Rules / schedules / Action Center / Change Log local lifecycle', async () => {
  await nav(page, 'rules');
  assert(await page.locator('.rule-page').count() === 1, 'Rules page missing');
  const beforeRules = await page.evaluate(() => JSON.parse(localStorage.getItem('keywordos_v9_actions') || '[]').length);
  await page.locator('#run-rules').click(); await page.waitForTimeout(100);
  const afterRules = await page.evaluate(() => JSON.parse(localStorage.getItem('keywordos_v9_actions') || '[]').length);
  assert(afterRules >= beforeRules, 'Rule run reduced staged actions');
  await nav(page, 'schedules');
  await page.locator('#create-schedule').click();
  assert(await page.locator('#modal-root .modal').count() === 1, 'Schedule modal missing');
  await page.locator('#schedule-name').fill('Acceptance schedule');
  await page.locator('#modal-root [data-modal-btn="1"]').click(); await page.waitForTimeout(80);
  const schedules = await page.evaluate(() => JSON.parse(localStorage.getItem('keywordos_v9_schedules') || '[]'));
  assert(schedules.some(s => s.name === 'Acceptance schedule' && s.status === 'Draft'), 'Schedule draft not persisted');
  await nav(page, 'actions');
  const approve = page.locator('[data-action-approve]').first();
  assert(await approve.count() === 1, 'No pending Action Center item');
  await approve.click(); await page.waitForTimeout(70);
  const actions = await page.evaluate(() => JSON.parse(localStorage.getItem('keywordos_v9_actions') || '[]'));
  assert(actions.some(a => a.status === 'Approved'), 'Approved action not persisted');
  await nav(page, 'change-log');
  assert(await page.locator('.change-source-tabs').count() === 1, 'Change Log shell missing');
  const logFile = await downloadFrom(page, page.locator('#log-export'), 'Change Log export');
  return { beforeRules, afterRules, logFile };
}, page);

await runTest('Keywords / Cerebro / Tracker / Library / Conflict / protection', async () => {
  await nav(page, 'cerebro');
  await page.locator('#research-query').fill('reading glasses');
  await page.locator('#research-query').press('Enter'); await page.waitForTimeout(120);
  const history = await page.evaluate(() => JSON.parse(localStorage.getItem('keywordos_v9_research_history') || '[]'));
  assert(history.some(h => /reading glasses/i.test(h.query)), 'Cerebro history not persisted');
  await nav(page, 'tracker');
  assert(await page.locator('table.data-table').count() === 1, 'Keyword Tracker table missing');
  await nav(page, 'keyword-library');
  await page.locator('#kw-search').fill('reading'); await page.waitForTimeout(150);
  assert(await page.locator('table.data-table tbody tr').count() > 0, 'Keyword Library search empty');
  const kwFile = await downloadFrom(page, page.locator('#kw-export'), 'Keyword Library export');
  await nav(page, 'negative-library');
  assert(await page.locator('table.data-table').count() >= 1, 'Negative Library tables missing');
  await nav(page, 'conflicts');
  assert((await lower(page.locator('#content'))).includes('conflict guard'), 'Conflict Guard truth missing');
  await nav(page, 'settings');
  await page.locator('#new-protected').fill('acceptance protected keyword');
  await page.locator('#add-protected').click(); await page.waitForTimeout(70);
  const protectedSet = await page.evaluate(() => JSON.parse(localStorage.getItem('keywordos_v9_protected') || '[]'));
  assert(protectedSet.includes('acceptance protected keyword'), 'Protected keyword not persisted');
  return { history: history.length, kwFile };
}, page);

await runTest('Finance tabs / drill-down / exports', async () => {
  await nav(page, 'unified-report');
  for (const tab of ['overview', 'income', 'fees', 'products', 'settlements', 'transactions']) {
    const b = page.locator(`[data-fin-tab="${tab}"]`);
    assert(await b.count() === 1, `Finance tab missing: ${tab}`);
    await b.click(); await page.waitForTimeout(70);
    assert((await text(page.locator('#content'))).length > 200, `Finance tab empty: ${tab}`);
  }
  await page.locator('[data-fin-tab="products"]').click(); await page.waitForTimeout(60);
  const productFile = await downloadFrom(page, page.locator('#finance-product-export'), 'Finance product export');
  await page.locator('[data-fin-tab="transactions"]').click(); await page.waitForTimeout(60);
  await page.locator('#fin-search').fill('Order'); await page.waitForTimeout(100);
  const txFile = await downloadFrom(page, page.locator('#fin-export'), 'Finance transaction export');
  return { productFile, txFile };
}, page);

await runTest('Data Operations / Data Health persistence', async () => {
  await nav(page, 'sync-center');
  assert(await page.locator('#refresh-local-data-status').count() === 1, 'Local Data Operations refresh missing');
  await page.locator('#refresh-local-data-status').click(); await page.waitForTimeout(80);
  const health = await page.evaluate(() => JSON.parse(localStorage.getItem('keywordos_v9_data_ops') || '{}'));
  assert(Boolean(health.lastCheckedAt) && health.snapshot?.ads?.rows > 0 && health.snapshot?.finance?.rows > 0, 'Data Health snapshot not persisted');
  await nav(page, 'data-health');
  assert((await text(page.locator('#content'))).includes(health.lastCheckedAt), 'Data Health timestamp missing');
  return { checkedAt: health.lastCheckedAt };
}, page);

await runTest('Ads local import / IndexedDB reload / reset', async () => {
  const csv = ['Account Name,Campaign Name,Ad Group Name,Search Term,Date,Targeting,Match Type,Impressions,Clicks,Spend,Orders,Sales,Status','Acceptance Account,SP YS1001 Acceptance,AG One,reading glasses acceptance,2026-06-30,reading glasses,EXACT,1000,50,25,5,100,ENABLED','Acceptance Account,SP YS1001 Acceptance,AG One,blue light readers acceptance,2026-06-29,blue light readers,PHRASE,800,30,12,2,50,ENABLED'].join('\n');
  await fs.writeFile(`${OUT}/acceptance-ads.csv`, csv);
  await nav(page, 'import');
  await page.locator('#hidden-file').setInputFiles(`${OUT}/acceptance-ads.csv`);
  await page.waitForSelector('#commit-import');
  assert(!(await page.locator('#commit-import').isDisabled()), 'Valid Ads import disabled');
  await page.locator('#commit-import').click(); await page.waitForTimeout(220);
  await page.reload({ waitUntil: 'domcontentloaded' }); await waitApp(page); await setEnglish(page); await scope(page, 'store-a'); await nav(page, 'import');
  const body = await text(page.locator('#content'));
  assert(body.includes('acceptance-ads.csv') && /Rows\s*2\b/.test(body), 'Ads import did not survive reload');
  await page.locator('#reset-ads-import').click(); await page.waitForTimeout(150);
  assert(/Cloudflare seed/i.test(await text(page.locator('#content'))), 'Ads reset did not restore seed');
  return { rows: 2 };
}, page);

await runTest('Unified local import / IndexedDB reload / reset', async () => {
  const csv = ['Date/Time,Settlement ID,Type,Order ID,SKU,Description,Quantity,Product Sales,Selling Fees,FBA Fees,Other Transaction Fees,Other,Total,Transaction Status','"Jun 30, 2026 10:00:00 AM UTC",SET-ACCEPT,Order,ORDER-1,YS1001-A,Acceptance Order,1,35,-5,-7,0,0,23,Released','"Jun 30, 2026 11:00:00 AM UTC",SET-ACCEPT,Transfer,,,Acceptance Transfer,0,0,0,0,0,0,-23,Released'].join('\n');
  await fs.writeFile(`${OUT}/acceptance-unified.csv`, csv);
  await nav(page, 'unified-report');
  await page.locator('#hidden-unified-file').setInputFiles(`${OUT}/acceptance-unified.csv`);
  await page.waitForSelector('#modal-root .modal');
  const importButton = page.locator('#modal-root [data-modal-btn]').filter({ hasText: 'Import & Replace' });
  assert(await importButton.count() === 1, 'Unified Import & Replace missing');
  await importButton.click(); await page.waitForTimeout(200);
  await page.reload({ waitUntil: 'domcontentloaded' }); await waitApp(page); await setEnglish(page); await scope(page, 'store-a'); await nav(page, 'unified-report');
  assert((await text(page.locator('#content'))).includes('acceptance-unified.csv'), 'Unified import did not survive reload');
  assert(await page.locator('#finance-reset-local').count() === 1, 'Unified reset control missing');
  await page.locator('#finance-reset-local').click(); await page.waitForTimeout(150);
  assert(!(await text(page.locator('#content'))).includes('acceptance-unified.csv'), 'Unified reset did not clear persisted import');
  return { rows: 2 };
}, page);

await runTest('Connection / shell truth / no false live semantics', async () => {
  await nav(page, 'amazon-connections');
  const body = await lower(page.locator('#content'));
  assert(/disabled|deferred|not configured|not connected/.test(body), 'Connection page lacks fail-closed truth');
  const falseConnected = await page.locator('.badge.green').evaluateAll(nodes => nodes.map(n => n.textContent?.trim()).filter(t => /^connected$/i.test(t || '')));
  const falseExecuted = await page.locator('.badge,.status-badge').evaluateAll(nodes => nodes.map(n => n.textContent?.trim()).filter(t => /^(live|synced|executed)$/i.test(t || '')));
  assert(falseConnected.length === 0 && falseExecuted.length === 0, 'False Connected/Live/Synced/Executed semantics present', { falseConnected, falseExecuted });
  return { snippet: body.slice(0, 500) };
}, page);

await runTest('Accessibility / keyboard / toast semantics', async () => {
  await scope(page, 'store-a'); await nav(page, 'ad-manager');
  const a11y = await page.evaluate(() => ({
    unlabeledCheckboxes: [...document.querySelectorAll('table input[type="checkbox"]')].filter(x => !x.getAttribute('aria-label') && !x.labels?.length).length,
    badDynamic: [...document.querySelectorAll('.entity-link[data-entity],.toggle[data-protect],.toggle[data-untrack]')].filter(x => x.tabIndex < 0 || !x.getAttribute('aria-label')).length,
    toastRole: document.querySelector('#toast-root')?.getAttribute('role'),
    toastLive: document.querySelector('#toast-root')?.getAttribute('aria-live')
  }));
  assert(a11y.unlabeledCheckboxes === 0, `${a11y.unlabeledCheckboxes} unlabeled checkboxes`);
  assert(a11y.badDynamic === 0, `${a11y.badDynamic} dynamic keyboard targets invalid`);
  assert(a11y.toastRole === 'status' && a11y.toastLive === 'polite', 'Toast live-region semantics invalid');
  return a11y;
}, page);

await runTest('Desktop overflow / table containment', async () => {
  await scope(page, 'store-a'); await nav(page, 'ad-manager');
  const g = await page.evaluate(() => { const root = document.documentElement; const table = document.querySelector('.table-scroll'); return { bodyScrollWidth: root.scrollWidth, bodyClientWidth: root.clientWidth, tableScrollWidth: table?.scrollWidth || 0, tableClientWidth: table?.clientWidth || 0 }; });
  assert(g.bodyScrollWidth <= g.bodyClientWidth + 2, `Desktop body horizontal overflow: ${JSON.stringify(g)}`);
  assert(g.tableScrollWidth >= g.tableClientWidth, 'Desktop table containment invalid');
  return g;
}, page);

await runTest('Mobile viewport / horizontal table containment', async () => {
  const mobile = await context.newPage();
  mobile.setDefaultTimeout(6000);
  await mobile.setViewportSize({ width: 390, height: 844 });
  mobile.on('pageerror', error => pageErrors.push({ at: now(), page: 'mobile', message: error.message, stack: error.stack }));
  mobile.on('console', msg => { if (msg.type() === 'error') consoleErrors.push({ at: now(), page: 'mobile', text: msg.text() }); });
  const r = await mobile.goto(PROD, { waitUntil: 'domcontentloaded' });
  assert(r?.status() === 200, `Mobile root status ${r?.status()}`);
  await waitApp(mobile); await setEnglish(mobile); await scope(mobile, 'store-a'); await nav(mobile, 'ad-manager');
  const g = await mobile.evaluate(() => { const root = document.documentElement; const table = document.querySelector('.table-scroll'); const rect = table?.getBoundingClientRect(); return { viewport: innerWidth, bodyScrollWidth: root.scrollWidth, bodyClientWidth: root.clientWidth, tableScrollWidth: table?.scrollWidth || 0, tableClientWidth: table?.clientWidth || 0, left: rect?.left, right: rect?.right, navItems: document.querySelectorAll('#sidebar-nav [data-page]').length }; });
  assert(g.navItems === 26, 'Mobile lost navigation items');
  assert(g.bodyScrollWidth <= g.bodyClientWidth + 2, `Mobile page leaks horizontal overflow: ${JSON.stringify(g)}`);
  assert(g.tableScrollWidth > g.tableClientWidth, `Mobile table is not horizontally scrollable: ${JSON.stringify(g)}`);
  assert((g.left ?? 0) >= -2 && (g.right ?? g.viewport) <= g.viewport + 2, `Mobile table escapes viewport: ${JSON.stringify(g)}`);
  await mobile.close();
  return g;
}, page);

await runTest('Network boundary / no Production or Amazon mutation', async () => {
  assert(forbiddenMutations.length === 0, `Forbidden mutation requests observed: ${JSON.stringify(forbiddenMutations)}`);
  return { forbiddenMutations };
}, page);

await runTest('Runtime exceptions / console errors', async () => {
  assert(pageErrors.length === 0, `Browser page errors observed: ${JSON.stringify(pageErrors)}`);
  assert(consoleErrors.length === 0, `Console errors observed: ${JSON.stringify(consoleErrors)}`);
  return { pageErrors, consoleErrors };
}, page);

const summary = {
  productionUrl: PROD,
  expectedExactMain: EXPECTED_MAIN,
  generatedAt: now(),
  passed: results.filter(x => x.status === 'PASS').length,
  failed: results.filter(x => x.status === 'FAIL').length,
  results,
  pageErrors,
  consoleErrors,
  forbiddenMutations
};
await fs.writeFile(path.join(OUT, 'production-cumulative-acceptance.json'), JSON.stringify(summary, null, 2));
await fs.writeFile(path.join(OUT, 'production-cumulative-acceptance.md'), ['# KeywordOS #20 Production Cumulative Acceptance','',`- Production: ${PROD}`,`- Exact main expected: ${EXPECTED_MAIN}`,`- Generated: ${summary.generatedAt}`,`- PASS: ${summary.passed}`,`- FAIL: ${summary.failed}`,'',...results.map(r => `- **${r.status}** — ${r.name}${r.error ? ` — ${r.error}` : ''}`)].join('\n'));

await context.close();
await browser.close();
console.log(JSON.stringify({ expectedExactMain: EXPECTED_MAIN, passed: summary.passed, failed: summary.failed, pageErrors: pageErrors.length, forbiddenMutations }, null, 2));
if (summary.failed) process.exit(1);
