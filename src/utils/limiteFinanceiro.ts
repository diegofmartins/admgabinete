import { CARGOS_GABINETE, LIMITE_FINANCEIRO_GABINETE } from '../types';

const emCentavos = (valor: number) => Math.round(valor * 100);
const LIMITE_CENTAVOS = emCentavos(LIMITE_FINANCEIRO_GABINETE);

/** Totais de uma composição e a decisão de limite, em centavos inteiros. */
export function calcularTotaisComposicao(quantidades: Record<string, number>) {
  const totalCentavos = CARGOS_GABINETE.reduce(
    (acc, cargo) => acc + emCentavos(cargo.vencimento) * (quantidades[cargo.simbolo] || 0),
    0
  );

  return {
    totalCentavos,
    totalValor: totalCentavos / 100,
    excedeLimite: totalCentavos > LIMITE_CENTAVOS
  };
}
