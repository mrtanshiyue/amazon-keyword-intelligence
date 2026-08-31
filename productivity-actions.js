(() => {
  'use strict';

  const SHELL_STATE_KEY = 'keywordos_v9_shell_ui';

  function normalizeSearch(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function filterEntries(entries, query) {
    const needle = normalizeSearch(query);
    if (!needle) return entries;
    return entries.filter((entry) => normalizeSearch(`${entry.section || ''} ${entry.label || ''}`).includes(needle));
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.KeywordOSProductivityTest = { normalizeSearch, filterEntries };
  }

  if (typeof document === 'undefined') return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const headerActions = () => $$('.header-right .header-action');

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
    return $$('#sidebar-nav [data-page]').map((button) => {
      const page = button.dataset.page || '';
      const label = $('.nav-label', button)?.textContent.trim() || button.textContent.trim();
      const section = button.closest('.nav-section')?.querySelector('.nav-section-title')?.textContent.trim() || '';
      return { page, label, section };
    }).filter((entry) => {
      if (!entry.page || !entry.label || seen.has(entry.page)) return false;
      seen.add(entry.page);
      return true;
    });
  }

  function closeCommandPalette() {
    const root = $('#modal-root');
    if (root?.querySelector('#keywordos-command-palette')) root.innerHTML = '';
  }

  function navigateToPage(page) {
    const target = $$('#sidebar-nav [data-page]').find((button) => button.dataset.page === page);
    if (!target) return false;
    closeCommandPalette();
    target.click();
    return true;
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

  function refreshShell() {
    bindSidebarCollapse();
    bindGlobalSearch();
    bindHelp();
    enforceNotificationTruth();
  }

  function start() {
    installStyles();
    refreshShell();
    const nav = $('#sidebar-nav');
    if (nav) new MutationObserver(refreshShell).observe(nav, { childList: true, subtree: true });
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
