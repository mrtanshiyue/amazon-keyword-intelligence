from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    p.write_text(text.replace(old, new, 1))


# Encourage dated native reverse-ASIN snapshots without making dates mandatory for legacy CSV.
replace_once(
    'growth-workspaces.js',
    "  'reverse-asin':'ASIN,Keyword,Search Volume,Organic Rank,Sponsored Rank,Traffic Share,Conversion Rate\\nB000000000,example keyword,1000,12,4,0.08,0.12'",
    "  'reverse-asin':'Snapshot Date,ASIN,Keyword,Search Volume,Organic Rank,Sponsored Rank,Traffic Share,Conversion Rate\\n2026-09-03,B000000000,example keyword,1000,12,4,0.08,0.12'",
    'dated reverse-ASIN template'
)

# Add conservative snapshot merge helpers. Dated imports append/correct; any undated incoming import keeps legacy replace behavior.
old = "function asinValue(value){return String(value||'').trim().toUpperCase()}\nfunction uniqueAsins(values=[]){return[...new Set((Array.isArray(values)?values:[]).map(asinValue).filter(Boolean))]}"
new = """function asinValue(value){return String(value||'').trim().toUpperCase()}
function reverseAsinSnapshotDate(row){const value=String(row?.snapshotDate||'').trim();return/^\\d{4}-\\d{2}-\\d{2}$/.test(value)?value:''}
function reverseAsinSeriesIdentity(row){const provider=String(row?.provider||'').trim()||'native',reportType=String(row?.reportType||'').trim(),marketplace=String(row?.marketplace||'').trim();return`${provider}\\u001f${reportType}\\u001f${marketplace}`}
function reverseAsinSnapshotKey(row){const asin=asinValue(row?.asin),keyword=normalizedTokens(row?.keyword).join(' '),snapshotDate=reverseAsinSnapshotDate(row);return asin&&keyword&&snapshotDate?`${asin}\\u001f${keyword}\\u001f${snapshotDate}\\u001f${reverseAsinSeriesIdentity(row)}`:''}
function mergeReverseAsinSnapshots(existing=[],incoming=[]){const next=Array.isArray(incoming)?incoming:[];if(!next.length)return[];if(!next.every(row=>reverseAsinSnapshotKey(row)))return next;const merged=new Map();for(const row of Array.isArray(existing)?existing:[]){const key=reverseAsinSnapshotKey(row);if(key)merged.set(key,row)}for(const row of next)merged.set(reverseAsinSnapshotKey(row),row);return[...merged.values()].sort((a,b)=>reverseAsinSnapshotDate(a).localeCompare(reverseAsinSnapshotDate(b))||asinValue(a?.asin).localeCompare(asinValue(b?.asin))||normalizedTokens(a?.keyword).join(' ').localeCompare(normalizedTokens(b?.keyword).join(' '))||reverseAsinSeriesIdentity(a).localeCompare(reverseAsinSeriesIdentity(b)))}
function uniqueAsins(values=[]){return[...new Set((Array.isArray(values)?values:[]).map(asinValue).filter(Boolean))]}"""
replace_once('growth-workspaces.js', old, new, 'reverse-ASIN snapshot merge helpers')

