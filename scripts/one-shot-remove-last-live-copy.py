from pathlib import Path

path = Path('app.js')
text = path.read_text(encoding='utf-8')

replacements = [
    ("${v8Kpi('Operating Net',fmtMoney(fin.operatingNet||0),'Unified Report · connected store','good')}", "${v8Kpi('Operating Net',fmtMoney(fin.operatingNet||0),'Unified Report · Store 01 data','good')}", 1, 'Operating Net source'),
    ("<small>${esc(s.connection)} · ${esc(s.sync)}</small>", "<small>${esc(s.connection)} · ${s.status==='Connected'?'Imported snapshot':'No data'}</small>", 1, 'Data Source Health recency'),
    ("`${t.orders} orders · ${fmtPct(t.acos)} ACoS in connected Store`", "`${t.orders} orders · ${fmtPct(t.acos)} ACoS in Store 01 dataset`", 1, 'global opportunity source'),
    ("${v8Kpi('Ad Spend',fmtMoney(m.spend),'Amazon Ads','')}${v8Kpi('Ad Sales',fmtMoney(m.sales),'Amazon Ads','')}", "${v8Kpi('Ad Spend',fmtMoney(m.spend),'Imported Ads data','')}${v8Kpi('Ad Sales',fmtMoney(m.sales),'Imported Ads data','')}", 1, 'Store workspace Ads source'),
]

for old, new, expected, label in replacements:
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected}, found {count}')
    text = text.replace(old, new)

path.write_text(text, encoding='utf-8')
