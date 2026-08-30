from pathlib import Path

path = Path('app.js')
text = path.read_text(encoding='utf-8')

old = "async function resetPersistentDataset(kind){try{await workspaceDbDelete(kind);}catch(err){console.warn('KeywordOS persistent dataset reset skipped',err);}if(kind==='ads'){state.currentRows=clone(SEED.rows||[]);state.adsSource='Cloudflare seed · 202606.csv';state.adsImportedAt='';state.adsPersistent=false;state.importPreview=null;state.range='30';$('#range-select').value='30';logEvent('Data Import Reset','Amazon Ads','Restored Cloudflare seed dataset','Manual','Import');toast('Amazon Ads workspace reset to Cloudflare seed','success');state.page='import';render();return;}state.financeRows=clone(FIN_SEED.rows||[]);state.financeSource=FIN_SEED.meta?.source||'Unified Report';state.financeImportedAt='';state.financePersistent=false;state.financePageNo=1;state.financeSearch='';logEvent('Unified Report Reset','Unified Transaction','Restored Cloudflare seed dataset','Manual','Import');toast('Unified Report reset to Cloudflare seed','success');render();}"
new = "async function resetPersistentDataset(kind){try{await workspaceDbDelete(kind);}catch(err){console.warn('KeywordOS persistent dataset reset failed',err);toast('Unable to clear the browser-persisted dataset; reset cancelled','error');return;}if(kind==='ads'){state.currentRows=clone(SEED.rows||[]);state.adsSource='Cloudflare seed · 202606.csv';state.adsImportedAt='';state.adsPersistent=false;state.importPreview=null;state.range='30';$('#range-select').value='30';logEvent('Data Import Reset','Amazon Ads','Restored Cloudflare seed dataset','Manual','Import');toast('Amazon Ads workspace reset to Cloudflare seed','success');state.page='import';render();return;}state.financeRows=clone(FIN_SEED.rows||[]);state.financeSource=FIN_SEED.meta?.source||'Unified Report';state.financeImportedAt='';state.financePersistent=false;state.financeImportPreview=null;state.financePageNo=1;state.financeSearch='';logEvent('Unified Report Reset','Unified Transaction','Restored Cloudflare seed dataset','Manual','Import');toast('Unified Report reset to Cloudflare seed','success');render();}"

count = text.count(old)
if count != 1:
    raise SystemExit(f'Expected generated reset function once, found {count}')

text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