# Trend helpers are exact-ASIN, exact-keyword, metric-specific and source-series-specific.
old = "function asinMetricObservations(rows=[],asin,keyword,metric){const targetAsin=asinValue(asin),targetKeyword=normalizedTokens(keyword).join(' '),matches=(Array.isArray(rows)?rows:[]).filter(row=>asinValue(row?.asin)===targetAsin&&normalizedTokens(row?.keyword).join(' ')===targetKeyword);if(metric?.kind==='coverage')return matches.length?[true]:[];const values=[];for(const row of matches){let value=null;if(metric?.kind==='field'){if(Number(row?.[metric.field])>0)value=row[metric.field]}else if(metric?.kind==='source-column'&&String(row?.provider||'').trim()===metric.provider){const raw=row?.sourceColumns?.[metric.originalName];if(raw!=null&&String(raw).trim()!=='')value=raw}if(value!=null&&!values.some(item=>Object.is(item,value)))values.push(value)}return values}\n"
new = old + """const ASIN_TREND_FIELDS=new Set(['organicRank','sponsoredRank','trafficShare','conversionRate']);
function asinMetricTrend(rows=[],asin,keyword,field){if(!ASIN_TREND_FIELDS.has(field))return{available:false,reason:'This metric is not trend-enabled.'};const targetAsin=asinValue(asin),targetKeyword=normalizedTokens(keyword).join(' '),series=new Map();for(const row of Array.isArray(rows)?rows:[]){if(asinValue(row?.asin)!==targetAsin||normalizedTokens(row?.keyword).join(' ')!==targetKeyword)continue;const snapshotDate=reverseAsinSnapshotDate(row),value=Number(row?.[field]);if(!snapshotDate||!(value>0))continue;const seriesId=reverseAsinSeriesIdentity(row),byDate=series.get(seriesId)||new Map();byDate.set(snapshotDate,{date:snapshotDate,value,provider:String(row?.provider||'').trim(),reportType:String(row?.reportType||'').trim(),marketplace:String(row?.marketplace||'').trim()});series.set(seriesId,byDate)}const candidates=[...series.entries()].map(([seriesId,byDate])=>({seriesId,points:[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date))})).filter(item=>item.points.length>=2);if(!candidates.length)return{available:false,reason:'At least two dated snapshots from the same source series are required.'};if(candidates.length>1)return{available:false,reason:'Multiple comparable source series exist; cross-source trend is not inferred.'};const selected=candidates[0],previous=selected.points.at(-2),latest=selected.points.at(-1);return{available:true,reason:'',field,seriesId:selected.seriesId,points:selected.points,previous,latest,delta:latest.value-previous.value,source:{provider:latest.provider,reportType:latest.reportType,marketplace:latest.marketplace}}}
function formatAsinTrendDelta(trend){if(!trend?.available)return'';const delta=trend.delta,sign=delta>0?'+':delta<0?'−':'';if(['trafficShare','conversionRate'].includes(trend.field))return`${sign}${Math.abs(delta*100).toFixed(2).replace(/\\.00$/,'')} pp`;return`${sign}${integer(Math.abs(delta))}`}
"""
replace_once('growth-workspaces.js', old, new, 'ASIN metric trend helpers')

old = "function asinComparisonMatrix(rows=[],scope={},metricId='coverage'){if(!scope?.primaryOwnedAsin)return{available:false,reason:'Primary owned ASIN is required.',metric:null,catalog:[],columns:[],rows:[]};const allowed=new Set(scope.scopeAsins||[]),scoped=(Array.isArray(rows)?rows:[]).filter(row=>allowed.has(asinValue(row?.asin))),catalog=asinMatrixMetricCatalog(scoped),metric=catalog.find(item=>item.id===metricId)||catalog[0],comparison=asinScopedComparison(scoped,scope),columns=[scope.primaryOwnedAsin,...(scope.competitorAsins||[])];const matrixRows=comparison.map(item=>({keyword:item.keyword,segment:item.segment,cells:Object.fromEntries(columns.map(asin=>{const observations=asinMetricObservations(scoped,asin,item.keyword,metric);return[asin,{available:observations.length>0,observations,value:observations.length===1?observations[0]:observations}]}))}));return{available:true,reason:'',metric,catalog,columns,rows:matrixRows}}"
new = "function asinComparisonMatrix(rows=[],scope={},metricId='coverage'){if(!scope?.primaryOwnedAsin)return{available:false,reason:'Primary owned ASIN is required.',metric:null,catalog:[],columns:[],rows:[]};const allowed=new Set(scope.scopeAsins||[]),scoped=(Array.isArray(rows)?rows:[]).filter(row=>allowed.has(asinValue(row?.asin))),catalog=asinMatrixMetricCatalog(scoped),metric=catalog.find(item=>item.id===metricId)||catalog[0],comparison=asinScopedComparison(scoped,scope),columns=[scope.primaryOwnedAsin,...(scope.competitorAsins||[])];const matrixRows=comparison.map(item=>({keyword:item.keyword,segment:item.segment,cells:Object.fromEntries(columns.map(asin=>{const observations=asinMetricObservations(scoped,asin,item.keyword,metric),trend=metric?.kind==='field'?asinMetricTrend(scoped,asin,item.keyword,metric.field):{available:false,reason:'This metric is not trend-enabled.'},displayObservations=trend.available?[trend.latest.value]:observations;return[asin,{available:displayObservations.length>0,observations:displayObservations,value:displayObservations.length===1?displayObservations[0]:displayObservations,trend}]}))}));return{available:true,reason:'',metric,catalog,columns,rows:matrixRows}}"
replace_once('growth-workspaces.js', old, new, 'trend-aware ASIN matrix')

