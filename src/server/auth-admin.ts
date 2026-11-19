/**
 * Acesso ao Firebase Admin Auth.
 *
 * No `firebase-admin` v14, `admin.auth(app)` não existe mais: a API correta é
 * `getAuth(app)`, exportada por `firebase-admin/auth` (o mesmo padrão já usado
 * para o Firestore, via `firebase-admin/firestore`).
 */
export async function obterAuthAdmin(app: unknown): Promise<unknown> {
  const modulo = (await import('firebase-admin/auth')) as unknown as {
    getAuth: (app?: unknown) => unknown;
  };
  return modulo.getAuth(app);
}
