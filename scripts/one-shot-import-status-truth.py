from pathlib import Path

path = Path('app.js')
text = path.read_text(encoding='utf-8')

replacements = [
    ("${state.adsPersistent?'Browser persisted':'Cloudflare seed'}", "${state.adsPersistent?'Browser persisted':state.adsImportedAt?'Session only':'Cloudflare seed'}", 1, 'Ads Import Center status'),
    ("${state.adsPersistent?'Browser persisted':'Cloudflare seed/session'}", "${state.adsPersistent?'Browser persisted':state.adsImportedAt?'Session only':'Cloudflare seed'}", 1, 'Ads Data Health status'),
    ("${state.financePersistent?'Browser persisted':'Cloudflare seed/session'}", "${state.financePersistent?'Browser persisted':state.financeImportedAt?'Session only':'Cloudflare seed'}", 2, 'Unified persistence status'),
    ("state.financePageNo=1;state.financeSearch='';const persisted=await persistWorkspaceDataset('finance'", "state.financePageNo=1;state.financeSearch='';state.financeImportPreview=null;const persisted=await persistWorkspaceDataset('finance'", 1, 'Unified preview cleanup'),
]

for old, new, expected, label in replacements:
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected} match(es), found {count}')
    text = text.replace(old, new)

path.write_text(text, encoding='utf-8')
