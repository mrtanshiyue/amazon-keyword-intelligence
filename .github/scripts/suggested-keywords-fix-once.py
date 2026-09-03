from pathlib import Path

# New Suggested Keywords module intentionally sits between Keyword Library and navigation in build order.
p=Path('tests/keyword-library-state.test.mjs')
text=p.read_text()
old="  assert.match(pkg,/keyword-lab-view\\.js keyword-library-state\\.js navigation-taxonomy\\.js/);"
new="  assert.match(pkg,/keyword-lab-view\\.js keyword-library-state\\.js suggested-keywords\\.js navigation-taxonomy\\.js/);"
if text.count(old)!=1:
    raise SystemExit(f'keyword library build-order assertion expected once, found {text.count(old)}')
p.write_text(text.replace(old,new,1))

# The generated test reads package.json as text; parse it before accessing scripts.
p=Path('tests/suggested-keywords.test.mjs')
text=p.read_text()
old="  const [app,index,pkg]=await Promise.all([\n    readFile(new URL('../app.js',import.meta.url),'utf8'),\n    readFile(new URL('../index.html',import.meta.url),'utf8'),\n    readFile(new URL('../package.json',import.meta.url),'utf8')\n  ]);\n  assert.ok(index.indexOf('<script src=\"suggested-keywords.js\"></script>')<index.indexOf('<script src=\"app.js\"></script>'));\n  assert.match(pkg.scripts.check,/node --check suggested-keywords\\.js/);\n  assert.match(pkg.scripts.build,/suggested-keywords\\.js/);"
new="  const [app,index,pkgText]=await Promise.all([\n    readFile(new URL('../app.js',import.meta.url),'utf8'),\n    readFile(new URL('../index.html',import.meta.url),'utf8'),\n    readFile(new URL('../package.json',import.meta.url),'utf8')\n  ]),pkg=JSON.parse(pkgText);\n  assert.ok(index.indexOf('<script src=\"suggested-keywords.js\"></script>')<index.indexOf('<script src=\"app.js\"></script>'));\n  assert.match(pkg.scripts.check,/node --check suggested-keywords\\.js/);\n  assert.match(pkg.scripts.build,/suggested-keywords\\.js/);"
if text.count(old)!=1:
    raise SystemExit(f'suggested package parse assertion expected once, found {text.count(old)}')
p.write_text(text.replace(old,new,1))
