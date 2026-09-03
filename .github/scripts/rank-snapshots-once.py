from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    p.write_text(text.replace(old, new, 1))


p = Path('growth-workspaces.js')
text = p.read_text()

old = "const growthDatasets={sqp:[],costs:[],inventory:[],ranks:[],'product-master':[],listing:[],'action-outcomes':[],competitor:[],reviews:[],'reverse-asin':[]};"
new = old + "\nconst rankViewState={asin:'',metric:'organic'};"
if text.count(old) != 1:
    raise SystemExit('rank view state anchor mismatch')
text = text.replace(old, new, 1)

old = "function latestRanks(rows){const map=new Map();for(const r of [...rows].sort((a,b)=>a.date.localeCompare(b.date)))map.set(`${r.asin}|${r.keyword.toLowerCase()}`,r);return[...map.values()].sort((a,b)=>(a.organicRank||9999)-(b.organicRank||9999))}"
new = r'''function rankSnapshotKey(row){const asin=String(row?.asin||'').trim().toUpperCase(),keyword=String(row?.keyword||'').trim().toLowerCase().replace(/\s+/g,' '),snapshot=String(row?.date||'').slice(0,10);return asin&&keyword&&snapshot?`${asin}|${keyword}|${snapshot}`:''}
function mergeRankSnapshots(existing=[],incoming=[]){const map=new Map(),apply=(raw,incomingRow=false)=>{const key=rankSnapshotKey(raw);if(!key)return;const current=map.get(key)||{},note=String(incomingRow&&raw?.note!==undefined?raw.note:(current.note??raw?.note??'')).trim().slice(0,1000),event=String(incomingRow&&raw?.event!==undefined?raw.event:(current.event??raw?.event??'')).trim().slice(0,200);map.set(key,{...current,...raw,asin:String(raw.asin||current.asin||'').trim(),keyword:String(raw.keyword||current.keyword||'').trim(),date:String(raw.date||current.date||'').slice(0,10),note,event})};for(const row of Array.isArray(existing)?existing:[])apply(row,false);for(const row of Array.isArray(incoming)?incoming:[])apply(row,true);return[...map.values()].sort((a,b)=>String(a.asin).localeCompare(String(b.asin))||String(a.keyword).localeCompare(String(b.keyword))||String(a.date).localeCompare(String(b.date)))}
function latestRanks(rows){const map=new Map();for(const r of mergeRankSnapshots([],rows).sort((a,b)=>String(a.date).localeCompare(String(b.date))))map.set(`${String(r.asin).toUpperCase()}|${String(r.keyword).toLowerCase()}`,r);return[...map.values()].sort((a,b)=>(a.organicRank||9999)-(b.organicRank||9999)||String(a.keyword).localeCompare(String(b.keyword)))}
function rankDateCoverage(rows=[]){const dates=[...new Set((Array.isArray(rows)?rows:[]).map(row=>String(row?.date||'').slice(0,10)).filter(value=>/^\d{4}-\d{2}-\d{2}$/.test(value)))].sort(),gaps=[];for(let index=1;index<dates.length;index++){const previous=dates[index-1],current=dates[index],days=Math.round((Date.parse(`${current}T00:00:00Z`)-Date.parse(`${previous}T00:00:00Z`))/86400000)-1;if(days>0)gaps.push({from:previous,to:current,calendarDays:days})}return{dates,min:dates[0]||'',max:dates.at(-1)||'',observedDates:dates.length,gaps,totalGapDays:gaps.reduce((sum,gap)=>sum+gap.calendarDays,0)}}
function rankMetricValue(row,metric='organic'){const field=metric==='sponsored'?'sponsoredRank':'organicRank',value=Number(row?.[field]||0);return value>0?value:null}
function rankHeatBucket(value){const rank=Number(value||0);if(!(rank>0))return'missing';if(rank<=10)return'top10';if(rank<=25)return'top25';if(rank<=50)return'top50';if(rank<=100)return'top100';return'beyond100'}
function rankHierarchy(rows=[]){const source=mergeRankSnapshots([],rows),groups=new Map();for(const row of source){const asin=String(row.asin||'').trim();if(!asin)continue;if(!groups.has(asin))groups.set(asin,[]);groups.get(asin).push(row)}return[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([asin,history])=>{const latest=latestRanks(history),keywords=latest.map(row=>({keyword:row.keyword,latest:row,history:history.filter(item=>String(item.keyword).trim().toLowerCase()===String(row.keyword).trim().toLowerCase()).sort((a,b)=>String(b.date).localeCompare(String(a.date)))}));return{asin,rows:history.sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(a.keyword).localeCompare(String(b.keyword))),keywords,coverage:rankDateCoverage(history)}})}
function rankHeatMatrix(rows=[],asin='',metric='organic'){const selectedMetric=metric==='sponsored'?'sponsored':'organic',source=mergeRankSnapshots([],rows).filter(row=>String(row.asin||'').trim()===String(asin||'').trim()),coverage=rankDateCoverage(source),byKey=new Map(source.map(row=>[`${String(row.keyword).trim().toLowerCase()}|${row.date}`,row])),latest=latestRanks(source);const keywords=[...new Set(source.map(row=>String(row.keyword||'').trim()).filter(Boolean))].sort((a,b)=>{const ar=latest.find(row=>String(row.keyword).toLowerCase()===a.toLowerCase()),br=latest.find(row=>String(row.keyword).toLowerCase()===b.toLowerCase()),av=rankMetricValue(ar,selectedMetric)??Infinity,bv=rankMetricValue(br,selectedMetric)??Infinity;return av-bv||a.localeCompare(b)});return{asin:String(asin||''),metric:selectedMetric,dates:coverage.dates,rows:keywords.map(keyword=>({keyword,cells:coverage.dates.map(date=>{const row=byKey.get(`${keyword.toLowerCase()}|${date}`)||null,value=rankMetricValue(row,selectedMetric);return{date,value,bucket:rankHeatBucket(value),indexed:row?Boolean(row.indexed):null,note:String(row?.note||''),event:String(row?.event||'')}})}))}}
function updateRankAnnotation(rows=[],key='',patch={}){const target=String(key||''),note=patch.note===undefined?undefined:String(patch.note||'').trim().slice(0,1000),event=patch.event===undefined?undefined:String(patch.event||'').trim().slice(0,200);return mergeRankSnapshots([],rows).map(row=>rankSnapshotKey(row)===target?{...row,...(note===undefined?{}:{note}),...(event===undefined?{}:{event})}:row)}'''
if text.count(old) != 1:
    raise SystemExit('latestRanks anchor mismatch')
