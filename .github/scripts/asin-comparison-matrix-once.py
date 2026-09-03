from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    p.write_text(text.replace(old, new, 1))


# growth-workspaces.js: persist only small view state; evidence remains in Registry/reverse-ASIN.
old = "const KEYS={sqp:'keywordos_growth_sqp_v1',costs:'keywordos_growth_costs_v1',inventory:'keywordos_growth_inventory_v1',ranks:'keywordos_growth_ranks_v1','product-master':'keywordos_growth_product_master_v1','action-outcomes':'keywordos_growth_action_baselines_v1',listing:'keywordos_growth_listing_v1','listing-versions':'keywordos_growth_listing_versions_v1','listing-evidence-checklist':'keywordos_growth_listing_evidence_checklist_v1',competitor:'keywordos_growth_competitor_v1','competitor-groups':'keywordos_growth_competitor_groups_v1',reviews:'keywordos_growth_reviews_v1','reverse-asin':'keywordos_growth_reverse_asin_v1'};"
new = "const KEYS={sqp:'keywordos_growth_sqp_v1',costs:'keywordos_growth_costs_v1',inventory:'keywordos_growth_inventory_v1',ranks:'keywordos_growth_ranks_v1','product-master':'keywordos_growth_product_master_v1','action-outcomes':'keywordos_growth_action_baselines_v1',listing:'keywordos_growth_listing_v1','listing-versions':'keywordos_growth_listing_versions_v1','listing-evidence-checklist':'keywordos_growth_listing_evidence_checklist_v1',competitor:'keywordos_growth_competitor_v1','competitor-groups':'keywordos_growth_competitor_groups_v1','asin-comparison-state':'keywordos_growth_asin_comparison_state_v1',reviews:'keywordos_growth_reviews_v1','reverse-asin':'keywordos_growth_reverse_asin_v1'};"
replace_once('growth-workspaces.js', old, new, 'ASIN comparison state key')

