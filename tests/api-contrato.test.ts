import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { criarApp } from '../src/server/app';
import { repositorioMemoria } from '../src/server/repository';

type ColecaoCaso = {
  nome: string;
  criarValido: (gabineteId: string) => Record<string, unknown>;
  filtraPorGabinete: boolean;
};

const CASOS: ColecaoCaso[] = [
  {
    nome: 'gabinetes',
    criarValido: () => ({ nome: 'Gabinete Teste' }),
    filtraPorGabinete: false,
  },
  {
    nome: 'usuarios',
    criarValido: (gabineteId) => ({ email: 'u@exemplo.test', nome: 'Usuário Teste', gabineteId }),
    filtraPorGabinete: false,
  },
  {
    nome: 'composicoes',
    criarValido: (gabineteId) => ({ gabineteId, cargos: { CC1: 1 } }),
    filtraPorGabinete: true,
  },
  {
    nome: 'admissoes',
    criarValido: (gabineteId) => ({ gabineteId, nome: 'Servidor Admissão' }),
    filtraPorGabinete: true,
  },
  {
    nome: 'exoneracoes',
    criarValido: (gabineteId) => ({ gabineteId, nome: 'Servidor Exoneração' }),
    filtraPorGabinete: true,
  },
  {
    nome: 'declaracoes',
    criarValido: (gabineteId) => ({ gabineteId, nomeCompleto: 'Nome Completo', cpf: '000.000.000-00' }),
    filtraPorGabinete: true,
  },
];

test('contrato /api preservado para as seis coleções', async (t) => {
  const repo = repositorioMemoria({
    gabinetes: [
      { id: 'gab_0', nome: 'Gabinete A', tipo: 'vereador', ativo: true },
      { id: 'gab_1', nome: 'Gabinete B', tipo: 'vereador', ativo: true },
    ],
  });

  // Fixture determinística para fallback SPA: criarApp resolve dist a partir do cwd.
  const cwdOriginal = process.cwd();
  const tmpRaiz = fs.mkdtempSync(path.join(os.tmpdir(), 'api-contrato-'));
  const distDir = path.join(tmpRaiz, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  const indexConteudo = '<!doctype html><html><body>SPA-FALLBACK-TESTE</body></html>';
  fs.writeFileSync(path.join(distDir, 'index.html'), indexConteudo, 'utf-8');
  process.chdir(tmpRaiz);

  let server: ReturnType<ReturnType<typeof criarApp>['listen']> | undefined;
  try {
    const app = criarApp(repo);
    server = app.listen(0);
    await once(server, 'listening');
  } finally {
    // criarApp já capturou o distDir; restaurar cwd para não afetar outros caminhos relativos.
    process.chdir(cwdOriginal);
  }

  t.after(async () => {
    await new Promise<void>((resolve, reject) => server!.close((err) => (err ? reject(err) : resolve())));
    fs.rmSync(tmpRaiz, { recursive: true, force: true });
  });

  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;

  for (const caso of CASOS) {
    await t.test(`${caso.nome}: GET retorna array`, async () => {
      const res = await fetch(`${base}/api/${caso.nome}`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(Array.isArray(body));
    });

    await t.test(`${caso.nome}: GET ?gabineteId=gab_0`, async () => {
      if (caso.filtraPorGabinete) {
        // garante registros em gabinetes diferentes para coleções filtráveis
        await fetch(`${base}/api/${caso.nome}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(caso.criarValido('gab_0')),
        });
        await fetch(`${base}/api/${caso.nome}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(caso.criarValido('gab_1')),
        });

        const res = await fetch(`${base}/api/${caso.nome}?gabineteId=gab_0`);
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.ok(Array.isArray(body));
        assert.ok(body.length >= 1, 'deve retornar ao menos o registro de gab_0');
        for (const item of body) {
          assert.equal(item.gabineteId, 'gab_0');
        }
      } else {
        // Contrato histórico preservado: gabinetes e usuarios ignoram ?gabineteId e devolvem a lista completa.
        if (caso.nome === 'usuarios') {
          await fetch(`${base}/api/${caso.nome}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(caso.criarValido('gab_0')),
          });
        }
        const semFiltroRes = await fetch(`${base}/api/${caso.nome}`);
        assert.equal(semFiltroRes.status, 200);
        const semFiltro = await semFiltroRes.json();
        assert.ok(Array.isArray(semFiltro));
        assert.ok(semFiltro.length >= 1, 'deve haver itens para tornar explícita a não-filtragem');

        const comFiltroRes = await fetch(`${base}/api/${caso.nome}?gabineteId=gab_0`);
        assert.equal(comFiltroRes.status, 200);
        const comFiltro = await comFiltroRes.json();
        assert.ok(Array.isArray(comFiltro));
        assert.deepEqual(
          comFiltro,
          semFiltro,
          'parâmetro ?gabineteId é ignorado nesta coleção (comportamento preservado): resultado igual ao sem filtro',
        );
      }
    });

    await t.test(`${caso.nome}: POST 201 com id, DELETE {ok:true} e some do GET`, async () => {
      const payload = caso.criarValido('gab_0');
      const criadoRes = await fetch(`${base}/api/${caso.nome}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      assert.equal(criadoRes.status, 201);
      const criado = await criadoRes.json();
      assert.ok(criado.id, 'POST deve retornar objeto contendo id');

      const idParaExcluir = caso.nome === 'usuarios' ? (criado.uid ?? criado.id) : criado.id;

      const delRes = await fetch(`${base}/api/${caso.nome}/${encodeURIComponent(idParaExcluir)}`, { method: 'DELETE' });
      assert.equal(delRes.status, 200);
      const delBody = await delRes.json();
      assert.deepEqual(delBody, { ok: true });

      const listaRes = await fetch(`${base}/api/${caso.nome}`);
      const lista = await listaRes.json();
      const aindaExiste = lista.some((item: any) =>
        item.id === criado.id || (caso.nome === 'usuarios' && item.uid === idParaExcluir),
      );
      assert.equal(aindaExiste, false, 'registro deve desaparecer do GET após DELETE');
    });
  }

  await t.test('gabinetes: PUT /api/gabinetes/:id retorna gabinete atualizado', async () => {
    const res = await fetch(`${base}/api/gabinetes/gab_0`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nome: 'Gabinete A Atualizado', ativo: false }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.id, 'gab_0');
    assert.equal(body.nome, 'Gabinete A Atualizado');
    assert.equal(body.ativo, false);
  });

  await t.test('fallback SPA: GET /api/inexistente cai no index.html (determinístico)', async () => {
    const res = await fetch(`${base}/api/inexistente`);
    assert.equal(res.status, 200);
    const texto = await res.text();
    assert.equal(texto, indexConteudo, 'deve retornar o conteúdo do dist/index.html da fixture');
  });
});
