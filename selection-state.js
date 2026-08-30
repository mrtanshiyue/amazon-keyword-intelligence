(() => {
  'use strict';

  /*
   * Compatibility layer for the current monolithic app.js renderer.
   * app.js clears `state.selected` at the start of every render(), which makes
   * row selections disappear immediately after checkbox-driven redraws.
   *
   * This shim captures only that Set instance during the first render, restores
   * the native Set prototype immediately, and preserves selection for a narrow
   * set of UI events where redraw should not discard the user's selection.
   * Context/view/filter navigation still clears normally.
   */
  const nativeClear = Set.prototype.clear;
  let selectionSet = null;
  let preserveNextRender = false;

  function stackContains(name) {
    try {
      return String(new Error().stack || '').includes(name);
    } catch {
      return false;
    }
  }

  function installSelectionClear(set) {
    if (!set || selectionSet) return;
    selectionSet = set;

    Object.defineProperty(selectionSet, 'clear', {
      configurable: true,
      writable: true,
      value() {
        if (preserveNextRender && stackContains('render')) {
          preserveNextRender = false;
          return this;
        }
        return nativeClear.call(this);
      },
    });
  }

  Set.prototype.clear = function keywordOSCaptureSelectionSet() {
    if (!selectionSet && stackContains('render')) {
      installSelectionClear(this);
      Set.prototype.clear = nativeClear;
    }
    return nativeClear.call(this);
  };

  function requestSelectionPreservation() {
    if (selectionSet) preserveNextRender = true;
  }

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.matches(
      '[data-select-key], [data-r-select], #select-all, #select-all-research, #page-size'
    )) {
      requestSelectionPreservation();
    }
  }, true);

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest(
      '#page-prev, #page-next, #r-prev, #r-next, [data-sort]'
    )) {
      requestSelectionPreservation();
    }
  }, true);

  /* Fail safe: never leave the built-in prototype patched after startup. */
  window.addEventListener('load', () => {
    if (Set.prototype.clear !== nativeClear) Set.prototype.clear = nativeClear;
  }, { once: true });
})();
