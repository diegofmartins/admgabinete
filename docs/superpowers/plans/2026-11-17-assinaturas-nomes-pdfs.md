# Assinaturas com nomes nos PDFs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o campo de assinatura dos quatro PDFs oficiais exibir o nome da pessoa responsável — vereador em composição, admissão e exoneração; servidor na declaração.

**Architecture:** Todos os quatro geradores vivem em `src/utils/pdfGenerator.ts` e já recebem o nome necessário (`nomeVereador`, `dados.vereador`, `dados.nomeCompleto`). A mudança é apenas o texto passado a `doc.text` no bloco da assinatura; fontes, tamanhos, posições, alturas reservadas e assinaturas das funções permanecem iguais. Testes Python leem o PDF gerado pela interface com `pdftotext -layout`.

**Tech Stack:** TypeScript/Vite, jsPDF via `window.jspdf`, Python 3 + poppler-utils para testes de PDF.

**Spec:** `docs/superpowers/specs/2026-11-17-assinaturas-nomes-pdfs-design.md`

## Global Constraints

- Fonte Helvetica, corpo 8,5 pt, títulos 10,5/9,5 pt; negrito apenas em títulos/rótulos.
- Margem 15 mm; datas em `DD/MM/AAAA`.
- Assinatura centralizada, 5 mm abaixo da linha horizontal.
- Fallback para nome vazio: `______________________`.
- Nenhuma alteração em redação de parágrafos, tabelas, vencimentos CC1–CC9, limite R$ 97.257,76, cabeçalho, rodapé ou paginação.
- O projeto não é repositório Git; o registro de progresso substitui commits.

## Review Focus

- **Vereador sem nome cadastrado:** o campo deve mostrar `______________________`, não um texto genérico — pinado na Task 1 com a checagem do fallback no gerador e leitura do PDF do gabinete Liderança do Partido PCO.
- **Nome do servidor vazio na declaração:** deve cair no fallback `______________________`, não em `DECLARANTE` — pinado na Task 2 pela checagem da ausência de `DECLARANTE` isolado no PDF.
- **Rótulo genérico remanescente:** `Declarante / Servidor(a) Nomeado(a)` não pode continuar no PDF — pinado na Task 2 pelo teste de linha isolada proibida.
- **Paginação da declaração:** remover o rótulo não pode fazer a assinatura aparecer sozinha numa página — pinado na Task 2 pelo teste existente `verificar-pdf-declaracao.py`.
- **Colisão com o nome do gabinete:** em admissão/exoneração, `GABINETE DO VEREADOR DIEGO MARTINS` continua na lotação; o teste da Task 1 diferencia a assinatura por linha isolada, não por ocorrência no texto.

---

### Task 1: Assinatura com o nome do vereador em composição, admissão e exoneração

**Files:**
- Create: `.superpowers/sdd/2026-11-17-assinaturas-nomes-pdfs/verificar-assinatura.py`
- Modify: `src/utils/pdfGenerator.ts:130` (composição), `:263` (admissão), `:346` (exoneração)
- Test: o mesmo script, invocado uma vez por PDF

**Interfaces:**
- Consumes: `gerarPdfComposicao(cargosConfig, nomeGabinete, nomeVereador)`; `gerarPdfAdmissao(dados)` e `gerarPdfExoneracao(dados)` com `dados.vereador`.
- Produces: nenhuma assinatura de função muda; `nomeGabinete` permanece para o nome do arquivo.

- [ ] **Step 1: Escrever o teste que falha**

Crie `verificar-assinatura.py` com a interface:
`python3 verificar-assinatura.py <tipo> <caminho-do-pdf> <nome-esperado>`
onde `<tipo>` ∈ `composicao|admissao|exoneracao|declaracao`.

O script deve:
1. ler o texto com `pdftotext -layout <pdf> -`;
2. construir `linhas = [l.strip() for l in texto.splitlines() if l.strip()]`;
3. garantir que `<nome-esperado>.strip().upper()` esteja em `linhas`;
4. garantir que nenhuma linha, em maiúsculas, seja exatamente um dos textos genéricos do tipo:
   - `composicao`: `GABINETE DO VEREADOR DIEGO MARTINS`
   - `admissao`: `GABINETE PARLAMENTAR`
   - `exoneracao`: `GABINETE PARLAMENTAR`
   - `declaracao`: `DECLARANTE / SERVIDOR(A) NOMEADO(A)`
5. imprimir `PASS` ou falhar com `assert` mensagem clara.

Rodar nos três PDFs atuais (antes da mudança):
```bash
T=.superpowers/sdd/2026-11-17-assinaturas-nomes-pdfs/verificar-assinatura.py
python3 $T composicao '/tmp/opencode-browser-Lka0nA/0/Composicao_Gabinete_Gabinete_do_Vereador_Diego_Martins.pdf' 'Diego Martins'
python3 $T admissao '/tmp/opencode-browser-5YecuK/0/Admissao_Cristina_Fonseca.pdf' 'Diego Martins'
python3 $T exoneracao '/tmp/opencode-browser-cVUUwj/0/Exoneracao_Cristina_Fonseca.pdf' 'Diego Martins'
```
Expected: as três falham com `GABINETE ...` / `GABINETE PARLAMENTAR` na linha da assinatura.

- [ ] **Step 2: Implementar a troca do texto**

