import test from 'node:test';
import assert from 'node:assert/strict';

await import('../keywordos-agent.js');
const agent=globalThis.KeywordOSAgentTest;

const adsRows=[
  {date:'2026-06-01',searchTerm:'reading glasses women',campaignName:'C1',adGroupName:'A1',matchType:'EXACT',clicks:10,orders:0,cost:12,sales:0},
  {date:'2026-06-02',searchTerm:'reading glasses women',campaignName:'C1',adGroupName:'A1',matchType:'EXACT',clicks:5,orders:0,cost:8,sales:0},
  {date:'2026-06-02',searchTerm:'blue light readers',campaignName:'C2',adGroupName:'A2',matchType:'PHRASE',clicks:12,orders:3,cost:9,sales:60}
];
const records=[
  {kind:'ads',storeId:'store-a',source:'ads.csv',importedAt:'2026-09-02T00:00:00Z',coverage:{min:'2026-06-01',max:'2026-06-02'},checksum:'fnv1a32:12345678',validation:{status:'validated'},rows:adsRows},
  {kind:'inventory',storeId:'store-a',source:'inventory.csv',validation:{status:'migrated'},rows:[{date:'2026-08-31',sku:'SKU-1',available:4}]},
  {kind:'ranks',storeId:'store-b',source:'other-store.csv',validation:{status:'validated'},rows:[{date:'2026-08-31',keyword:'reader',asin:'B000000000'}]}
];

test('uses only explicitly validated Store 01 registry records',()=>{
  assert.deepEqual(agent.validatedRecords(records).map(record=>record.kind),['ads']);
});

test('classifies supported local evidence questions deterministically',()=>{
  assert.equal(agent.classifyIntent('Which search terms have zero orders?'),'ads-waste');
  assert.equal(agent.classifyIntent('Show latest inventory evidence'),'inventory');
  assert.equal(agent.classifyIntent('有哪些数据源？'),'datasets');
});

test('zero-order waste answer aggregates terms but links back to exact raw source rows',()=>{
  const answer=agent.answerQuery('Which search terms spent money with zero orders?',records);
  assert.equal(answer.available,true);
  assert.equal(answer.intent,'ads-waste');
  assert.match(answer.summary,/reading glasses women/);
  assert.match(answer.summary,/\$20\.00/);
  assert.deepEqual(answer.evidenceRows.map(item=>item.sourceRow),[1,2]);
  assert.ok(answer.evidenceRows.every(item=>item.kind==='ads'));
  assert.deepEqual(answer.columns.slice(0,4),['date','campaignName','adGroupName','searchTerm']);
});

test('dataset inventory exposes provenance and excludes unvalidated or other-store data',()=>{
  const answer=agent.answerQuery('What data is loaded?',records);
  assert.equal(answer.sourceRecords.length,1);
  assert.equal(answer.evidenceRows.length,1);
  assert.equal(answer.evidenceRows[0].row.kind,'ads');
  assert.equal(answer.evidenceRows[0].row.coverage,'2026-06-01 → 2026-06-02');
});

test('missing evidence fails closed instead of falling back to demo data',()=>{
  const answer=agent.answerQuery('Show latest inventory evidence',records);
  assert.equal(answer.available,false);
  assert.match(answer.summary,/No validated Store 01 dataset/);
  assert.equal(answer.evidenceRows.length,0);
});