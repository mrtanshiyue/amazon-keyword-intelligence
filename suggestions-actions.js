(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function isSuggestionsPage() {
    return ($('#page-title')?.textContent || '').trim() === 'Suggestions';
  }

  function suggestionRows() {
    return $$('.h10-table tbody tr').filter((row) => $('input[data-suggest-select]', row));
  }

  function setRowVisibility(row) {
    row.style.display = row.dataset.searchHidden === '1' ? 'none' : '';
  }

  function updateApplyButton() {
    if (!isSuggestionsPage()) return;
    const checked = $$('input[data-suggest-select]:checked').filter(
      (input) => !input.disabled && input.closest('tr')?.style.display !== 'none'
    );
    const button = $('#apply-suggestion-changes');
    if (!button) return;
    const nextText = `Stage ${checked.length} Selected`;
    const nextDisabled = checked.length === 0;
    if (button.textContent !== nextText) button.textContent = nextText;
    if (button.disabled !== nextDisabled) button.disabled = nextDisabled;
  }

  function disableInactiveFilters() {
    const toolbar = $('.h10-toolbar');
    if (!toolbar) return;
    $$('button', toolbar).forEach((button) => {
      const text = button.textContent.trim();
      if (
        text.startsWith('Portfolio') ||
        text.startsWith('Campaign') ||
        text.startsWith('Status') ||
        text.startsWith('⚙ Columns')
      ) {
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
        button.title = 'This Suggestions control is not implemented in the current test runtime.';
      }
    });
  }

  function labelSettingsButton() {
    const settings = $('#suggestion-settings');
    if (!settings) return;
    settings.title = 'Open Workspace Settings to change recommendation thresholds.';
  }

  function applyUiEnhancements() {
    if (!isSuggestionsPage()) return;
    suggestionRows().forEach(setRowVisibility);
    disableInactiveFilters();
    labelSettingsButton();
    updateApplyButton();
  }

  function filterRows(query) {
    const value = query.trim().toLowerCase();
    suggestionRows().forEach((row) => {
      row.dataset.searchHidden = value && !row.textContent.toLowerCase().includes(value) ? '1' : '0';
      setRowVisibility(row);
    });
    updateApplyButton();
  }

  function applySelected() {
    const selected = $$('input[data-suggest-select]:checked').filter(
      (input) => !input.disabled && input.closest('tr')?.style.display !== 'none'
    );
    selected.forEach((input) => {
      const apply = $('[data-suggest-action="apply"]', input.closest('tr'));
      if (apply && !apply.disabled) apply.click();
    });
    updateApplyButton();
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
      suggestionRows().forEach((row) => {
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
    if (!button || button.id !== 'apply-suggestion-changes') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    applySelected();
  }, true);

  const observer = new MutationObserver(() => applyUiEnhancements());

  function start() {
    applyUiEnhancements();
    observer.observe($('#content') || document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();