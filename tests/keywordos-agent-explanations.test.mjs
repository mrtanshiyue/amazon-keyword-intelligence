import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

await import('../keywordos-agent-explanations.js');
await import('../keywordos-agent.js');
await import('../keywordos-agent-diagnostics.js');
await import('../keywordos-agent-modes.js');
const explanations=globalThis.KeywordOSAgentExplanationsTest;
const diagnostics=globalThis.KeywordOSAgentDiagnosticsTest;
const specialists=globalThis.KeywordOSAgentSpecialistsTest;
const validated=(kind,rows)=>({kind,storeId:'store-a',source:`${kind}.csv`,importedAt:'2026-09-03T00:00:00Z',validation:{status:'validated'},rows});

const records=[
  validated('ads',[
    {date:'2026-08-01',searchTerm:'blue light readers',orders:2,sales:40,clicks:10,cost:8},
    {date:'2026-08-02',searchTerm:'blue light readers',orders:1,sales:20,clicks:5,cost:4},
    {date:'2026-08-02',searchTerm:'blue light readers women',orders:9,sales:200,clicks:30,cost:20}
  ]),
  validated('sqp',[
    {date:'2026-08-01',query:'blue light readers',volume:100,clicks:20,purchases:2},
    {date:'2026-08-31',query:'blue light readers',volume:150,clicks:30,purchases:3}
  ]),
  validated('reverse-asin',[
    {snapshotDate:'2026-08-01',asin:'B000000001',keyword:'blue light readers'},
    {snapshotDate:'2026-08-31',asin:'B000000001',keyword:'blue light readers'},
    {snapshotDate:'2026-08-31',asin:'B000000002',keyword:'blue light readers'},
    {snapshotDate:'2026-08-31',asin:'B000000003',keyword:'blue light readers women'}
  ]),
  validated('ranks',[
    {date:'2026-08-01',asin:'B000000001',keyword:'blue light readers',organicRank:15},
    {date:'2026-08-31',asin:'B000000001',keyword:'blue light readers',organicRank:9,sponsoredRank:4}
  ]),
  validated('keyword-assets',[{id:'kw_blue',keyword:'blue light readers',status:'Active',favorite:true}]),
  validated('listing',[{title:'Blue Light Readers for Women',bullets:'Spring hinge',description:'Comfortable readers',searchTerms:'reading glasses blue light'}])
];

test('classifies explanation prompts without stealing ordinary why-change diagnostics',()=>{
  assert.equal(explanations.classifyExplanationIntent('Why is “blue light readers” prioritized?'),'keyword-priority');
  assert.equal(explanations.classifyExplanationIntent('缺少什么数据？'),'missing-data');
  assert.equal(explanations.classifyExplanationIntent('Why did ACoS change?'),'');
  assert.equal(diagnostics.isDiagnosticQuery('Why is “blue light readers” prioritized?'),false);
  assert.equal(diagnostics.isDiagnosticQuery('Why did ACoS change?'),true);
});

test('extracts an explicit exact keyword and refuses ambiguous this-keyword context',()=>{
  assert.equal(explanations.extractKeyword('Why is “blue light readers” prioritized?'),'blue light readers');
  assert.equal(explanations.extractKeyword('为什么 blue light readers 优先？'),'blue light readers');
  const answer=explanations.keywordPriority('Why is this keyword prioritized?',records);
  assert.equal(answer.available,false);
  assert.match(answer.deterministic,/no hidden selected-row context/i);
});

test('priority explanation joins exact local evidence only and creates no hidden score',()=>{
  const answer=explanations.keywordPriority('Why is “blue light readers” prioritized?',records);
  assert.equal(answer.available,true);
  assert.match(answer.summary,/3 imported Ads order/);
  assert.match(answer.summary,/3 imported SQP purchase/);
  assert.match(answer.summary,/2 current imported ASIN result sets/);
  assert.match(answer.summary,/does not compute a hidden global keyword priority score/i);
  assert.ok(answer.explanationRows.some(row=>row.signal==='Ads exact Search Term'&&/orders 3/.test(row.observed)));
  assert.ok(answer.explanationRows.some(row=>row.signal==='SQP exact query'&&/150/.test(row.observed)&&/purchases 3/.test(row.observed)));
  assert.ok(answer.explanationRows.some(row=>row.signal==='reverse-ASIN exact overlap'&&/2 of 3/.test(row.observed)));
  assert.ok(answer.explanationRows.some(row=>row.signal==='Listing exact phrase placement'&&/Title/.test(row.observed)));
  assert.equal('score' in answer,false);
  assert.ok(answer.evidenceRows.filter(row=>row.kind==='ads').every(row=>row.row.searchTerm==='blue light readers'));
});

