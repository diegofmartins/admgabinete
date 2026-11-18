# Compactação dos campos da declaração — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compactar os campos cadastrais da declaração em pares, preservando o visual, e impedir que a assinatura apareça sozinha numa página.

**Architecture:** Toda a mudança fica dentro de `gerarPdfDeclaracao` em `src/utils/pdfGenerator.ts`. Um auxiliar local mede rótulo e valor com `getTextWidth()` e empilha dois pares por linha quando cabem; valores longos ocupam a linha inteira. O bloco final passa a ser reservado junto com o último parágrafo da seção 5.

**Tech Stack:** React/TypeScript, jsPDF carregado em `window.jspdf`, A4, Helvetica, `pdftotext`/`pdftohtml` para verificação.

**Spec:** `docs/superpowers/specs/2026-11-17-compactacao-campos-declaracao-design.md`

## Global Constraints

- Manter Helvetica, fonte 8,5 pt nas tabelas, margem 15 mm e A4.
- Manter cores atuais: preto `(0,0,0)`, verde `(14,77,54)`, zebra `(244,246,245)`, cinza de rodapé `(150,150,150)`.
- Não alterar nenhum texto jurídico, consentimento ou dado impresso; não truncar valores.
- Não alterar `gerarPdfAdmissao`, `gerarPdfExoneracao`, `gerarPdfComposicao`, a interface, a API ou `data/db.json`.
- Projeto sem git: registrar o progresso em `.superpowers/sdd/2026-11-17-compactacao-campos-declaracao/progress.md` em vez de fazer commits.

## Review Focus

1. Valor longo (e-mail, logradouro, escolaridade, filiação) — deve ocupar a linha inteira e aparecer completo; teste: `verificar-pdf-declaracao.py` confere as strings integrais extraídas do PDF.
2. Campos curtos agrupados — `CEP` e `Número`, `Cidade` e `Estado`, `Agência` e `Conta` devem dividir a mesma linha; teste: o script confere pares na mesma linha normalizada do `pdftotext -layout`.
3. Assinatura órfã — a última página do exemplo não pode conter só data/assinatura; teste: o script exige no máximo 2 páginas e exige texto da seção 5 na última página junto de `Declarante / Servidor(a) Nomeado(a)`.
4. Campos vazios ou ausentes — nenhum rótulo das seções 1.1 a 1.5 pode desaparecer; teste: o script exige todos os rótulos e o `—` quando aplicável.
5. Quebra no meio de uma linha de campos — rótulo e valor não podem se separar; teste: o script exige cada rótulo seguido do seu valor na mesma linha ou na imediatamente seguinte.

---

### Task 1: Campos cadastrais em pares

**Files:**
- Modify: `src/utils/pdfGenerator.ts` — apenas dentro de `gerarPdfDeclaracao`
- Test: `.superpowers/sdd/2026-11-17-compactacao-campos-declaracao/verificar-pdf-declaracao.py`
- Ledger: `.superpowers/sdd/2026-11-17-compactacao-campos-declaracao/progress.md`

**Interfaces:**
- Consumes: `escreverSubsecao`, `checarQuebra`, `MARGEM`, `TAM_TEXTO`, `ENTRELINHA` e `doc` já existentes em `gerarPdfDeclaracao`.
- Produces: `escreverCamposEmPares(linhas: [string, string][]) => void`, auxiliar local usado no lugar de `escreverTabela` nas chamadas das seções 1.1 a 1.5.

- [ ] **Step 1: Criar o ledger e o teste comportamental**

Registrar no ledger o RED medido: 3 páginas, terceira só com assinatura. Criar `verificar-pdf-declaracao.py` com: normalização de espaços do `pdftotext -layout`; exigência de `CEP` e `Número` na mesma linha; exigência das strings completas de `maria.santos@curitiba.gov.br`, `Rua Barão do Rio Branco`, `Assessor de Gabinete Parlamentar (CC2)` e `Caixa Econômica Federal`; exigência de todos os rótulos das seções 1.1 a 1.5. Imprimir `PASS` ao final.

