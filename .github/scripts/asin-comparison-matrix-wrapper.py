from pathlib import Path

script = Path('.github/scripts/asin-comparison-matrix-once.py')
text = script.read_text()
needle = "replace_once('local-operations-actions.js', old, new, 'backup ASIN comparison state')"
replacement = "p=Path('local-operations-actions.js'); text=p.read_text(); index=text.find(old);\nif index<0: raise SystemExit('backup ASIN comparison state: whitelist anchor missing');\np.write_text(text[:index]+text[index:].replace(old,new,1))"
if text.count(needle) != 1:
    raise SystemExit(f'backup wrapper: expected one call, found {text.count(needle)}')
patched = text.replace(needle, replacement, 1)
exec(compile(patched, str(script), 'exec'), {'__name__': '__main__'})
