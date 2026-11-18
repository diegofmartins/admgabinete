export interface UsuarioAutenticado {
  uid: string;
  papel?: 'admin' | 'assessor' | 'vereador';
}

export type VerificadorToken = (token: string) => Promise<UsuarioAutenticado>;

export const semAutenticacao: VerificadorToken = async () => ({ uid: 'local' });

export interface AuthLike {
  verifyIdToken(token: string): Promise<{ uid: string; role?: string; papel?: string }>;
}

export function verificadorFirebase(auth: AuthLike): VerificadorToken {
  return async (token) => {
    const decoded = await auth.verifyIdToken(token);
    const papelBruto = decoded.papel ?? decoded.role;
    const papel =
      papelBruto === 'admin' || papelBruto === 'assessor' || papelBruto === 'vereador'
        ? papelBruto
        : undefined;
    return { uid: decoded.uid, papel };
  };
}
