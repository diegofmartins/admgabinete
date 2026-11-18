import test from 'node:test';
import assert from 'node:assert/strict';

import { DOMINIO_INSTITUCIONAL, emailInstitucionalValido } from '../src/dominio';

test('domínio institucional é o da Câmara de Curitiba', () => {
  assert.equal(DOMINIO_INSTITUCIONAL, '@cmc.pr.gov.br');
});

test('emailInstitucionalValido: aceita e-mail institucional em qualquer caixa', () => {
  assert.equal(emailInstitucionalValido('diego.martins@cmc.pr.gov.br'), true);
  assert.equal(emailInstitucionalValido('  DIEGO.MARTINS@CMC.PR.GOV.BR  '), true);
});

test('emailInstitucionalValido: rejeita Gmail, vazio e domínios parecidos', () => {
  for (const email of [
    'pessoal@gmail.com',
    'outro@cmc.pr.gov.br.evil.com',
    '@cmc.pr.gov.br',
    'cmc.pr.gov.br',
    '',
    undefined,
    null,
  ]) {
    assert.equal(emailInstitucionalValido(email), false, String(email));
  }
});
