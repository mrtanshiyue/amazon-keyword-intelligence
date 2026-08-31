(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function pageTitle() {
    return ($('#page-title')?.textContent || '').trim();
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

  function isLocalTableSearch(input) {
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
    const title = pageTitle();


    markRuleTruth();
  }

  document.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !isLocalTableSearch(input)) return;
    filterTable(input);
  });

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button || button.disabled) return;
    const text = button.textContent.trim();

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
