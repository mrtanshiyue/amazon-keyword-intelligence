import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

await import('../keyword-relevance-review.js');
const review=globalThis.KeywordOSKeywordRelevanceReviewTest;
assert.ok(review);

const rows=[
  {asin:'B000000001',keyword:'reading glasses',snapshotDate:'2026-09-01'},
  {asin:'B000000001',keyword:'old only',snapshotDate:'2026-09-01'},
  {asin:'B000000001',keyword:'reading glasses',snapshotDate:'2026-09-03'},
  {asin:'B000000001',keyword:'blue light readers',snapshotDate:'2026-09-03'},
  {asin:'B000000002',keyword:'Reading Glasses',snapshotDate:'2026-09-02'},
  {asin:'B000000002',keyword:'readers',snapshotDate:'2026-09-02'},
  {asin:'B000000003',keyword:'computer readers',snapshotDate:'2026-09-03'}
];

test('latest ASIN result sets use each ASIN latest imported snapshot and drop older rows',()=>{
  const sets=review.latestResultSets(rows,['B000000001','B000000002']);
  assert.equal(sets.length,2);
  assert.deepEqual(sets[0].keywords.map(x=>x.key),['reading glasses','blue light readers']);
  assert.equal(sets[0].date,'2026-09-03');
  assert.equal(sets[0].keywords.some(x=>x.key==='old only'),false);
});

test('local relevance is transparent exact ASIN result-set overlap only',()=>{
  const queue=review.buildQueue(rows,['B000000001','B000000002','B000000003']);
  const reading=queue.find(x=>x.key==='reading glasses');
  assert.equal(reading.localRelevance.available,true);
  assert.equal(reading.localRelevance.numerator,2);
  assert.equal(reading.localRelevance.denominator,3);
  assert.equal(reading.localRelevance.value,2/3);
  assert.match(reading.localRelevance.formula,/ASIN result sets containing the exact keyword/);
  const blue=queue.find(x=>x.key==='blue light readers');
  assert.equal(blue.localRelevance.available,false);
  assert.equal(blue.localRelevance.value,null);
});

test('overlap matching is exact normalized keyword and never substring or stemming',()=>{
  const queue=review.buildQueue(rows,['B000000001','B000000002']);
  const readers=queue.find(x=>x.key==='readers');
  const blue=queue.find(x=>x.key==='blue light readers');
  assert.equal(readers.localRelevance.numerator,1);
  assert.equal(blue.localRelevance.numerator,1);
  assert.equal(readers.localRelevance.available,false);
});

test('manual decisions bind to the evidence fingerprint and reset when evidence or scope changes',()=>{
  const evidence=review.evidenceKey(rows,['B000000001','B000000002']);
  let state=review.updateReview({},'reading glasses',{status:'relevant',note:'Core phrase'},evidence,'2026-09-03T04:00:00Z');
  assert.equal(review.normalizeState(state,evidence).reviews['reading glasses'].status,'relevant');
  assert.equal(review.normalizeState(state,evidence).reviews['reading glasses'].note,'Core phrase');
  const changed=review.evidenceKey(rows,['B000000001','B000000002','B000000003']);
  assert.notEqual(changed,evidence);
  assert.deepEqual(review.normalizeState(state,changed).reviews,{});
});

test('review state stores decisions only and does not preserve derived relevance result payloads',()=>{
  const evidence=review.evidenceKey(rows,['B000000001','B000000002']);
  const state=review.normalizeState({evidenceKey:evidence,reviews:{'reading glasses':{status:'relevant',note:'ok',score:99,asins:['fake'],formula:'fake'}},results:[1],resultCount:9},evidence);
  assert.deepEqual(Object.keys(state.reviews['reading glasses']),['status','note','updatedAt']);
  assert.equal(Object.hasOwn(state,'results'),false);
  assert.equal(Object.hasOwn(state,'resultCount'),false);
});

test('runtime uses existing suggestion-review persistence and renders a manual queue without Amazon Relevancy claims',async()=>{
  const [index,pkg,app,growth,readme]=await Promise.all([
    readFile(new URL('../index.html',import.meta.url),'utf8'),
    readFile(new URL('../package.json',import.meta.url),'utf8'),
    readFile(new URL('../app.js',import.meta.url),'utf8'),
    readFile(new URL('../growth-workspaces.js',import.meta.url),'utf8'),
    readFile(new URL('../README.md',import.meta.url),'utf8')
  ]);
  assert.ok(index.indexOf('keyword-relevance-review.js')<index.indexOf('growth-workspaces.js'));
  assert.match(pkg,/node --check keyword-relevance-review\.js/);
  assert.match(pkg,/keyword-relevance-review\.js growth-import-gate\.js/);
  assert.match(app,/__keywordRelevanceReviews/);
  assert.match(app,/getKeywordRelevanceReviewState:keywordRelevanceReviewState/);
  assert.match(app,/setKeywordRelevanceReviewState:saveKeywordRelevanceReviewState/);
  assert.match(growth,/Human relevance review queue/);
  assert.match(growth,/Local imported overlap only; this is not Amazon Relevancy/);
  assert.match(growth,/data-relevance-status/);
  assert.doesNotMatch(readme,/keywordos_v9_keyword_relevance_reviews/);
});
