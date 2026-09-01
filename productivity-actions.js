(() => {
  'use strict';

  const SHELL_STATE_KEY = 'keywordos_v9_shell_ui';
  const SUITE_WORKSPACES = Object.freeze({
    products: {
      title: 'Products Workspace',
      subtitle: 'Store-scoped product and workspace operations',
      notice: 'Product catalog editing and Amazon listing mutation are not connected in this runtime.',
      items: [
        { page: 'store-workspace', label: 'Store Workspace', detail: 'Open the selected Store workspace and its loaded data state.' },
        { page: 'stores-settings', label: 'Stores', detail: 'Manage browser-local Store workspace metadata.' }
      ]
    },
    keywords: {
      title: 'Keywords Workspace',
      subtitle: 'Research, library, tracking and conflict intelligence',
      notice: 'Keyword analysis uses loaded/local data. Amazon keyword writes remain disabled.',
      items: [
        { page: 'global-keywords', label: 'Global Keyword Library', detail: 'Review shared keyword intelligence across Store workspaces.' },
        { page: 'cerebro', label: 'Cerebro', detail: 'Research keyword opportunities from loaded advertising data.' },
        { page: 'keyword-library', label: 'Keyword Library', detail: 'Manage Store-scoped keyword assets and lifecycle state.' },
        { page: 'tracker', label: 'Keyword Tracker', detail: 'Track strategic keyword groups in the current Store context.' },
        { page: 'negative-library', label: 'Negative Library', detail: 'Review active and suggested negative targets.' }
      ]
    },
    listing: {
      title: 'Listing Workspace',
      subtitle: 'Keyword-backed listing preparation without Amazon write access',
      notice: 'Listing editing and publishing are not connected. Use existing keyword intelligence to prepare titles, bullets and search-term inputs without creating Amazon credentials or write actions.',
      items: [
        { page: 'global-keywords', label: 'Keyword Research', detail: 'Start from the Global Keyword Library to identify relevant search demand.' },
        { page: 'cerebro', label: 'Keyword Selection', detail: 'Qualify candidate terms using existing advertising search-term evidence.' },
        { page: 'keyword-library', label: 'Listing Keyword Set', detail: 'Review protected, tracked and lifecycle-tagged keyword assets.' }
      ]
    },
    marketing: {
      title: 'Marketing Workspace',
      subtitle: 'Advertising analysis, recommendations and controlled local actions',
      notice: 'Amazon execution remains disabled. Marketing actions stay local/review-only unless separately authorized.',
      items: [
        { page: 'overview', label: 'Dashboard', detail: 'Review advertising performance for the current Store scope.' },
        { page: 'suggestions', label: 'Suggestions', detail: 'Review source-backed bid, keyword and negative recommendations.' },
        { page: 'ad-manager', label: 'Ad Manager', detail: 'Drill through campaign, ad group, target and search-term data.' },
        { page: 'rules', label: 'Rules & Automation', detail: 'Define local decision rules without Amazon mutation.' },
        { page: 'actions', label: 'Action Center', detail: 'Review proposed advertising actions before any future execution path.' }
      ]
    },
    operations: {
      title: 'Operations Workspace',
      subtitle: 'Finance, imports, synchronization status and data health',
      notice: 'Operations are limited to loaded/local data and read-only runtime status. No anonymous mutable Worker API is exposed.',
      items: [
        { page: 'unified-report', label: 'Unified Report', detail: 'Analyze transaction-level income, refunds, fees and settlements.' },
        { page: 'import', label: 'Import Center', detail: 'Validate and load Amazon Ads or Unified Transaction CSV data.' },
        { page: 'sync-center', label: 'Sync Center', detail: 'Review synchronization readiness and connection truth.' },
        { page: 'data-health', label: 'Data Health', detail: 'Inspect loaded-period readiness, integrity and recency.' }
      ]
    },
    analytics: {
      title: 'Analytics Workspace',
      subtitle: 'Portfolio, cross-store and advertising performance analysis',
      notice: 'Analytics is read-only and operates on the currently loaded Store/local datasets.',
      items: [
        { page: 'portfolio-overview', label: 'Portfolio Overview', detail: 'Review consolidated intelligence across Store workspaces.' },
        { page: 'cross-store', label: 'Cross-store Intelligence', detail: 'Compare Store performance without sharing credentials or write actions.' },
        { page: 'analytics', label: 'Advertising Analytics', detail: 'Analyze performance across campaign, target, search term and product levels.' }
      ]
    }
  });
  const SUITE_PAGE_GROUPS = Object.freeze({
    products: new Set(['store-workspace', 'stores-settings']),
    keywords: new Set(['global-keywords', 'global-conflicts', 'cerebro', 'tracker', 'keyword-library', 'negative-library', 'conflicts']),
    marketing: new Set(['overview', 'suggestions', 'ad-manager', 'rules', 'schedules', 'actions', 'change-log']),
    operations: new Set(['unified-report', 'import', 'sync-center', 'data-health']),
    analytics: new Set(['portfolio-overview', 'cross-store', 'analytics'])
  });
  const SUITE_HOME_PAGES = Object.freeze({
    products: 'suite-products',
    keywords: 'suite-keywords',
    marketing: 'suite-marketing',
    operations: 'suite-operations',
    analytics: 'suite-analytics'
  });

  function normalizeSearch(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function filterEntries(entries, query) {
    const needle = normalizeSearch(query);
    if (!needle) return entries;
    return entries.filter((entry) => normalizeSearch(`${entry.section || ''} ${entry.label || ''}`).includes(needle));
  }

  function suiteAction(label) {
    const suite = normalizeSearch(label);
    return SUITE_WORKSPACES[suite] ? { type: 'workspace', suite } : null;
  }

  function suiteForPage(page) {
    for (const [suite, pages] of Object.entries(SUITE_PAGE_GROUPS)) {
      if (pages.has(page)) return suite;
    }
    return '';
  }

  function suiteWorkspace(suite) {
    return SUITE_WORKSPACES[suite] || null;
  }

  function suiteHomePage(suite) {
    return SUITE_HOME_PAGES[suite] || '';
  }

  function suiteFromHomePage(page) {
    return Object.entries(SUITE_HOME_PAGES).find(([, homePage]) => homePage === page)?.[0] || '';
  }

  function pageHash(page) {
    const normalized = String(page || '').trim();
    return normalized ? `#page=${encodeURIComponent(normalized)}` : '';
  }

  function pageFromHash(hash) {
    const match = String(hash || '').match(/^#page=([^&]+)$/);
    if (!match) return '';
    try {
      return decodeURIComponent(match[1]).trim();
    } catch {
      return '';
    }
  }

  function initialHistoryDecision(requestedPage, availablePages, currentPage) {
    const requested = String(requestedPage || '').trim();
    const available = new Set(Array.isArray(availablePages) ? availablePages : []);
    if (!requested) return { action: 'sync' };
    if (!available.size) return { action: 'wait', page: requested };
    if (!available.has(requested)) return { action: 'sync' };
    if (requested === currentPage) return { action: 'done', page: requested };
    return { action: 'navigate', page: requested };
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.KeywordOSProductivityTest = {
      normalizeSearch,
      filterEntries,
      suiteAction,
      suiteForPage,
      suiteWorkspace,
      suiteHomePage,
      suiteFromHomePage,
      pageHash,
      pageFromHash,
      initialHistoryDecision
    };
  }

  if (typeof document === 'undefined') return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const headerActions = () => $$('.header-right .header-action');
  let applyingHistoryRoute = false;
  let pendingInitialHistoryPage = '';
  let activeSuiteHome = '';

  function loadShellState() {
    try {
      const raw = localStorage.getItem(SHELL_STATE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveShellState(next) {
    try {
      localStorage.setItem(SHELL_STATE_KEY, JSON.stringify(next));
    } catch {}
  }

  function installStyles() {
    if ($('#keywordos-productivity-style')) return;
    const style = document.createElement('style');
    style.id = 'keywordos-productivity-style';
    style.textContent = `
      @media (min-width:761px){
        body.keywordos-sidebar-collapsed{--sidebar:68px}
        body.keywordos-sidebar-collapsed .brand-row{padding:0 5px;gap:2px}
        body.keywordos-sidebar-collapsed .brand-symbol{width:28px;height:28px;font-size:16px}
        body.keywordos-sidebar-collapsed .brand-copy,
        body.keywordos-sidebar-collapsed .tool-switcher>span:nth-child(2),
        body.keywordos-sidebar-collapsed .tool-switcher>.chev,
        body.keywordos-sidebar-collapsed .nav-section-title,
        body.keywordos-sidebar-collapsed .nav-label,
        body.keywordos-sidebar-collapsed .nav-pill,
        body.keywordos-sidebar-collapsed .sidebar-bottom .side-link>span:last-child,
        body.keywordos-sidebar-collapsed .account-card>div,
        body.keywordos-sidebar-collapsed .account-card>.chev{display:none!important}
        body.keywordos-sidebar-collapsed .tool-switcher,
        body.keywordos-sidebar-collapsed .nav-item,
        body.keywordos-sidebar-collapsed .side-link,
        body.keywordos-sidebar-collapsed .account-card{justify-content:center}
        body.keywordos-sidebar-collapsed .tool-switcher{padding:6px;margin-left:9px;margin-right:9px}
        body.keywordos-sidebar-collapsed .nav-item,
        body.keywordos-sidebar-collapsed .side-link{padding-left:7px;padding-right:7px}
        body.keywordos-sidebar-collapsed .nav-icon{width:22px;font-size:16px}
        body.keywordos-sidebar-collapsed .sidebar-nav{padding-left:7px;padding-right:7px}
        body.keywordos-sidebar-collapsed .account-card{padding-left:4px;padding-right:4px}
      }
      @media (max-width:760px){.sidebar-collapse{display:none!important}}
      .keywordos-command-list{display:flex;flex-direction:column;gap:6px;max-height:min(55vh,520px);overflow:auto;margin-top:12px}
      .keywordos-command-item{width:100%;border:1px solid var(--line);background:#fff;border-radius:6px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left}
      .keywordos-command-item:hover,.keywordos-command-item:focus-visible{background:var(--blue-soft);border-color:var(--blue-line)}
      .keywordos-command-item b{display:block;color:var(--text-strong);font-size:13px}
      .keywordos-command-item small{display:block;color:var(--muted);font-size:10px;margin-top:2px}
      .keywordos-command-item span{color:var(--muted);font-size:12px}
      .keywordos-command-empty{padding:22px 12px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:6px}
      #keywordos-command-search{width:100%}
      .suite-nav button:not(:disabled){cursor:pointer}
      .keywordos-suite-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}
      .keywordos-suite-card{width:100%;border:1px solid var(--line);background:#fff;border-radius:8px;padding:12px;text-align:left;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .keywordos-suite-card:hover,.keywordos-suite-card:focus-visible{background:var(--blue-soft);border-color:var(--blue-line)}
      .keywordos-suite-card b{display:block;color:var(--text-strong);font-size:13px}
      .keywordos-suite-card small{display:block;color:var(--muted);font-size:11px;line-height:1.45;margin-top:4px}
      .keywordos-suite-card span{color:var(--muted);font-size:12px;flex:0 0 auto}
      .keywordos-suite-home{max-width:1080px}
      .keywordos-suite-home-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px}
      .keywordos-suite-home-head h2{margin:0;color:var(--text-strong);font-size:20px}
      .keywordos-suite-home-head p{margin:5px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
      .keywordos-suite-home-count{flex:0 0 auto}
      @media (max-width:900px){
        .header-left{min-width:0;flex:1 1 auto!important}
        .suite-nav{display:flex!important;overflow-x:auto;overflow-y:hidden;flex-wrap:nowrap;max-width:calc(100vw - var(--sidebar) - 220px);scrollbar-width:none;-webkit-overflow-scrolling:touch}
        .suite-nav::-webkit-scrollbar{display:none}
        .suite-nav button{flex:0 0 auto;white-space:nowrap}
      }
      @media (max-width:760px){
        .suite-nav{max-width:calc(100vw - var(--sidebar) - 94px);gap:2px}
        .suite-nav button{padding:6px 8px;font-size:10px}
        .keywordos-suite-grid{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function enableButton(button, title, ariaLabel) {
    if (!button) return;
    button.disabled = false;
    button.removeAttribute('aria-disabled');
    delete button.dataset.uiCapabilityHandled;
    if (title) button.title = title;
    if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
  }

  function setSidebarCollapsed(collapsed, persist = true) {
    if (window.matchMedia('(max-width:760px)').matches) collapsed = false;
    document.body.classList.toggle('keywordos-sidebar-collapsed', Boolean(collapsed));
    const button = $('.sidebar-collapse');
    if (button) {
      enableButton(button);
      button.textContent = collapsed ? '›' : '‹';
      button.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
      button.setAttribute('aria-label', button.title);
      button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }
    $$('#sidebar-nav [data-page]').forEach((item) => {
      const label = $('.nav-label', item)?.textContent.trim() || item.textContent.trim();
      if (label) item.title = label;
    });
    if (persist) saveShellState({ ...loadShellState(), sidebarCollapsed: Boolean(collapsed) });
  }

  function bindSidebarCollapse() {
    const button = $('.sidebar-collapse');
    if (!button || button.dataset.productivityBound === '1') return;
    button.dataset.productivityBound = '1';
    enableButton(button);
    button.addEventListener('click', () => {
      setSidebarCollapsed(!document.body.classList.contains('keywordos-sidebar-collapsed'));
    });
    const saved = loadShellState();
    setSidebarCollapsed(Boolean(saved.sidebarCollapsed), false);
  }

  function currentPageEntries() {
    const seen = new Set();
    const entries = $$('#sidebar-nav [data-page]').map((button) => {
      const page = button.dataset.page || '';
      const label = $('.nav-label', button)?.textContent.trim() || button.textContent.trim();
      const section = button.closest('.nav-section')?.querySelector('.nav-section-title')?.textContent.trim() || '';
      return { page, label, section };
    });
    if (entries.some((entry) => entry.page === 'portfolio-overview')) {
      for (const [suite, page] of Object.entries(SUITE_HOME_PAGES)) {
        const workspace = suiteWorkspace(suite);
        entries.push({ page, label: workspace?.title || suite, section: 'WORKSPACES' });
      }
    }
    return entries.filter((entry) => {
      if (!entry.page || !entry.label || seen.has(entry.page)) return false;
      seen.add(entry.page);
      return true;
    });
  }

  function closeCommandPalette() {
    const root = $('#modal-root');
    if (root?.querySelector('#keywordos-command-palette')) root.innerHTML = '';
  }

  function closeSuiteWorkspace() {
    const root = $('#modal-root');
    if (root?.querySelector('#keywordos-suite-workspace')) root.innerHTML = '';
  }

  function activePage() {
    if (($('#page-title')?.textContent || '').trim() === 'Listing Workspace') return 'listing-workspace';
    if (activeSuiteHome) return suiteHomePage(activeSuiteHome);
    return $('#sidebar-nav .nav-item.active')?.dataset.page || '';
  }

  function writePageHistory(page, replace = false) {
    const hash = pageHash(page);
    if (!hash || window.location.hash === hash) return;
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({ keywordOSPage: page }, '', hash);
  }

  function navigateToPage(page, { fromHistory = false } = {}) {
    const suiteHome = suiteFromHomePage(page);
    if (suiteHome) {
      if (fromHistory) applyingHistoryRoute = true;
      renderSuiteHomePage(suiteHome, { writeHistory: !fromHistory });
      if (fromHistory) setTimeout(() => { applyingHistoryRoute = false; }, 0);
      return true;
    }
    const target = $$('#sidebar-nav [data-page]').find((button) => button.dataset.page === page);
    if (!target) return false;
    activeSuiteHome = '';
    closeCommandPalette();
    closeSuiteWorkspace();
    if (fromHistory) applyingHistoryRoute = true;
    target.click();
    if (fromHistory) setTimeout(() => { applyingHistoryRoute = false; }, 0);
    return true;
  }

  function applyPageHistoryRoute() {
    const page = pageFromHash(window.location.hash);
    if (!page) {
      syncPassivePageHash();
      return false;
    }
    if (activePage() === page) return true;
    if (navigateToPage(page, { fromHistory: true })) return true;
    syncPassivePageHash();
    return false;
  }

  function bindPageHistory() {
    $$('#sidebar-nav [data-page]').forEach((button) => {
      if (button.dataset.pageHistoryBound === '1') return;
      button.dataset.pageHistoryBound = '1';
      button.addEventListener('click', () => {
        activeSuiteHome = '';
        if (applyingHistoryRoute) return;
        const page = button.dataset.page || '';
        if (page) writePageHistory(page, false);
      });
    });
  }

  function syncPassivePageHash() {
    if (applyingHistoryRoute) return;
    const page = activePage();
    if (page && pageFromHash(window.location.hash) !== page) writePageHistory(page, true);
  }

  function settleInitialHistoryRoute() {
    const availablePages = currentPageEntries().map((entry) => entry.page);
    const decision = initialHistoryDecision(pendingInitialHistoryPage, availablePages, activePage());
    if (decision.action === 'wait') return false;
    pendingInitialHistoryPage = '';
    if (decision.action === 'navigate') return navigateToPage(decision.page, { fromHistory: true });
    if (decision.action === 'sync') syncPassivePageHash();
    return true;
  }

  function syncSuiteState() {
    const listingVisible = (($('#page-title')?.textContent || '').trim() === 'Listing Workspace');
    const currentSuite = listingVisible ? 'listing' : (activeSuiteHome || suiteForPage(activePage()));
    $$('.suite-nav button').forEach((button) => {
      const suite = normalizeSearch(button.textContent);
      button.classList.toggle('active', suite === currentSuite);
      if (suite === currentSuite) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function renderSuiteHomePage(suite, { writeHistory = true } = {}) {
    const workspace = suiteWorkspace(suite);
    const page = suiteHomePage(suite);
    const content = $('#content');
    if (!workspace || !page || !content) return false;
    activeSuiteHome = suite;
    closeCommandPalette();
    closeSuiteWorkspace();
    const modalRoot = $('#modal-root');
    if (modalRoot) modalRoot.innerHTML = '';
    $$('#sidebar-nav .nav-item').forEach((item) => item.classList.remove('active'));
    const eyebrow = $('#page-eyebrow');
    const title = $('#page-title');
    const subtitle = $('#page-subtitle');
    const breadcrumb = $('#breadcrumb');
    if (eyebrow) eyebrow.textContent = suite.toUpperCase();
    if (title) title.textContent = workspace.title;
    if (subtitle) subtitle.textContent = workspace.subtitle;
    if (breadcrumb) breadcrumb.textContent = `${suite.toUpperCase()} / ${workspace.title}`;
    content.innerHTML = `<div class="keywordos-suite-home"><div class="notice-banner"><b>${workspace.title}.</b> ${workspace.notice}</div><div class="keywordos-suite-home-head top-gap"><div><h2>Choose a workspace</h2><p>${workspace.subtitle}. Open an existing KeywordOS surface without changing authentication or Amazon execution boundaries.</p></div><span class="badge blue keywordos-suite-home-count">${workspace.items.length} TOOLS</span></div><div class="keywordos-suite-grid">${workspace.items.map((item) => `<button class="keywordos-suite-card" type="button" data-suite-page="${item.page}"><div><b>${item.label}</b><small>${item.detail}</small></div><span>Open →</span></button>`).join('')}</div></div>`;
    $$('[data-suite-page]', content).forEach((button) => {
      button.addEventListener('click', () => navigateToPage(button.dataset.suitePage));
    });
    if (writeHistory && !applyingHistoryRoute) writePageHistory(page, false);
    syncSuiteState();
    return true;
  }

  function bindSuiteNavigation() {
    $$('.suite-nav button').forEach((button) => {
      const action = suiteAction(button.textContent);
      if (!action) return;
      enableButton(button, `Open ${button.textContent.trim()} workspace`, `Open ${button.textContent.trim()} workspace`);
      if (button.dataset.suiteNavigationBound === '1') return;
      button.dataset.suiteNavigationBound = '1';
      button.addEventListener('click', () => {
        if (action.suite === 'listing') navigateToPage('listing-workspace');
        else renderSuiteHomePage(action.suite, { writeHistory: true });
        syncSuiteState();
      });
    });
    syncSuiteState();
  }

  function renderCommandResults(list, entries) {
    if (!list) return;
    if (!entries.length) {
      list.innerHTML = '<div class="keywordos-command-empty">No matching page</div>';
      return;
    }
    list.innerHTML = entries.map((entry, index) => `
      <button class="keywordos-command-item" type="button" data-command-page="${entry.page}" data-command-index="${index}">
        <div><b>${entry.label}</b><small>${entry.section || 'KeywordOS'}</small></div><span>Open →</span>
      </button>
    `).join('');
    $$('[data-command-page]', list).forEach((button) => {
      button.addEventListener('click', () => navigateToPage(button.dataset.commandPage));
    });
  }

  function openCommandPalette() {
    const root = $('#modal-root');
    if (!root) return;
    const entries = currentPageEntries();
    root.innerHTML = `<div class="modal-wrap" id="keywordos-command-palette"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="keywordos-command-title"><div class="modal-header"><div><h2 id="keywordos-command-title">Search KeywordOS</h2><small>Jump directly to any available workspace page</small></div><button class="drawer-close" id="keywordos-command-close" aria-label="Close search">×</button></div><div class="modal-body"><input id="keywordos-command-search" class="input" autocomplete="off" placeholder="Search pages, e.g. Suggestions, Data Health, Keywords"><div id="keywordos-command-results" class="keywordos-command-list"></div></div></div></div>`;
    const input = $('#keywordos-command-search');
    const list = $('#keywordos-command-results');
    const update = () => renderCommandResults(list, filterEntries(entries, input?.value || ''));
    $('#keywordos-command-close')?.addEventListener('click', closeCommandPalette);
    input?.addEventListener('input', update);
    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const first = $('[data-command-page]', list);
        if (first) {
          event.preventDefault();
          first.click();
        }
      }
      if (event.key === 'ArrowDown') {
        const first = $('[data-command-page]', list);
        if (first) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    update();
    requestAnimationFrame(() => input?.focus());
  }

  function bindGlobalSearch() {
    const button = headerActions()[0];
    if (!button || button.dataset.productivityBound === '1') return;
    button.dataset.productivityBound = '1';
    enableButton(button, 'Search KeywordOS (Ctrl/⌘ K)', 'Search KeywordOS');
    button.addEventListener('click', openCommandPalette);
  }

  function bindHelp() {
    const sidebarHelp = $('.sidebar-bottom .side-link:not([data-page])');
    const headerHelp = headerActions()[2];
    [sidebarHelp, headerHelp].filter(Boolean).forEach((button) => {
      if (button.dataset.productivityBound === '1') return;
      button.dataset.productivityBound = '1';
      enableButton(button, 'Open help for the current page', 'Open current page help');
      button.addEventListener('click', () => $('#page-learn')?.click());
    });
  }

  function enforceNotificationTruth() {
    const button = headerActions()[1];
    if (!button) return;
    const dot = $('.notification-dot', button);
    if (dot) dot.hidden = true;
    button.title = 'Notifications unavailable in the local analytics runtime';
    button.setAttribute('aria-label', button.title);
  }

  function refreshShell(syncHistory = true) {
    bindSidebarCollapse();
    bindPageHistory();
    bindSuiteNavigation();
    bindGlobalSearch();
    bindHelp();
    enforceNotificationTruth();
    if (activeSuiteHome && !$('#content')?.querySelector('.keywordos-suite-home')) {
      renderSuiteHomePage(activeSuiteHome, { writeHistory: false });
    }
    if (syncHistory) syncPassivePageHash();
  }

  function start() {
    installStyles();
    pendingInitialHistoryPage = pageFromHash(window.location.hash);
    refreshShell(false);
    settleInitialHistoryRoute();
    const nav = $('#sidebar-nav');
    if (nav) new MutationObserver(() => {
      refreshShell(false);
      settleInitialHistoryRoute();
    }).observe(nav, { childList: true, subtree: true });
    const modalRoot = $('#modal-root');
    if (modalRoot) new MutationObserver(syncSuiteState).observe(modalRoot, { childList: true, subtree: true });
    window.addEventListener('popstate', applyPageHistoryRoute);
    window.addEventListener('hashchange', applyPageHistoryRoute);
    window.addEventListener('resize', () => {
      if (window.matchMedia('(max-width:760px)').matches) setSidebarCollapsed(false, false);
    });
    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openCommandPalette();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();