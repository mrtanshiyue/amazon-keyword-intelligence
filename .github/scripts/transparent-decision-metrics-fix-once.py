from pathlib import Path
p=Path('growth-workspaces.js')
text=p.read_text()
old="</div>`}}if(page==='inventory-risk'){"
new="</div>`}if(page==='inventory-risk'){"
if text.count(old)!=1:
    raise SystemExit(f'operationsPanel boundary expected once, found {text.count(old)}')
p.write_text(text.replace(old,new,1))
