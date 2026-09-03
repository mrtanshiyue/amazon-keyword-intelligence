import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../growth-workspaces.js');
const growth=globalThis.KeywordOSGrowthTest;

test('rank hierarchy is ASIN first and keeps keywords and dated history separate',()=>{
  const hierarchy=growth.rankHierarchy([
    {asin:'B000000002',keyword:'Readers',date:'2026-09-01',organicRank:20},
    {asin:'B000000001',keyword:'Reading Glasses',date:'2026-09-01',organicRank:12},
    {asin:'B000000001',keyword:'Reading Glasses',date:'2026-09-03',organicRank:8},
    {asin:'B000000001',keyword:'Blue Light Readers',date:'2026-09-03',organicRank:18}
  ]);
  assert.deepEqual(hierarchy.map(group=>group.asin),['B000000001','B000000002']);
  assert.equal(hierarchy[0].keywords.length,2);
  assert.equal(hierarchy[0].keywords.find(item=>item.keyword==='Reading Glasses').history.length,2);
  assert.equal(hierarchy[0].keywords.find(item=>item.keyword==='Reading Glasses').latest.organicRank,8);
});

test('same ASIN keyword date is a correction while a new date appends and keeps local annotations',()=>{
  const existing=[{asin:'B000000001',keyword:'Reading Glasses',date:'2026-09-01',organicRank:18,note:'launch',event:'Coupon'}];
  const merged=growth.mergeRankSnapshots(existing,[
    {asin:'B000000001',keyword:'reading glasses',date:'2026-09-01',organicRank:15,sponsoredRank:4,indexed:true},
    {asin:'B000000001',keyword:'reading glasses',date:'2026-09-03',organicRank:11,sponsoredRank:3,indexed:true}
  ]);
  assert.equal(merged.length,2);
  assert.equal(merged[0].organicRank,15);
  assert.equal(merged[0].note,'launch');
  assert.equal(merged[0].event,'Coupon');
});

test('date coverage reports only observed imported dates and calendar spacing without assuming cadence',()=>{
  const one=growth.rankDateCoverage([{date:'2026-09-01'}]);
  assert.equal(one.observedDates,1);
  assert.deepEqual(one.gaps,[]);
  const coverage=growth.rankDateCoverage([{date:'2026-09-01'},{date:'2026-09-03'},{date:'2026-09-03'},{date:'2026-09-06'}]);
  assert.equal(coverage.observedDates,3);
  assert.deepEqual(coverage.gaps,[
    {from:'2026-09-01',to:'2026-09-03',calendarDays:1},
    {from:'2026-09-03',to:'2026-09-06',calendarDays:2}
  ]);
});

test('local heat map switches organic and sponsored metrics and leaves missing dates empty',()=>{
  const rows=[
    {asin:'B000000001',keyword:'Reading Glasses',date:'2026-09-01',organicRank:9,sponsoredRank:30,indexed:true},
    {asin:'B000000001',keyword:'Reading Glasses',date:'2026-09-03',organicRank:7,sponsoredRank:20,indexed:true},
    {asin:'B000000001',keyword:'Blue Readers',date:'2026-09-03',organicRank:40,sponsoredRank:0,indexed:false}
  ];
  const organic=growth.rankHeatMatrix(rows,'B000000001','organic');
  const reading=organic.rows.find(row=>row.keyword==='Reading Glasses');
  const blue=organic.rows.find(row=>row.keyword==='Blue Readers');
  assert.deepEqual(organic.dates,['2026-09-01','2026-09-03']);
  assert.deepEqual(reading.cells.map(cell=>cell.bucket),['top10','top10']);
  assert.equal(blue.cells[0].value,null);
  assert.equal(blue.cells[1].bucket,'top50');
  const sponsored=growth.rankHeatMatrix(rows,'B000000001','sponsored');
  assert.equal(sponsored.rows.find(row=>row.keyword==='Reading Glasses').cells[1].value,20);
});

test('rank annotations update only the exact ASIN keyword date snapshot key',()=>{
  const rows=[
    {asin:'B000000001',keyword:'Reading Glasses',date:'2026-09-01',organicRank:10},
    {asin:'B000000001',keyword:'Reading Glasses',date:'2026-09-02',organicRank:9}
  ];
  const key=growth.rankSnapshotKey(rows[0]),updated=growth.updateRankAnnotation(rows,key,{note:'listing update',event:'A+ refresh'});
  assert.equal(updated[0].note,'listing update');
  assert.equal(updated[0].event,'A+ refresh');
  assert.equal(updated[1].note,'');
});

test('Rank & Index runtime exposes ASIN hierarchy metric toggle heat map and exact-snapshot annotations',async()=>{
  const [source,css,readme]=await Promise.all([
    readFile(new URL('../growth-workspaces.js',import.meta.url),'utf8'),
    readFile(new URL('../growth-workspaces.css',import.meta.url),'utf8'),
    readFile(new URL('../README.md',import.meta.url),'utf8')
  ]);
  assert.match(source,/data-rank-asin/);
  assert.match(source,/data-rank-metric/);
  assert.match(source,/data-rank-note/);
  assert.match(source,/mergeRankSnapshots\(load\(kind\),rows\)/);
  assert.match(css,/rank-heat-top10/);
  assert.match(readme,/Rank Snapshots 改为 ASIN → Keywords 层级/);
});
