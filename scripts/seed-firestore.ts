import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Banco, FirestoreLike, Repositorio } from '../src/server/repository';
import { repositorioFirestore } from '../src/server/repositorio-firestore';

/** Coleções migradas de `data/db.json`; a ordem também define a ordem da escrita. */
export const COLECOES = [
  'gabinetes',
  'usuarios',
  'composicoes',
  'admissoes',
  'exoneracoes',
  'declaracoes',
] as const;

/**
 * Superfície mínima do Firebase Admin Auth usada para criar o administrador.
 * `AuthLike` (verificação de token) não expõe createUser/claims — daí a interface própria.
 */
export interface AdminAuthLike {
  createUser(dados: { email: string; password: string }): Promise<{ uid: string }>;
  setCustomUserClaims(uid: string, claims: Record<string, unknown>): Promise<void>;
}

/**
 * Copia as seis coleções de `bancoLocal` para o repositório injetado.
 *
 * O namespace é aplicado pelo próprio `repositorioFirestore`, então `prefixo`
 * serve apenas para validação e log — ele NÃO compõe nomes de coleção aqui.
 */
export async function seed(
  repositorio: Repositorio,
  bancoLocal: Banco,
  prefixo: string,
): Promise<{ escritos: number }> {
  const p = prefixo?.trim() || 'prod';
  let escritos = 0;

  for (const colecao of COLECOES) {
    const documentos = bancoLocal?.[colecao] ?? [];
    for (const documento of documentos) {
      if (!documento || typeof documento.id !== 'string' || documento.id.trim() === '') {
        throw new Error(`Documento sem id válido em ${p}_${colecao}; seed abortado.`);
      }
      await repositorio.salvar(colecao, documento);
      escritos++;
    }
  }

  console.log(`[seed] prefixo=${p} escritos=${escritos}`);
  return { escritos };
}

/** Cria o usuário administrador com a claim `role: 'admin'`. */
export async function criarAdmin(
  auth: AdminAuthLike,
  email: string,
  senha: string,
): Promise<void> {
  if (!email?.trim() || !senha) {
    throw new Error('SEED_ADMIN_EMAIL e SEED_ADMIN_SENHA devem ser informados (nunca hardcoded).');
  }
  const usuario = await auth.createUser({ email, password: senha });
  await auth.setCustomUserClaims(usuario.uid, { role: 'admin' });
  console.log(`[seed] administrador criado: ${email}`);
}

async function main(): Promise<void> {
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const caminhoBanco = path.join(raiz, 'data', 'db.json');
  const bancoLocal = JSON.parse(await fs.readFile(caminhoBanco, 'utf8')) as Banco;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!serviceAccount && !projectId) {
    throw new Error(
      'Defina FIREBASE_SERVICE_ACCOUNT (JSON da conta de serviço) ou FIREBASE_PROJECT_ID (ADC) antes de rodar o seed.',
    );
  }

  const admin = await import('firebase-admin');
  const { initializeApp, getApps, getApp, cert } = admin as unknown as {
    initializeApp: (options?: Record<string, unknown>) => unknown;
    getApps: () => unknown[];
    getApp: () => unknown;
    cert: (serviceAccount: object) => unknown;
  };
  const app = getApps().length
    ? getApp()
    : initializeApp(
        serviceAccount
          ? { credential: cert(JSON.parse(serviceAccount) as object) }
          : { projectId },
      );

  const { getFirestore } = (await import('firebase-admin/firestore')) as unknown as {
    getFirestore: (app?: unknown) => FirestoreLike;
  };
  const prefixo = process.env.FIRESTORE_PREFIX || 'prod';
  const repositorio = repositorioFirestore(getFirestore(app), prefixo);
  await seed(repositorio, bancoLocal, prefixo);

  const email = process.env.SEED_ADMIN_EMAIL;
  const senha = process.env.SEED_ADMIN_SENHA;
  if (email && senha) {
    const auth = (admin as unknown as { auth: (app?: unknown) => AdminAuthLike }).auth(app);
    await criarAdmin(auth, email, senha);
  } else {
    console.log('[seed] SEED_ADMIN_EMAIL/SEED_ADMIN_SENHA ausentes: administrador não criado.');
  }
}

const arquivoAtual = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (arquivoAtual === fileURLToPath(import.meta.url)) {
  void main().catch((erro: unknown) => {
    console.error('[seed] falha:', erro);
    process.exitCode = 1;
  });
}
