import test from 'node:test';
import assert from 'node:assert/strict';

import { api } from '../src/services/api';
import { configurarTokenProvider } from '../src/services/auth';

test('cliente HTTP da API anexa token quando disponível', async (t) => {
  const originalFetch = globalThis.fetch;

  t.afterEach(() => {
    globalThis.fetch = originalFetch;
    configurarTokenProvider(async () => null);
  });

  await t.test('envia Authorization Bearer quando há token', async () => {
    let capturadoUrl: unknown;
    let capturadoInit: RequestInit | undefined;

    globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
      capturadoUrl = url;
      capturadoInit = init;
      return {
        ok: true,
        status: 200,
        json: async () => [],
      } as Response;
    }) as typeof fetch;

    configurarTokenProvider(async () => 'abc');
    await api.listarGabinetes();

    assert.equal(capturadoUrl, '/api/gabinetes');
    const headers = capturadoInit?.headers as Record<string, string> | undefined;
    assert.equal(headers?.Authorization, 'Bearer abc');
  });

  await t.test('não envia Authorization quando token é null', async () => {
    let capturadoInit: RequestInit | undefined;

    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      capturadoInit = init;
      return {
        ok: true,
        status: 200,
        json: async () => [],
      } as Response;
    }) as typeof fetch;

    configurarTokenProvider(async () => null);
    await api.listarGabinetes();

    const headers = capturadoInit?.headers as Record<string, string> | undefined;
    assert.equal(headers?.Authorization, undefined);
    assert.equal(Object.prototype.hasOwnProperty.call(headers ?? {}, 'Authorization'), false);
  });

  await t.test('rejeita com a mensagem de erro da API quando a resposta não é ok', async () => {
    globalThis.fetch = (async () => {
      return {
        ok: false,
        status: 401,
        json: async () => ({ erro: 'Não autenticado.' }),
      } as Response;
    }) as typeof fetch;

    configurarTokenProvider(async () => null);
    await assert.rejects(() => api.listarGabinetes(), {
      message: 'Não autenticado.',
    });
  });
});
