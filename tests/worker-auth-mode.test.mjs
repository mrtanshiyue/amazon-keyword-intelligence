import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

test('private session defaults to explicit disabled-test mode without fabricating identity', async () => {
  const response = await worker.fetch(
    new Request('https://keywordos.test/api/private/session'),
    { AMAZON_API_MODE: 'disabled' }
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, {
    authenticated: false,
    authenticationRequired: false,
    authMode: 'disabled-test',
    identity: null,
    storeAuthorization: null,
    amazonApiMode: 'disabled',
  });
});

test('cloudflare-access mode remains fail-closed when explicitly restored without config', async () => {
  const response = await worker.fetch(
    new Request('https://keywordos.test/api/private/session'),
    { AUTH_MODE: 'cloudflare-access', AMAZON_API_MODE: 'disabled' }
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'access_not_configured' });
});

test('HEAD private session in disabled-test mode returns the same status without a body', async () => {
  const response = await worker.fetch(
    new Request('https://keywordos.test/api/private/session', { method: 'HEAD' }),
    {}
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
});