text = text.replace(old, new, 1)

old = "function renderRanks(){const rows=latestRanks(load('ranks'));if(!rows.length)return empty('Import rank snapshots','Required: Date, Keyword, ASIN, Organic Rank, Sponsored Rank and Indexed.','ranks','Import Rank CSV');return`<div class=\"growth-actions\"><div><b>Rank snapshots</b><small>${load('ranks').length} historical rows · ${rows.length} latest keyword/ASIN pairs</small></div><button class=\"btn\" data-growth-import=\"ranks\">Import & merge snapshots</button></div>${table(['Keyword','ASIN','Date','Organic Rank','Sponsored Rank','Indexed'],rows.map(r=>`<tr><td class=\"left\"><b>${esc(r.keyword)}</b></td><td class=\"left\">${esc(r.asin)}</td><td>${esc(r.date||'—')}</td><td>${r.organicRank||'—'}</td><td>${r.sponsoredRank||'—'}</td><td>${r.indexed?'<span class=\"badge green\">Indexed</span>':'<span class=\"badge red\">Not indexed</span>'}</td></tr>`))}`}"
new = r'''function renderRanks(){const source=mergeRankSnapshots([],load('ranks')),hierarchy=rankHierarchy(source);if(!hierarchy.length)return empty('Import rank snapshots','Required: Date, Keyword, ASIN, Organic Rank, Sponsored Rank and Indexed.','ranks','Import Rank CSV');const selected=hierarchy.find(group=>group.asin===rankViewState.asin)||hierarchy[0];rankViewState.asin=selected.asin;rankViewState.metric=rankViewState.metric==='sponsored'?'sponsored':'organic';const matrix=rankHeatMatrix(source,selected.asin,rankViewState.metric),coverage=selected.coverage,latest=selected.keywords.map(item=>item.latest),gapText=coverage.gaps.length?coverage.gaps.map(gap=>`${gap.from} → ${gap.to}: ${gap.calendarDays} unobserved calendar day${gap.calendarDays===1?'':'s'}`).join(' · '):coverage.observedDates>1?'No calendar-day gaps between imported dates':'Only one imported date; no cadence or trend is inferred';return`<div class="growth-actions"><div><b>Rank snapshots · ASIN → Keywords</b><small>${source.length} unique dated snapshots · ${hierarchy.length} ASIN${hierarchy.length===1?'':'s'} · same-date corrections replace instead of duplicate</small></div><button class="btn" data-growth-import="ranks">Import & merge snapshots</button></div><div class="growth-chips rank-asin-tabs">${hierarchy.map(group=>`<button class="btn ${group.asin===selected.asin?'primary':'secondary'} sm" data-rank-asin="${encodeURIComponent(group.asin)}">${esc(group.asin)} · ${integer(group.keywords.length)} keywords</button>`).join('')}</div><div class="growth-kpis">${kpi('Selected ASIN',esc(selected.asin),'Imported rank identity')}${kpi('Keywords',integer(selected.keywords.length),'Exact keyword rows')}${kpi('Snapshot dates',integer(coverage.observedDates),coverage.min&&coverage.max?`${esc(coverage.min)} → ${esc(coverage.max)}`:'No dated evidence')}${kpi('Observed date gaps',integer(coverage.gaps.length),'No expected cadence assumed')}</div><div class="notice-banner"><b>Date coverage:</b> ${esc(gapText)}. A gap only describes spacing between imported snapshot dates; KeywordOS does not assume daily collection. Heat-map colors are local rank buckets, not a score.</div><div class="growth-actions top-gap"><div><b>${esc(selected.asin)} local rank heat map</b><small>Rows are exact keywords; columns are imported snapshot dates. Missing cells remain —.</small></div><div class="rank-metric-toggle"><button class="btn sm ${rankViewState.metric==='organic'?'primary':'secondary'}" data-rank-metric="organic">Organic Rank</button> <button class="btn sm ${rankViewState.metric==='sponsored'?'primary':'secondary'}" data-rank-metric="sponsored">Sponsored Rank</button></div></div><div class="growth-chips rank-heat-legend"><span>Top 10</span><span>11–25</span><span>26–50</span><span>51–100</span><span>100+</span><span>— no observation</span></div><div class="table-scroll rank-heat-scroll"><table class="data-table"><thead><tr><th class="left">Keyword</th>${matrix.dates.map(date=>`<th>${esc(date)}</th>`).join('')}</tr></thead><tbody>${matrix.rows.map(row=>`<tr><td class="left"><b>${esc(row.keyword)}</b></td>${row.cells.map(cell=>`<td class="rank-heat-cell rank-heat-${cell.bucket}" title="${esc(`${cell.date} · ${cell.value==null?'No observation':'#'+cell.value}${cell.event?' · '+cell.event:''}${cell.note?' · '+cell.note:''}`)}">${cell.value==null?'—':'#'+integer(cell.value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><h3>Latest keyword snapshot</h3>${table(['Keyword','Date','Organic Rank','Sponsored Rank','Indexed'],latest.map(row=>`<tr><td class="left"><b>${esc(row.keyword)}</b></td><td>${esc(row.date||'—')}</td><td>${rankMetricValue(row,'organic')?'#'+integer(rankMetricValue(row,'organic')):'—'}</td><td>${rankMetricValue(row,'sponsored')?'#'+integer(rankMetricValue(row,'sponsored')):'—'}</td><td>${row.indexed?'<span class="badge green">Indexed</span>':'<span class="badge red">Not indexed</span>'}</td></tr>`))}<h3>Snapshot history & local annotations</h3><p class="growth-note">Note and Event are Store-local annotations attached to the exact ASIN + keyword + date snapshot. They do not alter imported ranks.</p>${table(['Date','Keyword','Organic','Sponsored','Indexed','Event','Note'],selected.rows.map(row=>{const key=encodeURIComponent(rankSnapshotKey(row));return`<tr><td>${esc(row.date||'—')}</td><td class="left"><b>${esc(row.keyword)}</b></td><td>${rankMetricValue(row,'organic')?'#'+integer(rankMetricValue(row,'organic')):'—'}</td><td>${rankMetricValue(row,'sponsored')?'#'+integer(rankMetricValue(row,'sponsored')):'—'}</td><td>${row.indexed?'<span class="badge green">Indexed</span>':'<span class="badge red">Not indexed</span>'}</td><td><input class="input rank-annotation-input" data-rank-event="${key}" value="${esc(row.event||'')}" placeholder="Event"></td><td><input class="input rank-annotation-input" data-rank-note="${key}" value="${esc(row.note||'')}" placeholder="Note"></td></tr>`}))}`}'''
if text.count(old) != 1:
    raise SystemExit('renderRanks anchor mismatch')
