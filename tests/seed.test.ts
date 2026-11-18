import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import type { Banco } from '../src/server/repository';
import { repositorioFirestore } from '../src/server/repositorio-firestore';
import { concederAdmin, seed, type AdminAuthLike } from '../scripts/seed-firestore';
import { fakeFirestore } from './helpers/firestore-fake';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COLECOES = [
  'gabinetes',
  'usuarios',
  'composicoes',
  'admissoes',
  'exoneracoes',
  'declaracoes',
] as const;

function carregarBanco(): Banco {
  return JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'db.json'), 'utf8')) as Banco;
}

test('seed(repo, bancoLocal, "test"): grava as seis coleções e devolve a soma dos tamanhos', async () => {
  const bancoLocal = carregarBanco();
  const fake = fakeFirestore();
  const repo = repositorioFirestore(fake, 'test');

  const resultado = await seed(repo, bancoLocal, 'test');

  const esperado = COLECOES.reduce((soma, colecao) => soma + bancoLocal[colecao].length, 0);
  assert.deepEqual(resultado, { escritos: esperado });
  assert.equal(bancoLocal.gabinetes.length, 3);
  assert.equal(bancoLocal.declaracoes.length, 2);

  for (const colecao of COLECOES) {
    const gravados = await fake.collection(`test_${colecao}`).get();
    assert.equal(gravados.docs.length, bancoLocal[colecao].length, `test_${colecao}`);
  }

  const declaracoes = (await fake.collection('test_declaracoes').get()).docs.map((doc) =>
    JSON.stringify(doc.data()),
  );
  for (const declaracao of bancoLocal.declaracoes) {
    assert.ok(
      declaracoes.some((texto) => texto.includes(String(declaracao.cpf))),
      `CPF ${declaracao.cpf} não foi gravado`,
    );
  }
});

test('seed(repo, bancoLocal, "test"): nenhum documento aparece nas coleções prod_*', async () => {
  const fake = fakeFirestore();
  const repo = repositorioFirestore(fake, 'test');

  await seed(repo, carregarBanco(), 'test');

  for (const colecao of COLECOES) {
    const producao = await fake.collection(`prod_${colecao}`).get();
    assert.equal(producao.docs.length, 0, `prod_${colecao} deveria estar vazia`);
  }
});

test('seed(repo, bancoLocal, "test"): ids originais são campo id e ID do documento', async () => {
  const bancoLocal = carregarBanco();
  const fake = fakeFirestore();
  const repo = repositorioFirestore(fake, 'test');

  await seed(repo, bancoLocal, 'test');

  for (const colecao of COLECOES) {
    for (const documento of bancoLocal[colecao]) {
      const gravado = await fake.collection(`test_${colecao}`).doc(documento.id).get();
      assert.equal(gravado.exists, true, `${colecao}/${documento.id} inexistente`);
      assert.equal(gravado.data()?.id, documento.id, `${colecao}/${documento.id}: campo id`);
    }
  }
  assert.equal((await fake.collection('test_gabinetes').doc('gab_0').get()).exists, true);
});

test('concederAdmin: promove usuário existente com claim role=admin', async () => {
  const chamadas: Array<Record<string, unknown>> = [];
  const fakeAuth: AdminAuthLike = {
    async getUserByEmail(email) {
      chamadas.push({ metodo: 'getUserByEmail', email });
      return { uid: 'uid-admin' };
    },
    async setCustomUserClaims(uid, claims) {
      chamadas.push({ metodo: 'setCustomUserClaims', uid, claims });
    },
  };

  await concederAdmin(fakeAuth, 'diego.martins@cmc.pr.gov.br');

  assert.deepEqual(chamadas, [
    { metodo: 'getUserByEmail', email: 'diego.martins@cmc.pr.gov.br' },
    { metodo: 'setCustomUserClaims', uid: 'uid-admin', claims: { role: 'admin' } },
  ]);
});

test('concederAdmin: usuário ainda não entrou com Google gera instrução clara', async () => {
  const fakeAuth: AdminAuthLike = {
    async getUserByEmail() { throw new Error('auth/user-not-found'); },
    async setCustomUserClaims() { throw new Error('não deveria ser chamado'); },
  };
  await assert.rejects(
    concederAdmin(fakeAuth, 'diego.martins@cmc.pr.gov.br'),
    /Entre uma vez com o Google/,
  );
});

test('concederAdmin: recusa e-mail fora do domínio institucional', async () => {
  const fakeAuth: AdminAuthLike = {
    async getUserByEmail() { return { uid: 'x' }; },
    async setCustomUserClaims() {},
  };
  await assert.rejects(concederAdmin(fakeAuth, 'admin@gmail.com'), /@cmc\.pr\.gov\.br/);
});

test('código versionado não contém senha de administrador', () => {
  for (const termo of ['SEED_ADMIN_SENHA', 'createUser(']) {
    const grep = spawnSync('grep', ['-R', '-F', '-l', termo, 'src', 'scripts'], {
      cwd: RAIZ, encoding: 'utf8',
    });
    assert.equal(grep.status, 1, `${termo} vazou em src/ ou scripts/`);
  }
});
