from pathlib import Path
import re

path = Path('app.js')
text = path.read_text(encoding='utf-8')


def replace(pattern, replacement, label):
    global text
    text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 replacement, got {count}')


replace(
    r"function storeMetricPreview\(store\)\{.*?\n\}",
    """function storeMetricPreview(store){
  if(store.id==='store-a'){
    const current=metrics(state.currentRows||[]);
    return {...current,preview:false,hasData:true};
  }
  return {spend:null,sales:null,orders:null,clicks:null,impressions:null,acos:null,roas:null,cvr:null,preview:true,hasData:false};
}""",
    'storeMetricPreview',
)

replace(
    r"function globalOpportunityRows\(\)\{.*?\}\nfunction renderCrossStore",
    """function globalOpportunityRows(){const terms=globalKeywordRows().slice(0,40);return terms.map(t=>({term:t.term,level:t.orders>=8&&t.acos!=null&&t.acos<.45?'High':t.orders===0&&t.clicks>=12?'Risk':'Watch',note:`${t.orders} orders · ${fmtPct(t.acos)} ACoS in Store 01 only · cross-store evidence unavailable`})).sort((a,b)=>{const rank={High:0,Risk:1,Watch:2};return rank[a.level]-rank[b.level];});}
function renderCrossStore""",
    'globalOpportunityRows',
)

replace(
    r"function renderCrossStore\(\)\{.*?\n\}\nfunction globalKeywordRows",
    """function renderCrossStore(){
  const stores=STORES.map(s=>({...s,m:storeMetricPreview(s)}));
  const metricCell=(s,key,formatter)=>s.m.hasData?formatter(s.m[key]):'<span class=\"muted\">—</span>';
  $('#content').innerHTML=`${scopeBanner()}<div class=\"card\"><div class=\"card-head\"><div class=\"card-title\"><h3>Cross-store Benchmark</h3><small>Only loaded datasets are compared. Store 02 / 03 currently have no business data.</small></div><div class=\"segmented\"><button class=\"active\" disabled aria-current=\"true\">Performance</button><button disabled title=\"Efficiency comparison will activate when the local Global workspace slice is completed\">Efficiency · Coming next</button><button disabled title=\"Keyword comparison will activate when the local Global workspace slice is completed\">Keywords · Coming next</button></div></div><div class=\"table-scroll\"><table class=\"data-table cross-table\"><thead><tr><th>Store</th><th>Connection</th><th>Status</th><th>Spend</th><th>Ad Sales</th><th>Orders</th><th>ACoS</th><th>ROAS</th><th>CVR</th><th>Action</th></tr></thead><tbody>${stores.map(s=>`<tr><td><button class=\"store-link\" data-switch-store=\"${s.id}\">${s.flag} <b>${esc(s.name)}</b>${s.demo?'<small>No business data</small>':''}</button></td><td><code>${esc(s.connection)}</code></td><td>${s.m.hasData?badge('Data loaded','blue'):badge('No data','gray')}</td><td>${metricCell(s,'spend',fmtMoney)}</td><td>${metricCell(s,'sales',fmtMoney)}</td><td>${metricCell(s,'orders',fmtInt)}</td><td class=\"${s.m.hasData?metricClassAcos(s.m.acos):''}\">${s.m.hasData?fmtPct(s.m.acos):'<span class=\"muted\">—</span>'}</td><td>${s.m.hasData?fmtDec(s.m.roas):'<span class=\"muted\">—</span>'}</td><td>${s.m.hasData?fmtPct(s.m.cvr):'<span class=\"muted\">—</span>'}</td><td><button class=\"btn ghost sm\" data-switch-store=\"${s.id}\">Open Store</button></td></tr>`).join('')}</tbody></table></div></div>
  <div class=\"v8-grid equal top-gap\"><div class=\"card\"><div class=\"card-head\"><div class=\"card-title\"><h3>Shared Intelligence</h3><small>Knowledge can be shared only after each Store has an actual dataset</small></div></div><div class=\"shared-model\"><div class=\"shared-core\">GLOBAL<br><b>Keyword Brain</b></div>${STORES.map(s=>`<div class=\"shared-store\"><span>${s.code}</span><b>${s.name}</b><small>${s.id==='store-a'?'Dataset loaded':'No data'}</small></div>`).join('')}</div></div><div class=\"card\"><div class=\"card-head\"><div class=\"card-title\"><h3>Decision Policy</h3></div></div><div class=\"policy-lines\"><p><b>Can compare now:</b> Store 01 imported advertising and finance data.</p><p><b>Cannot compare yet:</b> Store 02 / 03 performance until real datasets are loaded.</p><p><b>Never synthesize:</b> spend, sales, orders, ACoS, ROAS, CVR or keyword performance for an unloaded Store.</p><p><b>Cannot execute:</b> one cross-store “Apply All” request.</p></div></div></div>`;
}
function globalKeywordRows""",
    'renderCrossStore',
)

