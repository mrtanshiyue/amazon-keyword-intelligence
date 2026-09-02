(() => {
  'use strict';

  const ADS_KIND = 'ads';
  const STORE_ID = 'store-a';
  const ACTIONS_KEY = 'keywordos_v9_actions';
  const APPROVAL_SELECTOR = '[data-action-approve],#approve-all,#export-approved';

  function classifyAdsSource({ record = null, seedRows = [], validation = null } = {}) {
    const hasPersistedRows = Boolean(record && Array.isArray(record.rows) && record.rows.length);
    if (hasPersistedRows && validation?.ok) {
      return {
        type: 'user-import',
        label: 'USER IMPORT',
        description: record.source || 'User-imported Amazon Ads dataset',
        approvalAllowed: true,
      };
    }
    if (Array.isArray(seedRows) && seedRows.length) {
      return {
        type: 'bundled-seed',
        label: 'BUNDLED SEED',
        description: hasPersistedRows ? 'Bundled public-test seed · stored import rejected' : 'Bundled public-test seed',
        approvalAllowed: false,
      };
    }
    return {
      type: 'missing',
      label: 'NO DATA',
      description: hasPersistedRows ? 'Stored Ads dataset failed validation' : 'No validated Ads dataset',
      approvalAllowed: false,
    };
  }

  function approvalBlocked(provenance) {
    return provenance?.approvalAllowed !== true;
  }

  const api = { classifyAdsSource, approvalBlocked };
  globalThis.KeywordOSDataProvenance = api;

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  let current = classifyAdsSource({ seedRows: window.KEYWORDOS_SEED?.rows || [] });
  let refreshTimer = null;

  async function resolveAdsSource() {
    const registry = window.KeywordOSDatasetRegistry;
    const guard = window.KeywordOSPersistedDatasetGuard;
    let record = null;
    let validation = null;
    try {
      record = await registry?.get?.(ADS_KIND, STORE_ID) || null;
      if (record && Array.isArray(record.rows) && record.rows.length) {
        validation = guard?.validateDatasetRows?.(ADS_KIND, record.rows) || { ok: false };
      }
    } catch (error) {
      console.warn('KeywordOS provenance check failed', error);
    }
    return classifyAdsSource({
      record,
      seedRows: window.KEYWORDOS_SEED?.rows || [],
      validation,
    });
  }

  function ensureSourceBadge() {
    const controls = document.querySelector('.page-controls');
    if (!controls) return null;
    let badge = document.getElementById('data-provenance-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'data-provenance-badge';
      badge.className = 'scope-mode-badge';
      controls.appendChild(badge);
    }
    return badge;
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function replaceExactText(root, from, to) {
    root.querySelectorAll('span,b,small,p').forEach((node) => {
      if (!node.children.length && node.textContent.trim() === from) setText(node, to);
    });
  }

  function applyStoreTruth(root = document) {
    const badge = ensureSourceBadge();
    if (badge) {
      badge.className = `scope-mode-badge ${current.type === 'user-import' ? 'store' : 'global'}`;
      setText(badge, current.type === 'user-import' ? 'USER IMPORT · LOCAL' : `${current.label} · READ ONLY`);
      badge.title = current.description;
    }

    document.documentElement.dataset.adsEvidenceSource = current.type;

    const replacements = [
      ['Imported Amazon Ads dataset', current.description],
      ['Imported dataset', current.label],
      ['Actual imported', current.label],
    ];
    replacements.forEach(([from, to]) => replaceExactText(root, from, to));

    root.querySelectorAll('.connection-card.connected').forEach((card) => {
      const status = card.querySelector('.badge');
      setText(status, current.label);
      card.querySelectorAll('.connection-details p').forEach((row) => {
        if (row.querySelector('span')?.textContent.trim() === 'Last sync') {
          const value = row.querySelector('b');
          setText(value, current.type === 'user-import' ? 'User import snapshot' : 'Bundled seed snapshot');
        }
      });
    });

    const storeCards = root.querySelectorAll('.admin-store-card');
    storeCards.forEach((card) => {
      if (!card.textContent.includes('YTDBNS-US-01') && !card.textContent.includes('US01')) return;
      const status = card.querySelector('.badge');
      setText(status, current.label);
      card.querySelectorAll('.admin-fields div').forEach((row) => {
        if (row.querySelector('span')?.textContent.trim() === 'Data source') {
          const value = row.querySelector('b');
          setText(value, current.description);
        }
      });
    });
  }

  function ensureApprovalNotice() {
    const content = document.getElementById('content');
    if (!content) return;
    const actionTable = content.querySelector('[data-action-approve],#approve-all,#export-approved');
    let notice = document.getElementById('seed-approval-guard-notice');
    if (!actionTable || !approvalBlocked(current)) {
      notice?.remove();
      return;
    }
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'seed-approval-guard-notice';
      notice.className = 'notice-banner';
      content.prepend(notice);
    }
    const message = `<b>Approval disabled.</b> ${current.description}. Import and validate an Amazon Ads CSV before approving or exporting advertising actions.`;
    if (notice.innerHTML !== message) notice.innerHTML = message;
  }

  function applyApprovalGuard(root = document) {
    const blocked = approvalBlocked(current);
    root.querySelectorAll(APPROVAL_SELECTOR).forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      if (blocked) {
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
        button.dataset.provenanceBlocked = '1';
        button.title = `${current.description}. Validated user-imported Ads data is required.`;
      } else if (button.dataset.provenanceBlocked === '1') {
        button.disabled = false;
        button.removeAttribute('aria-disabled');
        delete button.dataset.provenanceBlocked;
        button.removeAttribute('title');
      }
    });
    ensureApprovalNotice();
  }

  function applyTruth(root = document) {
    applyStoreTruth(root);
    applyApprovalGuard(root);
  }

  async function refresh() {
    current = await resolveAdsSource();
    applyTruth(document);
  }

  function scheduleRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      void refresh();
    }, 50);
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest(APPROVAL_SELECTOR) : null;
    if (!target || !approvalBlocked(current)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    applyApprovalGuard(document);
  }, true);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) applyTruth(node);
      });
    }
    scheduleRefresh();
  });

  function start() {
    applyTruth(document);
    observer.observe(document.body, { childList: true, subtree: true });
    void refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
