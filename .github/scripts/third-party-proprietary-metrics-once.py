from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    p.write_text(text.replace(old, new, 1))


old = """function reverseAsinEvidenceRows(rows=[],mode='discovery',record=null){
  return groupByKeyword(rows,'keyword').map(group=>resultRow({keyword:group.keyword,mode,sources:['reverse-asin'],metrics:{
    searchVolume:observationValue(group.rows,'volume',{source:'reverse-asin'}),organicRank:observationValue(group.rows,'organicRank',{source:'reverse-asin'}),sponsoredRank:observationValue(group.rows,'sponsoredRank',{source:'reverse-asin'}),trafficShare:observationValue(group.rows,'trafficShare',{source:'reverse-asin'}),conversionRate:observationValue(group.rows,'conversionRate',{source:'reverse-asin'})
  },asins:group.rows.map(row=>row?.asin),provenance:[provenanceFor('reverse-asin','Imported reverse-ASIN keyword evidence','imported',record)]})).filter(Boolean);
}
"""
new = """function thirdPartyColumnMetrics(rows=[]){
  const byLabel=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const provider=clean(row?.provider),columns=row?.sourceColumns&&typeof row.sourceColumns==='object'&&!Array.isArray(row.sourceColumns)?row.sourceColumns:null;
    if(!provider||!columns)continue;
    for(const [rawLabel,rawValue] of Object.entries(columns)){
      const label=clean(rawLabel);if(!label||!fieldAvailable(rawValue))continue;
      const observation=Object.freeze({value:rawValue,provider,reportType:clean(row?.reportType),reportVersion:clean(row?.reportVersion),snapshotDate:clean(row?.snapshotDate),sourceFile:clean(row?.sourceFile),marketplace:clean(row?.marketplace),asin:clean(row?.asin).toUpperCase()});
      if(!byLabel.has(label))byLabel.set(label,[]);byLabel.get(label).push(observation);
    }
  }
  const out={};
  const shared=(observations,field)=>{const values=[...new Set(observations.map(item=>clean(item?.[field])).filter(Boolean))];return values.length===1?values[0]:'';};
  for(const [label,observations] of byLabel){
    const values=observations.map(item=>item.value),same=values.every(value=>Object.is(value,values[0])),provider=shared(observations,'provider');
    out[label]=Object.freeze({value:observations.length===1||same?values[0]:Object.freeze(observations),source:provider||'Multiple third-party providers',quality:'third-party-estimate',available:true,originalName:label,provider,reportType:shared(observations,'reportType'),reportVersion:shared(observations,'reportVersion'),snapshotDate:shared(observations,'snapshotDate'),sourceFile:shared(observations,'sourceFile'),observations:Object.freeze(observations)});
  }
  return Object.freeze(out);
}
function thirdPartyProvenance(rows=[]){
  const seen=new Set(),out=[];
  for(const row of Array.isArray(rows)?rows:[]){
    const provider=clean(row?.provider),columns=row?.sourceColumns&&typeof row.sourceColumns==='object'&&!Array.isArray(row.sourceColumns)?Object.keys(row.sourceColumns).map(clean).filter(Boolean):[];
    if(!provider||!columns.length)continue;
    const item={kind:'third-party-metric',label:`${provider}${clean(row?.reportType)?` · ${clean(row.reportType)}`:''} proprietary metrics`,quality:'third-party-estimate',provider,reportType:clean(row?.reportType),reportVersion:clean(row?.reportVersion),snapshotDate:clean(row?.snapshotDate),sourceFile:clean(row?.sourceFile),marketplace:clean(row?.marketplace),asin:clean(row?.asin).toUpperCase(),columns:Object.freeze(columns)};
    const key=[item.provider,item.reportType,item.reportVersion,item.snapshotDate,item.sourceFile,item.marketplace,item.asin,columns.join('\\u001f')].join('\\u001e');if(seen.has(key))continue;seen.add(key);out.push(Object.freeze(item));
  }
  return Object.freeze(out);
}
function reverseAsinEvidenceRows(rows=[],mode='discovery',record=null){
  return groupByKeyword(rows,'keyword').map(group=>resultRow({keyword:group.keyword,mode,sources:['reverse-asin'],metrics:{
    searchVolume:observationValue(group.rows,'volume',{source:'reverse-asin'}),organicRank:observationValue(group.rows,'organicRank',{source:'reverse-asin'}),sponsoredRank:observationValue(group.rows,'sponsoredRank',{source:'reverse-asin'}),trafficShare:observationValue(group.rows,'trafficShare',{source:'reverse-asin'}),conversionRate:observationValue(group.rows,'conversionRate',{source:'reverse-asin'}),...thirdPartyColumnMetrics(group.rows)
  },asins:group.rows.map(row=>row?.asin),provenance:[provenanceFor('reverse-asin','Imported reverse-ASIN keyword evidence','imported',record),...thirdPartyProvenance(group.rows)]})).filter(Boolean);
}
"""
replace_once('keyword-lab.js', old, new, 'third-party evidence projection')

