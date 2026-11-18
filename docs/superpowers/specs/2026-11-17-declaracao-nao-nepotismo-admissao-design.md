# Declaração de não nepotismo — design

Data: 2026-11-17

## Intenção

Alinhar os documentos de nomeação à regra de que quem tem vínculo de parentesco com agentes públicos não pode ser nomeado: o PDF de admissão passa a conter a declaração do Vereador nesse sentido, e a declaração do nomeado passa a exigir, obrigatoriamente, a afirmação de que não possui tal vínculo.

## Goals

- No PDF de admissão, inserir entre a caixa de dados do servidor e a data do documento o texto:

  > Eu, Vereador(a) &lt;Nome do Vereador&gt;, declaro, para os devidos fins de direito e ciente das sanções legais cabíveis, que a indicação do(a) Sr.(a) &lt;Nome do Indicado&gt; para o cargo em comissão de &lt;Nome do Cargo&gt; obedece rigorosamente à Súmula Vinculante nº 13 do Supremo Tribunal Federal, não configurando nenhuma hipótese de vínculo de parentesco até o terceiro grau ou de nepotismo, direto ou cruzado.

  Os três campos entre colchetes são preenchidos com `vereadorResponsavel` do gabinete, `nome` e `cargo` já presentes na admissão.
- Na tela de declaração do nomeado: remover a opção “POSSUO vínculo de parentesco.”, o botão “+ Adicionar vínculo” e a lista de vínculos; a frase “NÃO POSSUO cônjuge, companheiro ou parente em linha reta, colateral ou por afinidade até o terceiro grau no âmbito da Câmara Municipal de Curitiba.” passa a ser um checkbox obrigatório, com mensagem de erro logo abaixo, no mesmo padrão do item 4 (Inexistência de Impedimento — LCM nº 86/2012).

## Non-goals / anti-goals

- Não alterar as regras das seções 3, 4 e 5 da declaração.
- Não mexer na validação de CPF, cônjuge, dependentes ou consentimentos existentes.
- Não alterar a API, o contrato de persistência nem os PDFs de composição e exoneração.

## Constraints

- Projeto não é repositório git: registrar progresso no ledger `.superpowers/sdd/...` em vez de commits.
- Usar apenas o que já existe no projeto (React 19 + TypeScript + jsPDF local).
- Verificação obrigatória: `npx tsc --noEmit` e `npm run build`, mais conferência do PDF gerado e do comportamento no navegador.

## Approaches consideradas

1. **Manter o campo `parentesco` no dado salvo/PDF como `'nao'` e trocar só a interface por checkbox obrigatório** — escolhida. Preserva o contrato do registro e do PDF da declaração; a regra passa a ser binária: ou o declarante assume não ter vínculo, ou não conclui o formulário.
2. **Remover `parentesco` do registro e do PDF** — descartada: exigiria mudança de contrato da API, do PDF e dos exemplos salvos, sem benefício para a regra.
3. **Manter a opção “sim” apenas para exibição de vínculos antigos, sem permitir edição** — descartada: contraria a decisão de que nenhum indicado com vínculo pode ser nomeado e deixaria uma interface morta.

## Detalhes da implementação

### PDF de admissão (`src/utils/pdfGenerator.ts`)

- Inserir o parágrafo após a caixa de dados e antes de `Curitiba, ...`.
- Usar `doc.splitTextToSize(texto, pageWidth - 30)` e avançar `y` conforme o número de linhas, para não sobrepor a data.
- Texto integral, sem abreviações; `Nome do Vereador` = `dados.vereador`, `Nome do Indicado` = `dados.nome`, `Nome do Cargo` = `dados.cargo`.

### Declaração do nomeado (`src/components/DeclaracaoView.tsx`)

- Substituir os dois `input type="radio" name="parentesco"` por um único `input type="checkbox"` controlado por novo estado `declaracaoSemParentesco` (padrão `false`).
- Manter o texto integral da frase “NÃO POSSUO…” e o parágrafo explicativo existente.
- Remover `renderListaParentes()`, `adicionarParente`, `removerParente`, o botão “+ Adicionar vínculo” e a validação que exigia vínculos quando `parentesco === 'sim'`.
- Validar `declaracaoSemParentesco` junto dos demais consentimentos obrigatórios, com mensagem: `Você deve declarar que não possui vínculo de parentesco até o terceiro grau.` e id `err-declaracaoSemParentesco`.
- Ao salvar/gerar PDF, continuar enviando `parentesco: 'nao'` e `parentes: []`.
- `carregarItem` deve marcar o checkbox apenas quando o registro tiver `parentesco === 'nao'`; registros antigos com `'sim'` ficam desmarcados e exigem a nova confirmação.

### Dados de exemplo (`data/db.json`)

- Migrar `dec_mwks7jtd3givx6` (Maria) para `parentesco: 'nao'` e `parentes: []`, preservando todos os demais campos. Fazer via API (`PUT`/`PATCH`, conforme disponível) com backup prévio, porque `server.ts` carrega o banco no boot.

## Verificação

- RED antes de cada mudança: texto ausente no PDF; opção “POSSUO” e botão presentes na tela; checkbox ausente.
- GREEN: PDF com o texto integral e dados corretos; tela sem “POSSUO”/“+ Adicionar vínculo”; checkbox obrigatório bloqueando Salvar e Gerar PDF quando desmarcado; exemplo da Maria migrado sem perda dos demais dados.
- `npx tsc --noEmit` e `npm run build` com exit 0.
