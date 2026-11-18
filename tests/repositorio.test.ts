import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { repositorioMemoria } from '../src/server/repository';
import { repositorioJson } from '../src/server/repositorio-json';
import { repositorioFirestore } from '../src/server/repositorio-firestore';
import { fakeFirestore } from './helpers/firestore-fake';
import { GABINETES_PADRAO } from '../src/types';

test('repositorioMemoria: salvar, buscar, listar e excluir', async () => {
  const repo = repositorioMemoria();
  const gab = { id: 'gab_x', nome: 'X' };

  await repo.salvar('gabinetes', gab);

  assert.deepEqual(await repo.buscar('gabinetes', 'gab_x'), gab);
  assert.deepEqual(await repo.listar('gabinetes'), [gab]);

  assert.equal(await repo.excluir('gabinetes', 'gab_x'), true);
  assert.equal(await repo.buscar('gabinetes', 'gab_x'), null);
});

test('repositorioFirestore(fake, ""): usa prod_gabinetes e preserva o id', async () => {
  const fake = fakeFirestore();
  const repo = repositorioFirestore(fake, '');

  await repo.salvar('gabinetes', { id: 'gab_x', nome: 'X' });

  const gravado = await fake.collection('prod_gabinetes').doc('gab_x').get();
  assert.equal(gravado.exists, true);
  assert.deepEqual(gravado.data(), { id: 'gab_x', nome: 'X' });

  assert.deepEqual(await repo.buscar('gabinetes', 'gab_x'), { id: 'gab_x', nome: 'X' });
});

test('repositorioFirestore(fake, "test"): listar lê test_declaracoes, nunca prod_declaracoes', async () => {
  const fake = fakeFirestore();
  await fake.collection('prod_declaracoes').doc('dec_prod').set({ nome: 'PROD' });

  const repo = repositorioFirestore(fake, 'test');
  await repo.salvar('declaracoes', { id: 'dec_test', nome: 'TESTE' });

  const lista = await repo.listar<{ id: string; nome: string }>('declaracoes');
  assert.deepEqual(lista, [{ id: 'dec_test', nome: 'TESTE' }]);
  assert.equal(lista.some((d) => d.id === 'dec_prod'), false);
});

test('repositorioJson: salvar + listar preservam dados e ids', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repositorio-'));
  const arquivo = path.join(dir, 'db.json');
  try {
    // arquivo existente com gabinetes vazios: não deve acionar o seed padrão
    fs.writeFileSync(arquivo, JSON.stringify({ gabinetes: [] }, null, 2));
    const repo = repositorioJson(arquivo);

    await repo.salvar('gabinetes', { id: 'gab_x', nome: 'X' });
    await repo.salvar('gabinetes', { id: 'gab_y', nome: 'Y' });

    const lista = await repo.listar<{ id: string; nome: string }>('gabinetes');
    assert.deepEqual(lista, [
      { id: 'gab_x', nome: 'X' },
      { id: 'gab_y', nome: 'Y' },
    ]);
    assert.deepEqual(await repo.buscar('gabinetes', 'gab_y'), { id: 'gab_y', nome: 'Y' });

    // escrita atômica: o .tmp não pode sobrar depois do rename
    assert.equal(fs.existsSync(`${arquivo}.tmp`), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('repositorioJson: arquivo inexistente usa seed de GABINETES_PADRAO', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repositorio-'));
  const arquivo = path.join(dir, 'db.json'); // inexistente
  try {
    const repo = repositorioJson(arquivo);

    const lista = await repo.listar<{ id: string }>('gabinetes');
    assert.notEqual(lista.length, 0);
    assert.equal(lista[0].id, 'gab_0');
    assert.equal(lista.length, GABINETES_PADRAO.length);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
