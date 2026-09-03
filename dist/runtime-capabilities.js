(() => {
  'use strict';

  const state = {
    status: 'checking',
    amazonApiMode: 'unknown',
    environment: 'production',
  };

  function ensureBanner() {
    let banner = document.getElementById('runtime-capability-banner');
    if (banner) return banner;

    const workspace = document.querySelector('.workspace');
    const titleRow = document.querySelector('.page-title-row');
    if (!workspace || !titleRow) return null;

    banner = document.createElement('div');
    banner.id = 'runtime-capability-banner';
    banner.className = 'runtime-capability-banner checking';
    workspace.insertBefore(banner, titleRow);
    return banner;
  }

  function renderBanner() {
    const banner = ensureBanner();
    if (!banner) return;

    const apiOff = state.amazonApiMode !== 'enabled';
    banner.className = `runtime-capability-banner ${state.status} ${apiOff ? 'api-off' : 'api-on'}`;
    banner.innerHTML = `
      <div class="runtime-capability-main">
        <span class="runtime-capability-dot" aria-hidden="true"></span>
        <div>
          <b>${state.status === 'online' ? 'Cloudflare Production' : state.status === 'offline' ? 'Runtime status unavailable' : 'Checking Production runtime'}</b>
          <span>${apiOff ? 'Imported-data analytics · Amazon Ads API is disabled · No live Amazon mutation is possible' : 'Amazon Ads API enabled for this runtime'}</span>
        </div>
      </div>
      <span class="runtime-capability-chip">${apiOff ? 'ANALYTICS / LOCAL DECISIONS' : 'API CONNECTED'}</span>
    `;
  }

  function replaceText(root, selector, from, to) {
    root.querySelectorAll(selector).forEach((node) => {
      if (node.textContent.trim() === from) node.textContent = to;
    });
  }

  function applyCapabilityTruth(root = document) {
    const apiOff = state.amazonApiMode !== 'enabled';
    if (!apiOff) return;

    const accountStatus = root.querySelector('.account-card small');
    if (accountStatus) accountStatus.textContent = 'US · Production analytics workspace';

    root.querySelectorAll('.connection-card.connected').forEach((card) => {
      replaceText(card, '.badge', 'Connected', 'DATA LOADED');
      card.querySelectorAll('.connection-details p').forEach((row) => {
        const label = row.querySelector('span')?.textContent.trim();
        const value = row.querySelector('b');
        if (!value) return;
        if (label === 'Authorization') value.textContent = 'Not connected to Amazon API';
        if (label === 'Last sync') value.textContent = 'Imported report snapshot';
        if (label === 'Refresh token') value.textContent = 'Not configured';
      });
      card.querySelectorAll('.connection-footer button').forEach((button) => {
        const label = button.textContent.trim();
        if (label === 'Reconnect' || label === 'Pause Sync') {
          button.disabled = true;
          button.setAttribute('aria-disabled', 'true');
          button.title = 'Amazon Ads API is disabled in this Production runtime';
        }
      });
    });

    root.querySelectorAll('.connect-amazon').forEach((button) => {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.textContent = 'Amazon API Not Connected';
      button.title = 'OAuth backend is not enabled in the current Production runtime';
    });

    root.querySelectorAll('.workspace-status').forEach((node) => {
      if (node.textContent.includes('Connected')) node.innerHTML = '<i></i> Data workspace';
    });

    replaceText(root, '.badge', 'Connected locally', 'Imported dataset');
  }

  async function loadRuntimeStatus() {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      state.status = data.status === 'ok' ? 'online' : 'degraded';
      state.amazonApiMode = String(data.amazonApiMode || 'disabled').toLowerCase();
      state.environment = data.environment || 'production';
    } catch (error) {
      console.error('KeywordOS runtime capability check failed', error);
      state.status = 'offline';
      state.amazonApiMode = 'disabled';
    }

    document.documentElement.dataset.amazonApiMode = state.amazonApiMode;
    renderBanner();
    applyCapabilityTruth();
  }

  function start() {
    renderBanner();
    applyCapabilityTruth();
    window.addEventListener('keywordos:page-rendered', () => applyCapabilityTruth());
    loadRuntimeStatus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
