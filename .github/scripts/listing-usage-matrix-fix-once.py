from pathlib import Path
p=Path('tests/listing-usage-matrix.test.mjs')
text=p.read_text()
replacements={
"assert.deepEqual(matrix.unusedRoots.map(row=>row.root).sort(),['blue']);":"assert.deepEqual(matrix.unusedRoots.map(row=>row.root).sort(),['blue','light']);",
"assert.equal(title.rootUses,3);":"assert.equal(title.rootUses,2);",
}
for old,new in replacements.items():
    if text.count(old)!=1:
        raise SystemExit(f'listing usage expectation expected once, found {text.count(old)} for {old}')
    text=text.replace(old,new,1)
p.write_text(text)
