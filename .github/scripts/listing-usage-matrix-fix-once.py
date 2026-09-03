from pathlib import Path
p=Path('tests/listing-usage-matrix.test.mjs')
text=p.read_text()
old="assert.deepEqual(matrix.unusedRoots.map(row=>row.root).sort(),['blue']);"
new="assert.deepEqual(matrix.unusedRoots.map(row=>row.root).sort(),['blue','light']);"
if text.count(old)!=1:
    raise SystemExit(f'listing usage unused-root expectation expected once, found {text.count(old)}')
p.write_text(text.replace(old,new,1))
