import test from 'node:test';
import assert from 'node:assert/strict';

import { deveAplicarUsuarioAuth } from '../src/services/authSequencia';

test('deveAplicarUsuarioAuth aceita callback atual com o mesmo usuário', () => {
  assert.equal(deveAplicarUsuarioAuth(3, 3, 'uid-1', 'uid-1'), true);
});

test('deveAplicarUsuarioAuth rejeita sequência desatualizada', () => {
  assert.equal(deveAplicarUsuarioAuth(4, 3, 'uid-1', 'uid-1'), false);
});

test('deveAplicarUsuarioAuth rejeita usuário trocado ou desautenticado', () => {
  assert.equal(deveAplicarUsuarioAuth(3, 3, 'uid-2', 'uid-1'), false);
  assert.equal(deveAplicarUsuarioAuth(3, 3, undefined, 'uid-1'), false);
});

test('deveAplicarUsuarioAuth rejeita logout e troca de usuário simultâneos', () => {
  assert.equal(deveAplicarUsuarioAuth(5, 3, 'uid-2', 'uid-1'), false);
});
