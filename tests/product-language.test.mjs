import test from 'node:test';
import assert from 'node:assert/strict';

await import('../product-language.js');
const language = globalThis.KeywordOSProductLanguageTest;

test('renames the legacy Cerebro user label while preserving the legacy route id', () => {
  assert.equal(language.LEGACY_KEYWORD_ROUTE, 'cerebro');
  assert.equal(language.productLabel('cerebro', 'Cerebro'), 'Keyword Research');
  assert.equal(language.productLabel('tracker', 'Keyword Tracker'), 'Keyword Tracker');
});

test('normalizes legacy keyword-research text without changing unrelated words', () => {
  assert.equal(language.replaceLegacyKeywordLabel('KEYWORDS / Cerebro'), 'KEYWORDS / Keyword Research');
  assert.equal(language.replaceLegacyKeywordLabel('Cerebro keyword research'), 'Keyword Research keyword research');
  assert.equal(language.replaceLegacyKeywordLabel('Cerebral analysis'), 'Cerebral analysis');
});
