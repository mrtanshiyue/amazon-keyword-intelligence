import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../i18n.js', import.meta.url), 'utf8');

function loadI18n(mode = 'en') {
  const listeners = {};
  const attributeNodes = [];
  let observed = null;
  let observerCallback = null;
  class MutationObserverMock {
    constructor(callback) { this.callback = callback; observerCallback = callback; }
    observe(target, options) { observed = { target, options }; }
  }
  const body = {
    setAttribute() {},
    querySelectorAll() { return []; },
  };
  const document = {
    readyState: 'loading',
    body,
    title: '',
    documentElement: {},
    addEventListener(name, callback) { listeners[name] = callback; },
    querySelectorAll(selector) { return selector === '[placeholder],[title],[aria-label]' ? attributeNodes : []; },
    createTreeWalker() { return { nextNode() { return null; } }; },
  };
  const window = {};
  const context = {
    window,
    document,
    MutationObserver: MutationObserverMock,
    NodeFilter: { SHOW_TEXT: 4 },
    localStorage: {
      getItem(key) { return key === 'keywordos_language_v9' ? mode : null; },
      setItem() {},
    },
    queueMicrotask,
    console,
    WeakMap,
    Set,
    Object,
    String,
    Array,
    RegExp,
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'i18n.js' });
  return {
    api: window.KeywordOSI18N,
    listeners,
    body,
    observed: () => observed,
    addAttributeNode(node) { attributeNodes.push(node); },
    mutate(records) { observerCallback?.(records); },
  };
}

function attributeElement(initial = {}) {
  const attrs = new Map(Object.entries(initial));
  return {
    nodeType: 1,
    matches(selector) { return selector === '[placeholder],[title],[aria-label]' && ['placeholder','title','aria-label'].some(a => attrs.has(a)); },
    querySelectorAll() { return []; },
    hasAttribute(name) { return attrs.has(name); },
    getAttribute(name) { return attrs.get(name) ?? null; },
    setAttribute(name, value) { attrs.set(name, String(value)); },
    closest() { return null; },
  };
}

test('recent suite, import, evidence and organizer UI strings have Chinese translations', () => {
  const { api } = loadI18n();
  const pairs = [
    ['Evidence Health', '证据健康'],
    ['Next Tasks', '下一步任务'],
    ['Import readiness', '导入就绪状态'],
    ['Evidence details', '证据详情'],
    ['Saved Views', '已保存视图'],
    ['Recent Work', '最近工作'],
    ['Explicit voice-of-customer labels', '显式客户之声标签'],
    ['Relative opportunity score', '相对机会分'],
    ['Export PO CSV', '导出采购 CSV'],
    ['Expand sidebar', '展开侧栏'],
    ['Collapse sidebar', '收起侧栏'],
  ];
  for (const [en, zh] of pairs) assert.equal(api.zhFor(en), zh, en);
});

test('dynamic row and source-count patterns translate without inventing metrics', () => {
  const { api } = loadI18n();
  assert.equal(api.zhFor('1,234 rows'), '1,234 行');
  assert.equal(api.zhFor('3/5 sources loaded'), '已加载 3/5 个数据源');
  assert.equal(api.zhFor('Coverage 2026-06-01 → 2026-06-30'), '覆盖范围 2026-06-01 → 2026-06-30');
});

test('table translation allowlist covers system status columns but protects evidence columns', () => {
  const { api } = loadI18n();
  for (const header of ['Status', 'Validation', 'Result', 'State', 'Health', 'Risk', 'Priority', 'Decision', 'Indexed']) {
    assert.equal(api.isTranslatableTableHeader(header), true, header);
  }
  for (const header of ['Keyword', 'Title', 'Body', 'Imported label', 'Evidence samples', 'ASIN', 'SKU', 'Search Query']) {
    assert.equal(api.isTranslatableTableHeader(header), false, header);
  }
});

test('dynamic observer watches subtree child additions after DOMContentLoaded', () => {
  const runtime = loadI18n('zh');
  assert.equal(typeof runtime.listeners.DOMContentLoaded, 'function');
  runtime.listeners.DOMContentLoaded();
  const observed = runtime.observed();
  assert.equal(observed.target, runtime.body);
  assert.equal(observed.options.childList, true);
  assert.equal(observed.options.subtree, true);
  assert.equal(observed.options.attributes, true);
  assert.equal(observed.options.attributeFilter.join(','), 'placeholder,title,aria-label');
});

test('dynamic attribute updates refresh their English source and follow the active language', () => {
  const runtime = loadI18n('zh');
  const button = attributeElement({ title: 'Collapse sidebar', 'aria-label': 'Collapse sidebar' });
  runtime.addAttributeNode(button);
  runtime.listeners.DOMContentLoaded();
  assert.equal(button.getAttribute('title'), '收起侧栏');
  assert.equal(button.getAttribute('aria-label'), '收起侧栏');

  button.setAttribute('title', 'Expand sidebar');
  button.setAttribute('aria-label', 'Expand sidebar');
  runtime.mutate([
    { type: 'attributes', target: button, attributeName: 'title', addedNodes: [] },
    { type: 'attributes', target: button, attributeName: 'aria-label', addedNodes: [] },
  ]);
  assert.equal(button.getAttribute('title'), '展开侧栏');
  assert.equal(button.getAttribute('aria-label'), '展开侧栏');

  runtime.api.setLanguage('en');
  assert.equal(button.getAttribute('title'), 'Expand sidebar');
  assert.equal(button.getAttribute('aria-label'), 'Expand sidebar');
});

test('newly added root elements translate their own accessible attributes', () => {
  const runtime = loadI18n('zh');
  const button = attributeElement({ title: 'Expand sidebar' });
  runtime.api.apply(button);
  assert.equal(button.getAttribute('title'), '展开侧栏');
});

test('observer intentionally avoids characterData to prevent translation feedback loops', () => {
  assert.match(source, /attributes:true,attributeFilter:TRANSLATABLE_ATTRS/);
  assert.doesNotMatch(source, /characterData\s*:\s*true/);
});

test('i18n runtime still respects data-no-i18n and exports the existing language API', () => {
  assert.match(source, /data-no-i18n/);
  const { api } = loadI18n();
  assert.equal(typeof api.apply, 'function');
  assert.equal(typeof api.setLanguage, 'function');
  assert.equal(typeof api.getLanguage, 'function');
  assert.equal(typeof api.zhFor, 'function');
});
