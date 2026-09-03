from pathlib import Path
import runpy

runpy.run_path('.github/scripts/keyword-lab-bulk-actions-v2-once.py', run_name='__main__')

p = Path('keyword-lab-view.js')
text = p.read_text()
old = "const PUBLIC_API={STORAGE_KEY,MAX_PRESETS,FILTER_KEYS,COLUMN_CATALOG,DEFAULT_SORT,clean,modeId,catalog,allowedKeys,normalizeColumns,moveColumn,normalizeSort,normalizeFilterSnapshot,normalizePreset,normalizeState,upsertPreset,deletePreset,rowValue,sortRows,csvQuote,rowsToCsv};"
new = "const PUBLIC_API={STORAGE_KEY,MAX_PRESETS,FILTER_KEYS,COLUMN_CATALOG,DEFAULT_SORT,clean,modeId,catalog,allowedKeys,normalizeColumns,moveColumn,normalizeSort,normalizeFilterSnapshot,normalizePreset,normalizeState,upsertPreset,deletePreset,rowValue,sortRows,csvQuote,rowsToCsv,normalizeKeywordSelection};"
count = text.count(old)
if count != 1:
    raise SystemExit(f'public test API export: expected one match, found {count}')
p.write_text(text.replace(old, new, 1))
