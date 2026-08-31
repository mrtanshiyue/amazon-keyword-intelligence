from pathlib import Path
import re

path = Path('app.js')
text = path.read_text(encoding='utf-8')


def exact(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 marker, got {count}')
    text = text.replace(old, new, 1)


def regex(pattern, replacement, label):
    global text
    text, count = re.subn(pattern, lambda _: replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 replacement, got {count}')

exact(
    "dashboardUi:'keywordos_v9_dashboard_ui'",
    "dashboardUi:'keywordos_v9_dashboard_ui', dataOps:'keywordos_v9_data_ops'",
    'dataOps storage',
)

exact(
    "  dashboardUi:load(STORAGE.dashboardUi,{granularity:'daily'}),\n  presets:load(STORAGE.presets,[",
    "  dashboardUi:load(STORAGE.dashboardUi,{granularity:'daily'}),\n  dataOps:load(STORAGE.dataOps,{lastCheckedAt:'',snapshot:null}),\n  presets:load(STORAGE.presets,[",
    'dataOps state',
)

block = r'''function datasetDateCoverage(rows){const dates=(rows||[]).map(r=>r.date).filter(Boolean).sort();return dates.length?{min:dates[0],max:dates.at(-1),dated:dates.length}:{min:null,max:null,dated:0};}
function localDataHealthSnapshot(){const adsRows=state.currentRows||[],finRows=state.financeRows||[],adsDates=datasetDateCoverage(adsRows),finDates=datasetDateCoverage(finRows),adsRequired=['date','campaign','searchTerm','spend','orders','sales'],adsMissing=adsRows.filter(r=>adsRequired.some(k=>r[k]===undefined||r[k]===null||r[k]==='')).length,finMissing=finRows.filter(r=>!r.date||r.total===undefined||r.total===null).length;return{checkedAt:new Date().toLocaleString(),ads:{rows:adsRows.length,source:state.adsSource,mode:state.adsPersistent?'Browser persisted':state.adsImportedAt?'Session only':'Cloudflare seed',dates:adsDates,invalidRows:adsMissing},finance:{rows:finRows.length,source:state.financeSource,mode:state.financePersistent?'Browser persisted':state.financeImportedAt?'Session only':'Cloudflare seed',dates:finDates,invalidRows:finMissing}};}
function runLocalDataHealthCheck(){const snap=localDataHealthSnapshot();state.dataOps={lastCheckedAt:snap.checkedAt,snapshot:snap};save(STORAGE.dataOps,state.dataOps);logEvent('Data Health Check','Local workspace',`Ads ${fmtInt(snap.ads.rows)} rows · Unified ${fmtInt(snap.finance.rows)} rows · schema issues ${fmtInt(snap.ads.invalidRows+snap.finance.invalidRows)}`,'Manual','Data');toast(snap.ads.invalidRows||snap.finance.invalidRows?'Local data check completed with schema warnings':'Local data check passed','success');render();}
function dataStatusBadge(rows,invalidRows){if(!rows)return badge('No data','gray');if(invalidRows)return badge('Needs review','amber');return badge('Ready','green');}
function renderSyncCenter(){const snap=state.dataOps.snapshot||localDataHealthSnapshot(),checked=state.dataOps.lastCheckedAt||'Not checked yet',sources=[{name:'Amazon Ads dataset',source:snap.ads.source,rows:snap.ads.rows,dates:snap.ads.dates,mode:snap.ads.mode,invalid:snap.ads.invalidRows,page:'import'},{name:'Unified Transaction dataset',source:snap.finance.source,rows:snap.finance.rows,dates:snap.finance.dates,mode:snap.finance.mode,invalid:snap.finance.invalidRows,page:'unified-report'}];$('#content').innerHTML=`${scopeBanner()}<div class="card"><div class="card-head"><div class="card-title"><h3>Local Data Operations</h3><small>Refresh validates the current browser workspace. It does not call Amazon or pretend to run a live synchronization job.</small></div><div style="display:flex;align-items:center;gap:8px"><span class="muted">Last checked: ${esc(checked)}</span><button class="btn secondary" id="refresh-local-data-status">⟳ Refresh Local Status</button></div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Data Source</th><th>Current Source</th><th>Rows</th><th>Date Coverage</th><th>Persistence</th><th>Schema</th><th>Status</th><th>Action</th></tr></thead><tbody>${sources.map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.source||'—')}</td><td>${fmtInt(s.rows)}</td><td>${s.dates.min?`${esc(s.dates.min)} → ${esc(s.dates.max)}`:'—'}</td><td>${esc(s.mode)}</td><td>${s.invalid?`${fmtInt(s.invalid)} rows need review`:'Normalized'}</td><td>${dataStatusBadge(s.rows,s.invalid)}</td><td><button class="btn ghost sm" data-nav="${s.page}">Open</button></td></tr>`).join('')}<tr><td><b>Store 02 workspace</b></td><td>—</td><td>—</td><td>—</td><td>—</td><td>No dataset</td><td>${badge('No data','gray')}</td><td><span class="muted">Load a real dataset first</span></td></tr><tr><td><b>Store 03 workspace</b></td><td>—</td><td>—</td><td>—</td><td>—</td><td>No dataset</td><td>${badge('No data','gray')}</td><td><span class="muted">Load a real dataset first</span></td></tr></tbody></table></div></div><div class="card top-gap"><div class="card-head"><div class="card-title"><h3>Amazon Live Sync</h3><small>External dependency</small></div></div><div class="card-body"><div class="notice-banner"><b>Not connected.</b> Amazon Ads API/OAuth remains disabled. Live sync schedules, refresh tokens and remote mutation are intentionally unavailable until the API integration phase.</div></div></div>`;$('#refresh-local-data-status')?.addEventListener('click',runLocalDataHealthCheck);}
function renderDataHealth(){const snap=state.dataOps.snapshot||localDataHealthSnapshot(),rows=state.currentRows||[],coverage=[['Amazon Ads Rows',fmtInt(rows.length),`${snap.ads.invalidRows?fmtInt(snap.ads.invalidRows)+' rows need review':'Normalized dataset'}`,snap.ads.invalidRows?'amber':'green'],['Unified Transactions',fmtInt(state.financeRows.length),`${snap.finance.invalidRows?fmtInt(snap.finance.invalidRows)+' rows need review':'Financial ledger ready'}`,snap.finance.invalidRows?'amber':'green'],['Data Workspaces','1 / 3','Store 01 loaded · Store 02/03 no data','amber'],['Search Terms',fmtInt(new Set(rows.map(x=>x.searchTerm)).size),'Store 01 coverage','blue']];$('#content').innerHTML=`${scopeBanner()}<div class="settings-intro"><div><h2>Data Health</h2><p>Current browser workspace health derived from real loaded rows.</p></div><button class="btn secondary" data-nav="sync-center">Open Local Data Operations</button></div><div class="health-grid">${coverage.map(x=>`<div class="health-card"><span class="health-dot ${x[3]}"></span><div><span>${x[0]}</span><b>${x[1]}</b><small>${x[2]}</small></div></div>`).join('')}</div><div class="v8-grid equal top-gap"><div class="card"><div class="card-head"><div class="card-title"><h3>Source Health</h3><small>Last local validation: ${esc(state.dataOps.lastCheckedAt||'Not checked yet')}</small></div></div><div class="schema-list"><p><b>Amazon Ads</b><span>${esc(state.adsSource)}</span><em>${snap.ads.mode}</em></p><p><b>Ads date coverage</b><span>${snap.ads.dates.min?`${esc(snap.ads.dates.min)} → ${esc(snap.ads.dates.max)}`:'No dated rows'}</span><em>${fmtInt(snap.ads.dates.dated)} dated rows</em></p><p><b>Unified Transaction</b><span>${esc(state.financeSource)}</span><em>${snap.finance.mode}</em></p><p><b>Finance date coverage</b><span>${snap.finance.dates.min?`${esc(snap.finance.dates.min)} → ${esc(snap.finance.dates.max)}`:'No dated rows'}</span><em>${fmtInt(snap.finance.dates.dated)} dated rows</em></p></div></div><div class="card"><div class="card-head"><div class="card-title"><h3>Decision Readiness</h3></div></div><div class="readiness"><div><span>Advertising analytics</span><b>${snap.ads.rows&&!snap.ads.invalidRows?'Ready':'Review data'}</b></div><div><span>Finance analytics</span><b>${snap.finance.rows&&!snap.finance.invalidRows?'Ready':'Review data'}</b></div><div><span>Cross-store comparison</span><b>1 store loaded</b></div><div><span>Amazon live sync / write actions</span><b>API required</b></div></div></div></div>`;}'''

regex(
    r"function renderSyncCenter\(\)\{.*?\}\nfunction renderDataHealth\(\)\{.*?\}(?=\nfunction renderStoresSettings)",
    block,
    'Sync Center and Data Health',
)

for marker in (
    "dataOps:'keywordos_v9_data_ops'",
    'function runLocalDataHealthCheck',
    'refresh-local-data-status',
    'Local Data Operations',
    'It does not call Amazon',
    'Amazon Live Sync',
):
    if marker not in text:
        raise SystemExit(f'missing local-data marker: {marker}')

for forbidden in (
    'Sync Model Preview',
    'Refresh Status · Preview',
    'Planned 02:',
    'Planned 03:',
    'Planned 04:',
):
    if forbidden in text:
        raise SystemExit(f'obsolete fake sync marker remains: {forbidden}')

path.write_text(text, encoding='utf-8')
