import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../navigation-taxonomy.js');
const registry = globalThis.KeywordOSPageRegistryTest;

test('central registry has unique page ids and stable i18n keys', () => {
  const validation = registry.validate();
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.duplicateIds, []);
  assert.deepEqual(validation.duplicateI18nKeys, []);
  assert.deepEqual(validation.unknownSuites, []);
  assert.deepEqual(validation.unknownGroups, []);
  assert.deepEqual(validation.invalidAliases, []);
  assert.deepEqual(validation.invalidSuiteRefs, []);
  for (const page of [...registry.PAGES, ...registry.VIRTUAL_PAGES]) {
    assert.match(page.i18nKey, /^page\./);
    assert.ok(page.title);
  }
});

test('canonical route aliases live in the page registry', () => {
  assert.equal(registry.canonicalPage('tracker'), 'rank-intelligence');
  assert.equal(registry.canonicalPage('listing-workspace'), 'listing-optimizer');
  assert.equal(registry.pageFromHash('#page=tracker'), 'rank-intelligence');
  assert.equal(registry.pageHash('listing-workspace'), '#page=listing-optimizer');
  assert.equal(registry.isLegacy('tracker'), true);
  assert.equal(registry.isLegacy('rank-intelligence'), false);
});

test('registry exposes only canonical KeywordOS product names to navigation and commands', () => {
  const research = registry.page('cerebro');
  assert.equal(research.navLabel, 'Keyword Lab');
  assert.equal(research.title, 'Keyword Lab');
  assert.equal(registry.commandEntries().find(entry => entry.page === 'cerebro')?.label, 'Keyword Lab');
  assert.equal(registry.commandEntries().some(entry => entry.label === 'Keyword Research'), false);
  assert.equal(registry.commandEntries().some(entry => /\bCerebro\b/.test(entry.label)), false);
  assert.equal(registry.commandEntries().some(entry => entry.page === 'tracker'), false);
  assert.equal(registry.commandEntries().some(entry => entry.page === 'listing-workspace'), false);
});

test('every canonical page belongs to at most one suite and one sidebar group', () => {
  const grouped = registry.sidebarGroups().flatMap(group => group.pages.map(page => page.id));
  assert.equal(new Set(grouped).size, grouped.length);
  assert.equal(grouped.length, registry.PAGES.length);
  for (const page of registry.PAGES) {
    assert.ok(registry.SIDEBAR_ORDER.includes(page.sidebarGroup));
    if (page.suite) assert.ok(registry.SUITE_ORDER.includes(page.suite));
    assert.equal(registry.suiteForPage(page.id), page.suite);
  }
});

test('suite workspaces and command palette entries derive from the same page records', () => {
  for (const suite of registry.SUITE_ORDER) {
    const pages = registry.pagesForSuite(suite);
    assert.ok(pages.length > 0);
    pages.forEach(page => assert.equal(page.suite, suite));
  }
  const commands = registry.commandEntries();
  for (const entry of commands) {
    const page = registry.page(entry.page);
    assert.ok(page);
    assert.equal(entry.label, page.navLabel || page.title);
    assert.equal(entry.i18nKey, page.i18nKey);
  }
});

test('existing core and Growth page ids are covered by the registry contract', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const growth = await readFile(new URL('../growth-workspaces.js', import.meta.url), 'utf8');
  const navBlock = app.match(/const NAV = \[(.*?)\];\nconst META=/s)?.[1] || '';
  const coreIds = [...navBlock.matchAll(/\[\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*'[^']*'/g)].map(match => match[1]);
  const growthBlock = growth.match(/const PAGE_META=\{(.*?)\n\};/s)?.[1] || '';
  const growthIds = [...growthBlock.matchAll(/'([^']+)'\s*:\s*\[/g)].map(match => match[1]);
  assert.ok(coreIds.length > 20);
  assert.ok(growthIds.length >= 12);
  for (const id of [...coreIds, ...growthIds]) {
    const canonical = registry.canonicalPage(id);
    assert.ok(registry.page(canonical), `missing registry record for ${id} -> ${canonical}`);
  }
});

test('central registry is exposed before route and suite consumers', async () => {
  const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const registryIndex = index.indexOf('<script src="navigation-taxonomy.js"></script>');
  assert.ok(registryIndex >= 0, 'navigation taxonomy should expose the central page registry');
  for (const consumer of ['workflow-canonicalization.js', 'productivity-actions.js', 'suite-home-intelligence.js']) {
    const consumerIndex = index.indexOf(`<script src="${consumer}"></script>`);
    assert.ok(consumerIndex > registryIndex, `${consumer} should load after navigation-taxonomy.js`);
  }
});