replace(
    r"function globalKeywordRows\(\)\{.*?\}\nfunction renderGlobalKeywords",
    """function globalKeywordRows(){return aggregateLevel(state.currentRows||[],'searchterm').filter(x=>x.clicks>=5).sort((a,b)=>b.sales-a.sales).slice(0,80).map(x=>{const term=x.name,protectedKeyword=isProtected(term);return {...x,term,protected:protectedKeyword,storeB:null,storeC:null,globalStatus:protectedKeyword?'Protected':x.orders>=5?'Core':x.orders===0?'Review':'Testing'};});}
function renderGlobalKeywords""",
    'globalKeywordRows',
)

replace(
    r"function renderGlobalKeywords\(\)\{.*?\}\nfunction renderGlobalConflicts",
    """function renderGlobalKeywords(){const rows=globalKeywordRows();$('#content').innerHTML=`${scopeBanner()}<div class=\"toolbar\"><div class=\"toolbar-left\"><div class=\"searchbox\"><span>⌕</span><input id=\"global-keyword-search\" placeholder=\"Search global keyword library\"></div><button class=\"btn secondary\" disabled aria-disabled=\"true\" title=\"Advanced Global filters are implemented in the next Global workspace slice\">Filter Library · Coming next</button></div><div class=\"toolbar-right\"><span class=\"muted\">${fmtInt(rows.length)} Store 01 keyword assets</span><button class=\"btn secondary\">Export</button></div></div><div class=\"notice-banner\">Only Store 01 currently has a loaded dataset. Store 02 / 03 columns remain empty until real data is loaded; KeywordOS never synthesizes cross-store performance.</div><div class=\"card flat\"><div class=\"table-scroll\"><table class=\"data-table\"><thead><tr><th>Keyword</th><th>Global Status</th><th>Store 01 ACoS</th><th>Store 02 ACoS</th><th>Store 03 ACoS</th><th>Orders</th><th>Sales</th><th>Store Coverage</th><th>Decision</th></tr></thead><tbody>${rows.slice(0,40).map(x=>`<tr><td><b class=\"keyword-main\">${esc(x.term)}</b>${x.protected?'<small class=\"subline\">Protected core asset</small>':''}</td><td>${badge(x.globalStatus,x.globalStatus==='Protected'?'blue':x.globalStatus==='Core'?'green':'gray')}</td><td class=\"${metricClassAcos(x.acos)}\">${fmtPct(x.acos)}</td><td><span class=\"muted\">— · no data</span></td><td><span class=\"muted\">— · no data</span></td><td>${fmtInt(x.orders)}</td><td>${fmtMoney(x.sales)}</td><td><span class=\"coverage-dots\" title=\"1 of 3 stores has data\"><i class=\"on\"></i><i></i><i></i></span></td><td><button class=\"btn ghost sm\" data-switch-store=\"store-a\">Open Store 01</button></td></tr>`).join('')}</tbody></table></div></div>`;}
function renderGlobalConflicts""",
    'renderGlobalKeywords',
)

replace(
    r"function renderGlobalConflicts\(\)\{.*?\}\nfunction renderStoreWorkspace",
    """function renderGlobalConflicts(){const local=computeConflicts(state.currentRows||[]).slice(0,8);$('#content').innerHTML=`${scopeBanner()}<div class=\"notice-banner\"><b>Cross-store conflict evaluation is unavailable with only one loaded Store dataset.</b> Store 02 / 03 have no business data, so KeywordOS will not infer or simulate conflicts for them.</div><div class=\"card top-gap\"><div class=\"card-head\"><div class=\"card-title\"><h3>Store 01 Internal Conflict Signals</h3><small>Real cross-product evidence from the loaded Store 01 dataset only</small></div><button class=\"btn secondary\" data-switch-store=\"store-a\" data-nav=\"conflicts\">Open Store Conflict Guard</button></div>${local.length?`<div class=\"table-scroll\"><table class=\"data-table\"><thead><tr><th>Search Term</th><th>Risk</th><th>Profitable Product</th><th>Wasteful Product</th><th>Waste Spend</th></tr></thead><tbody>${local.map(x=>`<tr><td><b>${esc(x.term)}</b></td><td>${badge(x.risk,x.risk==='High'?'red':'amber')}</td><td>${esc(x.good.name)} · ${x.good.orders} orders</td><td>${esc(x.bad.name)} · ${x.bad.clicks} clicks</td><td>${fmtMoney(x.bad.spend)}</td></tr>`).join('')}</tbody></table></div>`:`<div class=\"empty-state\"><h3>No Store 01 cross-product conflicts detected</h3><p>Cross-store conflict analysis will activate only after another Store has a real loaded dataset.</p></div>`}</div>`;}
function renderStoreWorkspace""",
    'renderGlobalConflicts',
)

for forbidden in (
    "store.id==='store-b'?0.62:0.47",
    "storeB:b,storeC:c",
    "STORE 03 · DEMO",
    "Potentially inefficient",
):
    if forbidden in text:
        raise SystemExit(f'forbidden synthetic marker remains: {forbidden}')

path.write_text(text, encoding='utf-8')
