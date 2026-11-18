# Novos vencimentos CC e limite por gabinete — design curto

Data: 2026-11-17

## Intenção

Aplicar os vencimentos aprovados hoje para CC1–CC9 e o novo teto de despesa por gabinete, mantendo coerentes a tela de composição, os selects de cargo e o PDF de composição.

## Valores

| Cargo | Vencimento |
| --- | --- |
| CC1 | R$ 19.451,52 |
| CC2 | R$ 17.290,22 |
| CC3 | R$ 15.129,04 |
| CC4 | R$ 12.967,76 |
| CC5 | R$ 10.806,40 |
| CC6 | R$ 8.645,14 |
| CC7 | R$ 6.483,84 |
| CC8 | R$ 4.322,49 |
| CC9 | R$ 3.241,97 |

Limite total por gabinete: **R$ 97.257,76**.

Ruling do usuário: o limite informado originalmente (R$ 97.257,78) divergia em R$ 0,02 da soma CC1–CC6 + 2×CC7 com os novos salários; prevalece o valor calculado, R$ 97.257,76, sem alterar nenhum vencimento.

## Goals

- Atualizar `CARGOS_GABINETE` e `LIMITE_FINANCEIRO_GABINETE` em `src/types.ts`.
- Fazer os textos que hoje repetem valores antigos derivarem dessas constantes:
  - `src/utils/pdfGenerator.ts`: observation do limite (hoje 92.998,45) e tabela "VENCIMENTOS VIGENTES CONFORME SÍMBOLO" (hoje 9 valores antigos).
  - `src/components/ComposicaoView.tsx:63`: mensagem de erro "Limite financeiro excedido".
  - `src/components/DeclaracaoView.tsx:621`: rótulo fixo do CC1.

## Non-goals

- Não alterar a API, `data/db.json`, os PDFs de admissão/exoneração/declação, a validação de CPF/cônjuge ou as regras de composição diferentes do teto financeiro.
- Não alterar o teto de pessoas (`MAX_PESSOAS_GABINETE = 9`).
- Não migrar registros salvos: as composições guardam quantidades, não valores.

## Abordagens

1. **Centralizar em `types.ts` e derivar todos os textos** — escolhida. Evita que a próxima revisão de salários deixe números antigos em textos literais.
2. **Trocar apenas os literais** — descartada: manteria cinco cópias do limite e dez do vencimento, com risco de divergência.

## Verificação

- RED comportamental: PDF de composição gerado antes da mudança contém `18.599,66` e `92.998,45`; tela mostra limite antigo.
- GREEN: `npx tsc --noEmit` e `npm run build` exit 0; PDF de composição gerado pela tela contém os nove valores novos e `97.257,76`; tela de composição mostra o limite novo; selects de admissão/exoneração/declação mostram os novos valores; nenhuma ocorrência dos valores antigos em `src`.
