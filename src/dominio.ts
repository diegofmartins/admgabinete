/** Domínio dos e-mails institucionais da Câmara Municipal de Curitiba. */
export const DOMINIO_INSTITUCIONAL = '@cmc.pr.gov.br';

/**
 * True somente quando o e-mail termina em `@cmc.pr.gov.br` e tem algo antes do `@`.
 * O `@` no sufixo impede falsos positivos como `cmc.pr.gov.br.evil.com`.
 */
export function emailInstitucionalValido(email: string | null | undefined): boolean {
  if (typeof email !== 'string') return false;
  const normalizado = email.trim().toLowerCase();
  return (
    normalizado.endsWith(DOMINIO_INSTITUCIONAL) &&
    normalizado.length > DOMINIO_INSTITUCIONAL.length
  );
}