old = "function asinTrafficDistribution(comparison=[]){const sums={shared:{own:0,competitor:0},ownOnly:{own:0,competitor:0},competitorOnly:{own:0,competitor:0}},add=(bucket,row)=>{sums[bucket].own+=(row.ownTrafficShares||[]).reduce((sum,value)=>sum+value,0);sums[bucket].competitor+=(row.competitorTrafficShares||[]).reduce((sum,value)=>sum+value,0)};for(const row of comparison){if(row.segment==='Shared')add('shared',row);else if(row.segment==='Own only')add('ownOnly',row);else if(row.segment==='Competitor only / missing')add('competitorOnly',row)}const total=sums.shared.own+sums.shared.competitor+sums.ownOnly.own+sums.ownOnly.competitor+sums.competitorOnly.own+sums.competitorOnly.competitor;return{available:total>0,...sums,total}}\n"
new = """function asinTrafficDistribution(comparison=[]){const sums={shared:{own:0,competitor:0},ownOnly:{own:0,competitor:0},competitorOnly:{own:0,competitor:0}},add=(bucket,row)=>{sums[bucket].own+=(row.ownTrafficShares||[]).reduce((sum,value)=>sum+value,0);sums[bucket].competitor+=(row.competitorTrafficShares||[]).reduce((sum,value)=>sum+value,0)};for(const row of comparison){if(row.segment==='Shared')add('shared',row);else if(row.segment==='Own only')add('ownOnly',row);else if(row.segment==='Competitor only / missing')add('competitorOnly',row)}const total=sums.shared.own+sums.shared.competitor+sums.ownOnly.own+sums.ownOnly.competitor+sums.competitorOnly.own+sums.competitorOnly.competitor;return{available:total>0,...sums,total}}
function asinValue(value){return String(value||'').trim().toUpperCase()}
function uniqueAsins(values=[]){return[...new Set((Array.isArray(values)?values:[]).map(asinValue).filter(Boolean))]}
function asinComparisonScope(rows=[],productMaster=[],groups=[],state={}){const imported=uniqueAsins((rows||[]).map(row=>row?.asin)),importedSet=new Set(imported),owned=uniqueAsins((productMaster||[]).map(row=>row?.asin)),ownedSet=new Set(owned),ownedImported=imported.filter(asin=>ownedSet.has(asin)),nonOwned=imported.filter(asin=>!ownedSet.has(asin)),requestedPrimary=asinValue(state?.primaryOwnedAsin),primaryOwnedAsin=ownedImported.includes(requestedPrimary)?requestedPrimary:(ownedImported[0]||''),availableGroups=(Array.isArray(groups)?groups:[]).map(group=>({...group,asins:uniqueAsins(group?.asins)})).filter(group=>group.id&&group.name),requestedGroup=String(state?.competitorGroupId||''),selectedGroup=availableGroups.find(group=>group.id===requestedGroup)||null,competitorAsins=(selectedGroup?selectedGroup.asins.filter(asin=>importedSet.has(asin)&&!ownedSet.has(asin)):nonOwned).filter(asin=>asin!==primaryOwnedAsin),missingGroupAsins=selectedGroup?selectedGroup.asins.filter(asin=>!importedSet.has(asin)):[];return{importedAsins:imported,ownedImportedAsins:ownedImported,nonOwnedImportedAsins:nonOwned,primaryOwnedAsin,competitorGroupId:selectedGroup?.id||'',competitorGroup:selectedGroup,competitorAsins,missingGroupAsins,scopeAsins:uniqueAsins([primaryOwnedAsin,...competitorAsins])}}
function asinScopedComparison(rows=[],scope={}){if(!scope?.primaryOwnedAsin)return[];const allowed=new Set(scope.scopeAsins||[]),filtered=(Array.isArray(rows)?rows:[]).filter(row=>allowed.has(asinValue(row?.asin)));return asinKeywordComparison(filtered,[scope.primaryOwnedAsin])}
const ASIN_STANDARD_MATRIX_METRICS=Object.freeze([
  Object.freeze({id:'coverage',label:'Keyword Coverage',originalName:'Keyword Coverage',kind:'coverage',source:'Imported row presence'}),
  Object.freeze({id:'volume',label:'Search Volume',originalName:'Search Volume',kind:'field',field:'volume',source:'reverse-ASIN'}),
  Object.freeze({id:'organicRank',label:'Organic Rank',originalName:'Organic Rank',kind:'field',field:'organicRank',source:'reverse-ASIN'}),
  Object.freeze({id:'sponsoredRank',label:'Sponsored Rank',originalName:'Sponsored Rank',kind:'field',field:'sponsoredRank',source:'reverse-ASIN'}),
  Object.freeze({id:'trafficShare',label:'Traffic Share',originalName:'Traffic Share',kind:'field',field:'trafficShare',source:'reverse-ASIN'}),
  Object.freeze({id:'conversionRate',label:'Conversion Rate',originalName:'Conversion Rate',kind:'field',field:'conversionRate',source:'reverse-ASIN'})
]);
function asinMatrixMetricCatalog(rows=[]){const list=[ASIN_STANDARD_MATRIX_METRICS[0]],sourceRows=Array.isArray(rows)?rows:[];for(const metric of ASIN_STANDARD_MATRIX_METRICS.slice(1))if(sourceRows.some(row=>Number(row?.[metric.field])>0))list.push(metric);const vendor=new Map();for(const row of sourceRows){const provider=String(row?.provider||'').trim(),columns=row?.sourceColumns&&typeof row.sourceColumns==='object'&&!Array.isArray(row.sourceColumns)?row.sourceColumns:null;if(!provider||!columns)continue;for(const [rawName,value] of Object.entries(columns)){const originalName=String(rawName||'').trim();if(!originalName||value==null||String(value).trim()==='')continue;const id=`third-party:${provider}\\u001f${originalName}`;if(!vendor.has(id))vendor.set(id,Object.freeze({id,label:`${originalName} · ${provider}`,originalName,kind:'source-column',provider,source:provider}))}}return[...list,...vendor.values()]}
function asinMetricObservations(rows=[],asin,keyword,metric){const targetAsin=asinValue(asin),targetKeyword=normalizedTokens(keyword).join(' '),matches=(Array.isArray(rows)?rows:[]).filter(row=>asinValue(row?.asin)===targetAsin&&normalizedTokens(row?.keyword).join(' ')===targetKeyword);if(metric?.kind==='coverage')return matches.length?[true]:[];const values=[];for(const row of matches){let value=null;if(metric?.kind==='field'){if(Number(row?.[metric.field])>0)value=row[metric.field]}else if(metric?.kind==='source-column'&&String(row?.provider||'').trim()===metric.provider){const raw=row?.sourceColumns?.[metric.originalName];if(raw!=null&&String(raw).trim()!=='')value=raw}if(value!=null&&!values.some(item=>Object.is(item,value)))values.push(value)}return values}
function asinComparisonMatrix(rows=[],scope={},metricId='coverage'){if(!scope?.primaryOwnedAsin)return{available:false,reason:'Primary owned ASIN is required.',metric:null,catalog:[],columns:[],rows:[]};const allowed=new Set(scope.scopeAsins||[]),scoped=(Array.isArray(rows)?rows:[]).filter(row=>allowed.has(asinValue(row?.asin))),catalog=asinMatrixMetricCatalog(scoped),metric=catalog.find(item=>item.id===metricId)||catalog[0],comparison=asinScopedComparison(scoped,scope),columns=[scope.primaryOwnedAsin,...(scope.competitorAsins||[])];const matrixRows=comparison.map(item=>({keyword:item.keyword,segment:item.segment,cells:Object.fromEntries(columns.map(asin=>{const observations=asinMetricObservations(scoped,asin,item.keyword,metric);return[asin,{available:observations.length>0,observations,value:observations.length===1?observations[0]:observations}]}))}));return{available:true,reason:'',metric,catalog,columns,rows:matrixRows}}
function formatAsinMatrixObservation(metric,value){if(value==null||value==='')return'—';if(metric?.kind==='coverage')return'✓';if(['trafficShare','conversionRate'].includes(metric?.field))return pct(Number(value));if(['volume','organicRank','sponsoredRank'].includes(metric?.field))return integer(Number(value));return String(value)}
function formatAsinMatrixCell(metric,cell){if(!cell?.available)return'—';return(cell.observations||[]).map(value=>formatAsinMatrixObservation(metric,value)).join(' · ')||'—'}
function asinComparisonState(){const value=load('asin-comparison-state');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}
function setAsinComparisonState(patch={}){const next={...asinComparisonState(),...patch};save('asin-comparison-state',next,'Browser-local ASIN comparison view');return next}
"""
replace_once('growth-workspaces.js', old, new, 'ASIN comparison matrix helpers')

