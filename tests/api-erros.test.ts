import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { criarApp } from '../src/server/app';
import { repositorioMemoria } from '../src/server/repository';

test('rejeição do repositório em rota /api responde 500 e não derruba o processo', async (t) => {
  const repositorioBase = repositorioMemoria({
    gabinetes: [{ id: 'gab_0', nome: 'Gabinete A' }],
    admissoes: [{ id: 'adm_0', nome: 'Admissão A' }],
  });
  // Só a coleção de gabinetes falha: a segunda requisição prova que o processo segue vivo.
  const repositorioQueFalha = {
    ...repositorioBase,
    async listar<T>(colecao: string): Promise<T[]> {
      if (colecao === 'gabinetes') throw new Error('falha simulada do Firestore');
      return repositorioBase.listar<T>(colecao);
    },
  };

  const cwdOriginal = process.cwd();
  const tmpRaiz = fs.mkdtempSync(path.join(os.tmpdir(), 'api-erros-'));
  const distDir = path.join(tmpRaiz, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><html></html>', 'utf-8');

  let server: ReturnType<ReturnType<typeof criarApp>['listen']> | undefined;
  let rejeicoesNaoTratadas = 0;
  const registrarRejeicao = () => {
    rejeicoesNaoTratadas += 1;
  };

  // O listener evita que o Node encerre o runner no estado RED; a asserção final exige zero rejeições.
  process.on('unhandledRejection', registrarRejeicao);
  try {
    process.chdir(tmpRaiz);
    const app = criarApp(repositorioQueFalha);
    server = app.listen(0);
    await once(server, 'listening');
  } finally {
    process.chdir(cwdOriginal);
  }

  t.after(async () => {
    process.off('unhandledRejection', registrarRejeicao);
    await new Promise<void>((resolve, reject) => server!.close((err) => (err ? reject(err) : resolve())));
    fs.rmSync(tmpRaiz, { recursive: true, force: true });
  });

  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  const primeira = await fetch(`${baseUrl}/api/gabinetes`, { signal: AbortSignal.timeout(2000) });
  assert.equal(primeira.status, 500, 'rejeição do repositório deve virar 500');
  assert.deepEqual(await primeira.json(), { erro: 'Erro interno.' });

  const segunda = await fetch(`${baseUrl}/api/admissoes`, { signal: AbortSignal.timeout(2000) });
  assert.equal(segunda.status, 200, 'segunda requisição deve ser atendida: o processo não pode ter morrido');
  assert.ok(Array.isArray(await segunda.json()));

  assert.equal(
    rejeicoesNaoTratadas,
    0,
    'a rejeição deve ser capturada pelo middleware de erro, não pelo Node',
  );
});
