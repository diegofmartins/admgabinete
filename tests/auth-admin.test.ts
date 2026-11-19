import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteApp, initializeApp } from 'firebase-admin';

import { obterAuthAdmin } from '../src/server/auth-admin';

test('obterAuthAdmin devolve Admin Auth com getUserByEmail e setCustomUserClaims', async () => {
  const app = initializeApp({ projectId: 'projeto-teste' }, 'teste-auth-admin');
  try {
    const auth = (await obterAuthAdmin(app)) as {
      getUserByEmail?: unknown;
      setCustomUserClaims?: unknown;
    };
    assert.equal(typeof auth.getUserByEmail, 'function');
    assert.equal(typeof auth.setCustomUserClaims, 'function');
  } finally {
    await deleteApp(app);
  }
});
