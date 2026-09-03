from pathlib import Path

p=Path('growth-workspaces.js')
text=p.read_text()
old='Sending keywords here never edits those fields automatically.'
new='Sending keywords here never edits Title, Bullets, Description or Backend Search Terms automatically.'
if text.count(old)!=1:
    raise SystemExit(f'listing safety copy expected once, found {text.count(old)}')
p.write_text(text.replace(old,new,1))

p=Path('tests/listing-keyword-bank.test.mjs')
text=p.read_text()
old="  assert.match(workspace,/never edits those fields automatically/i);"
new="  assert.match(workspace,/never edits Title, Bullets, Description or Backend Search Terms automatically/);"
if text.count(old)!=1:
    raise SystemExit(f'listing bank safety assertion expected once, found {text.count(old)}')
p.write_text(text.replace(old,new,1))
