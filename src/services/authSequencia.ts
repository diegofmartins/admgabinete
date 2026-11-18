/**
 * Guarda pura para callbacks do observer do Firebase Auth.
 * Impede que um callback assíncrono antigo reaplique usuário/perfil depois de
 * um logout ou de uma troca de usuário (sequência divergente ou uid diferente).
 */
export function deveAplicarUsuarioAuth(
  seqAtual: number,
  seqCapturada: number,
  uidAtual: string | undefined,
  uidEsperado: string
): boolean {
  return seqAtual === seqCapturada && uidAtual === uidEsperado;
}
