import test from 'node:test';
import assert from 'node:assert/strict';

import type { Firestore } from 'firebase-admin/firestore';
import type { FirestoreLike } from '../src/server/repository';

// Verificação apenas em tempo de tipo: nenhuma credencial é importada ou usada em runtime.
// Se a compatibilidade falhar, `Compativel` vira `false` e a atribuição abaixo não compila.
type Compativel = Firestore extends FirestoreLike ? true : false;
const _compativel: Compativel = true;

test('Firestore do Admin SDK satisfaz FirestoreLike', () => {
  assert.equal(_compativel, true);
});
