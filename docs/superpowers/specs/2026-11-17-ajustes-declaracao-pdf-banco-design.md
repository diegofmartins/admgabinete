# Design — ajustes na declaração do servidor nomeado (2026-11-17)

## Intenção

Deixar dois exemplos contrastantes na base (um que declara os opcionais, outro que não os declara) e tornar o PDF mais fácil de ler, agrupando os campos cadastrais em subtítulos e em tabela com linhas claras. Na tela, fixar banco e agência para que o servidor preencha apenas a conta.

## Objetivos

- Registro do João da Silva Nogueira sem dependentes, sem atividade remunerada e sem vínculo de parentesco (`parentesco: 'nao'`, listas vazias).
- PDF: identificação antes dos dados cadastrais; cadastrais em subtítulos 1.2 a 1.5; campos em tabela com linhas cinza alternadas.
- Tela: "Banco" (Caixa Econômica Federal) e "Agência" (0369) fixos, "Conta" editável, os três na mesma linha.

## Não-objetivos

- Não alterar o texto nem a numeração das seções 2 a 5 do PDF.
- Não alterar o consentimento nem a validação de CPF.
- Não mexer no servidor nem criar novos endpoints.

## Restrições

- `server.ts` carrega `data/db.json` uma vez na inicialização (`const banco = lerBanco()`); editar o arquivo diretamente não seria visto pela API em execução e seria sobrescrito na próxima escrita.
- O PDF é gerado com jsPDF em `src/utils/pdfGenerator.ts`; largura A4, margem de 15 mm.
- Projeto sem repositório git; verificação por `tsc`, `build`, API, navegador e `pdftotext`.

## Abordagens consideradas

**PDF — tabela de duas colunas por subseção (escolhida).** Para cada bloco (1.1 a 1.5), desenhar linhas com rótulo à esquerda e valor à direita, fundo cinza claro nas linhas pares e borda inferior fina. Dá o agrupamento pedido e a leveza de leitura sem quebrar rótulos longos. Alternativas descartadas: manter linhas corridas com subtítulos (não entrega a tabela pedida) e tabela de quatro colunas com dois pares por linha (rótulos longos como "Órgão expedidor" quebrariam).

**Campos fixos — `readOnly` com fundo cinza (escolhida).** Mantém os valores no estado controlado pelo React, é acessível e mostra visualmente que não são editáveis. Alternativas descartadas: `disabled` (aparência esmaecida, parece erro) e texto estático sem input (não permite selecionar/copiar).

**Registro do João — DELETE + POST pela API (escolhida).** Envia o registro atual com os campos ajustados; o ID é regenerado, o que é irrelevante para o uso como exemplo. Alternativas descartadas: editar `data/db.json` diretamente (não refletido no servidor em execução) e adicionar endpoint `PUT` (mudança desnecessária no servidor).

## Detalhes da implementação

1. `DeclaracaoView.tsx` — bloco 1.5: grid de três colunas (`sm:grid-cols-3`), com "Banco" e "Agência" em `readOnly`, fundo cinza e rótulos curtos; "Conta" permanece editável. Sem mudança nos estados `bancoAgencia`/`bancoConta` nem nos payloads.
2. `pdfGenerator.ts` — funções auxiliares `escreverTabela(linhas)` e `escreverSubsecao(titulo)`; blob da identificação vira subseção 1.1; dados cadastrais divididos em 1.2 Endereço, 1.3 Dados Pessoais e Documentos, 1.4 Filiação e Dependentes, 1.5 Dados Bancários; ordem invertida para identificação primeiro. Seções 2 a 5 intactas.
3. `data/db.json` — registro do João alterado via `DELETE /api/declaracoes/:id` e `POST /api/declaracoes`, com `parentesco: 'nao'`, `parentes: []`, `atividade: 'nao'`, `atividades: []`, `dependentes: []`.
4. Verificação: `npx tsc --noEmit`, `npm run build`, consulta à API, E2E no navegador para os campos fixos, geração do PDF e `pdftotext -layout` confirmando ordem, subtítulos, dependentes com IRPF e ausência de alteração nas seções 2 a 5.

## Pendente

Aprovação deste desenho antes de qualquer alteração de código.
