import test from 'node:test';
import assert from 'node:assert/strict';

await import('../keywordos-agent.js');
await import('../keywordos-agent-diagnostics.js');
const diagnostics=globalThis.KeywordOSAgentDiagnosticsTest;
const validated=(kind,rows)=>({kind,storeId:'store-a',source:`${kind}.csv`,importedAt:'2026-09-02T00:00:00Z',validation:{status:'validated'},rows});

test('recognizes why-change questions and supported metrics deterministically',()=>{
  assert.equal(diagnostics.isDiagnosticQuery('Why did ACoS change?'),true);
  assert.equal(diagnostics.isDiagnosticQuery('Show ACoS'),false);
  assert.deepEqual(diagnostics.metricFromQuery('为什么广告花费下降？'),{domain:'ads',metric:'spend'});
  assert.deepEqual(diagnostics.metricFromQuery('Why did rank change?'),{domain:'ranks',metric:'organicRank'});
});

test('builds equal observed-date windows and shrinks safely when history is shorter than requested',()=>{
  const rows=['2026-08-01','2026-08-02','2026-08-03','2026-08-04','2026-08-05','2026-08-06'].map(date=>({date}));
  const window=diagnostics.observedWindows(rows,7);
  assert.equal(window.available,true);
  assert.equal(window.used,3);
  assert.deepEqual(window.priorDates,['2026-08-01','2026-08-02','2026-08-03']);
  assert.deepEqual(window.recentDates,['2026-08-04','2026-08-05','2026-08-06']);
});

test('ACoS diagnosis shows deterministic ratio inputs and links grouped movement to raw rows',()=>{
  const rows=[];
  for(let day=1;day<=14;day++)rows.push({date:`2026-08-${String(day).padStart(2,'0')}`,searchTerm:day<=7?'stable term':'waste term',campaignName:'C1',clicks:10,orders:day<=7?2:1,cost:day<=7?10:20,sales:day<=7?50:40});
  const answer=diagnostics.diagnose('Why did ACoS change in 7 days?',[validated('ads',rows)],'advertising');
  assert.equal(answer.available,true);
  assert.equal(answer.metric,'acos');
  assert.match(answer.summary,/ACoS = spend ÷ sales/);
  assert.match(answer.summary,/20\.0%/);
  assert.match(answer.summary,/50\.0%/);
  assert.ok(answer.driverRows.some(row=>row.entity==='waste term'));
  assert.ok(answer.evidenceRows.length>0);
  assert.ok(answer.evidenceRows.every(row=>Number.isInteger(row.sourceRow)));
  assert.match(answer.note,/No auction, customer, Amazon algorithm or action cause is inferred/);
});

test('inventory diagnosis compares only the two latest dated snapshots',()=>{
  const record=validated('inventory',[
    {date:'2026-08-01',sku:'A',available:20},{date:'2026-08-15',sku:'A',available:15},{date:'2026-08-15',sku:'B',available:5},{date:'2026-08-31',sku:'A',available:7},{date:'2026-08-31',sku:'B',available:3}
  ]);
  const answer=diagnostics.diagnose('为什么库存下降？',[record],'inventory');
  assert.equal(answer.available,true);
  assert.match(answer.summary,/20 → 10/);
  assert.equal(answer.driverRows[0].sku,'A');
  assert.equal(answer.driverRows[0].delta,-8);
});

test('rank diagnosis uses positive medians and refuses to invent a cause',()=>{
  const record=validated('ranks',[
    {date:'2026-08-01',keyword:'reader',asin:'B000000001',organicRank:10},{date:'2026-08-01',keyword:'glasses',asin:'B000000001',organicRank:20},
    {date:'2026-08-31',keyword:'reader',asin:'B000000001',organicRank:15},{date:'2026-08-31',keyword:'glasses',asin:'B000000001',organicRank:25}
  ]);
  const answer=diagnostics.diagnose('Why did rank change?',[record],'keyword');
  assert.equal(answer.available,true);
  assert.match(answer.summary,/15\.0 → 20\.0/);
  assert.match(answer.note,/No algorithm change/);
});

test('diagnosis fails closed without enough dated evidence',()=>{
  const answer=diagnostics.diagnose('Why did ACoS change?',[validated('ads',[{date:'2026-08-01',cost:10,sales:20}])],'advertising');
  assert.equal(answer.available,false);
  assert.match(answer.summary,/At least two dated observations/);
});