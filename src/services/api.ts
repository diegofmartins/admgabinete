import { Gabinete, UsuarioPerfil } from '../types';
import { obterIdToken } from './auth';

const API_URL = import.meta.env?.VITE_API_URL ?? '/api';

export interface RespostaOperacao {
  ok: boolean;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await obterIdToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data?.erro as string) || `Falha na requisição à API (${res.status}).`);
  }
  return data as T;
}

export const api = {
  // Gabinetes
  listarGabinetes: (): Promise<Gabinete[]> => request<Gabinete[]>('/gabinetes'),
  criarGabinete: (dados: Omit<Gabinete, 'id'>): Promise<Gabinete> =>
    request<Gabinete>('/gabinetes', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarGabinete: (id: string, dados: Partial<Omit<Gabinete, 'id'>>): Promise<Gabinete> =>
    request<Gabinete>(`/gabinetes/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirGabinete: (id: string): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(`/gabinetes/${id}`, { method: 'DELETE' }),

  // Usuários
  listarUsuarios: (): Promise<UsuarioPerfil[]> => request<UsuarioPerfil[]>('/usuarios'),
  criarUsuario: (dados: Omit<UsuarioPerfil, 'uid' | 'criadoEm'>): Promise<UsuarioPerfil> =>
    request<UsuarioPerfil>('/usuarios', { method: 'POST', body: JSON.stringify({ ...dados, uid: 'u_' + Date.now().toString(36) }) }),
  excluirUsuario: (id: string): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(`/usuarios/${id}`, { method: 'DELETE' }),

  // Composições de Gabinete
  listarComposicoes: (gabineteId?: string): Promise<any[]> => {
    const qs = gabineteId ? `?gabineteId=${gabineteId}` : '';
    return request<any[]>(`/composicoes${qs}`);
  },
  salvarComposicao: (dados: any): Promise<any> =>
    request<any>('/composicoes', { method: 'POST', body: JSON.stringify(dados) }),
  excluirComposicao: (id: string): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(`/composicoes/${id}`, { method: 'DELETE' }),

  // Pedidos de Admissão
  listarAdmissoes: (gabineteId?: string): Promise<any[]> => {
    const qs = gabineteId ? `?gabineteId=${gabineteId}` : '';
    return request<any[]>(`/admissoes${qs}`);
  },
  salvarAdmissao: (dados: any): Promise<any> =>
    request<any>('/admissoes', { method: 'POST', body: JSON.stringify(dados) }),
  excluirAdmissao: (id: string): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(`/admissoes/${id}`, { method: 'DELETE' }),

  // Pedidos de Exoneração
  listarExoneracoes: (gabineteId?: string): Promise<any[]> => {
    const qs = gabineteId ? `?gabineteId=${gabineteId}` : '';
    return request<any[]>(`/exoneracoes${qs}`);
  },
  salvarExoneracao: (dados: any): Promise<any> =>
    request<any>('/exoneracoes', { method: 'POST', body: JSON.stringify(dados) }),
  excluirExoneracao: (id: string): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(`/exoneracoes/${id}`, { method: 'DELETE' }),

  // Declarações do Servidor Nomeado
  listarDeclaracoes: (gabineteId?: string): Promise<any[]> => {
    const qs = gabineteId ? `?gabineteId=${gabineteId}` : '';
    return request<any[]>(`/declaracoes${qs}`);
  },
  salvarDeclaracao: (dados: any): Promise<any> =>
    request<any>('/declaracoes', { method: 'POST', body: JSON.stringify(dados) }),
  excluirDeclaracao: (id: string): Promise<RespostaOperacao> => {
    const url = `/declaracoes/${id}`;
    return request<RespostaOperacao>(url, { method: 'DELETE' });
  },
};
