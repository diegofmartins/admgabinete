import fs from 'fs';
import path from 'path';
import type { Banco, Repositorio } from './repository';
import { GABINETES_PADRAO } from '../../src/types';

const BANCO_PADRAO: Banco = {
  gabinetes: GABINETES_PADRAO.map((g, i) => ({ id: 'gab_' + i, ...g })),
  usuarios: [],
  composicoes: [],
  admissoes: [],
  exoneracoes: [],
  declaracoes: [],
};

function lerBanco(caminhoArquivo: string): Banco {
  try {
    if (!fs.existsSync(caminhoArquivo)) return { ...BANCO_PADRAO };
    const raw = fs.readFileSync(caminhoArquivo, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...BANCO_PADRAO, ...parsed };
  } catch (e) {
    console.error('Erro ao ler o banco local. Preservando cópia e reiniciando com dados padrão:', e);
    try {
      const backup = `${caminhoArquivo}.corrompido-${Date.now()}`;
      fs.renameSync(caminhoArquivo, backup);
      console.error('Cópia do banco preservada em', backup);
    } catch (backupErr) {
      console.error('Não foi possível preservar a cópia do banco:', backupErr);
    }
    return { ...BANCO_PADRAO };
  }
}

function salvarBanco(caminhoArquivo: string, banco: Banco) {
  fs.mkdirSync(path.dirname(caminhoArquivo), { recursive: true });
  const arquivoTemporario = `${caminhoArquivo}.tmp`;
  fs.writeFileSync(arquivoTemporario, JSON.stringify(banco, null, 2));
  fs.renameSync(arquivoTemporario, caminhoArquivo);
}

/** Persistência em arquivo JSON, com escrita atômica (`.tmp` + `rename`). */
export function repositorioJson(caminhoArquivo: string): Repositorio {
  function lista(banco: Banco, colecao: string): any[] {
    return (banco as any)[colecao] ?? [];
  }

  return {
    async listar<T>(colecao: string): Promise<T[]> {
      return [...lista(lerBanco(caminhoArquivo), colecao)] as T[];
    },
    async buscar<T>(colecao: string, id: string): Promise<T | null> {
      return (lista(lerBanco(caminhoArquivo), colecao).find((d) => d?.id === id) as T) ?? null;
    },
    async salvar<T extends { id: string }>(colecao: string, documento: T): Promise<T> {
      const banco = lerBanco(caminhoArquivo);
      const copia = { ...documento };
      const atual = lista(banco, colecao);
      const indice = atual.findIndex((d) => d?.id === copia.id);
      const novaLista = [...atual];
      if (indice === -1) novaLista.push(copia);
      else novaLista[indice] = copia;
      (banco as any)[colecao] = novaLista;
      salvarBanco(caminhoArquivo, banco);
      return copia;
    },
    async excluir(colecao: string, id: string): Promise<boolean> {
      const banco = lerBanco(caminhoArquivo);
      const atual = lista(banco, colecao);
      const indice = atual.findIndex((d) => d?.id === id);
      if (indice === -1) return false;
      const novaLista = [...atual];
      novaLista.splice(indice, 1);
      (banco as any)[colecao] = novaLista;
      salvarBanco(caminhoArquivo, banco);
      return true;
    },
  };
}
