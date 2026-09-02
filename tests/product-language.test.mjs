import test from 'node:test';
import assert from 'node:assert/strict';

await import('../navigation-taxonomy.js');
await import('../product-language.js');

const registry = globalThis.KeywordOSPageRegistryTest;
const language = globalThis.KeywordOSProductLanguageTest;

test('renames the legacy Cerebro user label while preserving the internal route id', () => {
  assert.equal(language.LEGACY_KEYWORD_ROUTE, 'cerebro');
  assert.equal(registry.page('cerebro').navLabel, 'Keyword Research');
  assert.equal(registry.page('cerebro').title, 'Keyword Research');
  assert.equal(language.productLabel('cerebro', 'Cerebro'), 'Keyword Research');
  assert.equal(language.productLabel('tracker', 'Keyword Tracker'), 'Keyword Tracker');
});

test('normalizes legacy keyword-research text without changing unrelated words', () => {
  assert.equal(language.replaceLegacyKeywordLabel('KEYWORDS / Cerebro'), 'KEYWORDS / Keyword Research');
  assert.equal(language.replaceLegacyKeywordLabel('Cerebro keyword research'), 'Keyword Research keyword research');
  assert.equal(language.replaceLegacyKeywordLabel('Cerebral analysis'), 'Cerebral analysis');
});

test('every canonical registry page has a Chinese page-language record', () => {
  for (const page of registry.PAGES) {
    const localized = language.pageLanguage(page.id, 'zh');
    assert.ok(localized, page.id);
    assert.ok(localized.navLabel, `${page.id} nav`);
    assert.ok(localized.title, `${page.id} title`);
    assert.ok(localized.subtitle, `${page.id} subtitle`);
    assert.notEqual(localized.title, page.title, `${page.id} title should not fall back to English`);
  }
});

test('page language supports English, Chinese and bilingual shell text from the same registry id', () => {
  assert.equal(language.pageLanguage('rank-intelligence', 'en').title, 'Rank & Index Tracker');
  assert.equal(language.pageLanguage('rank-intelligence', 'zh').title, '排名与收录追踪');
  assert.equal(language.pageLanguage('rank-intelligence', 'bi').title, '排名与收录追踪 / Rank & Index Tracker');
  assert.equal(language.pageLanguage('listing-workspace', 'zh').title, 'Listing 优化器 2.0');
});

test('tool workspace and suite labels use the marketing suite id instead of ambiguous Advertising text', () => {
  assert.equal(language.toolWorkspaceLabel('en'), 'Marketing');
  assert.equal(language.toolWorkspaceLabel('zh'), '营销');
  assert.equal(language.toolWorkspaceLabel('bi'), '营销 / Marketing');
  assert.equal(language.suiteLanguage('marketing', 'zh').title, '营销工作区');
});