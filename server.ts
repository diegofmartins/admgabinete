import path from 'path';
import { fileURLToPath } from 'url';
import { criarApp } from './src/server/app';
import { repositorioJson } from './src/server/repositorio-json';
import { repositorioFirestore } from './src/server/repositorio-firestore';
import type { FirestoreLike, Repositorio } from './src/server/repository';
import { semAutenticacao, verificadorFirebase, type AuthLike } from './src/server/auth';
import { GABINETES_PADRAO } from './src/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function semearGabinetesSeVazio(repositorio: Repositorio): Promise<void> {
  const gabinetes = await repositorio.listar('gabinetes');
  if (gabinetes.length > 0) return;
  for (let i = 0; i < GABINETES_PADRAO.length; i++) {
    await repositorio.salvar('gabinetes', { id: 'gab_' + i, ...GABINETES_PADRAO[i] });
  }
}

type ModoPersistencia = 'json' | 'firestore';

async function criarRepositorioEVerificador(): Promise<{
  repositorio: Repositorio;
  verificadorToken: import('./src/server/auth').VerificadorToken;
  modo: ModoPersistencia;
}> {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (serviceAccount || projectId) {
    const prefixo = process.env.FIRESTORE_PREFIX || 'prod';
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

    const firestoreMod = await import('firebase-admin/firestore');
    const { getFirestore } = firestoreMod as unknown as {
      getFirestore: (app?: unknown) => FirestoreLike;
    };
    const db = getFirestore(app);

    const auth = (admin as unknown as { auth: (app?: unknown) => AuthLike }).auth(app);
    return {
      repositorio: repositorioFirestore(db, prefixo),
      verificadorToken: verificadorFirebase(auth),
      modo: 'firestore',
    };
  }

  return {
    repositorio: repositorioJson(path.join(__dirname, 'data', 'db.json')),
    verificadorToken: semAutenticacao,
    modo: 'json',
  };
}

const PORT = process.env.PORT || 3001;

async function main() {
  const { repositorio, verificadorToken, modo } = await criarRepositorioEVerificador();
  await semearGabinetesSeVazio(repositorio);
  const app = criarApp(repositorio, verificadorToken);
  app.listen(PORT, () => {
    const rotulo = modo === 'firestore' ? 'API (Firestore)' : 'API local (JSON)';
    console.log(`${rotulo} rodando na porta ${PORT}`);
  });
}

void main().catch((erro: unknown) => {
  console.error('[boot] falha ao iniciar:', erro);
  process.exitCode = 1;
});
