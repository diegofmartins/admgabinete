import type { FirestoreLike, Repositorio } from './repository';

/** Nomes de coleção no Firestore: `<prefixo>_<colecao>`, com `prod` como padrão. */
export function repositorioFirestore(db: FirestoreLike, prefixo: string): Repositorio {
  const p = prefixo?.trim() || 'prod';
  const nomeColecao = (colecao: string) => `${p}_${colecao}`;

  return {
    async listar<T>(colecao: string): Promise<T[]> {
      const snapshot = await db.collection(nomeColecao(colecao)).get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as T[];
    },
    async buscar<T>(colecao: string, id: string): Promise<T | null> {
      const snapshot = await db.collection(nomeColecao(colecao)).doc(id).get();
      if (!snapshot.exists) return null;
      return { id, ...(snapshot.data() ?? {}) } as T;
    },
    async salvar<T extends { id: string }>(colecao: string, documento: T): Promise<T> {
      await db.collection(nomeColecao(colecao)).doc(documento.id).set(documento);
      return documento;
    },
    async excluir(colecao: string, id: string): Promise<boolean> {
      const referencia = db.collection(nomeColecao(colecao)).doc(id);
      const snapshot = await referencia.get();
      if (!snapshot.exists) return false;
      await referencia.delete();
      return true;
    },
  };
}
