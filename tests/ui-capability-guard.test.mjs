import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../ui-capability-guard.js');
const guard = globalThis.KeywordOSUiCapabilityGuardTest;

test('rule-based bid labels are accurate in all language modes', () => {
  assert.equal(guard.LEGACY_BID_KEY, 'AI Bids');
  assert.equal(guard.bidLabel('en'), 'Rule-based Bids');
  assert.equal(guard.bidLabel('zh'), '规则化调价建议');
  assert.equal(guard.bidLabel('bi'), '规则化调价建议 / Rule-based Bids');
  assert.equal(guard.bidSettingsLabel('en'), 'Bid Recommendation Settings');
});

test('button capability fails closed when no action is connected', () => {
  assert.deepEqual(guard.capabilityDecision({}), { enabled: false, reason: guard.UNAVAILABLE_REASON, source: 'unbound' });
  assert.deepEqual(guard.capabilityDecision({ direct: true }), { enabled: true, reason: '', source: 'direct' });
  assert.deepEqual(guard.capabilityDecision({ delegated: true }), { enabled: true, reason: '', source: 'delegated' });
  assert.deepEqual(guard.capabilityDecision({ navigation: true }), { enabled: true, reason: '', source: 'navigation' });
});

test('disabled buttons always receive an explanatory reason', () => {
  assert.deepEqual(
    guard.capabilityDecision({ disabled: true, title: '' }),
    { enabled: false, reason: guard.DISABLED_REASON, source: 'disabled' }
  );
  assert.equal(guard.capabilityDecision({ disabled: true, title: 'No hourly data' }).reason, 'No hourly data');
});

test('known document-delegated controls remain recognized without treating every data attribute as an action', () => {
  assert.equal(guard.delegatedActionDescriptor({ id: 'apply-suggestion-changes' }), true);
  assert.equal(guard.delegatedActionDescriptor({ bulk: 'inspect' }), true);
  assert.equal(guard.delegatedActionDescriptor({ text: '⇩ Export' }), true);
  assert.equal(guard.delegatedActionDescriptor({ page: 'negative-library', text: 'Thresholds' }), true);
  assert.equal(guard.delegatedActionDescriptor({ page: 'conflicts', text: 'Risk: High ⌄' }), true);
  assert.equal(guard.delegatedActionDescriptor({ id: 'mystery-button', text: 'Do thing' }), false);
});

test('page detection uses the canonical registry route instead of translated visible titles', () => {
  const registry = { pageFromHash(hash) { return hash === '#page=cerebro' ? 'cerebro' : ''; } };
  assert.equal(guard.currentPageId({ hash: '#page=cerebro' }, registry), 'cerebro');
});

test('capability guard loads before application renderers and is included in the publish build', async () => {
  const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const guardIndex = index.indexOf('<script src="ui-capability-guard.js"></script>');
  const appIndex = index.indexOf('<script src="app.js"></script>');
  assert.ok(guardIndex >= 0, 'guard script should be loaded');
  assert.ok(appIndex > guardIndex, 'guard must load before app.js so direct click handlers are observed');
  assert.match(pkg.scripts.check, /node --check ui-capability-guard\.js/);
  assert.match(pkg.scripts.build, /ui-capability-guard\.js/);
});
