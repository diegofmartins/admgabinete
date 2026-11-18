import test from 'node:test';
import assert from 'node:assert/strict';

import { mapearPapel } from '../src/services/firebase';

test('mapearPapel reconhece os papéis conhecidos', () => {
  assert.equal(mapearPapel('admin'), 'admin');
  assert.equal(mapearPapel('vereador'), 'vereador');
  assert.equal(mapearPapel('assessor'), 'assessor');
});

test('mapearPapel usa assessor como fallback', () => {
  assert.equal(mapearPapel('qualquer'), 'assessor');
  assert.equal(mapearPapel(undefined), 'assessor');
});
