(() => {
  'use strict';

  const RUNTIME_SCRIPTS = [
    'app.js',
    'runtime-capabilities.js',
    'ui-actions.js',
    'suggestions-actions.js',
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Unable to load ${src}`));
      document.body.appendChild(script);
    });
  }

  async function boot() {
    try {
      await window.KeywordOSImportPersistence?.hydrate?.();
    } catch (error) {
      console.error('KeywordOS local import hydration failed; using R2 baseline', error);
    }

    try {
      for (const src of RUNTIME_SCRIPTS) await loadScript(src);
      window.KeywordOSImportPersistence?.attach?.();
    } catch (error) {
      console.error('KeywordOS application bootstrap failed', error);
      const content = document.querySelector('#content');
      if (content) {
        content.innerHTML = '<div class="danger-banner"><b>Application runtime failed to start.</b><br>Reload the page. If the problem continues, restore the last accepted deployment.</div>';
      }
    }
  }

  boot();
})();
