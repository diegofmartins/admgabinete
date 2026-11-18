export function formatarSalvoEm(salvoEm?: string): string {
  if (!salvoEm) return '';
  const data = new Date(salvoEm);
  if (Number.isNaN(data.getTime())) return '';
  const dia = data.toLocaleDateString('pt-BR');
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} às ${hora}`;
}
