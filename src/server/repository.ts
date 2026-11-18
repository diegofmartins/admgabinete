/** Formato atual de `data/db.json` (movido de `server.ts:11`). */
export interface Banco {
  gabinetes: any[];
  usuarios: any[];
  composicoes: any[];
  admissoes: any[];
  exoneracoes: any[];
  declaracoes: any[];
}

/** Contrato de persistência consumido pelas rotas `/api`. */
export interface Repositorio {
  listar<T>(colecao: string): Promise<T[]>;
  buscar<T>(colecao: string, id: string): Promise<T | null>;
  salvar<T extends { id: string }>(colecao: string, documento: T): Promise<T>;
  excluir(colecao: string, id: string): Promise<boolean>;
}

/**
 * Superfície mínima de Firestore satisfaz tanto `admin.firestore()` quanto o
 * fake de testes. Mantida estrutural para não acoplar a camada ao SDK.
 */
export interface FirestoreLike {
  collection(nome: string): {
    get(): Promise<{ docs: Array<{ id: string; data(): Record<string, unknown> }> }>;
    doc(id: string): {
      get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
      set(data: Record<string, unknown>): Promise<unknown>;
      delete(): Promise<unknown>;
    };
  };
}

/** Adaptador em memória, usado nos testes de contrato das rotas. */
export function repositorioMemoria(inicial: Record<string, any[]> = {}): Repositorio {
  const dados: Record<string, any[]> = JSON.parse(JSON.stringify(inicial ?? {}));

  function colecao(nome: string): any[] {
    if (!dados[nome]) dados[nome] = [];
    return dados[nome];
  }

  return {
    async listar<T>(nome: string): Promise<T[]> {
      return [...colecao(nome)] as T[];
    },
    async buscar<T>(nome: string, id: string): Promise<T | null> {
      return (colecao(nome).find((documento) => documento?.id === id) as T) ?? null;
    },
    async salvar<T extends { id: string }>(nome: string, documento: T): Promise<T> {
      const copia = { ...documento };
      const lista = colecao(nome);
      const indice = lista.findIndex((atual) => atual?.id === copia.id);
      if (indice === -1) lista.push(copia);
      else lista[indice] = copia;
      return copia;
    },
    async excluir(nome: string, id: string): Promise<boolean> {
      const lista = colecao(nome);
      const indice = lista.findIndex((atual) => atual?.id === id);
      if (indice === -1) return false;
      lista.splice(indice, 1);
      return true;
    },
  };
}
