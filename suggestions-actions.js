(() => {
  'use strict';

  const STORAGE_KEY = 'keywordos_v9_suggestion_review_state';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function isSuggestionsPage() {
    return ($('#page-title')?.textContent || '').trim() === 'Suggestions';
  }

  function loadReviewState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  let reviewState = loadReviewState();

  function saveReviewState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reviewState));
    } catch {}
  }

  function activeTab() {
    return ($('.h10-tabs .section-tab.active')?.childNodes?.[0]?.textContent || '').trim();
  }

  function rowTarget(row) {
    return ($('td:nth-child(2) b', row)?.textContent || '').trim();
  }

  function rowKey(row) {
    const tab = activeTab();
    const target = rowTarget(row);
    return tab && target ? `${tab}::${target}` : '';
  }

  function currentStatus(row) {
    const key = rowKey(row);
    return key ? reviewState[key]?.status || 'active' : 'active';
  }

  function setStatus(row, status) {
    const key = rowKey(row);
    if (!key) return;
    if (status === 'active') delete reviewState[key];
    else reviewState[key] = { status, updatedAt: new Date().toISOString() };
    saveReviewState();
  }

  function setRowVisibility(row) {
    const removed = row.dataset.reviewStatus === 'removed';
    const searchHidden = row.dataset.searchHidden === '1';
    const nextDisplay = removed || searchHidden ? 'none' : '';
    if (row.style.display !== nextDisplay) row.style.display = nextDisplay;
  }

  function styleRow(row) {
    const status = currentStatus(row);
    row.dataset.reviewStatus = status;
    const nextOpacity = status === 'paused' ? '.62' : status === 'applied' ? '.56' : '';
    if (row.style.opacity !== nextOpacity) row.style.opacity = nextOpacity;

    const checkbox = $('input[data-suggest-select]', row);
    const apply = $('[data-suggest-action="apply"]', row);
    const remove = $('[data-suggest-action="remove"]', row);
    const pause = $('[data-suggest-action="pause"]', row);

    if (checkbox) {
      checkbox.disabled = status === 'paused' || status === 'applied';
      if (checkbox.disabled && checkbox.checked) checkbox.checked = false;
    }

    if (apply) {
      apply.disabled = status === 'paused' || status === 'applied';
      apply.title = status === 'applied' ? 'Already staged in Action Center' : status === 'paused' ? 'Resume before applying' : 'Apply';
    }

    if (remove) {
      remove.disabled = status === 'paused' || status === 'applied';
    }

    if (pause) {
      pause.disabled = status === 'applied';
      const label = status === 'paused' ? '▶' : 'Ⅱ';
      if (pause.textContent !== label) pause.textContent = label;
      pause.title = status === 'paused' ? 'Resume' : status === 'applied' ? 'Already staged' : 'Pause';
    }

    setRowVisibility(row);
  }

  function visibleSuggestionRows() {
    return $$('.h10-table tbody tr').filter((row) => rowTarget(row));
  }

  function updateApplyButton() {
    if (!isSuggestionsPage()) return;
    const checked = $$('input[data-suggest-select]:checked').filter((input) => !input.disabled && input.closest('tr')?.style.display !== 'none');
    const button = $('#apply-suggestion-changes');
    if (!button) return;
    const label = `Apply ${checked.length} Changes`;
    if (button.textContent !== label) button.textContent = label;
    button.disabled = checked.length === 0;
  }

  function disableInactiveFilters() {
    const toolbar = $('.h10-toolbar');
    if (!toolbar) return;
    $$('button', toolbar).forEach((button) => {
      const text = button.textContent.trim();
      if (text.startsWith('Portfolio') || text.startsWith('Campaign') || text.startsWith('Status') || text.startsWith('⚙ Columns')) {
        button.disabled = true;
        button.title = 'This Suggestions filter is not implemented in the current test runtime.';
      }
    });
  }

  function wireSettingsButton() {
    const settings = $('.suggest-settings button');
    if (!settings) return;
    const label = 'Edit Threshold Settings';
    if (settings.textContent !== label) settings.textContent = label;
    settings.title = 'Open Workspace Settings to change recommendation thresholds.';
  }

  function addReviewSummary() {
    const callout = $('.h10-callout');
    if (!callout) return;

    const tab = activeTab();
    const entries = Object.entries(reviewState).filter(([key]) => key.startsWith(`${tab}::`));
    const counts = entries.reduce((acc, [, value]) => {
      acc[value.status] = (acc[value.status] || 0) + 1;
      return acc;
    }, {});

    let summary = $('#suggestion-review-summary');
    if (!summary) {
      summary = document.createElement('span');
      summary.id = 'suggestion-review-summary';
      summary.className = 'small muted';
      callout.querySelector('div')?.appendChild(summary);
    }
    const summaryText = entries.length
      ? `Review state · ${counts.applied || 0} staged · ${counts.paused || 0} paused · ${counts.removed || 0} dismissed`
      : 'Review state · no local decisions yet';
    if (summary.textContent !== summaryText) summary.textContent = summaryText;

    let reset = $('#reset-suggestion-review');
    if (!reset && entries.length) {
      reset = document.createElement('button');
      reset.id = 'reset-suggestion-review';
      reset.className = 'btn secondary sm';
      reset.textContent = 'Reset Review State';
      callout.appendChild(reset);
    } else if (reset && !entries.length) {
      reset.remove();
    }
  }

  function applyReviewState() {
    if (!isSuggestionsPage()) return;
    visibleSuggestionRows().forEach(styleRow);
    disableInactiveFilters();
    wireSettingsButton();
    addReviewSummary();
    updateApplyButton();
  }

  function filterRows(query) {
    const value = query.trim().toLowerCase();
    visibleSuggestionRows().forEach((row) => {
      const hidden = value && !row.textContent.toLowerCase().includes(value) ? '1' : '0';
      if (row.dataset.searchHidden !== hidden) row.dataset.searchHidden = hidden;
      setRowVisibility(row);
    });
  }

  function applySelected() {
    const selected = $$('input[data-suggest-select]:checked').filter((input) => !input.disabled && input.closest('tr')?.style.display !== 'none');
    selected.forEach((input) => {
      const row = input.closest('tr');
      const apply = $('[data-suggest-action="apply"]', row);
      if (apply && !apply.disabled) apply.click();
    });
    updateApplyButton();
  }

  function resetCurrentTab() {
    const prefix = `${activeTab()}::`;
    Object.keys(reviewState).forEach((key) => {
      if (key.startsWith(prefix)) delete reviewState[key];
    });
    saveReviewState();
    applyReviewState();
  }

  document.addEventListener('change', (event) => {
    if (!isSuggestionsPage()) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.matches('input[data-suggest-select]')) {
      updateApplyButton();
      return;
    }

    if (target.matches('.h10-table thead input[type="checkbox"]')) {
      const checked = target.checked;
      visibleSuggestionRows().forEach((row) => {
        const checkbox = $('input[data-suggest-select]', row);
        if (checkbox && !checkbox.disabled && row.style.display !== 'none') checkbox.checked = checked;
      });
      updateApplyButton();
    }
  }, true);

  document.addEventListener('input', (event) => {
    if (!isSuggestionsPage()) return;
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.closest('.h10-toolbar .searchbox')) filterRows(input.value);
  });

  document.addEventListener('click', (event) => {
    if (!isSuggestionsPage()) return;
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button) return;

    if (button.id === 'apply-suggestion-changes') {
      event.preventDefault();
      event.stopImmediatePropagation();
      applySelected();
      return;
    }

    if (button.id === 'reset-suggestion-review') {
      event.preventDefault();
      resetCurrentTab();
      return;
    }

    if (button.closest('.suggest-settings')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const settingsNav = $('#sidebar-nav [data-page="settings"]') || $('.side-link[data-page="settings"]');
      settingsNav?.click();
      return;
    }

    const action = button.dataset.suggestAction;
    if (!action) return;
    const row = button.closest('tr');
    if (!row) return;

    const status = currentStatus(row);
    if (action === 'pause' && status === 'paused') {
      event.preventDefault();
      event.stopImmediatePropagation();
      setStatus(row, 'active');
      styleRow(row);
      addReviewSummary();
      updateApplyButton();
      return;
    }

    if (status === 'applied' || status === 'removed') {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (action === 'apply') setStatus(row, 'applied');
    if (action === 'remove') setStatus(row, 'removed');
    if (action === 'pause') setStatus(row, 'paused');

    setTimeout(() => applyReviewState(), 0);
  }, true);

  const observer = new MutationObserver(() => applyReviewState());

  function start() {
    applyReviewState();
    observer.observe($('#content') || document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
