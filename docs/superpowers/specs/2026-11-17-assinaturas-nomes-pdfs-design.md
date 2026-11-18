# Design — Nomes nos campos de assinatura dos PDFs

Data: 17/11/2026

## Intenção
Substituir o texto genérico exibido no campo de assinatura dos quatro PDFs
oficiais pelo nome da pessoa responsável pelo documento:

- Composição do gabinete, admissão e exoneração: nome do vereador responsável.
- Declaração do servidor nomeado: nome do servidor.

Motivo: o campo de assinatura hoje mostra `GABINETE PARLAMENTAR` (ou o nome do
gabinete) em vez de identificar quem assina.

## Estado anterior (medido no código)
| PDF | Texto abaixo da linha | Fonte disponível |
|---|---|---|
| Composição | `nomeGabinete.toUpperCase()` | parâmetro `nomeVereador` (já existe) |
| Admissão | `GABINETE PARLAMENTAR` | `dados.vereador` |
| Exoneração | `GABINETE PARLAMENTAR` | `dados.vereador` |
| Declaração | nome do servidor em negrito, 5 mm abaixo da linha; `Declarante / Servidor(a) Nomeado(a)` 5 mm abaixo do nome | `dados.nomeCompleto` |

## Metas
- O nome correto apareça centralizado abaixo da linha de assinatura nos quatro PDFs.
- Na declaração, remover o rótulo genérico sem mover o nome (ele já está abaixo da linha).
- Manter integralmente fonte, tamanho, negrito, posição da linha, alturas reservadas e paginação.

## Não metas
- Não alterar redação de parágrafos, tabelas, limites financeiros, datas, cabeçalho ou rodapé.
- Não trocar a origem dos dados (já cadastrados no sistema).
- Não alterar o nome dos arquivos baixados.

## Restrição importante
O bloco final da declaração usa `escrever(..., 8, false, 40)` para reservar
altura e evitar que a assinatura apareça sozinha numa página. A remoção do
rótulo é o último elemento do documento e não altera essa reserva.

## Abordagens consideradas
1. **Trocar apenas o texto impresso em cada gerador (escolhida).** Usa os dados
   já passados às funções; nenhuma assinatura de função muda; risco mínimo de
   regressão de layout.
2. **Passar o nome como novo parâmetro em todos os geradores.** Descartada:
   admissão, exoneração e declaração já recebem o nome; só criaria trabalho
   redundante nas três telas.
3. **Buscar o nome do perfil logado (`usuarioAtual`).** Descartada: o usuário
   logado pode ser admin/assessor e não coincide com o responsável do gabinete
   selecionado — a mesma decisão tomada no texto inicial da composição.

## Decisões de implementação
- Nos quatro geradores, imprimir o nome em maiúsculas, centralizado, com a
  fonte/tamanho/negrito já usados em cada local (9 pt na composição e na
  declaração; 9,5 pt em admissão e exoneração).
- Se a fonte estiver vazia, usar `______________________` — o mesmo fallback do
  texto inicial da composição — em vez de um texto genérico.
- `nomeGabinete` continua como parâmetro de `gerarPdfComposicao` porque ainda
  compõe o nome do arquivo baixado.
- Na declaração, manter o `y += 5` que posiciona o nome abaixo da linha e
  remover apenas o `y += 5` + `doc.text('Declarante / Servidor(a) Nomeado(a)')`.

## Verificação planejada
- Teste RED por PDF, lendo o texto do arquivo gerado: nome presente e texto
  genérico ausente no campo de assinatura.
- Regenerar os quatro PDFs pela interface real.
- Rodar a bateria de regressão existente (tipografia, não nepotismo, simetria,
  texto inicial da composição, compactação da declaração).
- `npx tsc --noEmit`, `npm run build` e console do navegador sem erros.