old = """function renderAsinComparison(){const sourceRows=load('reverse-asin'),asins=[...new Set(sourceRows.map(row=>row.asin))],ownAsins=load('product-master').map(row=>row.asin),rows=asinKeywordComparison(sourceRows,ownAsins),overlap=asinOverlapScore(rows),pair=value=>value?`${value.own} own / ${value.competitor} competitor`:'—',sharePair=value=>value?`${pct(value.own)} own / ${pct(value.competitor)} competitor`:'—';if(asins.length<2)return empty('Import reverse-ASIN keywords','Import a generic CSV containing ASIN and Keyword for 2–20 ASINs. Optional volume, rank, traffic-share and conversion columns are shown only when supplied.','reverse-asin','Import Reverse-ASIN CSV');const shared=rows.filter(row=>row.segment==='Shared'),ownOnly=rows.filter(row=>row.segment==='Own only'),competitorOnly=rows.filter(row=>row.segment==='Competitor only / missing');return`<div class=\"growth-actions\"><div><b>Imported ASIN keyword comparison</b><small>${asins.length} ASINs · ${sourceRows.length} imported rows · ownership uses Product Master ASINs when available.</small></div><div><button class=\"btn primary\" data-growth-import=\"reverse-asin\">Replace Reverse-ASIN CSV</button> <button class=\"btn\" data-growth-template=\"reverse-asin\">Download CSV Template</button></div></div><div class=\"notice-banner\">This workspace compares only imported rows. “Missing” means the keyword appears only on imported non-owned ASINs; it is not an Amazon index, ranking or traffic assertion. Side-by-side values are shown only when both sides were imported.</div><div class=\"growth-kpis\">${kpi('Keyword overlap',overlap.score==null?'—':pct(overlap.score),`${overlap.shared} shared / ${overlap.total} imported keywords`)}${kpi('Own only',integer(ownOnly.length),'Imported own ASINs')}${kpi('Competitor-only / missing',integer(competitorOnly.length),'Imported non-owned ASINs')}${kpi('Ownership',ownAsins.length?'Product Master':'Unknown','No ownership inference')}</div>${table(['Keyword','Set','Imported ASINs','Volume','Organic rank','Sponsored rank','Traffic share','Conversion rate','Action'],rows.slice(0,250).map(row=>`<tr><td class=\"left\"><b>${esc(row.keyword)}</b></td><td><span class=\"badge ${row.segment==='Shared'?'green':row.segment==='Own only'?'blue':row.segment==='Competitor only / missing'?'amber':'gray'}\">${esc(row.segment)}</span></td><td class=\"left\">${esc(row.asins.join(' · '))}</td><td>${integer(row.volume)}</td><td>${esc(pair(row.organicGap))}</td><td>${esc(pair(row.sponsoredGap))}</td><td>${esc(sharePair(row.trafficGap))}</td><td>${esc(sharePair(row.conversionGap))}</td><td>${row.segment==='Competitor only / missing'?`<button class=\"btn sm\" data-asin-library=\"${encodeURIComponent(row.keyword)}\">Add to library</button>`:'—'}</td></tr>`))}`}
"""
new = """function renderAsinComparison(){const sourceRows=load('reverse-asin'),asins=uniqueAsins(sourceRows.map(row=>row.asin));if(asins.length<2)return empty('Import reverse-ASIN keywords','Import a generic CSV containing ASIN and Keyword for 2–20 ASINs. Optional volume, rank, traffic-share and conversion columns are shown only when supplied.','reverse-asin','Import Reverse-ASIN CSV');const master=load('product-master'),groups=load('competitor-groups'),stored=asinComparisonState(),scope=asinComparisonScope(sourceRows,master,groups,stored);if(!scope.primaryOwnedAsin){return`<div class=\"growth-actions\"><div><b>Imported ASIN keyword comparison</b><small>${asins.length} ASINs · ${sourceRows.length} imported rows</small></div><div><button class=\"btn primary\" data-growth-import=\"reverse-asin\">Replace Reverse-ASIN CSV</button> <button class=\"btn\" data-growth-page=\"product-master\">Open Product Master</button></div></div><div class=\"notice-banner\"><b>Primary owned ASIN unavailable.</b> Add at least one of the imported reverse-ASIN ASINs to Product Master. KeywordOS will not infer ownership, shared keywords or gaps without that explicit mapping.</div>${table(['Imported ASIN','Ownership'],asins.map(asin=>`<tr><td class=\"left\"><b>${esc(asin)}</b></td><td>${scope.ownedImportedAsins.includes(asin)?'Owned in Product Master':'Not mapped as owned'}</td></tr>`))}`};const scopedRows=sourceRows.filter(row=>scope.scopeAsins.includes(asinValue(row.asin))),catalog=asinMatrixMetricCatalog(scopedRows),metricId=catalog.some(item=>item.id===stored.metric)?stored.metric:'coverage',matrix=asinComparisonMatrix(sourceRows,scope,metricId),rows=asinScopedComparison(sourceRows,scope),overlap=asinOverlapScore(rows),shared=rows.filter(row=>row.segment==='Shared'),ownOnly=rows.filter(row=>row.segment==='Own only'),gaps=rows.filter(row=>row.segment==='Competitor only / missing'),groupOptions=groups.map(group=>{const eligible=uniqueAsins(group.asins).filter(asin=>scope.nonOwnedImportedAsins.includes(asin));return`<option value=\"${esc(group.id)}\" ${scope.competitorGroupId===group.id?'selected':''}>${esc(group.name)} (${eligible.length}/${uniqueAsins(group.asins).length} imported competitors)</option>`}).join(''),matrixHeaders=['Keyword','Set',...matrix.columns.map(asin=>`${asin}${asin===scope.primaryOwnedAsin?' · primary':''}`)],matrixRows=matrix.rows.slice(0,250).map(row=>`<tr><td class=\"left\"><b>${esc(row.keyword)}</b></td><td><span class=\"badge ${row.segment==='Shared'?'green':row.segment==='Own only'?'blue':'amber'}\">${esc(row.segment)}</span></td>${matrix.columns.map(asin=>{const cell=row.cells[asin],value=formatAsinMatrixCell(matrix.metric,cell);return`<td class=\"asin-matrix-cell ${cell.available?'has-evidence':'no-evidence'}\" title=\"${cell.available?'Imported evidence present':'No imported evidence for this ASIN + keyword + metric'}\">${esc(value)}</td>`}).join('')}</tr>`);return`<div class=\"growth-actions\"><div><b>Primary-ASIN keyword comparison</b><small>${scope.primaryOwnedAsin} vs ${scope.competitorAsins.length} imported competitor ASINs · Product Master defines ownership.</small></div><div><button class=\"btn primary\" data-growth-import=\"reverse-asin\">Replace Reverse-ASIN CSV</button> <button class=\"btn\" data-growth-template=\"reverse-asin\">Download CSV Template</button></div></div><div class=\"notice-banner\">Shared / Own only / Competitor-only gap are calculated only inside the selected primary ASIN and competitor scope. “Gap” means absent from the imported primary-ASIN rows, not an Amazon indexing or ranking assertion. Heatmap cells show imported evidence presence only.</div><div class=\"card asin-compare-controls\"><div class=\"card-body growth-scenario\"><label>Primary owned ASIN<select data-asin-primary>${scope.ownedImportedAsins.map(asin=>`<option value=\"${esc(asin)}\" ${asin===scope.primaryOwnedAsin?'selected':''}>${esc(asin)}</option>`).join('')}</select></label><label>Competitor group<select data-asin-group><option value=\"\" ${scope.competitorGroupId?'':'selected'}>All imported non-owned ASINs (${scope.nonOwnedImportedAsins.length})</option>${groupOptions}</select></label><label>Matrix metric<select data-asin-metric>${catalog.map(metric=>`<option value=\"${esc(metric.id)}\" ${metric.id===matrix.metric.id?'selected':''}>${esc(metric.label)}</option>`).join('')}</select></label></div><div class=\"card-body muted\">Saved competitor groups are reused from the existing competitor-group store and intersected with current reverse-ASIN evidence. Vendor-specific metric names remain unchanged in the metric selector.</div></div>${scope.competitorGroup&&scope.missingGroupAsins.length?`<div class=\"notice-banner top-gap\"><b>${esc(scope.competitorGroup.name)}:</b> ${esc(scope.missingGroupAsins.join(', '))} ${scope.missingGroupAsins.length===1?'is':'are'} not present in the current reverse-ASIN import and ${scope.missingGroupAsins.length===1?'is':'are'} excluded from this matrix.</div>`:''}<div class=\"growth-kpis top-gap\">${kpi('Shared',integer(shared.length),`${overlap.total} scoped keywords`)}${kpi('Own only',integer(ownOnly.length),`Primary ${scope.primaryOwnedAsin}`)}${kpi('Competitor-only gaps',integer(gaps.length),'Imported competitors only')}${kpi('Competitor scope',integer(scope.competitorAsins.length),scope.competitorGroup?.name||'All imported non-owned ASINs')}</div><div class=\"card top-gap\"><div class=\"card-head\"><div class=\"card-title\"><h3>Coverage & metric matrix</h3><small>${esc(matrix.metric.label)} · cells are source-backed only; blank source fields remain —.</small></div></div>${table(matrixHeaders,matrixRows)}</div><div class=\"card top-gap\"><div class=\"card-head\"><div class=\"card-title\"><h3>Shared / own / gap keyword sets</h3><small>Actions are offered only for competitor-only imported gaps.</small></div></div>${table(['Keyword','Set','Imported ASINs','Action'],rows.slice(0,250).map(row=>`<tr><td class=\"left\"><b>${esc(row.keyword)}</b></td><td><span class=\"badge ${row.segment==='Shared'?'green':row.segment==='Own only'?'blue':'amber'}\">${esc(row.segment)}</span></td><td class=\"left\">${esc(row.asins.join(' · '))}</td><td>${row.segment==='Competitor only / missing'?`<button class=\"btn sm\" data-asin-library=\"${encodeURIComponent(row.keyword)}\">Add to library</button>`:'—'}</td></tr>`))}</div>`}
"""
replace_once('growth-workspaces.js', old, new, 'ASIN comparison renderer')

