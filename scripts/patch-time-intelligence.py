from pathlib import Path
import re

path = Path('app.js')
text = path.read_text(encoding='utf-8')


def replace_exact(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 marker, got {count}')
    text = text.replace(old, new, 1)


def replace_regex(pattern, replacement, label):
    global text
    text, count = re.subn(pattern, lambda _: replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 replacement, got {count}')

replace_exact(
    "researchHistory:'keywordos_v9_research_history'",
    "researchHistory:'keywordos_v9_research_history', dashboardUi:'keywordos_v9_dashboard_ui'",
    'dashboard storage',
)

replace_exact(
    "  researchHistory:load(STORAGE.researchHistory,[]),\n  presets:load(STORAGE.presets,[",
    "  researchHistory:load(STORAGE.researchHistory,[]),\n  dashboardUi:load(STORAGE.dashboardUi,{granularity:'daily'}),\n  presets:load(STORAGE.presets,[",
    'dashboard state',
)

replace_exact(
    "function dailyMetrics(rows){const m=new Map();for(const r of rows){if(!m.has(r.date))m.set(r.date,[]);m.get(r.date).push(r);}return [...m].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,g])=>({date,...metrics(g)}));}",
    """function dailyMetrics(rows){const m=new Map();for(const r of rows){if(!m.has(r.date))m.set(r.date,[]);m.get(r.date).push(r);}return [...m].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,g])=>({date,...metrics(g)}));}
function trendBucketDate(date,granularity){if(granularity==='monthly')return `${date.slice(0,7)}-01`;if(granularity==='weekly'){const d=new Date(date+'T00:00:00Z'),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()-day+1);return d.toISOString().slice(0,10);}return date;}
function trendMetrics(rows,granularity='daily'){const mode=['daily','weekly','monthly'].includes(granularity)?granularity:'daily';if(mode==='daily')return dailyMetrics(rows);const buckets=new Map();for(const r of rows){if(!r.date)continue;const key=trendBucketDate(r.date,mode);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(r);}return [...buckets].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,g])=>({date,...metrics(g)}));}""",
    'trend metric helpers',
)

replace_exact(
    "const rows=getRangeRows(),prev=getRangeRows(true),m=metrics(rows),pm=metrics(prev),d=dailyMetrics(rows),fin=financeSummary(getFinanceRangeRows());",
    "const rows=getRangeRows(),prev=getRangeRows(true),m=metrics(rows),pm=metrics(prev),d=trendMetrics(rows,state.dashboardUi.granularity),fin=financeSummary(getFinanceRangeRows());",
    'overview trend source',
)

old_chart = '<div class="chart-legend"><span><i class="legend-dot legend-dark"></i>Sales</span><span><i class="legend-dot legend-blue"></i>Spend</span><button class="btn ghost sm" disabled aria-disabled="true" title="Daily is the only aggregation available in the current imported-data runtime">Daily</button></div>'
new_chart = '<div class="chart-legend"><span><i class="legend-dot legend-dark"></i>Sales</span><span><i class="legend-dot legend-blue"></i>Spend</span><div class="segmented">${[[\'daily\',\'Daily\'],[\'weekly\',\'Weekly\'],[\'monthly\',\'Monthly\']].map(([key,label])=>`<button data-dashboard-granularity="${key}" class="${state.dashboardUi.granularity===key?\'active\':\'\'}" ${state.dashboardUi.granularity===key?\'aria-current="true"\':\'\'}>${label}</button>`).join(\'\')}</div></div>'
replace_exact(old_chart, new_chart, 'dashboard granularity control')

replace_exact(
    "  $$('[data-learn-page]').forEach(b=>b.addEventListener('click',()=>openLearn(b.dataset.learnPage)));",
    "  $$('[data-learn-page]').forEach(b=>b.addEventListener('click',()=>openLearn(b.dataset.learnPage)));\n  $$('[data-dashboard-granularity]').forEach(b=>b.addEventListener('click',()=>{const mode=b.dataset.dashboardGranularity;if(!['daily','weekly','monthly'].includes(mode))return;state.dashboardUi.granularity=mode;save(STORAGE.dashboardUi,state.dashboardUi);render();}));",
    'dashboard granularity binding',
)

history_block = r'''function openSearchTermDetail(term,rows){const g=rows.filter(r=>r.searchTerm===term),m=metrics(g),contexts=groupRows(g,r=>`${r.campaign}|${r.adGroup}|${r.target}|${r.product}`,(c)=>({campaign:c[0].campaign,adGroup:c[0].adGroup,target:c[0].target,matchType:c[0].matchType,product:c[0].product})).sort((a,b)=>b.spend-a.spend);const pp=aggregateLevel(g,'product').sort((a,b)=>b.sales-a.sales);const protectedK=isProtected(term),conf=negativeConflict(term,rows);openDrawer(`<h2>${esc(term)}</h2>`,`<div class="drawer-tabs"><button class="drawer-tab active" disabled aria-current="true">Performance</button><button class="drawer-tab" disabled aria-disabled="true" title="Placement is not present in the current imported search-term report">Placements · unavailable</button><button class="drawer-tab" data-term-history>History</button></div>${protectedK?'<div class="notice-banner"><b>Protected keyword</b> · Negative targeting is blocked unless protection is removed.</div>':''}${conf?'<div class="danger-banner top-gap"><b>Conflict Guard:</b> this term is profitable on at least one product and wasteful on another.</div>':''}<div class="detail-metrics top-gap"><div class="detail-metric"><span>Spend</span><b>${fmtMoney(m.spend)}</b></div><div class="detail-metric"><span>Sales</span><b>${fmtMoney(m.sales)}</b></div><div class="detail-metric"><span>ACoS</span><b class="${metricClassAcos(m.acos)}">${fmtPct(m.acos)}</b></div><div class="detail-metric"><span>Orders</span><b>${m.orders}</b></div><div class="detail-metric"><span>CVR</span><b>${fmtPct(m.cvr)}</b></div><div class="detail-metric"><span>ROAS</span><b>${fmtDec(m.roas)}</b></div></div><div class="detail-section"><h3>Product Performance</h3>${pp.map(p=>`<div class="context-row"><div><b>${esc(p.name)}</b><small>${p.clicks} clicks · ${p.orders} orders</small></div><div class="context-metric"><b>${fmtMoney(p.sales)}</b><small>Sales</small></div><div class="context-metric"><b class="${metricClassAcos(p.acos)}">${fmtPct(p.acos)}</b><small>ACoS</small></div></div>`).join('')}</div><div class="detail-section"><h3>Top Campaign Contexts</h3>${contexts.slice(0,8).map(c=>`<div class="context-row"><div><b>${esc(c.campaign)}</b><small>${esc(c.adGroup)} · ${esc(c.target)} · ${esc(c.product)}</small></div><div class="context-metric"><b>${fmtMoney(c.spend)}</b><small>Spend</small></div><div class="context-metric"><b>${c.orders}</b><small>Orders</small></div></div>`).join('')}</div><div class="detail-section"><div style="display:flex;gap:7px"><button class="btn success" id="drawer-harvest">＋ Harvest Exact</button><button class="btn danger" id="drawer-negative">⊖ Negative</button><button class="btn" id="drawer-track">Track</button></div></div>`);$('#drawer-root [data-term-history]')?.addEventListener('click',()=>openSearchTermHistory(term,rows));setTimeout(()=>{$('#drawer-harvest')?.addEventListener('click',()=>{queueAction('Add Exact Keyword',term,{reason:`Search term detail · ${m.orders} orders · ACoS ${fmtPct(m.acos)}`});toast('Harvest action queued','success');renderNav();});$('#drawer-negative')?.addEventListener('click',()=>{if(protectedK||conf){closeDrawer();openNegativeRisk(term)}else{queueNegative(term);toast('Negative action queued','success');renderNav();}});$('#drawer-track')?.addEventListener('click',()=>{if(!state.tracked.includes(term))state.tracked.push(term);save(STORAGE.tracked,state.tracked);toast('Keyword added to tracker','success');});},0);}
function openSearchTermHistory(term,rows){const g=rows.filter(r=>r.searchTerm===term),history=dailyMetrics(g),recent=[...history].reverse();openDrawer(`<h2>${esc(term)}</h2>`,`<div class="drawer-tabs"><button class="drawer-tab" data-term-performance>Performance</button><button class="drawer-tab" disabled aria-disabled="true" title="Placement is not present in the current imported search-term report">Placements · unavailable</button><button class="drawer-tab active" disabled aria-current="true">History</button></div><div class="notice-banner"><b>Real imported history only.</b> ${fmtInt(history.length)} dated performance buckets from the current selected report range. No missing dates or placement metrics are synthesized.</div><div class="detail-section"><h3>Spend & Sales Trend</h3><div class="chart-shell" style="min-height:190px">${lineChart(history)}</div></div><div class="detail-section"><h3>Daily History</h3>${recent.length?`<div class="table-scroll"><table class="mini-table"><thead><tr><th>Date</th><th>Impressions</th><th>Clicks</th><th>Orders</th><th>Spend</th><th>Sales</th><th>ACoS</th><th>CVR</th></tr></thead><tbody>${recent.map(d=>`<tr><td><b>${esc(d.date)}</b></td><td>${fmtInt(d.impressions)}</td><td>${fmtInt(d.clicks)}</td><td>${fmtInt(d.orders)}</td><td>${fmtMoney(d.spend)}</td><td>${fmtMoney(d.sales)}</td><td class="${metricClassAcos(d.acos)}">${fmtPct(d.acos)}</td><td class="${metricClassCvr(d.cvr)}">${fmtPct(d.cvr)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty-state"><h3>No dated history</h3><p>The current imported rows do not contain dated performance for this term.</p></div>'}</div>`);$('#drawer-root [data-term-performance]')?.addEventListener('click',()=>openSearchTermDetail(term,rows));}'''

replace_regex(
    r"function openSearchTermDetail\(term,rows\)\{.*?\}(?=\nfunction openDetailDrawer)",
    history_block,
    'search term detail/history',
)

for marker in (
    "dashboardUi:'keywordos_v9_dashboard_ui'",
    "data-dashboard-granularity",
    "trendMetrics(rows,state.dashboardUi.granularity)",
    "data-term-history",
    "function openSearchTermHistory",
    "Placements · unavailable",
    "Real imported history only.",
    "id=\"drawer-harvest\"",
    "id=\"drawer-negative\"",
    "id=\"drawer-track\"",
):
    if marker not in text:
        raise SystemExit(f'missing time-intelligence marker: {marker}')

for forbidden in (
    'Daily is the only aggregation available in the current imported-data runtime',
    'History · Preview',
    'Search-term history view is not implemented yet',
):
    if forbidden in text:
        raise SystemExit(f'obsolete Preview marker remains: {forbidden}')

path.write_text(text, encoding='utf-8')
