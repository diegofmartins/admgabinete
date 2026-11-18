import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { criarApp } from '../src/server/app';
import { repositorioMemoria } from '../src/server/repository';
import { ErroAcessoRestrito, verificadorFirebase, type AuthLike } from '../src/server/auth';

const verificadorTeste = async (token: string) => {
  if (token !== 'token-valido') {
    throw new Error('Token inválido');
  }
  return { uid: 'usuario-teste' };
};

test('auth na API /api/* com verificador customizado', async (t) => {
  const repo = repositorioMemoria({
    gabinetes: [{ id: 'gab_0', nome: 'Gabinete A', tipo: 'vereador', ativo: true }],
  });

  const cwdOriginal = process.cwd();
  const tmpRaiz = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-api-'));
  const distDir = path.join(tmpRaiz, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><html></html>', 'utf-8');
  process.chdir(tmpRaiz);

  let server: ReturnType<ReturnType<typeof criarApp>['listen']> | undefined;
  try {
    const app = criarApp(repo, verificadorTeste);
    server = app.listen(0);
    await once(server, 'listening');
  } finally {
    process.chdir(cwdOriginal);
  }

  t.after(async () => {
    await new Promise<void>((resolve, reject) => server!.close((err) => (err ? reject(err) : resolve())));
    fs.rmSync(tmpRaiz, { recursive: true, force: true });
  });

  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;

  await t.test('GET /api/gabinetes sem header → 401', async () => {
    const res = await fetch(`${base}/api/gabinetes`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.deepEqual(body, { erro: 'Não autenticado.' });
  });

  await t.test('GET /api/gabinetes com Bearer token-invalido → 401', async () => {
    const res = await fetch(`${base}/api/gabinetes`, {
      headers: { authorization: 'Bearer token-invalido' },
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.deepEqual(body, { erro: 'Não autenticado.' });
  });

  await t.test('GET /api/gabinetes com Bearer token-valido → 200 e array', async () => {
    const res = await fetch(`${base}/api/gabinetes`, {
      headers: { authorization: 'Bearer token-valido' },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body));
  });

  await t.test('verificadorFirebase mapeia uid e role', async () => {
    const fakeAuth: AuthLike = {
      verifyIdToken: async () => ({
        uid: 'u1',
        role: 'admin',
        email: 'diego.martins@cmc.pr.gov.br',
        email_verified: true,
      }),
    };
    const usuario = await verificadorFirebase(fakeAuth)('qualquer-token');
    assert.deepEqual(usuario, { uid: 'u1', papel: 'admin' });
  });

  await t.test('verificadorFirebase recusa e-mail pessoal', async () => {
    const fakeAuth: AuthLike = {
      verifyIdToken: async () => ({
        uid: 'u2', email: 'pessoal@gmail.com', email_verified: true,
      }),
    };
    await assert.rejects(verificadorFirebase(fakeAuth)('token'), ErroAcessoRestrito);
  });

  await t.test('verificadorFirebase recusa e-mail não verificado', async () => {
    const fakeAuth: AuthLike = {
      verifyIdToken: async () => ({
        uid: 'u3', email: 'diego.martins@cmc.pr.gov.br', email_verified: false,
      }),
    };
    await assert.rejects(verificadorFirebase(fakeAuth)('token'), ErroAcessoRestrito);
  });

  await t.test('API devolve 403 para token institucional recusado', async () => {
    const app403 = criarApp(repo, async () => { throw new ErroAcessoRestrito(); });
    const srv403 = app403.listen(0);
    await once(srv403, 'listening');
    try {
      const { port } = srv403.address() as AddressInfo;
      const res = await fetch(`http://127.0.0.1:${port}/api/gabinetes`, {
        headers: { authorization: 'Bearer qualquer' },
      });
      assert.equal(res.status, 403);
      assert.deepEqual(await res.json(), { erro: 'Acesso restrito.' });
    } finally {
      await new Promise<void>((resolve, reject) =>
        srv403.close((err) => (err ? reject(err) : resolve())),
      );
    }
  });
});
