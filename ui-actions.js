(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const STORE_WORKSPACES_KEY = 'keywordos_v9_store_workspaces';
  const DEFAULT_STORE_WORKSPACES = [
    { id: 'store-a', code: 'US01', name: 'YTDBNS-US-01', marketplace: 'Amazon.com', flag: '🇺🇸', hasData: true, source: 'Imported Amazon Ads dataset', builtIn: true },
    { id: 'store-b', code: 'US02', name: 'STORE-US-02', marketplace: 'Amazon.com', flag: '🇺🇸', hasData: false, source: 'No data', builtIn: true },
    { id: 'store-c', code: 'US03', name: 'STORE-US-03', marketplace: 'Amazon.com', flag: '🇺🇸', hasData: false, source: 'No data', builtIn: true }
  ];
  let localOpenStoreId = '';

  function pageTitle() {
    return ($('#page-title')?.textContent || '').trim();
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function storeWorkspaces() {
    const saved = loadJson(STORE_WORKSPACES_KEY, []);
    const byId = new Map(Array.isArray(saved) ? saved.filter(Boolean).map((store) => [store.id, store]) : []);
    const builtIns = DEFAULT_STORE_WORKSPACES.map((store) => ({ ...store, ...(byId.get(store.id) || {}) }));
    const custom = [...byId.values()].filter((store) => !DEFAULT_STORE_WORKSPACES.some((item) => item.id === store.id));
    return [...builtIns, ...custom].map((store) => ({
      ...store,
      marketplace: store.marketplace || 'Amazon.com',
      flag: store.flag || '🇺🇸',
      hasData: store.id === 'store-a',
      source: store.id === 'store-a' ? 'Imported Amazon Ads dataset' : 'No data'
    }));
  }

  function saveStoreWorkspaces(stores) {
    try {
      localStorage.setItem(STORE_WORKSPACES_KEY, JSON.stringify(stores));
      return true;
    } catch {
      return false;
    }
  }

  function storeById(id) {
    return storeWorkspaces().find((store) => store.id === id) || null;
  }

  function selectedStoreId() {
    return $('#profile-select')?.value || 'global';
  }

  function syncBuiltInStoreOptions() {
    const select = $('#profile-select');
    if (!select) return;
    for (const store of storeWorkspaces().filter((item) => item.builtIn)) {
      const option = [...select.options].find((item) => item.value === store.id);
      if (!option) continue;
      const next = `${store.name} · ${store.marketplace}${store.hasData ? '' : ' · No data'}`;
      if (option.textContent !== next) option.textContent = next;
    }
  }

  function csvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  function download(name, content) {
    const blob = new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function safeFilePart(value) {
    return String(value || 'KeywordOS')
      .replace(/[^a-z0-9-_]+/gi, '_')
      .replace(/^_+|_+$/g, '') || 'KeywordOS';
  }

  function exportTable(table) {
    const headers = $$('thead th', table);
    const included = headers
      .map((header, index) => ({ header, index }))
      .filter(({ header }) => !header.classList.contains('check-col'));

    const rows = [];
    rows.push(included.map(({ header }) => csvCell(header.textContent.trim())).join(','));

    $$('tbody tr', table)
      .filter((row) => !row.hidden && row.style.display !== 'none')
      .forEach((row) => {
        const cells = $$('td', row);
        if (!cells.length) return;
        rows.push(included.map(({ index }) => csvCell(cells[index]?.textContent.trim() || '')).join(','));
      });

    const date = new Date().toISOString().slice(0, 10);
    download(`KeywordOS_${safeFilePart(pageTitle())}_${date}.csv`, rows.join('\n'));
  }

  function exportWordFrequency(card) {
    const rows = [['Word', 'Frequency']];
    $$('.word-chip', card).forEach((chip) => {
      const count = $('b', chip)?.textContent.trim() || '';
      const word = chip.childNodes[0]?.textContent?.trim() || chip.textContent.replace(count, '').trim();
      rows.push([word, count]);
    });
    download(
      `KeywordOS_Word_Frequency_${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((row) => row.map(csvCell).join(',')).join('\n')
    );
  }

  function filterTable(input) {
    const workspace = input.closest('.data-workspace') || $('#content');
    const table = $('table.data-table', workspace);
    if (!table) return;
    const query = input.value.trim().toLowerCase();
    $$('tbody tr', table).forEach((row) => {
      row.hidden = Boolean(query) && !row.textContent.toLowerCase().includes(query);
    });
  }

  function isLocalTableSearch() {
    return false;
  }

  function cycleConflictRisk(button) {
    const modes = ['All', 'High', 'Medium'];
    const current = button.textContent.replace(/^Risk:\s*/i, '').replace(/\s*⌄$/, '').trim();
    const next = modes[(modes.indexOf(current) + 1) % modes.length] || 'All';
    button.textContent = `Risk: ${next} ⌄`;

    const table = $('table.data-table', button.closest('.data-workspace') || $('#content'));
    if (!table) return;
    $$('tbody tr', table).forEach((row) => {
      const risk = row.cells?.[1]?.textContent.trim() || '';
      row.hidden = next !== 'All' && !risk.includes(next);
    });
  }

  function openWorkspaceSettings() {
    const target = $('#sidebar-nav [data-page="settings"]') || $('.side-link[data-page="settings"]');
    target?.click();
  }

  function disableButton(button, title) {
    if (!button || button.dataset.uiCapabilityHandled === '1') return;
    button.dataset.uiCapabilityHandled = '1';
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.title = title;
  }

  function closeLocalModal() {
    const root = $('#modal-root');
    if (root) root.innerHTML = '';
  }

  function nextStoreCode(stores) {
    const used = new Set(stores.map((store) => store.code));
    for (let index = 1; index < 100; index += 1) {
      const code = `US${String(index).padStart(2, '0')}`;
      if (!used.has(code)) return code;
    }
    return `US${Date.now().toString().slice(-2)}`;
  }

  function openStoreEditor(store = null) {
    const root = $('#modal-root');
    if (!root) return;
    const creating = !store;
    const stores = storeWorkspaces();
    const draft = store || {
      id: `local-store-${Date.now()}`,
      code: nextStoreCode(stores),
      name: '',
      marketplace: 'Amazon.com',
      flag: '🇺🇸',
      hasData: false,
      source: 'No data',
      builtIn: false
    };
    root.innerHTML = `<div class="modal-wrap" id="local-store-modal"><div class="modal"><div class="modal-header"><h2>${creating ? 'Create Store Workspace' : 'Edit Store Workspace'}</h2><button class="drawer-close" id="local-store-close">×</button></div><div class="modal-body"><label class="field"><span>Workspace name</span><input id="local-store-name" class="input" maxlength="80" value="${escapeHtml(draft.name)}" placeholder="e.g. YTDBNS-US-04"></label><label class="field top-gap"><span>Internal code</span><input class="input" value="${escapeHtml(draft.code)}" disabled aria-disabled="true"></label><label class="field top-gap"><span>Marketplace</span><select id="local-store-marketplace" class="select"><option value="Amazon.com" selected>Amazon.com</option></select></label><div class="notice-banner top-gap"><b>Local workspace only.</b> Saving this workspace does not connect Amazon, create OAuth credentials, or copy data from another Store.</div><div id="local-store-error" class="small" style="margin-top:8px;color:#b42318"></div></div><div class="modal-footer"><button class="btn" id="local-store-cancel">Cancel</button><button class="btn primary" id="local-store-save">${creating ? 'Create Workspace' : 'Save Changes'}</button></div></div></div>`;
    $('#local-store-close')?.addEventListener('click', closeLocalModal);
    $('#local-store-cancel')?.addEventListener('click', closeLocalModal);
    $('#local-store-save')?.addEventListener('click', () => {
      const name = ($('#local-store-name')?.value || '').trim();
      const error = $('#local-store-error');
      if (!name) {
        if (error) error.textContent = 'Workspace name is required.';
        $('#local-store-name')?.focus();
        return;
      }
      const current = storeWorkspaces();
      const updated = { ...draft, name, marketplace: 'Amazon.com', hasData: draft.id === 'store-a', source: draft.id === 'store-a' ? 'Imported Amazon Ads dataset' : 'No data' };
      const index = current.findIndex((item) => item.id === updated.id);
      if (index >= 0) current[index] = updated;
      else current.push(updated);
      if (!saveStoreWorkspaces(current)) {
        if (error) error.textContent = 'Browser storage is unavailable. Workspace was not saved.';
        return;
      }
      closeLocalModal();
      syncBuiltInStoreOptions();
      renderLocalStoreAdmin();
    });
    $('#local-store-name')?.focus();
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]));
  }

  function renderLocalStoreAdmin() {
    if (pageTitle() !== 'Stores') return;
    const content = $('#content');
    if (!content) return;
    const stores = storeWorkspaces();
    content.innerHTML = `<div id="local-store-workspace-admin"><div class="settings-intro"><div><h2>Store Workspaces</h2><p>Manage local Store metadata independently from Amazon authorization.</p></div><button class="btn primary" id="local-add-store">＋ Add Store</button></div><div class="notice-banner"><b>Local management only.</b> Store workspaces persist in this browser. Amazon OAuth, advertiser binding, live sync and remote writes remain disabled.</div><div class="store-admin-grid top-gap">${stores.map((store) => `<div class="admin-store-card"><div class="admin-store-head"><span class="store-flag">${store.flag}</span><div><b>${escapeHtml(store.name)}</b><small>${escapeHtml(store.marketplace)} · Internal code ${escapeHtml(store.code)}</small></div><span class="badge ${store.hasData ? 'blue' : 'gray'}">${store.hasData ? 'Data loaded' : 'No data'}</span></div><div class="admin-fields"><div><span>Data source</span><b>${escapeHtml(store.source)}</b></div><div><span>Amazon API</span><b>Disabled</b></div><div><span>Authorization</span><b>Deferred</b></div><div><span>Persistence</span><b>Browser local</b></div></div><div class="admin-actions"><button class="btn secondary" data-local-store-open="${escapeHtml(store.id)}">Open Workspace</button><button class="btn ghost" data-local-store-edit="${escapeHtml(store.id)}">Edit</button>${store.builtIn ? '' : `<button class="btn ghost" data-local-store-remove="${escapeHtml(store.id)}">Remove</button>`}</div></div>`).join('')}</div></div>`;
    $('#local-add-store')?.addEventListener('click', () => openStoreEditor());
    $$('[data-local-store-edit]').forEach((button) => button.addEventListener('click', () => openStoreEditor(storeById(button.dataset.localStoreEdit))));
    $$('[data-local-store-open]').forEach((button) => button.addEventListener('click', () => openLocalStoreWorkspace(button.dataset.localStoreOpen)));
    $$('[data-local-store-remove]').forEach((button) => button.addEventListener('click', () => removeLocalStore(button.dataset.localStoreRemove)));
  }

  function removeLocalStore(id) {
    const store = storeById(id);
    if (!store || store.builtIn) return;
    const root = $('#modal-root');
    if (!root) return;
    root.innerHTML = `<div class="modal-wrap"><div class="modal"><div class="modal-header"><h2>Remove Store Workspace</h2><button class="drawer-close" id="local-remove-close">×</button></div><div class="modal-body"><div class="notice-banner"><b>${escapeHtml(store.name)}</b> has no Store dataset in KeywordOS. Removing it deletes only this browser-local workspace metadata.</div></div><div class="modal-footer"><button class="btn" id="local-remove-cancel">Cancel</button><button class="btn danger" id="local-remove-confirm">Remove Workspace</button></div></div></div>`;
    $('#local-remove-close')?.addEventListener('click', closeLocalModal);
    $('#local-remove-cancel')?.addEventListener('click', closeLocalModal);
    $('#local-remove-confirm')?.addEventListener('click', () => {
      const next = storeWorkspaces().filter((item) => item.id !== id);
      if (!saveStoreWorkspaces(next)) return;
      closeLocalModal();
      if (localOpenStoreId === id) localOpenStoreId = '';
      renderLocalStoreAdmin();
    });
  }

  function setWorkspaceHeader(store) {
    const eyebrow = $('#page-eyebrow');
    const title = $('#page-title');
    const subtitle = $('#page-subtitle');
    const breadcrumb = $('#breadcrumb');
    const badge = $('#scope-mode-badge');
    if (eyebrow) eyebrow.textContent = 'STORES';
    if (title) title.textContent = 'Store Workspace';
    if (subtitle) subtitle.textContent = 'Local Store workspace metadata and data-source state.';
    if (breadcrumb) breadcrumb.textContent = `STORES / Store Workspace · ${store.name}`;
    if (badge) {
      badge.className = 'scope-mode-badge store';
      badge.textContent = `${store.code} · LOCAL`;
    }
  }

  function openLocalStoreWorkspace(id) {
    const store = storeById(id);
    if (!store) return;
    localOpenStoreId = id;
    if (store.id === 'store-a') {
      const select = $('#profile-select');
      if (select) {
        select.value = 'store-a';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }
    renderEmptyStoreWorkspace(store);
  }

  function renderEmptyStoreWorkspace(store) {
    const content = $('#content');
    if (!content) return;
    setWorkspaceHeader(store);
    content.innerHTML = `<div id="local-empty-store-workspace" data-local-store="${escapeHtml(store.id)}"><div class="scope-banner store"><div class="scope-lock">🔒</div><div><b>${escapeHtml(store.name)} · ${escapeHtml(store.marketplace)}</b><span>Local workspace · No Store dataset · Amazon API disabled</span></div><span class="scope-tag">LOCAL STORE</span></div><div class="workspace-hero"><div><span class="workspace-status"><i></i> Local workspace</span><h2>${store.flag} ${escapeHtml(store.name)}</h2><p>${escapeHtml(store.marketplace)} · No imported dataset · Amazon API disabled</p></div><div class="workspace-actions"><button class="btn secondary" data-local-store-edit="${escapeHtml(store.id)}">Edit Workspace</button><button class="btn primary" id="local-store-import">Import Data</button></div></div><div class="empty-state top-gap"><h3>No business data loaded for this Store</h3><p>KeywordOS will not copy, scale or simulate Store 01 data. Import a real Store dataset before advertising analytics or decisions are available.</p><button class="btn secondary" id="local-store-back">Back to Stores</button></div></div>`;
    $('[data-local-store-edit]')?.addEventListener('click', () => openStoreEditor(storeById(store.id)));
    $('#local-store-import')?.addEventListener('click', () => {
      localOpenStoreId = '';
      $('#import-top')?.click();
    });
    $('#local-store-back')?.addEventListener('click', () => {
      localOpenStoreId = '';
      $('#sidebar-nav [data-page="stores-settings"]')?.click();
    });
  }

  function markStoreWorkspaceTruth() {
    if (pageTitle() !== 'Store Workspace') return;
    if (localOpenStoreId) {
      const store = storeById(localOpenStoreId);
      if (store && !store.hasData && !$('#local-empty-store-workspace')) renderEmptyStoreWorkspace(store);
      return;
    }
    const id = selectedStoreId();
    const store = storeById(id);
    if (!store) return;
    if (!store.hasData) {
      if (!$('#local-empty-store-workspace')) renderEmptyStoreWorkspace(store);
      return;
    }
    const heading = $('.workspace-hero h2');
    const copy = $('.workspace-hero p');
    if (heading) {
      const next = `${store.flag} ${store.name}`;
      if (heading.textContent !== next) heading.textContent = next;
    }
    if (copy) {
      const next = `${store.marketplace} · Imported dataset · Amazon API disabled`;
      if (copy.textContent !== next) copy.textContent = next;
    }
    const bannerTitle = $('.scope-banner.store b');
    const bannerCopy = $('.scope-banner.store span:not(.scope-tag)');
    if (bannerTitle) {
      const next = `${store.name} · ${store.marketplace}`;
      if (bannerTitle.textContent !== next) bannerTitle.textContent = next;
    }
    if (bannerCopy) {
      const next = 'Imported dataset · Browser workspace · Amazon API disabled';
      if (bannerCopy.textContent !== next) bannerCopy.textContent = next;
    }
  }

  function renderAmazonConnectionsTruth() {
    if (pageTitle() !== 'Amazon Connections' || $('#local-amazon-connections')) return;
    const content = $('#content');
    if (!content) return;
    const stores = storeWorkspaces();
    content.innerHTML = `<div id="local-amazon-connections"><div class="connection-policy"><div class="policy-icon">🔒</div><div><h3>Amazon authorization is deferred</h3><p>Store workspaces are local. OAuth, advertiser binding, refresh tokens, live sync and Amazon writes are not enabled in this phase.</p></div><span class="badge gray">API DISABLED</span></div><div class="connection-grid">${stores.map((store) => `<div class="connection-card"><div class="connection-card-head"><div class="amazon-mark">a</div><div><span class="connection-kicker">AMAZON ADS</span><h3>${escapeHtml(store.name)}</h3><p>${store.flag} ${escapeHtml(store.marketplace)}</p></div><span class="badge gray">Not connected</span></div><div class="connection-details"><p><span>Local data</span><b>${store.hasData ? 'Data loaded' : 'No data'}</b></p><p><span>Amazon authorization</span><b>Not enabled</b></p><p><span>Advertiser binding</span><b>Unavailable until OAuth</b></p><p><span>Live sync</span><b>API required</b></p></div><div class="connection-footer"><button class="btn primary" disabled aria-disabled="true" title="Authentication and Amazon OAuth are deferred until #17">Connect Amazon · Deferred</button><button class="btn ghost" data-local-store-edit="${escapeHtml(store.id)}">Edit Local Workspace</button></div></div>`).join('')}</div></div>`;
    $$('[data-local-store-edit]').forEach((button) => button.addEventListener('click', () => openStoreEditor(storeById(button.dataset.localStoreEdit))));
  }

  function markSettingsTruth() {
    if (pageTitle() !== 'Workspace Settings') return;
    $$('td,span,b').forEach((node) => {
      if (node.childElementCount === 0 && node.textContent.trim() === 'Connected locally') {
        node.textContent = 'Data loaded locally';
      }
    });
  }

  function markRuleTruth() {
    if (pageTitle() !== 'Rules & Automation') return;

    const run = $('#run-rules');
    if (run?.textContent.includes('Run Executable Rules')) return;
    if (run) {
      run.textContent = '▶ Run Default Thresholds';
      run.title = 'Runs built-in harvest and negative thresholds. Saved custom rule definitions are not evaluated yet.';
    }

    const create = $('#create-rule');
    if (create) {
      create.textContent = '＋ Save Rule Definition';
      create.title = 'Stores a local rule definition for review; it does not create a live Amazon automation.';
    }

    const head = $('.rules-head');
    if (head && !$('#rule-engine-truth')) {
      const notice = document.createElement('div');
      notice.id = 'rule-engine-truth';
      notice.className = 'notice-banner';
      notice.style.margin = '0 0 10px';
      notice.innerHTML = '<b>Rule engine status:</b> Run Default Thresholds evaluates the built-in Harvest and Negative thresholds. Saved custom rule definitions are configuration-only in the current test runtime.';
      head.insertAdjacentElement('afterend', notice);
    }

    const activeTab = $('.section-tab.active')?.textContent.trim();
    if (activeTab === 'Apply Rules') {
      $$('.rule-page .toolbar button').forEach((button) => {
        disableButton(button, 'Campaign-level automation controls are not active in the current test runtime.');
      });
      $$('.rule-page .table-scroll input[type="checkbox"]').forEach((input) => {
        input.disabled = true;
        input.title = 'Campaign rule assignment is not active in the current test runtime.';
      });
      $$('.rule-page .table-scroll .toggle').forEach((toggle) => {
        toggle.setAttribute('aria-disabled', 'true');
        toggle.style.pointerEvents = 'none';
        toggle.style.opacity = '.45';
        toggle.title = 'Bid automation is not active in the current test runtime.';
      });
    }
  }

  function markStaticShellTruth() {
    disableButton($('.sidebar-collapse'), 'Sidebar collapse is not implemented in the current test runtime.');
    disableButton($('#tool-switcher'), 'Advertising is the only active tool workspace in the current test runtime.');
    disableButton($('.product-menu'), 'Product suite switching is not implemented in the current test runtime.');
    $$('.suite-nav button').forEach((button) => disableButton(button, 'Suite navigation is preview-only in this runtime.'));
    $$('.header-action').forEach((button) => disableButton(button, 'This global header action is not implemented in the current test runtime.'));
    $$('.side-link:not([data-page])').forEach((button) => disableButton(button, 'Help Center integration is not implemented in the current test runtime.'));
  }

  function markKnownInactiveControls() {
    syncBuiltInStoreOptions();
    if (pageTitle() === 'Stores') {
      if (!$('#local-store-workspace-admin')) renderLocalStoreAdmin();
      return;
    }
    markStoreWorkspaceTruth();
    renderAmazonConnectionsTruth();
    markSettingsTruth();
    markRuleTruth();
  }

  document.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !isLocalTableSearch(input)) return;
    filterTable(input);
  });

  document.addEventListener('change', (event) => {
    if (event.target?.id === 'profile-select') localOpenStoreId = '';
  }, true);

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button || button.disabled) return;
    const text = button.textContent.trim();

    if (button.dataset.page) localOpenStoreId = '';

    if (text === 'Thresholds' && pageTitle() === 'Negative Library') {
      event.preventDefault();
      openWorkspaceSettings();
      return;
    }

    if (/^Risk:/.test(text) && pageTitle() === 'Store Conflict Guard') {
      event.preventDefault();
      cycleConflictRisk(button);
      return;
    }

    if (pageTitle() === 'Cerebro' && text === 'Learn' && button.classList.contains('utility-link')) {
      event.preventDefault();
      $('#page-learn')?.click();
      return;
    }

    if (pageTitle() === 'Cerebro' && text === 'Common Words' && button.classList.contains('utility-link')) {
      event.preventDefault();
      $('.wordcloud')?.closest('.summary-card')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    if (pageTitle() === 'Cerebro' && text === '⌕ Search') {
      event.preventDefault();
      $('#research-query')?.focus();
      return;
    }

    if (pageTitle() === 'Cerebro' && text === '☷ Settings') {
      event.preventDefault();
      if (!$('#r-apply')) $('#research-toggle')?.click();
      $('#r-word-min')?.focus();
      return;
    }

    if (/Export/i.test(text) && !button.id) {
      event.preventDefault();
      const card = button.closest('.summary-card');
      if (card && $('.wordcloud', card)) {
        exportWordFrequency(card);
        return;
      }

      const workspace = button.closest('.data-workspace') || $('#content');
      const table = $('table.data-table', workspace);
      if (table) exportTable(table);
    }
  }, true);

  const observer = new MutationObserver(() => markKnownInactiveControls());

  function start() {
    markStaticShellTruth();
    markKnownInactiveControls();
    observer.observe($('#content') || document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
