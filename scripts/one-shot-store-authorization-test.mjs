import assert from 'node:assert/strict';
import {
  StoreAuthorizationError,
  readStoreMemberships,
  requireStoreAuthorization,
} from '../src/store-authorization.js';

function dbMock({ tables = [], memberships = [] } = {}) {
  return {
    prepare(sql) {
      const query = String(sql);
      return {
        bind(...args) {
          return {
            async all() {
              if (query.includes('sqlite_master')) {
                return { results: tables.map((name) => ({ name })) };
              }
              if (query.includes('FROM store_memberships')) {
                const sub = args[0];
                return {
                  results: memberships
                    .filter((row) => row.access_sub === sub && row.status === 'active')
                    .map((row) => ({
                      store_id: row.store_id,
                      role: row.role,
                      status: row.status,
                      created_at: row.created_at,
                      updated_at: row.updated_at,
                    })),
                };
              }
              throw new Error(`Unexpected query: ${query}`);
            },
          };
        },
      };
    },
  };
}

const subject = 'access-sub-1';
const row = {
  access_sub: subject,
  store_id: 'store-a',
  role: 'owner',
  status: 'active',
  created_at: '2026-08-31T00:00:00Z',
  updated_at: '2026-08-31T00:00:00Z',
};

assert.deepEqual(
  await readStoreMemberships({ DB: dbMock() }, subject),
  { status: 'schema_not_applied', memberships: [] }
);

assert.deepEqual(
  await readStoreMemberships({ DB: dbMock({ tables: ['access_users', 'store_memberships'] }) }, subject),
  { status: 'no_membership', memberships: [] }
);

const authorized = await readStoreMemberships({
  DB: dbMock({ tables: ['access_users', 'store_memberships'], memberships: [row] }),
}, subject);
assert.equal(authorized.status, 'authorized');
assert.deepEqual(authorized.memberships.map(({ storeId, role }) => ({ storeId, role })), [
  { storeId: 'store-a', role: 'owner' },
]);

const membership = await requireStoreAuthorization({
  DB: dbMock({ tables: ['access_users', 'store_memberships'], memberships: [row] }),
}, subject, 'store-a', ['owner', 'operator']);
assert.equal(membership.role, 'owner');

await assert.rejects(
  () => requireStoreAuthorization({
    DB: dbMock({ tables: ['access_users', 'store_memberships'], memberships: [row] }),
  }, subject, 'store-b', ['owner']),
  (error) => error instanceof StoreAuthorizationError && error.code === 'store_access_denied'
);

await assert.rejects(
  () => requireStoreAuthorization({
    DB: dbMock({ tables: ['access_users', 'store_memberships'], memberships: [row] }),
  }, subject, 'store-a', ['viewer']),
  (error) => error instanceof StoreAuthorizationError && error.code === 'store_role_denied'
);

console.log('store authorization contract tests passed');
