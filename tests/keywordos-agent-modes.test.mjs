import test from 'node:test';
import assert from 'node:assert/strict';

await import('../keywordos-agent.js');
await import('../keywordos-agent-modes.js');
const specialists=globalThis.KeywordOSAgentSpecialistsTest;

const validated=(kind,rows)=>({kind,storeId:'store-a',source:`${kind}.csv`,importedAt:'2026-09-02T00:00:00Z',validation:{status:'validated'},rows});

test('specialist mode catalog includes the six requested domains plus general',()=>{
  assert.deepEqual(Object.keys(specialists.MODES),['general','help','advertising','keyword','listing','profitability','inventory']);
});

test('advertising and keyword modes stay inside their evidence domains',()=>{
  const records=[validated('ads',[{date:'2026-06-01',searchTerm:'reader',clicks:10,orders:0,cost:12,sales:0}]),validated('sqp',[{date:'2026-06-01',query:'reader',volume:100,purchases:2}])];
  assert.equal(specialists.resolve('advertising','Show inventory',records).intent,'ads-summary');
  assert.equal(specialists.resolve('keyword','Show search query evidence',records).intent,'sqp');
});

test('Listing specialist reads the validated local draft and does not generate copy',()=>{
  const records=[validated('listing',[{title:'Reading Glasses for Women',bullets:'Spring hinge',description:'Local draft',searchTerms:'reader women',marketplace:'US'}]),validated('keyword-assets',[{keyword:'reading glasses'}])];
  const answer=specialists.resolve('listing','Improve my Listing',records);
  assert.equal(answer.available,true);
  assert.equal(answer.intent,'listing');
  assert.match(answer.summary,/title 25 characters/);
  assert.equal(answer.evidenceRows[0].row.title,'Reading Glasses for Women');
  assert.match(answer.note,/does not draft copy/i);
});

test('profitability specialist requires exact Product Master joins and computes loaded-period evidence',()=>{
  const records=[
    validated('product-master',[{productId:'P1',product:'Reader A',sku:'SKU-1',asin:'B000000001'}]),
    validated('ads',[{date:'2026-06-01',product:'Reader A',cost:20,sales:100,orders:5,units:5}]),
    validated('finance',[{date:'2026-06-01',sku:'SKU-1',type:'Order',quantity:5,total:80}]),
    validated('costs',[{sku:'SKU-1',unitCost:4,inboundCost:1}])
  ];
  const rows=specialists.profitabilityRows(records);
  assert.equal(rows.length,1);
  assert.equal(rows[0].cogs,25);
  assert.equal(rows[0].contribution,35);
  const answer=specialists.resolve('profitability','Show profitability evidence',records);
  assert.equal(answer.available,true);
  assert.match(answer.summary,/\$35\.00/);
  assert.equal(answer.evidenceRows.length,3);
});

test('profitability specialist fails closed when a required validated source is missing',()=>{
  const records=[validated('product-master',[{productId:'P1',sku:'SKU-1'}]),validated('finance',[{sku:'SKU-1',type:'Order',quantity:1,total:20}])];
  const answer=specialists.resolve('profitability','Show profitability evidence',records);
  assert.equal(answer.available,false);
  assert.match(answer.summary,/requires validated Product Master/);
});