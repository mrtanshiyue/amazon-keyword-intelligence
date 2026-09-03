from pathlib import Path
import re


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}")
    p.write_text(text.replace(old, new, 1))


# app.js: sidebar rendering is the explicit synchronization point. No observer loop.
replace_once(
    'app.js',
    """  }).join('')}</div>`).join('');
}
function setMeta(){""",
    """  }).join('')}</div>`).join('');
  window.KeywordOSGrowth?.ensureNavigation?.();
  window.KeywordOSNavigationTaxonomy?.organizeGrowthNavigation?.();
}
function setMeta(){"""
)

# navigation-taxonomy.js: canonical organizer deduplicates page buttons and no longer observes
# its own DOM mutations / translations.
replace_once(
    'navigation-taxonomy.js',
    "const sections=sectionMap(nav),buttons=[...nav.querySelectorAll('[data-page]')];for(const button of buttons){const raw=button.dataset.page||'';if(registry.isLegacy(raw)){hideLegacyButton(button);continue;}const record=registry.page(raw);if(!record||!record.nav||!record.sidebarGroup)continue;decorateButton(button,record);",
    "const sections=sectionMap(nav),buttons=[...nav.querySelectorAll('[data-page]')],seenPages=new Set();for(const button of buttons){const raw=button.dataset.page||'';if(registry.isLegacy(raw)){hideLegacyButton(button);continue;}const record=registry.page(raw);if(!record||!record.nav||!record.sidebarGroup)continue;if(seenPages.has(record.id)){button.remove();continue;}seenPages.add(record.id);decorateButton(button,record);"
)
replace_once(
    'navigation-taxonomy.js',
    "function start(){if(!root?.document)return;const boot=()=>{const nav=root.document.getElementById('sidebar-nav');if(!nav)return;schedule();new MutationObserver(schedule).observe(nav,{childList:true,subtree:true});};root.document.readyState==='loading'?root.document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();}",
    "function start(){if(!root?.document)return;const boot=()=>{const nav=root.document.getElementById('sidebar-nav');if(!nav)return;schedule();};root.document.readyState==='loading'?root.document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();}"
)

# growth-workspaces.js: replace the legacy reinjection loop with an idempotent ensure function.
p = Path('growth-workspaces.js')
text = p.read_text()
pattern = re.compile(r"function injectNav\(\)\{.*?\}\nfunction start\(\)", re.S)
match = pattern.search(text)
if not match:
    raise SystemExit('growth-workspaces.js: injectNav block not found')
new_block = r'''const GROWTH_NAV_ITEMS=Object.freeze([
  ['product-master','▣','Product Master'],['keyword-workflow','◎','Keyword Workflow'],['product-360','◉','Product 360'],['search-funnel','⌁','Search Funnel'],['asin-comparison','⇄','ASIN Compare'],['rank-intelligence','↗','Rank & Index'],['listing-optimizer','✎','Listing Optimizer'],['inventory-risk','▦','Inventory'],['action-outcomes','◎','Action Outcomes'],['competitor-snapshots','◌','Competitors'],['review-evidence','☷','Reviews'],['anomaly-center','⚠','Anomaly Center']
]);
function injectNav(){const nav=$('#sidebar-nav');if(!nav)return false;const missing=GROWTH_NAV_ITEMS.filter(([id])=>!nav.querySelector(`[data-page="${id}"]`));if(!missing.length)return false;let section=$('#growth-nav');if(!section){section=document.createElement('div');section.className='nav-section';section.id='growth-nav';section.innerHTML='<div class="nav-section-title">GROWTH</div>';nav.appendChild(section)}section.insertAdjacentHTML('beforeend',missing.map(x=>`<button class="nav-item" data-page="${x[0]}" data-growth-page="${x[0]}" aria-label="${x[2]}"><span class="nav-icon">${x[1]}</span><span class="nav-label">${x[2]}</span></button>`).join(''));$$('[data-growth-page]',section).filter(b=>!b.dataset.growthNavBound).forEach(b=>{b.dataset.growthNavBound='1';b.addEventListener('click',e=>{e.stopPropagation();render(b.dataset.growthPage)})});return true}
function start()'''
text = text[:match.start()] + new_block + text[match.end():]
p.write_text(text)

replace_once(
    'growth-workspaces.js',
    "await hydrateGrowthDatasets();injectNav();bindAlertTrigger();",
    "await hydrateGrowthDatasets();injectNav();root.KeywordOSNavigationTaxonomy?.organizeGrowthNavigation?.();bindAlertTrigger();"
)
replace_once(
    'growth-workspaces.js',
    ";new MutationObserver(injectNav).observe($('#sidebar-nav')||document.body,{childList:true})",
    ""
)
replace_once(
    'growth-workspaces.js',
    "refreshAlertIndicator,start,render};",
    "refreshAlertIndicator,ensureNavigation:injectNav,start,render};"
)

# Regression contract: prevent any future pair of sidebar observers from fighting again.
test_path = Path('tests/navigation-taxonomy.test.mjs')
test_text = test_path.read_text()
addition = r'''

test('sidebar navigation is explicitly synchronized without MutationObserver feedback loops', async () => {
  const [taxonomySource, growthSource, appSource] = await Promise.all([
    readFile(new URL('../navigation-taxonomy.js', import.meta.url), 'utf8'),
    readFile(new URL('../growth-workspaces.js', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);
  assert.doesNotMatch(taxonomySource, /new MutationObserver\(schedule\).*sidebar-nav/);
  assert.doesNotMatch(growthSource, /new MutationObserver\(injectNav\)/);
  assert.match(taxonomySource, /seenPages\.has\(record\.id\)\)\{button\.remove\(\);continue;\}/);
  assert.match(growthSource, /const missing=GROWTH_NAV_ITEMS\.filter/);
  assert.match(growthSource, /ensureNavigation:injectNav/);
  assert.match(appSource, /KeywordOSGrowth\?\.ensureNavigation\?\.\(\);/);
  assert.match(appSource, /KeywordOSNavigationTaxonomy\?\.organizeGrowthNavigation\?\.\(\);/);
});
'''
if "sidebar navigation is explicitly synchronized without MutationObserver feedback loops" in test_text:
    raise SystemExit('navigation regression test already present')
test_path.write_text(test_text.rstrip() + addition)