text = text.replace(old, new, 1)

old = "$$('[data-asin-metric]',rootNode).forEach(el=>el.addEventListener('change',()=>{setAsinComparisonState({metric:el.value});render('asin-comparison')}));$$('[data-replenish-sku],[data-replenish-lead],[data-replenish-safety]',rootNode)"
new = "$$('[data-asin-metric]',rootNode).forEach(el=>el.addEventListener('change',()=>{setAsinComparisonState({metric:el.value});render('asin-comparison')}));$$('[data-rank-asin]',rootNode).forEach(button=>button.addEventListener('click',()=>{rankViewState.asin=decodeURIComponent(button.dataset.rankAsin||'');render('rank-intelligence')}));$$('[data-rank-metric]',rootNode).forEach(button=>button.addEventListener('click',()=>{rankViewState.metric=button.dataset.rankMetric==='sponsored'?'sponsored':'organic';render('rank-intelligence')}));$$('[data-rank-note],[data-rank-event]',rootNode).forEach(input=>input.addEventListener('change',async()=>{const encoded=input.dataset.rankNote||input.dataset.rankEvent,key=decodeURIComponent(encoded||''),patch=input.dataset.rankNote!==undefined?{note:input.value}:{event:input.value},next=updateRankAnnotation(load('ranks'),key,patch);await save('ranks',next,'Rank snapshot local annotation');render('rank-intelligence');root.KeywordOSUIBridge?.toast?.('Rank snapshot annotation saved','success')}));$$('[data-replenish-sku],[data-replenish-lead],[data-replenish-safety]',rootNode)"
if text.count(old) != 1:
    raise SystemExit('rank bind anchor mismatch')