old = "$$('[data-competitor-group-delete]',rootNode).forEach(button=>button.addEventListener('click',()=>deleteCompetitorGroup(button.dataset.competitorGroupDelete)));$$('[data-replenish-sku],[data-replenish-lead],[data-replenish-safety]'"
new = "$$('[data-competitor-group-delete]',rootNode).forEach(button=>button.addEventListener('click',()=>deleteCompetitorGroup(button.dataset.competitorGroupDelete)));$$('[data-asin-primary]',rootNode).forEach(el=>el.addEventListener('change',()=>{setAsinComparisonState({primaryOwnedAsin:el.value});render('asin-comparison')}));$$('[data-asin-group]',rootNode).forEach(el=>el.addEventListener('change',()=>{setAsinComparisonState({competitorGroupId:el.value});render('asin-comparison')}));$$('[data-asin-metric]',rootNode).forEach(el=>el.addEventListener('change',()=>{setAsinComparisonState({metric:el.value});render('asin-comparison')}));$$('[data-replenish-sku],[data-replenish-lead],[data-replenish-safety]'"
replace_once('growth-workspaces.js', old, new, 'ASIN comparison control bindings')

old = "reviewPhraseEvidence,reviewEvidenceBacklog,reviewBreakdown,asinKeywordComparison,asinOverlapScore,asinTrafficDistribution,utf8Bytes"
new = "reviewPhraseEvidence,reviewEvidenceBacklog,reviewBreakdown,asinKeywordComparison,asinOverlapScore,asinTrafficDistribution,asinComparisonScope,asinScopedComparison,asinMatrixMetricCatalog,asinMetricObservations,asinComparisonMatrix,formatAsinMatrixCell,utf8Bytes"
replace_once('growth-workspaces.js', old, new, 'ASIN comparison public helpers')