# Add a compact source-backed trend line only when the cell has two comparable dated snapshots.
old = "matrixRows=matrix.rows.slice(0,250).map(row=>`<tr><td class=\"left\"><b>${esc(row.keyword)}</b></td><td><span class=\"badge ${row.segment==='Shared'?'green':row.segment==='Own only'?'blue':'amber'}\">${esc(row.segment)}</span></td>${matrix.columns.map(asin=>{const cell=row.cells[asin],value=formatAsinMatrixCell(matrix.metric,cell);return`<td class=\"asin-matrix-cell ${cell.available?'has-evidence':'no-evidence'}\" title=\"${cell.available?'Imported evidence present':'No imported evidence for this ASIN + keyword + metric'}\">${esc(value)}</td>`}).join('')}</tr>`);"
new = "matrixRows=matrix.rows.slice(0,250).map(row=>`<tr><td class=\"left\"><b>${esc(row.keyword)}</b></td><td><span class=\"badge ${row.segment==='Shared'?'green':row.segment==='Own only'?'blue':'amber'}\">${esc(row.segment)}</span></td>${matrix.columns.map(asin=>{const cell=row.cells[asin],value=formatAsinMatrixCell(matrix.metric,cell),trend=cell.trend?.available?`<small class=\"muted\">${esc(cell.trend.previous.date)} ${esc(formatAsinMatrixObservation(matrix.metric,cell.trend.previous.value))} → ${esc(cell.trend.latest.date)} ${esc(formatAsinMatrixObservation(matrix.metric,cell.trend.latest.value))} · Δ ${esc(formatAsinTrendDelta(cell.trend))}</small>`:'';return`<td class=\"asin-matrix-cell ${cell.available?'has-evidence':'no-evidence'}\" title=\"${cell.available?'Imported evidence present':'No imported evidence for this ASIN + keyword + metric'}\">${esc(value)}${trend}</td>`}).join('')}</tr>`);"
replace_once('growth-workspaces.js', old, new, 'trend line matrix rendering')

old = "<small>${esc(matrix.metric.label)} · cells are source-backed only; blank source fields remain —.</small>"
new = "<small>${esc(matrix.metric.label)} · cells are source-backed only; a trend/Δ appears only for the exact ASIN + keyword + metric when at least two dated snapshots exist in one comparable source series.</small>"
replace_once('growth-workspaces.js', old, new, 'ASIN trend disclosure')

# Dated reverse-ASIN imports now retain dated history; undated imports retain prior replace semantics.
old = "const rows=parseKind(kind,await file.text()),next=['ranks','competitor'].includes(kind)?[...load(kind),...rows]:rows;"
new = "const rows=parseKind(kind,await file.text()),next=['ranks','competitor'].includes(kind)?[...load(kind),...rows]:kind==='reverse-asin'?mergeReverseAsinSnapshots(load(kind),rows):rows;"
replace_once('growth-workspaces.js', old, new, 'reverse-ASIN dated import merge')

old = "asinComparisonScope,asinScopedComparison,asinMatrixMetricCatalog,asinMetricObservations,asinComparisonMatrix,formatAsinMatrixCell,utf8Bytes"
new = "asinComparisonScope,asinScopedComparison,asinMatrixMetricCatalog,asinMetricObservations,asinMetricTrend,mergeReverseAsinSnapshots,asinComparisonMatrix,formatAsinMatrixCell,formatAsinTrendDelta,utf8Bytes"
replace_once('growth-workspaces.js', old, new, 'ASIN trend helper exports')

