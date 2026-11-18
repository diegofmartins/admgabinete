import type { FirestoreLike } from '../../src/server/repository';

/**
 * Fake estrutural de Firestore: Map<nomeColecao, Map<id, dados>>.
 * Satisfaz FirestoreLike sem depender de firebase-admin — reutilizado pela Task 6.
 */
export function fakeFirestore(): FirestoreLike {
  const colecoes = new Map<string, Map<string, Record<string, unknown>>>();

  return {
    collection(nome: string) {
      let documentos = colecoes.get(nome);
      if (!documentos) {
        documentos = new Map<string, Record<string, unknown>>();
        colecoes.set(nome, documentos);
      }
      const docs = documentos;

      return {
        async get() {
          return {
            docs: [...docs.entries()].map(([id, dados]) => ({
              id,
              data: () => ({ ...dados }),
            })),
          };
        },
        doc(id: string) {
          return {
            async get() {
              const dados = docs.get(id);
              return {
                exists: dados !== undefined,
                data: () => (dados === undefined ? undefined : { ...dados }),
              };
            },
            async set(data: Record<string, unknown>) {
              docs.set(id, { ...data });
              return undefined;
            },
            async delete() {
              docs.delete(id);
              return undefined;
            },
          };
        },
      };
    },
  };
}