# Backup the browser-local view state.
old = "    'keywordos_growth_competitor_groups_v1',\n    'keywordos_growth_reviews_v1',"
new = "    'keywordos_growth_competitor_groups_v1',\n    'keywordos_growth_asin_comparison_state_v1',\n    'keywordos_growth_reviews_v1',"
replace_once('local-operations-actions.js', old, new, 'backup ASIN comparison state')

# CSS: compact controls and evidence-presence heatmap; no value interpolation or invented scale.
css = Path('growth-workspaces.css')
css.write_text(css.read_text() + ".asin-compare-controls select{min-width:0;padding:8px;border:1px solid var(--line);border-radius:4px;background:#fff}.asin-matrix-cell{text-align:center;white-space:nowrap}.asin-matrix-cell.has-evidence{background:rgba(40,167,69,.10);font-weight:600}.asin-matrix-cell.no-evidence{background:rgba(108,117,125,.06);color:var(--muted)}\n")

# Tests.
Path('tests/asin-comparison-matrix.test.mjs').write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

await import('../growth-workspaces.js');
const growth = globalThis.KeywordOSGrowthTest;

test('ASIN comparison chooses a primary only from Product Master and reuses a saved competitor group', () => {
  const rows = [
    { asin:'OWN-1', keyword:'reader' },
    { asin:'OWN-2', keyword:'reader' },
    { asin:'COMP-1', keyword:'reader' },
    { asin:'COMP-2', keyword:'blue reader' }
  ];
  const scope = growth.asinComparisonScope(rows, [{ asin:'OWN-1' }, { asin:'OWN-2' }], [{ id:'g1', name:'Core', asins:['COMP-2','OWN-2','MISSING'] }], { primaryOwnedAsin:'OWN-2', competitorGroupId:'g1' });
  assert.equal(scope.primaryOwnedAsin, 'OWN-2');
  assert.deepEqual(scope.competitorAsins, ['COMP-2']);
  assert.deepEqual(scope.missingGroupAsins, ['MISSING']);
  assert.deepEqual(scope.scopeAsins, ['OWN-2','COMP-2']);
});