test('SQP and rank explanations use latest dated exact observations rather than old or substring rows',()=>{
  const answer=explanations.keywordPriority('keyword: blue light readers',records);
  const sqp=answer.evidenceRows.filter(item=>item.kind==='sqp');
  const ranks=answer.evidenceRows.filter(item=>item.kind==='ranks');
  assert.deepEqual(sqp.map(item=>item.row.date),['2026-08-31']);
  assert.deepEqual(ranks.map(item=>item.row.date),['2026-08-31']);
  assert.ok(answer.evidenceRows.every(item=>item.kind!=='ads'||item.row.searchTerm!=='blue light readers women'));
});

test('keyword missing-data explanation distinguishes missing dataset from no exact keyword evidence',()=>{
  const partial=[validated('ads',[{date:'2026-08-01',searchTerm:'other term',orders:2}]),validated('sqp',[{date:'2026-08-01',query:'blue light readers',volume:100}])];
  const answer=explanations.missingData('What data is missing for keyword: blue light readers',partial,'keyword');
  assert.equal(answer.available,true);
  assert.ok(answer.missingData.some(row=>row.kind==='ads'&&row.status==='No exact keyword evidence'));
  assert.ok(answer.missingData.some(row=>row.kind==='reverse-asin'&&row.status==='Missing dataset'));
  assert.match(answer.summary,/local evidence gap/);
  assert.match(answer.summary,/not Amazon data requirements/i);
});

test('generic missing-data inventory is deterministic per specialist mode',()=>{
  const profitability=[validated('product-master',[{sku:'SKU-1'}]),validated('ads',[{searchTerm:'reader'}])];
  const answer=explanations.missingData('What data is missing?',profitability,'profitability');
  assert.deepEqual(answer.missingData.map(row=>row.kind),['finance','costs']);
  assert.match(answer.deterministic,/product-master, ads, finance, costs/);
});

test('removing a source removes its explanation and turns it into a current gap',()=>{
  const before=explanations.keywordPriority('Why is “blue light readers” prioritized?',records);
  const afterRecords=records.filter(record=>record.kind!=='sqp');
  const after=explanations.keywordPriority('Why is “blue light readers” prioritized?',afterRecords);
  assert.ok(before.explanationRows.some(row=>row.signal==='SQP exact query'));
  assert.ok(!after.explanationRows.some(row=>row.signal==='SQP exact query'));
  assert.ok(after.missingData.some(row=>row.kind==='sqp'&&row.status==='Missing dataset'));
});

test('specialist resolver routes explanation prompts before normal domain answers',()=>{
  const priority=specialists.resolve('keyword','Why is “blue light readers” prioritized?',records);
  const missing=specialists.resolve('profitability','What data is missing?',records);
  assert.equal(priority.intent,'keyword-priority');
  assert.equal(missing.intent,'missing-data');
  assert.match(specialists.explanationHtml(priority),/Deterministic rule/);
  assert.match(specialists.explanationHtml(missing),/Missing data/);
});

test('runtime wiring loads the explanation engine before the existing contiguous Agent stack',async()=>{
  const [index,pkg,modes,diagnostic]=await Promise.all([
    readFile(new URL('../index.html',import.meta.url),'utf8'),
    readFile(new URL('../package.json',import.meta.url),'utf8'),
    readFile(new URL('../keywordos-agent-modes.js',import.meta.url),'utf8'),
    readFile(new URL('../keywordos-agent-diagnostics.js',import.meta.url),'utf8')
  ]);
  const explanationIndex=index.indexOf('keywordos-agent-explanations.js'),agentIndex=index.indexOf('keywordos-agent.js'),diagnosticIndex=index.indexOf('keywordos-agent-diagnostics.js'),modesIndex=index.indexOf('keywordos-agent-modes.js');
  assert.ok(explanationIndex>=0&&explanationIndex<agentIndex&&agentIndex<diagnosticIndex&&diagnosticIndex<modesIndex);
  assert.match(pkg,/node --check keywordos-agent-explanations\.js && node --check keywordos-agent\.js && node --check keywordos-agent-diagnostics\.js && node --check keywordos-agent-modes\.js/);
  assert.match(pkg,/market-intelligence\.js keywordos-agent-explanations\.js keywordos-agent\.js keywordos-agent-diagnostics\.js keywordos-agent-modes\.js/);
  assert.match(modes,/KeywordOSAgentExplanationsTest/);
  assert.match(diagnostic,/prioriti\[sz\]ed/);
});