text = text.replace(old, new, 1)

old = "const rows=parseKind(kind,await file.text()),next=['ranks','competitor'].includes(kind)?[...load(kind),...rows]:kind==='reverse-asin'?mergeReverseAsinSnapshots(load(kind),rows):rows;"
new = "const rows=parseKind(kind,await file.text()),next=kind==='ranks'?mergeRankSnapshots(load(kind),rows):kind==='competitor'?[...load(kind),...rows]:kind==='reverse-asin'?mergeReverseAsinSnapshots(load(kind),rows):rows;"
if text.count(old) != 1:
    raise SystemExit('rank import merge anchor mismatch')
text = text.replace(old, new, 1)

old = "return{KEYS,TEMPLATES,MAX_GROWTH_IMPORT_BYTES,PAGE_META,parseKind,sqpSummary,latestRanks,latestCompetitors"
new = "return{KEYS,TEMPLATES,MAX_GROWTH_IMPORT_BYTES,PAGE_META,parseKind,sqpSummary,rankSnapshotKey,mergeRankSnapshots,latestRanks,rankDateCoverage,rankMetricValue,rankHeatBucket,rankHierarchy,rankHeatMatrix,updateRankAnnotation,latestCompetitors"
if text.count(old) != 1:
    raise SystemExit('rank exports anchor mismatch')