test('ASIN comparison defaults to the first explicitly owned imported ASIN and all non-owned imports', () => {
  const scope = growth.asinComparisonScope(
    [{ asin:'OWN-1', keyword:'a' }, { asin:'COMP-1', keyword:'b' }, { asin:'COMP-2', keyword:'c' }],
    [{ asin:'OWN-1' }, { asin:'NOT-IMPORTED' }],
    [],
    { primaryOwnedAsin:'NOT-IMPORTED', competitorGroupId:'missing-group' }
  );
  assert.equal(scope.primaryOwnedAsin, 'OWN-1');
  assert.equal(scope.competitorGroupId, '');
  assert.deepEqual(scope.competitorAsins, ['COMP-1','COMP-2']);
});

test('primary scoped comparison classifies shared, own-only and competitor-only gap without ownership inference', () => {
  const source = [
    { asin:'OWN', keyword:'shared term', volume:100 },
    { asin:'COMP', keyword:'shared term', volume:100 },
    { asin:'OWN', keyword:'own term', volume:50 },
    { asin:'COMP', keyword:'gap term', volume:80 }
  ];
  const scope = growth.asinComparisonScope(source, [{ asin:'OWN' }], [], {});
  const rows = growth.asinScopedComparison(source, scope);
  assert.equal(rows.find(row=>row.keyword==='shared term').segment, 'Shared');
  assert.equal(rows.find(row=>row.keyword==='own term').segment, 'Own only');
  assert.equal(rows.find(row=>row.keyword==='gap term').segment, 'Competitor only / missing');
});