Em `src/utils/pdfGenerator.ts`, alterar apenas os argumentos de `doc.text` nos blocos de assinatura:
- composição: `nomeGabinete.toUpperCase()` → `nomeVereador.trim().toUpperCase() || '______________________'`
- admissão: `'GABINETE PARLAMENTAR'` → `dados.vereador?.trim().toUpperCase() || '______________________'`
- exoneração: `'GABINETE PARLAMENTAR'` → `dados.vereador?.trim().toUpperCase() || '______________________'`

Manter `align: 'center'`, `setFont(FONTE, 'bold')` e os tamanhos atuais (9 / 9,5 / 9,5 pt).

- [ ] **Step 3: Gerar os três PDFs pela interface e verificar o GREEN**

Na aba do navegador já aberta: Composição → `Gerar PDF`; Admissão → carregar pedido de Cristina Fonseca → `Gerar PDF`; Exoneração → carregar o mesmo pedido → `Gerar PDF`. Obter os `fileID` via `browser.files.list` e os caminhos via `browser.files.get`.

Rodar o comando do Step 1 nos três arquivos novos.
Expected: `PASS` nos três.

Gerar também a composição do gabinete sem responsável (Liderança do Partido PCO) e rodar:
```bash
python3 $T composicao '<pdf-da-lideranca>' '______________________'
```
Expected: PASS (fallback presente na assinatura).

- [ ] **Step 4: Registrar progresso**

Escrever `.superpowers/sdd/2026-11-17-assinaturas-nomes-pdfs/progress.md` com RED, GREEN e caminhos dos PDFs.

---

### Task 2: Assinatura com o nome do servidor na declaração

**Files:**
- Modify: `src/utils/pdfGenerator.ts:721-724`
- Modify: `.superpowers/sdd/2026-11-17-compactacao-campos-declaracao/verificar-pdf-declaracao.py:70`
- Test: `verificar-assinatura.py` (criado na Task 1)

**Interfaces:**
- Consumes: `gerarPdfDeclaracao(dados)` com `dados.nomeCompleto`; script `verificar-assinatura.py <tipo> <pdf> <nome>`.
- Produces: nenhuma assinatura de função muda.

- [ ] **Step 1: Escrever/atualizar os testes que falham**

Rodar o teste da Task 1 no PDF atual da declaração:
```bash
python3 .superpowers/sdd/2026-11-17-assinaturas-nomes-pdfs/verificar-assinatura.py declaracao '/tmp/opencode-browser-saI7gj/0/Declaracao_Servidor_Maria_Aparecida_de_Oliveira_Santos.pdf' 'Maria Aparecida de Oliveira Santos'
```
Expected: FAIL com `DECLARANTE / SERVIDOR(A) NOMEADO(A)` — o script já traz esse texto na lista de linhas proibidas do tipo `declaracao`, e o PDF atual contém o rótulo como linha isolada.

Confirmar também que `verificar-pdf-declaracao.py:70` exige o rótulo antigo e vai precisar de atualização após a mudança.

- [ ] **Step 2: Implementar a remoção do rótulo**

Em `gerarPdfDeclaracao`, remover apenas:
```ts
  y += 5;
  doc.setFont(FONTE, 'normal');
  doc.setFontSize(8);
  doc.text('Declarante / Servidor(a) Nomeado(a)', pageWidth / 2, { align: 'center' });
```
Manter intactos: `y += 25`, a linha horizontal, `y += 5`, `doc.text((dados.nomeCompleto || 'DECLARANTE').toUpperCase(), ...)` e a reserva `escrever(..., 8, false, 40)`.

**Nota:** se a checagem de Review Focus do nome vazio mostrar que o fallback `DECLARANTE` ainda é necessário, substituí-lo por `______________________` nesta mesma etapa, sem alterar mais nada.

- [ ] **Step 3: Atualizar o teste de compactação da declaração**

Em `.superpowers/sdd/2026-11-17-compactacao-campos-declaracao/verificar-pdf-declaracao.py:70`, trocar a asserção que exige `Declarante / Servidor(a) Nomeado(a)` pela exigência do nome do servidor em maiúsculas como linha isolada. Rodar o script no PDF regenerado na Step 4.

- [ ] **Step 4: Gerar a declaração pela interface e verificar o GREEN**

Na tela Declaração Nomeado, gerar o PDF de Maria Aparecida de Oliveira Santos. Rodar `verificar-assinatura.py declaracao <novo-pdf> 'Maria Aparecida de Oliveira Santos'` e `verificar-pdf-declaracao.py <novo-pdf>`.
Expected: ambos PASS; número de páginas e ausência de assinatura isolada inalterados.

- [ ] **Step 5: Regressão e verificação final**

Rodar, no PDF de admissão regenerado e no PDF de declaração regenerado:
```bash
npx tsc --noEmit
npm run build
python3 .superpowers/sdd/2026-11-17-padronizacao-tipografia-oficios/verificar-tipografia-oficios.py <pdf-admissao>
python3 .superpowers/sdd/2026-11-17-declaracao-nao-nepotismo-admissao/verificar-pdf-admissao.py <pdf-admissao>
python3 .superpowers/sdd/2026-11-17-simetria-caixa-admissao/verificar-simetria-caixa-admissao.py <pdf-admissao>
python3 .superpowers/sdd/2026-11-17-texto-inicial-composicao/verificar-texto-inicial-composicao.py <pdf-composicao>
python3 .superpowers/sdd/2026-11-17-compactacao-campos-declaracao/verificar-pdf-declaracao.py <pdf-declaracao>
```
Expected: exit 0 em todos. Conferir console do navegador sem erros e abrir os quatro PDFs via `browser.preview`.

Atualizar `progress.md` com o resultado consolidado.
