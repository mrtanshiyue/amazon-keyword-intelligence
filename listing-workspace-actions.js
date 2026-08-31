(() => {
  'use strict';

  const LISTING_PAGE = 'listing-workspace';
  const LISTING_HASH = '#page=listing-workspace';
  const MAX_EVIDENCE_ROWS = 16;
  const WORKSPACE_DB_NAME = 'keywordos_v9_workspace';
  const WORKSPACE_DATASET_STORE = 'datasets';

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function aggregateKeywordEvidence(rows) {
    const byTerm = new Map();
    for (const row of Array.isArray(rows) ? rows : []) {
      const term = String(row?.searchTerm || '').trim();
      if (!term) continue;
      const key = term.toLowerCase();
      const current = byTerm.get(key) || {
        term,
        impressions: 0,
        clicks: 0,
        orders: 0,
        spend: 0,
        sales: 0
      };
      current.impressions += number(row.impressions);
      current.clicks += number(row.clicks);
      current.orders += number(row.orders);
      current.spend += number(row.spend ?? row.cost);
      current.sales += number(row.sales);
      byTerm.set(key, current);
    }
    return [...byTerm.values()]
      .map((item) => ({
        ...item,
        acos: item.sales > 0 ? item.spend / item.sales : null,
        cvr: item.clicks > 0 ? item.orders / item.clicks : null
      }))
      .sort((a, b) =>
        b.orders - a.orders ||
        b.sales - a.sales ||
        b.clicks - a.clicks ||
        a.term.localeCompare(b.term)
      );
  }

  function composeSearchTerms(terms) {
    const seen = new Set();
    const result = [];
    for (const value of Array.isArray(terms) ? terms : []) {
      const term = String(value || '').trim();
      const key = term.toLowerCase();
      if (!term || seen.has(key)) continue;
      seen.add(key);
      result.push(term);
    }
    return result.join(' ');
  }

  function draftStatus(draft) {
    const values = [draft?.title, draft?.bullets, draft?.searchTerms].map((value) => String(value || '').trim());
    const completed = values.filter(Boolean).length;
    return { completed, total: 3, ready: completed === 3 };
  }

  function chooseListingDataset(record, fallbackRows, validateRows) {
    const fallback = Array.isArray(fallbackRows) ? fallbackRows : [];
    if (record?.schemaVersion === 1 && Array.isArray(record.rows) && record.rows.length && typeof validateRows === 'function') {
      const validation = validateRows('ads', record.rows);
      if (validation?.ok) {
        return {
          rows: record.rows,
          source: String(record.source || 'Browser persisted Ads dataset'),
          mode: 'Browser persisted'
        };
      }
    }
    return { rows: fallback, source: 'Bundled Ads dataset', mode: 'Bundled fallback' };
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.KeywordOSListingWorkspaceTest = {
      aggregateKeywordEvidence,
      composeSearchTerms,
      draftStatus,
      chooseListingDataset
    };
  }

  if (typeof document === 'undefined') return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const listingDraft = { title: '', bullets: '', searchTerms: '' };
  const selectedTerms = new Set();
  let listingActive = false;
  let navObserver = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]));
  }

  function formatInt(value) {
    return number(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function formatMoney(value) {
    return '$' + number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPct(value) {
    return value == null ? '—' : `${(number(value) * 100).toFixed(1)}%`;
  }

  function installStyles() {
    if ($('#keywordos-listing-page-style')) return;
    const style = document.createElement('style');
    style.id = 'keywordos-listing-page-style';
    style.textContent = `
      .keywordos-listing-layout{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);gap:14px;align-items:start}
      .keywordos-listing-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}
      .keywordos-listing-kpi{border:1px solid var(--line);border-radius:8px;background:#fff;padding:12px}
      .keywordos-listing-kpi span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.3px}
      .keywordos-listing-kpi b{display:block;margin-top:4px;font-size:18px;color:var(--text-strong)}
      .keywordos-listing-kpi small{display:block;margin-top:3px;color:var(--muted);font-size:10.5px}
      .keywordos-listing-evidence{display:flex;flex-direction:column;gap:8px}
      .keywordos-listing-evidence-row{display:grid;grid-template-columns:26px minmax(180px,1fr) 70px 70px 86px 70px;gap:8px;align-items:center;border:1px solid var(--line);border-radius:7px;padding:9px 10px;background:#fff}
      .keywordos-listing-evidence-row b{font-size:12px;overflow-wrap:anywhere}
      .keywordos-listing-evidence-row span{font-size:11px;color:var(--muted)}
      .keywordos-listing-draft{display:flex;flex-direction:column;gap:12px}
      .keywordos-listing-field{display:flex;flex-direction:column;gap:5px}
      .keywordos-listing-field label{font-size:11px;font-weight:600;color:var(--text-strong)}
      .keywordos-listing-field textarea{min-height:96px;resize:vertical}
      .keywordos-listing-field textarea[data-listing-field="bullets"]{min-height:150px}
      .keywordos-listing-field-meta{display:flex;justify-content:space-between;gap:8px;color:var(--muted);font-size:10px}
      .keywordos-listing-actions{display:flex;gap:8px;flex-wrap:wrap}
      .keywordos-listing-source-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .keywordos-listing-session-note{font-size:10.5px;color:var(--muted);line-height:1.45}
      @media (max-width:1040px){
        .keywordos-listing-layout{grid-template-columns:1fr}
      }
      @media (max-width:760px){
        .keywordos-listing-kpis{grid-template-columns:1fr}
        .keywordos-listing-evidence-row{grid-template-columns:24px minmax(0,1fr) 58px 58px}
        .keywordos-listing-evidence-row .listing-sales,.keywordos-listing-evidence-row .listing-acos{display:none}
      }
    `;
    document.head.appendChild(style);
  }

  function readPersistedAdsRecord() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    return new Promise((resolve) => {
      let request;
      try {
        request = indexedDB.open(WORKSPACE_DB_NAME);
      } catch {
        resolve(null);
        return;
      }
      let abortedUpgrade = false;
      request.onupgradeneeded = () => {
        abortedUpgrade = true;
        try { request.transaction?.abort(); } catch {}
      };
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
      request.onsuccess = () => {
        const db = request.result;
        if (abortedUpgrade || !db.objectStoreNames.contains(WORKSPACE_DATASET_STORE)) {
          db.close();
          resolve(null);
          return;
        }
        try {
          const transaction = db.transaction(WORKSPACE_DATASET_STORE, 'readonly');
          const get = transaction.objectStore(WORKSPACE_DATASET_STORE).get('ads');
          get.onsuccess = () => resolve(get.result || null);
          get.onerror = () => resolve(null);
          transaction.oncomplete = () => db.close();
          transaction.onabort = () => { db.close(); resolve(null); };
          transaction.onerror = () => { db.close(); resolve(null); };
        } catch {
          db.close();
          resolve(null);
        }
      };
    });
  }

  async function resolveListingDataset() {
    const fallbackRows = window.KEYWORDOS_SEED?.rows || [];
    const record = await readPersistedAdsRecord();
    const validateRows = (kind, rows) => window.KeywordOSPersistedDatasetGuard?.validateDatasetRows?.(kind, rows);
    return chooseListingDataset(record, fallbackRows, validateRows);
  }

  function evidenceRows(dataset) {
    return aggregateKeywordEvidence(dataset?.rows || []).slice(0, MAX_EVIDENCE_ROWS);
  }

  function ensureSidebarEntry() {
    const nav = $('#sidebar-nav');
    if (!nav || nav.querySelector(`[data-page="${LISTING_PAGE}"]`)) return;
    const section = document.createElement('div');
    section.className = 'nav-section keywordos-listing-nav-section';
    section.innerHTML = `<div class="nav-section-title">LISTING</div><button class="nav-item" data-page="${LISTING_PAGE}"><span class="nav-icon">▤</span><span class="nav-label">Listing Workspace</span></button>`;
    const finance = $$('.nav-section', nav).find((item) => $('.nav-section-title', item)?.textContent.trim() === 'FINANCE');
    if (finance) nav.insertBefore(section, finance);
    else nav.appendChild(section);
  }

  function syncActiveState() {
    if (!listingActive) return;
    $$('#sidebar-nav .nav-item').forEach((item) => item.classList.toggle('active', item.dataset.page === LISTING_PAGE));
    $$('.suite-nav button').forEach((button) => {
      const active = button.textContent.trim().toLowerCase() === 'listing';
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function setHeader() {
    const eyebrow = $('#page-eyebrow');
    const title = $('#page-title');
    const subtitle = $('#page-subtitle');
    const breadcrumb = $('#breadcrumb');
    if (eyebrow) eyebrow.textContent = 'LISTING';
    if (title) title.textContent = 'Listing Workspace';
    if (subtitle) subtitle.textContent = 'Prepare listing copy from validated keyword evidence without Amazon write access.';
    if (breadcrumb) breadcrumb.textContent = 'LISTING / Listing Workspace';
  }

  function draftInput(field) {
    const element = $(`[data-listing-field="${field}"]`);
    if (!element) return;
    element.value = listingDraft[field];
    element.addEventListener('input', () => {
      listingDraft[field] = element.value;
      updateDraftMeta();
    });
  }

  function updateDraftMeta() {
    const status = draftStatus(listingDraft);
    const state = $('#listing-draft-state');
    if (state) state.textContent = status.ready ? '3 / 3 sections drafted' : `${status.completed} / 3 sections drafted`;
    for (const field of ['title', 'bullets', 'searchTerms']) {
      const count = $(`[data-listing-count="${field}"]`);
      if (count) count.textContent = `${listingDraft[field].length} characters`;
    }
  }

  function selectedSummary() {
    const element = $('#listing-selected-count');
    if (element) element.textContent = String(selectedTerms.size);
  }

  async function renderListingWorkspace({ writeHistory = true } = {}) {
    listingActive = true;
    installStyles();
    ensureSidebarEntry();
    const content = $('#content');
    if (!content) return;
    setHeader();
    $('#modal-root').innerHTML = '';
    content.innerHTML = '<div class="notice-banner"><b>Loading validated Listing evidence…</b> KeywordOS is checking the browser-persisted Ads dataset before using it.</div>';
    const dataset = await resolveListingDataset();
    if (!listingActive) return;
    const rows = evidenceRows(dataset);
    const status = draftStatus(listingDraft);
    content.innerHTML = `
      <div class="notice-banner"><b>Preparation only.</b> This workspace does not edit or publish Amazon listings, create credentials, or call Amazon APIs. Draft text remains in this browser session only.</div>
      <div class="keywordos-listing-source-actions">
        <button class="btn secondary" data-listing-nav="global-keywords">Global Keyword Library</button>
        <button class="btn secondary" data-listing-nav="cerebro">Cerebro</button>
        <button class="btn secondary" data-listing-nav="keyword-library">Keyword Library</button>
      </div>
      <div class="keywordos-listing-kpis top-gap">
        <div class="keywordos-listing-kpi"><span>Evidence candidates</span><b>${formatInt(rows.length)}</b><small>${escapeHtml(dataset.mode)} · top search terms by orders / sales</small></div>
        <div class="keywordos-listing-kpi"><span>Selected keywords</span><b id="listing-selected-count">${selectedTerms.size}</b><small>Used only in the local preparation session</small></div>
        <div class="keywordos-listing-kpi"><span>Draft progress</span><b id="listing-draft-state">${status.completed} / 3</b><small>Title · bullets · search terms</small></div>
      </div>
      <div class="keywordos-listing-layout">
        <div class="card">
          <div class="card-head"><div class="card-title"><h3>Keyword Evidence</h3><small>${escapeHtml(dataset.source)} · ${escapeHtml(dataset.mode)}</small></div></div>
          <div class="card-body keywordos-listing-evidence">
            ${rows.length ? rows.map((row) => `
              <label class="keywordos-listing-evidence-row">
                <input type="checkbox" data-listing-term="${encodeURIComponent(row.term)}" ${selectedTerms.has(row.term) ? 'checked' : ''} aria-label="Select ${escapeHtml(row.term)}">
                <b>${escapeHtml(row.term)}</b>
                <span>${formatInt(row.orders)} orders</span>
                <span>${formatInt(row.clicks)} clicks</span>
                <span class="listing-sales">${formatMoney(row.sales)}</span>
                <span class="listing-acos">${formatPct(row.acos)}</span>
              </label>
            `).join('') : '<div class="empty-state"><h3>No keyword evidence available</h3><p>Load and persist a valid Amazon Ads dataset before preparing listing keyword inputs.</p></div>'}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title"><h3>Listing Draft</h3><small>Session-only working copy · no Amazon publishing</small></div></div>
          <div class="card-body keywordos-listing-draft">
            <div class="keywordos-listing-field"><label>Title draft</label><textarea class="input" data-listing-field="title" placeholder="Draft the product title here"></textarea><div class="keywordos-listing-field-meta"><span>Manual copy only</span><span data-listing-count="title">0 characters</span></div></div>
            <div class="keywordos-listing-field"><label>Bullet draft</label><textarea class="input" data-listing-field="bullets" placeholder="Draft bullets or key selling points here"></textarea><div class="keywordos-listing-field-meta"><span>One or more bullet lines</span><span data-listing-count="bullets">0 characters</span></div></div>
            <div class="keywordos-listing-field"><label>Search-term draft</label><textarea class="input" data-listing-field="searchTerms" placeholder="Build a search-term input from selected evidence"></textarea><div class="keywordos-listing-field-meta"><span>Use only relevant terms; no automatic publishing</span><span data-listing-count="searchTerms">0 characters</span></div></div>
            <div class="keywordos-listing-actions"><button class="btn primary" id="listing-use-selected">Use selected in Search Terms</button><button class="btn secondary" data-listing-copy="title">Copy title</button><button class="btn secondary" data-listing-copy="bullets">Copy bullets</button><button class="btn secondary" data-listing-copy="searchTerms">Copy search terms</button></div>
            <div class="keywordos-listing-session-note">KeywordOS does not infer product claims or fabricate listing copy from advertising metrics. The evidence list helps selection; the actual listing language remains a human-edited draft.</div>
          </div>
        </div>
      </div>`;

    for (const field of ['title', 'bullets', 'searchTerms']) draftInput(field);
    updateDraftMeta();
    $$('[data-listing-term]').forEach((input) => input.addEventListener('change', () => {
      const term = decodeURIComponent(input.dataset.listingTerm || '');
      if (input.checked) selectedTerms.add(term);
      else selectedTerms.delete(term);
      selectedSummary();
    }));
    $('#listing-use-selected')?.addEventListener('click', () => {
      listingDraft.searchTerms = composeSearchTerms([...selectedTerms]);
      const field = $('[data-listing-field="searchTerms"]');
      if (field) field.value = listingDraft.searchTerms;
      updateDraftMeta();
    });
    $$('[data-listing-copy]').forEach((button) => button.addEventListener('click', async () => {
      const value = listingDraft[button.dataset.listingCopy] || '';
      if (!value) return;
      try { await navigator.clipboard.writeText(value); } catch {}
    }));
    $$('[data-listing-nav]').forEach((button) => button.addEventListener('click', () => navigateToExistingPage(button.dataset.listingNav)));
    if (writeHistory && window.location.hash !== LISTING_HASH) window.history.pushState({ keywordOSPage: LISTING_PAGE }, '', LISTING_HASH);
    setTimeout(syncActiveState, 0);
  }

  function navigateToExistingPage(page) {
    listingActive = false;
    const target = $$('#sidebar-nav [data-page]').find((button) => button.dataset.page === page);
    target?.click();
  }

  function isListingSuiteButton(target) {
    const button = target instanceof Element ? target.closest('.suite-nav button') : null;
    return button && button.textContent.trim().toLowerCase() === 'listing' ? button : null;
  }

  function interceptNavigation(event) {
    const listingSuite = isListingSuiteButton(event.target);
    const listingNav = event.target instanceof Element ? event.target.closest(`[data-page="${LISTING_PAGE}"]`) : null;
    if (listingSuite || listingNav) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      renderListingWorkspace({ writeHistory: true });
      return;
    }
    const sidebarPage = event.target instanceof Element ? event.target.closest('#sidebar-nav [data-page]') : null;
    if (sidebarPage && sidebarPage.dataset.page !== LISTING_PAGE) listingActive = false;
  }

  function handleHistory() {
    if (window.location.hash === LISTING_HASH) {
      renderListingWorkspace({ writeHistory: false });
      return;
    }
    listingActive = false;
  }

  function refreshNav() {
    ensureSidebarEntry();
    if (listingActive) {
      setHeader();
      setTimeout(syncActiveState, 0);
      if (!$('#content')?.querySelector('.keywordos-listing-layout')) renderListingWorkspace({ writeHistory: false });
    }
  }

  function start() {
    installStyles();
    ensureSidebarEntry();
    document.addEventListener('click', interceptNavigation, true);
    window.addEventListener('popstate', handleHistory);
    window.addEventListener('hashchange', handleHistory);
    const nav = $('#sidebar-nav');
    if (nav) {
      navObserver = new MutationObserver(() => setTimeout(refreshNav, 0));
      navObserver.observe(nav, { childList: true, subtree: true });
    }
    if (window.location.hash === LISTING_HASH) renderListingWorkspace({ writeHistory: false });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