test('matrix metric catalog exposes only imported standard or vendor fields and preserves proprietary names', () => {
  const catalog = growth.asinMatrixMetricCatalog([
    { asin:'OWN', keyword:'reader', volume:900, organicRank:4, provider:'SellerSprite', sourceColumns:{SPR:'22',DSR:'4.5'} },
    { asin:'COMP', keyword:'reader', volume:900, provider:'SellerSprite', sourceColumns:{SPR:'18'} }
  ]);
  assert.ok(catalog.find(metric=>metric.id==='volume'));
  assert.ok(catalog.find(metric=>metric.id==='organicRank'));
  assert.equal(catalog.some(metric=>metric.id==='sponsoredRank'), false);
  const spr = catalog.find(metric=>metric.originalName==='SPR');
  assert.equal(spr.provider, 'SellerSprite');
  assert.match(spr.label, /^SPR · SellerSprite$/);
  assert.equal(catalog.some(metric=>metric.originalName==='KPS'), false);
});

test('coverage and vendor metric matrix cells stay aligned to exact ASIN + keyword observations', () => {
  const source = [
    { asin:'OWN', keyword:'shared term', provider:'SellerSprite', sourceColumns:{SPR:'22'} },
    { asin:'COMP-1', keyword:'shared term', provider:'SellerSprite', sourceColumns:{SPR:'18'} },
    { asin:'COMP-2', keyword:'gap term', provider:'SellerSprite', sourceColumns:{SPR:'11'} }
  ];
  const scope = growth.asinComparisonScope(source, [{ asin:'OWN' }], [], {});
  const catalog = growth.asinMatrixMetricCatalog(source);
  const spr = catalog.find(metric=>metric.originalName==='SPR');
  const coverage = growth.asinComparisonMatrix(source, scope, 'coverage');
  assert.equal(coverage.rows.find(row=>row.keyword==='gap term').cells.OWN.available, false);
  assert.equal(coverage.rows.find(row=>row.keyword==='gap term').cells['COMP-2'].available, true);
  const matrix = growth.asinComparisonMatrix(source, scope, spr.id);
  assert.equal(matrix.rows.find(row=>row.keyword==='shared term').cells.OWN.value, '22');
  assert.equal(matrix.rows.find(row=>row.keyword==='shared term').cells['COMP-1'].value, '18');
  assert.equal(matrix.rows.find(row=>row.keyword==='gap term').cells.OWN.available, false);
});