old = """function dedupeProvenance(items=[]){const seen=new Set(),out=[];for(const item of items){const key=[item?.kind,item?.label,item?.quality,item?.source,item?.importedAt].map(clean).join('\\u001f');if(seen.has(key))continue;seen.add(key);out.push(item);}return out;}"""
new = """function dedupeProvenance(items=[]){const seen=new Set(),out=[];for(const item of items){const key=[item?.kind,item?.label,item?.quality,item?.source,item?.importedAt,item?.provider,item?.reportType,item?.reportVersion,item?.snapshotDate,item?.sourceFile,item?.marketplace,item?.asin].map(clean).join('\\u001f');if(seen.has(key))continue;seen.add(key);out.push(item);}return out;}"""
replace_once('keyword-lab.js', old, new, 'snapshot-aware provenance dedupe')

old = """observationValue,groupByKeyword,latestPerAsinKeyword,adsResultRows,sqpResultRows,reverseAsinEvidenceRows,rankResultRows"""
new = """observationValue,groupByKeyword,latestPerAsinKeyword,adsResultRows,sqpResultRows,thirdPartyColumnMetrics,thirdPartyProvenance,reverseAsinEvidenceRows,rankResultRows"""
replace_once('keyword-lab.js', old, new, 'public third-party evidence helpers')

Path('tests/third-party-proprietary-metrics.test.mjs').write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';

await import('../growth-import-validation.js');
await import('../growth-workspaces.js');
await import('../keyword-lab.js');

const validation = globalThis.KeywordOSGrowthImportValidationTest;
const growth = globalThis.KeywordOSGrowthTest;
const lab = globalThis.KeywordOSKeywordLabTest;

function profileRows(csv, options){
  const profile = validation.profileThirdPartyCsv('reverse-asin', csv, options);
  assert.equal(profile.canProfile, true);
  const checked = validation.validateGrowthCsv('reverse-asin', profile.normalizedCsv);
  assert.equal(checked.rejectedCount, 0);
  return growth.parseKind('reverse-asin', checked.acceptedCsv);
}

