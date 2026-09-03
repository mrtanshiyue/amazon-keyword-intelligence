from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}")
    p.write_text(text.replace(old, new, 1))


path = Path('growth-consistency-actions.js')
text = path.read_text()

old = """  function badgeClass(risk) {
    return risk === 'Critical' ? 'red' : risk === 'Low' || risk === 'Damaged' ? 'amber' : risk === 'Healthy' ? 'green' : 'gray';
  }

  function queueBySku(rows) {
"""
new = """  function badgeClass(risk) {
    return risk === 'Critical' ? 'red' : risk === 'Low' || risk === 'Damaged' ? 'amber' : risk === 'Healthy' ? 'green' : 'gray';
  }

  function setBadge(cell, risk) {
    if (!cell) return false;
    const className = `badge ${badgeClass(risk)}`;
    const badge = cell.children.length === 1 && cell.firstElementChild?.matches?.('span.badge')
      ? cell.firstElementChild
      : null;
    if (!badge) {
      const next = document.createElement('span');
      next.className = className;
      next.textContent = risk;
      cell.replaceChildren(next);
      return true;
    }
    let changed = false;
    if (badge.className !== className) { badge.className = className; changed = true; }
    if (badge.textContent !== risk) { badge.textContent = risk; changed = true; }
    return changed;
  }

  function queueBySku(rows) {
"""
if old not in text:
    raise SystemExit('growth-consistency-actions.js: badge anchor missing')
text = text.replace(old, new, 1)

old = """      setText(row.cells[7], model.daysCover == null ? '—' : model.daysCover.toFixed(1));
      if (row.cells[8]) row.cells[8].innerHTML = `<span class=\"badge ${badgeClass(model.risk)}\">${model.risk}</span>`;
      setText(row.cells[9], model.priority || '');
"""
new = """      setText(row.cells[7], model.daysCover == null ? '—' : model.daysCover.toFixed(1));
      setBadge(row.cells[8], model.risk);
      setText(row.cells[9], model.priority || '');
"""
if old not in text:
    raise SystemExit('growth-consistency-actions.js: inventory badge write anchor missing')
text = text.replace(old, new, 1)

old = """    const table = [...document.querySelectorAll('#content table.data-table')].find((candidate) => candidate.tHead?.rows?.[0]?.cells?.length === 4);
    if (!table?.tBodies?.[0]) return;
    [...table.tBodies[0].rows].forEach((row) => {
      if ((row.cells?.[0]?.textContent || '').trim().startsWith('Inventory ')) row.remove();
    });
    for (const item of rows) {
      const row = document.createElement('tr');
"""
new = """    const table = [...document.querySelectorAll('#content table.data-table')].find((candidate) => candidate.tHead?.rows?.[0]?.cells?.length === 4);
    if (!table?.tBodies?.[0]) return;
    const body = table.tBodies[0];
    const fingerprint = JSON.stringify(rows.map((item) => [item.sku || '', item.risk || '', item.daysCover ?? null, item.observedDays || 0]));
    const managed = [...body.querySelectorAll('tr[data-keywordos-inventory-anomaly=\"1\"]')];
    if (body.dataset.keywordosInventoryAnomalyFingerprint === fingerprint && managed.length === rows.length) return;
    [...body.rows].forEach((row) => {
      if (row.dataset.keywordosInventoryAnomaly === '1' || (row.cells?.[0]?.textContent || '').trim().startsWith('Inventory ')) row.remove();
    });
    for (const item of rows) {
      const row = document.createElement('tr');
      row.dataset.keywordosInventoryAnomaly = '1';
"""
if old not in text:
    raise SystemExit('growth-consistency-actions.js: anomaly rebuild anchor missing')
text = text.replace(old, new, 1)

old = """      row.append(signal, entity, evidence, severity);
      table.tBodies[0].appendChild(row);
    }
  }
"""
new = """      row.append(signal, entity, evidence, severity);
      body.appendChild(row);
    }
    body.dataset.keywordosInventoryAnomalyFingerprint = fingerprint;
  }
"""
if old not in text:
    raise SystemExit('growth-consistency-actions.js: anomaly append anchor missing')
text = text.replace(old, new, 1)

path.write_text(text)

# Regression contract: inventory/anomaly consistency patches must converge even though
# Import Workspace State observes the content subtree and redraws a top-level readiness card.
test_path = Path('tests/growth-consistency-actions.test.mjs')
test_text = test_path.read_text()
addition = r'''

test('inventory and anomaly DOM patches converge instead of feeding cross-observer redraw loops', async () => {
  const [source, importStates] = await Promise.all([
    readFile(new URL('../growth-consistency-actions.js', import.meta.url), 'utf8'),
    readFile(new URL('../import-workspace-states.js', import.meta.url), 'utf8')
  ]);
  assert.match(importStates, /observer\.observe\(content,\{childList:true,subtree:true\}\)/);
  assert.doesNotMatch(source, /row\.cells\[8\]\.innerHTML\s*=/);
  assert.match(source, /function setBadge\(cell, risk\)/);
  assert.match(source, /body\.dataset\.keywordosInventoryAnomalyFingerprint === fingerprint/);
  assert.match(source, /row\.dataset\.keywordosInventoryAnomaly = '1'/);
});
'''
if "inventory and anomaly DOM patches converge instead of feeding cross-observer redraw loops" in test_text:
    raise SystemExit('growth consistency observer regression test already present')
test_path.write_text(test_text.rstrip() + addition)
