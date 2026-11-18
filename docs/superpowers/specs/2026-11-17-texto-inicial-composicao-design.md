# Design — Texto inicial do PDF de composição do gabinete

Data: 17/11/2026

## Intenção
Fazer o parágrafo inicial do PDF de composição seguir o modelo oficial anexado
(`Vereador - Indicação de Estrutura de Gabinetes 2026 - Lei 16546.pdf`), com o
nome do vereador responsável no lugar do texto genérico usado hoje.

## Texto desejado
`O(A) Vereador(a) <nome do vereador>, na escolha da organização de seu Gabinete Parlamentar, nos termos do Art. 4º da Lei Municipal 16.546/2025, opta pela seguinte composição:`

## Estado anterior
`O(A) Responsável / Vereador(a) do <GABINETE>, na escolha ...`

## Abordagens consideradas
1. **Passar o nome do gabinete selecionado para o gerador (escolhida).**
   `ComposicaoView` já recebe `gabineteSelecionado`, cujo campo
   `vereadorResponsavel` é a mesma fonte usada pelos PDFs de admissão e
   exoneração. Não cria nova dependência nem novo dado.
2. Usar `usuarioAtual`/`perfilUsuario` como fonte do nome.
   Descartada: o perfil do usuário logado pode ser assessor/admin e não
   coincide necessariamente com o responsável do gabinete selecionado.
3. Manter linha em branco fixa, como no modelo impresso.
   Descartada como regra geral: o sistema já possui o nome cadastrado e os
   demais ofícios preenchem o nome automaticamente. A linha em branco fica
   apenas como fallback quando o gabinete não tiver responsável.

## Decisão de implementação
- `gerarPdfComposicao` recebe um terceiro parâmetro opcional `nomeVereador`.
- O texto usa `nomeVereador.trim()`; se vazio, usa `______________________`
  (compatível com o espaço de preenchimento manual do modelo oficial).
- `nomeGabinete` permanece como parâmetro porque continua sendo usado no nome
  do arquivo baixado.
- Nenhuma outra parte do PDF (títulos, tabela, observação, rodapé, limites)
  é alterada.

## Fora de escopo
- Alterar a redação do modelo oficial ou demais parágrafos.
- Padronizar tipografia deste PDF (tratada em trabalho separado).
