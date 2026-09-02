(() => {
  'use strict';

  const LEGACY_KEYWORD_ROUTE = 'cerebro';
  const LEGACY_KEYWORD_LABEL = 'Cerebro';
  const KEYWORD_RESEARCH_LABEL = 'Keyword Research';

  function productLabel(page, label) {
    const value = String(label ?? '');
    return String(page || '') === LEGACY_KEYWORD_ROUTE && value.trim() === LEGACY_KEYWORD_LABEL
      ? KEYWORD_RESEARCH_LABEL
      : value;
  }

  function replaceLegacyKeywordLabel(value) {
    return String(value ?? '').replace(/\bCerebro\b/g, KEYWORD_RESEARCH_LABEL);
  }

  function labelElement(element) {
    if (!element || element.textContent.trim() !== LEGACY_KEYWORD_LABEL) return false;
    element.textContent = KEYWORD_RESEARCH_LABEL;
    if (element.getAttribute?.('title') === LEGACY_KEYWORD_LABEL) element.setAttribute('title', KEYWORD_RESEARCH_LABEL);
    return true;
  }

  function applyProductLanguage(root = document) {
    if (typeof document === 'undefined') return 0;
    let changed = 0;
    const scope = root?.querySelectorAll ? root : document;
    const selectors = [
      '#sidebar-nav [data-page="cerebro"] .nav-label',
      '[data-suite-page="cerebro"] b',
      '[data-listing-nav="cerebro"]'
    ];
    for (const selector of selectors) {
      for (const element of scope.querySelectorAll(selector)) changed += labelElement(element) ? 1 : 0;
    }

    const title = document.getElementById('page-title');
    if (title?.textContent.trim() === LEGACY_KEYWORD_LABEL) {
      title.textContent = KEYWORD_RESEARCH_LABEL;
      changed += 1;
    }
    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb?.textContent.includes(LEGACY_KEYWORD_LABEL)) {
      breadcrumb.textContent = replaceLegacyKeywordLabel(breadcrumb.textContent);
      changed += 1;
    }
    const navItem = document.querySelector('#sidebar-nav [data-page="cerebro"]');
    if (navItem?.title === LEGACY_KEYWORD_LABEL) navItem.title = KEYWORD_RESEARCH_LABEL;
    return changed;
  }

  function handleKeywordResearchAction(event) {
    if (typeof document === 'undefined') return false;
    if (document.getElementById('page-title')?.textContent.trim() !== KEYWORD_RESEARCH_LABEL) return false;
    const button = event.target?.closest?.('button,.utility-link');
    if (!button) return false;
    const text = button.textContent.trim();
    let handled = true;
    if (text === 'Learn' && button.classList.contains('utility-link')) {
      document.getElementById('page-learn')?.click();
    } else if (text === 'Common Words' && button.classList.contains('utility-link')) {
      document.querySelector('.wordcloud')?.closest('.summary-card')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else if (text === '⌕ Search') {
      document.getElementById('research-query')?.focus();
    } else if (text === '☷ Settings') {
      if (!document.getElementById('r-apply')) document.getElementById('research-toggle')?.click();
      document.getElementById('r-word-min')?.focus();
    } else {
      handled = false;
    }
    if (handled) event.preventDefault();
    return handled;
  }

  function start() {
    if (typeof document === 'undefined') return;
    const boot = () => {
      applyProductLanguage(document);
      document.addEventListener('click', handleKeywordResearchAction, true);
      new MutationObserver(() => applyProductLanguage(document)).observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  }

  const api = {
    LEGACY_KEYWORD_ROUTE,
    LEGACY_KEYWORD_LABEL,
    KEYWORD_RESEARCH_LABEL,
    productLabel,
    replaceLegacyKeywordLabel,
    applyProductLanguage,
    handleKeywordResearchAction,
    start
  };

  if (typeof globalThis !== 'undefined') globalThis.KeywordOSProductLanguageTest = api;
  start();
})();
