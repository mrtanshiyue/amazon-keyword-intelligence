import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../review-voc.js',import.meta.url),'utf8');
const context={console};context.globalThis=context;vm.createContext(context);vm.runInContext(source,context);
const voc=context.KeywordOSReviewVoCTest;

test('pipe-delimited labels are explicit and blank-safe',()=>{
  assert.deepEqual(Array.from(voc.splitExplicitLabels(' Fit | Lightweight || ')),['Fit','Lightweight']);
  assert.deepEqual(Array.from(voc.splitExplicitLabels('')),[]);
});

test('summary counts explicit labels without inferring from stars or text',()=>{
  const summary=voc.summarizeVoc([
    {date:'2026-09-01',asin:'A1',rating:1,title:'Too small',body:'bad fit',negativeTheme:'Fit',complaint:'Too small'},
    {date:'2026-09-02',asin:'A2',rating:5,title:'Great',body:'love it',positiveTheme:'Lightweight|Comfort',purchaseMotivation:'Reading'}
  ]);
  assert.equal(summary.rows,2);
  assert.equal(summary.labelledRows,2);
  assert.equal(summary.totalLabels,5);
  assert.equal(summary.items.find(item=>item.label==='Fit').count,1);
  assert.equal(summary.items.some(item=>item.label==='bad fit'),false);
});

test('same label is counted once per row and type',()=>{
  const summary=voc.summarizeVoc([{asin:'A1',positiveTheme:'Comfort|comfort| Comfort '}]);
  assert.equal(summary.totalLabels,1);
  assert.equal(summary.items[0].count,1);
});

test('same words in positive and negative theme remain separate evidence types',()=>{
  const summary=voc.summarizeVoc([{asin:'A1',positiveTheme:'Fit',negativeTheme:'Fit'}]);
  assert.equal(summary.items.length,2);
  assert.deepEqual(Array.from(summary.items.map(item=>item.type).sort()),['Negative theme','Positive theme']);
});

test('summary retains sample references and imported marketplace/language labels',()=>{
  const summary=voc.summarizeVoc([{date:'2026-09-01',asin:'a1',rating:4,title:'Good',marketplace:'USA',language:'English',useCase:'Computer work'}]);
  const item=summary.items[0];
  assert.deepEqual(Array.from(item.asins),['A1']);
  assert.deepEqual(Array.from(item.marketplaces),['USA']);
  assert.deepEqual(Array.from(item.languages),['English']);
  assert.equal(item.samples[0].title,'Good');
});

test('panel discloses evidence boundary and all six explicit VOC types',()=>{
  const html=voc.panelHtml([]);
  for(const label of ['Positive theme','Negative theme','Complaint','Purchase motivation','Use case','Requested feature'])assert.match(html,new RegExp(label));
  assert.match(html,/does not derive them from star rating, title, body, marketplace or language/);
});

test('growth review parser preserves all explicit VOC fields verbatim',()=>{
  const growthSource=fs.readFileSync(new URL('../growth-workspaces.js',import.meta.url),'utf8');
  const ctx={console};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(growthSource,ctx);
  const growth=ctx.KeywordOSGrowthTest;
  const csv='Date,ASIN,Rating,Title,Body,Variant,Marketplace,Language,Positive Theme,Negative Theme,Complaint,Purchase Motivation,Use Case,Requested Feature\n2026-09-01,B000000001,5,Great,Original body,Blue,USA,English,Comfort|Lightweight,,None,Reading,Computer work,Hard case';
  const rows=growth.parseKind('reviews',csv);
  assert.equal(rows.length,1);
  assert.equal(rows[0].positiveTheme,'Comfort|Lightweight');
  assert.equal(rows[0].negativeTheme,'');
  assert.equal(rows[0].complaint,'None');
  assert.equal(rows[0].purchaseMotivation,'Reading');
  assert.equal(rows[0].useCase,'Computer work');
  assert.equal(rows[0].requestedFeature,'Hard case');
  assert.equal(rows[0].body,'Original body');
});
