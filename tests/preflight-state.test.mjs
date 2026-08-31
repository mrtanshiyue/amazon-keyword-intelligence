import test from 'node:test';
import assert from 'node:assert/strict';

await import('../preflight-state.js');

const { sanitizeScheduleDrafts } = globalThis.KeywordOSPreflightTest;

test('sanitizeScheduleDrafts removes only the synthetic default schedule', () => {
  const input = [
    { id: 'schedule-default', name: 'Weekday efficiency window' },
    { id: 'schedule-123', name: 'My real draft' }
  ];
  assert.deepEqual(sanitizeScheduleDrafts(input), [{ id: 'schedule-123', name: 'My real draft' }]);
});

test('sanitizeScheduleDrafts fails closed for non-array input', () => {
  assert.deepEqual(sanitizeScheduleDrafts({ id: 'schedule-default' }), []);
});
