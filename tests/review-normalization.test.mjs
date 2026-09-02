import test from 'node:test';
import assert from 'node:assert/strict';

await import('../growth-workspaces.js');
await import('../review-normalization.js');
const growth=globalThis.KeywordOSGrowthTest;
const normalization=globalThis.KeywordOSReviewNormalizationTest;


test('review CSV parser preserves explicit marketplace and language labels',()=>{
  const rows=growth.parseKind('reviews','Date,ASIN,Rating,Title,Body,Variant,Marketplace,Language\n2026-09-01,B000TEST00,5,Great,Original review body,Blue,United States,en_US');
  assert.equal(rows.length,1);
  assert.equal(rows[0].marketplace,'United States');
  assert.equal(rows[0].language,'en_US');
  assert.equal(rows[0].body,'Original review body');
});

test('normalizes explicit marketplace aliases without inferring from review text',()=>{
  assert.equal(normalization.normalizeMarketplace('amazon.com').key,'US');
  assert.equal(normalization.normalizeMarketplace('USA').key,'US');
  assert.equal(normalization.normalizeMarketplace('Amazon.co.uk').key,'GB');
  const unknown=normalization.normalizeMarketplace('Marketplace X');
  assert.equal(unknown.recognized,false);
  assert.match(unknown.key,/^raw:/);
});

test('canonicalizes explicit language names and BCP-47-style tags',()=>{
  assert.deepEqual(normalization.normalizeLanguage('English'),{raw:'English',key:'en',tag:'en',label:'en',recognized:true});
  assert.equal(normalization.normalizeLanguage('en_US').tag,'en-US');
  assert.equal(normalization.normalizeLanguage('zh-hant-tw').tag,'zh-Hant-TW');
  assert.equal(normalization.normalizeLanguage('French').key,'fr');
});

test('does not infer a missing language from marketplace or body',()=>{
  const summary=normalization.reviewNormalizationSummary([{marketplace:'US',language:'',title:'Hola',body:'Excelente',rating:5}]);
  assert.equal(summary.missingLanguage,1);
  assert.equal(summary.groups[0].languageKey,'unspecified');
});

test('groups marketplace and language aliases while preserving original labels',()=>{
  const summary=normalization.reviewNormalizationSummary([
    {marketplace:'USA',language:'English',rating:5,title:'A',body:'One'},
    {marketplace:'amazon.com',language:'en-US',rating:3,title:'B',body:'Two'}
  ]);
  assert.equal(summary.groups.length,1);
  assert.equal(summary.groups[0].marketplaceKey,'US');
  assert.equal(summary.groups[0].languageKey,'en');
  assert.deepEqual(summary.groups[0].rawMarketplaces,['amazon.com','USA']);
  assert.deepEqual(summary.groups[0].rawLanguages,['en-US','English']);
  assert.equal(summary.groups[0].average,4);
});

test('normalized rows preserve original review fields verbatim',()=>{
  const row={marketplace:'United States',language:'English',title:'  Keep spacing  ',body:'原文 stays exactly as imported',rating:4};
  const normalized=normalization.normalizedReviewRows([row])[0];
  assert.equal(normalized.marketplace,row.marketplace);
  assert.equal(normalized.language,row.language);
  assert.equal(normalized.title,row.title);
  assert.equal(normalized.body,row.body);
});

test('panel disclosure forbids translation, detection and cross-language phrase merging',()=>{
  const html=normalization.panelHtml([{marketplace:'US',language:'en-US',rating:5,title:'Good',body:'Good fit'}]);
  assert.match(html,/No translation or language detection is performed/);
  assert.match(html,/phrases are never merged across languages/);
  assert.match(html,/Original marketplace, language, title and review body remain unchanged/);
});
