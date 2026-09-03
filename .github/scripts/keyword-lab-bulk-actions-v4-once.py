from pathlib import Path
import runpy

runpy.run_path('.github/scripts/keyword-lab-bulk-actions-v3-once.py', run_name='__main__')

p = Path('tests/keyword-lab.test.mjs')
text = p.read_text()
old = "  assert.match(app, /stageKeywordAsset,render,/);"
new = "  assert.match(app, /stageKeywordAsset,stageKeywordAssets,trackKeywords,stageNegativeCandidates,render,/);"
count = text.count(old)
if count != 1:
    raise SystemExit(f'Keyword Lab bridge regression contract: expected one match, found {count}')
p.write_text(text.replace(old, new, 1))