- [ ] **Step 2: Gerar o PDF RED e rodar o teste**

Gerar o PDF da declaração salva da Maria pela tela (aba “Declaração Nomeado”, item salvo, “Gerar PDF”) e copiar o arquivo para `/tmp/opencode/`. Rodar:

```
python3 .superpowers/sdd/2026-11-17-compactacao-campos-declaracao/verificar-pdf-declaracao.py /tmp/opencode/declaracao-red.pdf
```

Expected: FAIL em `CEP` e `Número` na mesma linha.

- [ ] **Step 3: Implementar `escreverCamposEmPares`**

Medir cada par com `doc.getTextWidth()` em 8,5 pt (rótulo negrito, valor normal). Largura útil = `pageWidth - 2*MARGEM`; metade = `(larguraUtil - 8)/2`. Se `larguraRotulo + larguraValor + 6 <= metade` e houver um par seguinte que também caiba, imprimir os dois na mesma linha (colunas em `MARGEM+2` e `MARGEM + metade + 6`); caso contrário, imprimir o par sozinho em largura total. Quebrar texto com `splitTextToSize` dentro da largura da coluna; altura da linha = maior número de linhas dos pares. Manter o zebra alternando por linha impressa e chamar `checarQuebra(altura + 2)`.

- [ ] **Step 4: Trocar as cinco chamadas de tabela**

Substituir `escreverTabela` por `escreverCamposEmPares` somente nas seções 1.1, 1.2, 1.3, 1.4 e 1.5. Manter `escreverTabela` intacto para uso futuro e não alterar seu corpo.

- [ ] **Step 5: Verificar GREEN do Task 1**

Gerar novo PDF pela tela e rodar o mesmo script. Expected: PASS. Rodar `npx tsc --noEmit` e `npm run build`; ambos exit 0.

### Task 2: Bloco final sem assinatura órfã

**Files:**
- Modify: `src/utils/pdfGenerator.ts` — bloco de encerramento de `gerarPdfDeclaracao`
- Test: `.superpowers/sdd/2026-11-17-compactacao-campos-declaracao/verificar-pdf-declaracao.py`

**Interfaces:**
- Consumes: `checarQuebra`, `MESES`, `pageWidth`, `pageHeight`, `MARGEM`, `doc` e a última chamada `escrever` da seção 5.
- Produces: nenhuma interface nova; muda apenas a reserva de espaço antes do fechamento.

- [ ] **Step 1: Estender o teste com a regra da página final**

Acrescentar ao script: `pdfinfo` deve reportar no máximo 2 páginas; a última página extraída deve conter uma frase da seção 5 (`informações prestadas neste formulário são verdadeiras`) e `Declarante / Servidor(a) Nomeado(a)`.

- [ ] **Step 2: Rodar o teste estendido no PDF do Task 1**

Expected: FAIL se ainda houver 3 páginas ou se a última página contiver só a assinatura.

- [ ] **Step 3: Manter o fechamento junto do texto anterior**

Mudar a assinatura do auxiliar para `escrever(texto: string, espacoDepois = 4, negrito = false, reservaFinal = 0)`: antes do laço de linhas, chamar `checarQuebra(linhas.length * ENTRELINHA + espacoDepois + reservaFinal)`. Chamar a última `escrever` da seção 5 com `reservaFinal = 40` e remover o `checarQuebra(40)` isolado do encerramento — a quebra passa a acontecer antes do último parágrafo, nunca entre ele e a data. A reserva de 40 cobre data, linha de assinatura, nome e legenda.

- [ ] **Step 4: Verificar GREEN final**

Gerar o PDF pela tela e rodar o script; Expected: PASS com 2 páginas. Rodar `npx tsc --noEmit` e `npm run build`; ambos exit 0. Conferir no navegador que “Gerar PDF” ainda baixa o arquivo sem erro de console.

- [ ] **Step 5: Registrar o resultado no ledger**

Anotar RED/GREEN, comandos executados e o caminho do PDF validado.