# Focused regression coverage.
tests = Path('tests/asin-comparison-matrix.test.mjs')
text = tests.read_text()
marker = "test('dated reverse-ASIN imports append history and same-date same-source rows act as corrections'"
if marker not in text:
    text += r'''

test('dated reverse-ASIN imports append history and same-date same-source rows act as corrections', () => {
  const existing = [
    { asin:'OWN', keyword:'Reader', snapshotDate:'2026-09-01', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:12 },
    { asin:'OWN', keyword:'Reader', snapshotDate:'', organicRank:99 }
  ];
  const incoming = [
    { asin:'own', keyword:'reader', snapshotDate:'2026-09-02', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:9 },
    { asin:'OWN', keyword:'Reader', snapshotDate:'2026-09-01', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:10 },
    { asin:'OWN', keyword:'Reader', snapshotDate:'2026-09-01', provider:'SellerSprite', reportType:'Reverse ASIN', marketplace:'US', organicRank:7 }
  ];
  const merged = growth.mergeReverseAsinSnapshots(existing, incoming);
  assert.equal(merged.length, 3);
  assert.equal(merged.find(row=>row.provider==='Helium 10'&&row.snapshotDate==='2026-09-01').organicRank, 10);
  assert.equal(merged.some(row=>row.snapshotDate===''), false);
  assert.ok(merged.find(row=>row.provider==='SellerSprite'));
});

test('an undated reverse-ASIN import keeps conservative replace semantics', () => {
  const existing = [{ asin:'OWN', keyword:'reader', snapshotDate:'2026-09-01', organicRank:12 }];
  const incoming = [{ asin:'OWN', keyword:'reader', organicRank:8 }];
  assert.deepEqual(growth.mergeReverseAsinSnapshots(existing, incoming), incoming);
});

test('metric trend requires two distinct dates for the exact ASIN keyword and comparable source series', () => {
  const rows = [
    { asin:'OWN', keyword:'reader', snapshotDate:'2026-09-01', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:12 },
    { asin:'OTHER', keyword:'reader', snapshotDate:'2026-09-02', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:6 },
    { asin:'OWN', keyword:'other', snapshotDate:'2026-09-02', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:5 },
    { asin:'OWN', keyword:'reader', snapshotDate:'2026-09-01', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:11 }
  ];
  const trend = growth.asinMetricTrend(rows, 'OWN', 'reader', 'organicRank');
  assert.equal(trend.available, false);
  assert.match(trend.reason, /two dated snapshots/i);
});

test('metric trend uses the latest two same-source dates and reports raw rank or percentage-point delta', () => {
  const rows = [
    { asin:'OWN', keyword:'reader', snapshotDate:'2026-09-01', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:12, trafficShare:0.08 },
    { asin:'OWN', keyword:'reader', snapshotDate:'2026-09-02', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:9, trafficShare:0.10 },
    { asin:'OWN', keyword:'reader', snapshotDate:'2026-09-03', provider:'Helium 10', reportType:'Cerebro', marketplace:'US', organicRank:7, trafficShare:0.13 }
  ];
  const rank = growth.asinMetricTrend(rows, 'OWN', 'reader', 'organicRank');
  assert.equal(rank.available, true);
  assert.equal(rank.previous.date, '2026-09-02');
  assert.equal(rank.latest.date, '2026-09-03');
  assert.equal(rank.delta, -2);
  assert.equal(growth.formatAsinTrendDelta(rank), '−2');
  const traffic = growth.asinMetricTrend(rows, 'OWN', 'reader', 'trafficShare');
  assert.equal(traffic.delta, 0.03);
  assert.equal(growth.formatAsinTrendDelta(traffic), '+3 pp');
});

test('matrix exposes a trend only for qualifying standard metric cells and the UI discloses the two-snapshot gate', () => {
  const source = [
    { asin:'OWN', keyword:'reader', snapshotDate:'2026-09-01', organicRank:12 },
    { asin:'OWN', keyword:'reader', snapshotDate:'2026-09-03', organicRank:8 },
    { asin:'COMP', keyword:'reader', snapshotDate:'2026-09-03', organicRank:5 }
  ];
  const scope = growth.asinComparisonScope(source, [{ asin:'OWN' }], [], {});
  const matrix = growth.asinComparisonMatrix(source, scope, 'organicRank');
  const row = matrix.rows.find(item=>item.keyword==='reader');
  assert.equal(row.cells.OWN.value, 8);
  assert.equal(row.cells.OWN.trend.available, true);
  assert.equal(row.cells.COMP.trend.available, false);
  const file = fs.readFileSync(new URL('../growth-workspaces.js', import.meta.url), 'utf8');
  assert.match(file, /at least two dated snapshots exist in one comparable source series/);
  assert.match(file, /mergeReverseAsinSnapshots\(load\(kind\),rows\)/);
});
'''
    tests.write_text(text)

# README is updated before the build so source truth and verification stay in one business commit.
old = "- [ ] 只有相同 ASIN/keyword 存在多个日期快照时才显示自然位、广告位、traffic/conversion 的趋势与差值。"
new = """- [x] 只有相同 ASIN/keyword 存在多个日期快照时才显示自然位、广告位、traffic/conversion 的趋势与差值。
  - 2026-09-03：reverse-ASIN 导入现在采用保守的 dated-history 规则：当本次导入所有行都有合法 Snapshot Date 时，按 ASIN + normalized keyword + snapshot date + provider/report/marketplace source series 追加历史，同日同源重导作为 correction 覆盖；若本次含任一无日期行则继续原有 replace 语义，不把无日期记录伪装成历史。ASIN Comparison 的 Organic Rank、Sponsored Rank、Traffic Share、Conversion Rate 只有在精确 ASIN + keyword + metric 的同一可比来源序列至少存在两个不同日期时才生成 trend/Δ，并只比较最近两个真实快照；Rank 显示原始数值差，Traffic/Conversion 显示百分点差，不自动解释好坏。单快照、同日重复、跨 ASIN/keyword 或跨来源数据都不会生成趋势；矩阵仍显示当前导入证据。原生 reverse-ASIN CSV 模板已补 Snapshot Date 列以便建立可追溯历史。CI 为 **__TEST_COUNT__ passed / 0 failed**；`npm run build` 验证 **43 个 JS + 9 个 CSS，53 个发布文件**，source/dist byte identity 与 committed-dist parity gate 全部通过。"""
replace_once('README.md', old, new, 'README P2 dated ASIN trend item')