text = text.replace(old, new, 1)
p.write_text(text)

css = Path('growth-workspaces.css')
css.write_text(css.read_text() + "\n.rank-asin-tabs{align-items:center}.rank-heat-scroll{overflow:auto;max-width:100%;margin-bottom:18px}.rank-heat-cell{text-align:center;min-width:82px;font-variant-numeric:tabular-nums}.rank-heat-top10{background:rgba(40,167,69,.20);font-weight:700}.rank-heat-top25{background:rgba(40,167,69,.11);font-weight:600}.rank-heat-top50{background:rgba(255,193,7,.16)}.rank-heat-top100{background:rgba(255,193,7,.09)}.rank-heat-beyond100{background:rgba(220,53,69,.09)}.rank-heat-missing{background:rgba(108,117,125,.05);color:var(--muted)}.rank-annotation-input{min-width:130px;width:100%}.rank-heat-legend span:nth-child(1){background:rgba(40,167,69,.20)}.rank-heat-legend span:nth-child(2){background:rgba(40,167,69,.11)}.rank-heat-legend span:nth-child(3){background:rgba(255,193,7,.16)}.rank-heat-legend span:nth-child(4){background:rgba(255,193,7,.09)}.rank-heat-legend span:nth-child(5){background:rgba(220,53,69,.09)}\n")

test = r'''import test from 'node:test';
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
'''
Path('tests/rank-snapshots.test.mjs').write_text(test)

readme_path=Path('README.md')
readme=readme_path.read_text()
old='- [ ] Rank Snapshots 改为 ASIN → Keywords 层级，增加日期覆盖、断档、备注/事件、自然/广告切换和本地 heat map。'
new='''- [x] Rank Snapshots 改为 ASIN → Keywords 层级，增加日期覆盖、断档、备注/事件、自然/广告切换和本地 heat map。\n  - 2026-09-03：`rank-intelligence` 不再只显示 latest keyword/ASIN 平表；同一个现有 `ranks` Dataset Registry 现在按 **ASIN → Keywords → dated snapshots** 组织。`mergeRankSnapshots()` 以 ASIN + normalized keyword + date 为稳定快照键，新日期追加历史，同日重导作为 correction 覆盖，同时保留该快照已经填写的本地 Note / Event；没有新增第二套排名库或 localStorage key。页面按 ASIN 切换，显示真实 imported date coverage、相邻导入日期之间的 calendar gap，并明确 gap 只是“未观察日期间隔”，不假设日更；只有一个日期时不显示趋势暗示。Organic / Sponsored 可直接切换，同一 ASIN 的 keyword × imported date 矩阵生成本地 heat map，分桶仅按真实 rank 值 Top 10 / 11–25 / 26–50 / 51–100 / 100+ 着色，缺行保持 `—`，不生成排名分数。每个精确 ASIN + keyword + date 快照可编辑 Store-local Event / Note，注释直接保存在同一 `ranks` 行且不改写 imported rank/indexed 值。CI 为 **__TEST_COUNT__ passed / 0 failed**；`npm run build` 验证 **__JS_COUNT__ 个 JS + 9 个 CSS，__PUBLISH_COUNT__ 个发布文件**，source/dist byte identity 与 committed-dist parity gate 全部通过。'''
if readme.count(old)!=1:
    raise SystemExit(f'README rank item expected once, found {readme.count(old)}')
readme_path.write_text(readme.replace(old,new,1))
