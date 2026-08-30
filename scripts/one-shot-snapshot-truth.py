from pathlib import Path

path = Path('app.js')
text = path.read_text(encoding='utf-8')


def rep(old, new, expected=1, label='replacement'):
    global text
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected}, found {count}')
    text = text.replace(old, new)

rep("${v8Kpi('Connected Stores',String(connected.length),'3 workspaces configured','blue')}", "${v8Kpi('Data Workspaces',String(connected.length),'1 imported dataset · 2 preview workspaces','blue')}", label='portfolio data workspaces')
rep('<h3>Connection Health</h3><small>Independent authorization status</small>', '<h3>Data Source Health</h3><small>Imported-data and preview workspace status</small>', label='portfolio data source health')
rep("${s.status==='Connected'?badge('Healthy','green'):badge('Not connected','gray')}", "${s.status==='Connected'?badge('Imported data','blue'):badge('No data · Preview','gray')}", label='portfolio health badges')
rep('✓ Every store owns an independent OAuth connection.', '✓ Any future Amazon authorization is isolated per Store workspace.', label='execution safety OAuth truth')
rep("${s.demo?'<span class=\"badge gray\">UI PREVIEW</span>':'<span class=\"badge green\">CONNECTED</span>'}", "${s.demo?'<span class=\"badge gray\">UI PREVIEW</span>':'<span class=\"badge blue\">DATA LOADED</span>'}", label='store card badge')
rep("${s.status==='Connected'?badge('Connected','green'):badge('Ready','gray')}", "${s.status==='Connected'?badge('Data loaded','blue'):badge('Preview','gray')}", label='cross-store status badge')
rep("<span class=\"workspace-status\"><i></i> Connected</span><h2>${st.flag} ${esc(st.name)}</h2><p>${st.connection} → ${st.advertiser} · ${st.marketplace} · Last sync ${st.sync}</p>", "<span class=\"workspace-status\"><i></i> Data workspace</span><h2>${st.flag} ${esc(st.name)}</h2><p>${st.connection} → ${st.advertiser} · ${st.marketplace} · Imported dataset snapshot · Amazon API disabled</p>", label='store workspace hero')

old_sync = "function renderSyncCenter(){const jobs=[];STORES.forEach((s,si)=>{jobs.push({store:s,type:'Ads Structure',schedule:`02:${String(si*15).padStart(2,'0')}`,status:s.status==='Connected'?'Healthy':'Waiting'});jobs.push({store:s,type:'Performance Report',schedule:`03:${String(si*15).padStart(2,'0')}`,status:s.status==='Connected'?'Healthy':'Waiting'});jobs.push({store:s,type:'Search Terms',schedule:`04:${String(si*15).padStart(2,'0')}`,status:s.status==='Connected'?'Healthy':'Waiting'});});$('#content').innerHTML=`${scopeBanner()}<div class=\"card\"><div class=\"card-head\"><div class=\"card-title\"><h3>Independent Sync Jobs</h3><small>Failure in one Amazon connection does not stop other stores</small></div><button class=\"btn secondary\" disabled aria-disabled=\"true\" title=\"Live Amazon synchronization is not enabled in this runtime\">Refresh Status · Preview</button></div><div class=\"table-scroll\"><table class=\"data-table\"><thead><tr><th>Store</th><th>Connection</th><th>Job</th><th>Schedule</th><th>Last Success</th><th>Status</th></tr></thead><tbody>${jobs.map(j=>`<tr><td><b>${esc(j.store.name)}</b></td><td><code>${j.store.connection}</code></td><td>${j.type}</td><td>${j.schedule}</td><td>${j.store.status==='Connected'?'10 min ago':'—'}</td><td>${j.status==='Healthy'?badge('Healthy','green'):badge('Waiting for OAuth','gray')}</td></tr>`).join('')}</tbody></table></div></div>`;}"
new_sync = "function renderSyncCenter(){const jobs=[];STORES.forEach((s,si)=>{jobs.push({store:s,type:'Ads Structure',schedule:`Planned 02:${String(si*15).padStart(2,'0')}`});jobs.push({store:s,type:'Performance Report',schedule:`Planned 03:${String(si*15).padStart(2,'0')}`});jobs.push({store:s,type:'Search Terms',schedule:`Planned 04:${String(si*15).padStart(2,'0')}`});});$('#content').innerHTML=`${scopeBanner()}<div class=\"card\"><div class=\"card-head\"><div class=\"card-title\"><h3>Sync Model Preview</h3><small>Live Amazon synchronization is disabled. These rows describe the planned isolated ingestion model.</small></div><button class=\"btn secondary\" disabled aria-disabled=\"true\" title=\"Live Amazon synchronization is not enabled in this runtime\">Refresh Status · Preview</button></div><div class=\"table-scroll\"><table class=\"data-table\"><thead><tr><th>Store</th><th>Connection</th><th>Job</th><th>Schedule</th><th>Current Source</th><th>Status</th></tr></thead><tbody>${jobs.map(j=>`<tr><td><b>${esc(j.store.name)}</b></td><td><code>${j.store.connection}</code></td><td>${j.type}</td><td>${j.schedule}</td><td>${j.store.status==='Connected'?'Imported dataset':'—'}</td><td>${j.store.status==='Connected'?badge('Imported snapshot','blue'):badge('Preview only','gray')}</td></tr>`).join('')}</tbody></table></div></div>`;}"
rep(old_sync, new_sync, label='sync center snapshot truth')

rep("const coverage=[['Amazon Ads Rows',fmtInt(rows.length),'45 fields normalized','green'],['Unified Transactions',fmtInt(state.financeRows.length),'Financial ledger rows','green'],['Connected Stores','1 / 3','2 stores awaiting authorization','amber'],['Search Terms'", "const coverage=[['Amazon Ads Rows',fmtInt(rows.length),'45 fields normalized','green'],['Unified Transactions',fmtInt(state.financeRows.length),'Financial ledger rows','green'],['Data Workspaces','1 / 3','Store 01 imported data · Store 02/03 preview','amber'],['Search Terms'", label='data health workspace status')
rep("${s.status==='Connected'?badge('Connected','green'):badge('Workspace only','gray')}", "${s.status==='Connected'?badge('Data loaded','blue'):badge('Workspace preview','gray')}", label='store settings status')

path.write_text(text, encoding='utf-8')
