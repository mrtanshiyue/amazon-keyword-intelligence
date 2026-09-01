import assert from 'node:assert/strict';
import test from 'node:test';

import { readStoreMemberships } from '../src/store-authorization.js';

test('store membership lookup requires both user and membership to be active', async () => {
  const statements = [];
  const env = {
    DB: {
      prepare(sql) {
        statements.push(sql);
        return {
          bind() {
            return {
              async all() {
                return statements.length === 1
                  ? { results: [{ name: 'access_users' }, { name: 'store_memberships' }] }
                  : { results: [] };
              },
            };
          },
        };
      },
    },
  };

  assert.deepEqual(await readStoreMemberships(env, 'user-1'), {
    status: 'no_membership',
    memberships: [],
  });
  assert.match(statements[1], /JOIN access_users u ON u\.access_sub = m\.access_sub/);
  assert.match(statements[1], /m\.status = 'active' AND u\.status = 'active'/);
});