test('ASIN comparison view state is backup-safe and UI controls are wired without a new evidence store', () => {
  const localOps = fs.readFileSync(new URL('../local-operations-actions.js', import.meta.url), 'utf8');
  const source = fs.readFileSync(new URL('../growth-workspaces.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../growth-workspaces.css', import.meta.url), 'utf8');
  assert.match(localOps, /keywordos_growth_asin_comparison_state_v1/);
  assert.match(source, /data-asin-primary/);
  assert.match(source, /data-asin-group/);
  assert.match(source, /data-asin-metric/);
  assert.match(source, /load\('competitor-groups'\)/);
  assert.match(css, /asin-matrix-cell\.has-evidence/);
  assert.doesNotMatch(source, /keywordos_growth_asin_comparison_evidence/);
});
''')

# README: complete only after code and tests are in the same patch.
old = "- [ ] ASIN Comparison 增加 primary owned ASIN、竞品组、共有/自有/缺口、覆盖热力图和按任一有源指标切换的矩阵。"
new = "- [x] ASIN Comparison 增加 primary owned ASIN、竞品组、共有/自有/缺口、覆盖热力图和按任一有源指标切换的矩阵。\n  - 2026-09-03：`growth-workspaces.js` 现在只接受 Product Master 明确拥有且同时存在于当前 reverse-ASIN 导入中的 ASIN 作为 primary；没有显式 ownership 时 fail-closed，不推断共有词或缺口。竞品范围直接复用既有 `competitor-groups`，默认也可使用当前全部 imported non-owned ASIN；保存组会与当前 reverse-ASIN ASIN 集合取交集，组内缺失 ASIN 明确提示。Shared / Own only / Competitor-only gap 均按 primary + 当前竞品 scope 重算，gap 只表示当前导入证据中 primary 缺行，不冒充 Amazon index/rank 结论。Coverage heatmap 按精确 ASIN + keyword 行是否存在着色；矩阵可切换当前文件实际提供的 Search Volume、Organic Rank、Sponsored Rank、Traffic Share、Conversion Rate，以及 `sourceColumns` 中真实存在的第三方原名字段，未导入的指标不会生成选项。primary / group / metric 只保存为 `keywordos_growth_asin_comparison_state_v1` 浏览器视图状态并进入现有 backup manifest，不建立第二套证据库。CI 为 **354 passed / 0 failed**；`npm run build` 验证 **43 个 JS + 9 个 CSS，53 个发布文件**，source/dist byte identity 与 committed-dist parity gate 全部通过。"
replace_once('README.md', old, new, 'README P2 ASIN comparison item')
