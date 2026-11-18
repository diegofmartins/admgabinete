import { getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

import type { PapelUsuario } from '../types';

/** Converte a custom claim `role`/`papel` do Firebase no papel usado pela aplicação. */
export function mapearPapel(role: string | undefined): PapelUsuario {
  if (role === 'admin' || role === 'assessor' || role === 'vereador') {
    return role;
  }
  return 'assessor';
}

/**
 * Inicializa o Firebase Web SDK com as variáveis públicas VITE_FIREBASE_*.
 * Retorna null (com aviso, não erro) quando a configuração está incompleta,
 * para que o desenvolvimento local sem credenciais continue funcional.
 */
export function iniciarFirebase(): Auth | null {
  const env = import.meta.env;
  const config = {
    apiKey: env?.VITE_FIREBASE_API_KEY,
    authDomain: env?.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env?.VITE_FIREBASE_PROJECT_ID,
    appId: env?.VITE_FIREBASE_APP_ID,
  };

  if (Object.values(config).some((valor) => !valor)) {
    console.warn('[Firebase] VITE_FIREBASE_* incompletas; login com Firebase desabilitado.');
    return null;
  }

  try {
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(config);
    return getAuth(app);
  } catch (erro) {
    console.warn('[Firebase] Não foi possível inicializar o Auth:', erro);
    return null;
  }
}

/** Id token do usuário atual, consumido por `configurarTokenProvider`. */
export async function obterTokenFirebase(): Promise<string | null> {
  if (getApps().length === 0) return null;
  try {
    return (await getAuth().currentUser?.getIdToken()) ?? null;
  } catch (erro) {
    console.warn('[Firebase] Não foi possível obter o ID token:', erro);
    return null;
  }
}
