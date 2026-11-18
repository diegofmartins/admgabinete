import { emailInstitucionalValido } from '../dominio';

export interface UsuarioAutenticado {
  uid: string;
  papel?: 'admin' | 'assessor' | 'vereador';
}

export type VerificadorToken = (token: string) => Promise<UsuarioAutenticado>;

export const semAutenticacao: VerificadorToken = async () => ({ uid: 'local' });

/** Sinaliza e-mail fora do domínio institucional ou não verificado. */
export class ErroAcessoRestrito extends Error {
  constructor() {
    super('Acesso restrito.');
    this.name = 'ErroAcessoRestrito';
  }
}

export interface AuthLike {
  verifyIdToken(token: string): Promise<{
    uid: string;
    role?: string;
    papel?: string;
    email?: string;
    email_verified?: boolean;
  }>;
}

export function verificadorFirebase(auth: AuthLike): VerificadorToken {
  return async (token) => {
    const decoded = await auth.verifyIdToken(token);
    if (decoded.email_verified !== true || !emailInstitucionalValido(decoded.email)) {
      throw new ErroAcessoRestrito();
    }
    const papelBruto = decoded.papel ?? decoded.role;
    const papel =
      papelBruto === 'admin' || papelBruto === 'assessor' || papelBruto === 'vereador'
        ? papelBruto
        : undefined;
    return { uid: decoded.uid, papel };
  };
}