test('Helium 10 proprietary columns keep exact names, raw values and snapshot provenance in Keyword Lab evidence', () => {
  const rows = profileRows(
    'Keyword Phrase,Search Volume,Cerebro IQ Score,CPR,KPS,Title Density\nreading glasses,1200,3456,18,9.7,7',
    { asin:'B000000001', marketplace:'US', snapshotDate:'2026-09-03', reportVersion:'h10-export', sourceFile:'cerebro.csv' }
  );
  const [result] = lab.reverseAsinEvidenceRows(rows, 'discovery');
  for(const [name,value] of Object.entries({'Cerebro IQ Score':'3456',CPR:'18',KPS:'9.7','Title Density':'7'})){
    assert.ok(Object.hasOwn(result.metrics, name), `${name} must keep its vendor field name`);
    const evidence = result.metrics[name];
    assert.equal(evidence.value, value);
    assert.equal(evidence.originalName, name);
    assert.equal(evidence.source, 'Helium 10');
    assert.equal(evidence.provider, 'Helium 10');
    assert.equal(evidence.reportType, 'Cerebro');
    assert.equal(evidence.reportVersion, 'h10-export');
    assert.equal(evidence.snapshotDate, '2026-09-03');
    assert.equal(evidence.sourceFile, 'cerebro.csv');
    assert.equal(evidence.quality, 'third-party-estimate');
    assert.equal(evidence.observations[0].value, value);
    assert.equal(evidence.observations[0].snapshotDate, '2026-09-03');
  }
  const provenance = result.provenance.find(item => item.kind === 'third-party-metric');
  assert.equal(provenance.provider, 'Helium 10');
  assert.equal(provenance.snapshotDate, '2026-09-03');
  assert.deepEqual(provenance.columns, ['Cerebro IQ Score','CPR','KPS','Title Density']);
});

test('SellerSprite SPR and DSR remain imported vendor evidence rather than KeywordOS-computed scores', () => {
  const rows = profileRows(
    'Keyword,Searches/M,SPR,DSR\nblue light readers,1500,22,4.5',
    { asin:'B000000002', marketplace:'US', snapshotDate:'2026-09-02', reportVersion:'seller-web', sourceFile:'sellersprite.csv' }
  );
  const [result] = lab.reverseAsinEvidenceRows(rows, 'batch');
  assert.equal(result.metrics.SPR.value, '22');
  assert.equal(result.metrics.DSR.value, '4.5');
  assert.equal(result.metrics.SPR.source, 'SellerSprite');
  assert.equal(result.metrics.DSR.snapshotDate, '2026-09-02');
  assert.equal(result.metrics.SPR.quality, 'third-party-estimate');
  assert.equal(result.metrics.DSR.quality, 'third-party-estimate');
});

test('Keyword Lab never invents proprietary score fields when the imported source did not provide them', () => {
  const [result] = lab.reverseAsinEvidenceRows([{
    asin:'B000000003', keyword:'computer readers', volume:800, organicRank:5, sponsoredRank:2,
    trafficShare:0.1, conversionRate:0.05, marketplace:'US', provider:'Helium 10', reportType:'Cerebro',
    reportVersion:'h10-export', snapshotDate:'2026-09-03', sourceFile:'cerebro.csv', sourceColumns:{'Title Density':'6'}
  }], 'discovery');
  assert.equal(result.metrics['Title Density'].value, '6');
  for(const name of ['Cerebro IQ Score','IQ','CPR','KPS','SPR','DSR'])assert.equal(Object.hasOwn(result.metrics,name), false, `${name} must not be synthesized`);
});
''')

old = """- [ ] 所有第三方专有指标保留原名、来源和快照，不生成仿 IQ/CPR/KPS/SPR/DSR 分数。"""
new = """- [x] 所有第三方专有指标保留原名、来源和快照，不生成仿 IQ/CPR/KPS/SPR/DSR 分数。\n  - 2026-09-03：`sourceColumns` 不再只停留在 reverse-ASIN 原始记录；`keyword-lab.js` 现在把第三方未知/专有列逐字段投影进统一 `metrics`，字段 key 与 `originalName` 都保留供应商原名，值保持 CSV 原始值，不做数值公式反推。每个第三方 metric 同时携带 Provider、Report Type / Version、Snapshot Date、Source File、Marketplace、ASIN observations，并统一标记 `third-party-estimate`；多快照 provenance 去重键也加入 provider/report/snapshot/file/ASIN，避免不同快照被错误折叠。Helium 10 的 Cerebro IQ Score / CPR / KPS 与卖家精灵 SPR / DSR 只有源文件实际提供时才出现；KeywordOS 不计算、不补齐、不仿制这些专有分数。"""
replace_once('README.md', old, new, 'README proprietary metric checklist')
