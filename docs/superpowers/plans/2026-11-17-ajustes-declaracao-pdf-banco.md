# Ajustes na declaração: campos bancários fixos, PDF em tabela e exemplo sem opcionais — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fixar Banco/Agência na tela, reestruturar o PDF com identificação primeiro e subseções 1.2–1.5 em tabela com linhas cinza, e transformar o registro do João em exemplo sem parentesco, dependentes nem atividade remunerada.

**Architecture:** Três mudanças independentes em `DeclaracaoView.tsx` (apresentação dos campos 1.5), `pdfGenerator.ts` (novas auxiliares de tabela e subseção, reordenação do bloco 1) e `data/db.json` (alteração via API DELETE+POST, pois o servidor carrega o banco apenas no boot). Os payloads de save/PDF e as seções 2–5 do PDF não mudam.

**Tech Stack:** React + TypeScript + Tailwind, Vite, jsPDF, API Express com JSON em `data/db.json`, verificação com `tsc`/`build`/`curl`/`pdftotext`.

**Spec:** `docs/superpowers/specs/2026-11-17-ajustes-declaracao-pdf-banco-design.md`

## Global Constraints

- Projeto **não é repositório git**: não criar commits, worktrees, branches nem PRs.
- Raiz absoluta: `/home/Docs.Locais/sistema-de-aministração-de-gabinete` (não usar `/home/Docs/Locais/...`).
- Sem framework de testes: verificar com `npx tsc --noEmit`, `npm run build`, `curl`, E2E no navegador e `pdftotext -layout`.
- Serviços: Vite em `http://localhost:3000`, API em `http://localhost:3001`.
- Seções 2 a 5 do PDF e todos os consentimentos obrigatórios permanecem exatamente como estão.
- Mensagem de sucesso do save permanece "Declaração salva com sucesso no Firestore!".
- `POST /api/declaracoes` é append-only; para alterar um registro existente, usar `DELETE` seguido de `POST`.

## Review Focus

- Banco/Agência precisam permanecer "Caixa Econômica Federal" e "0369" mesmo após tentativa de edição, e devem continuar presentes no payload e no PDF — teste: E2E tenta alterar ambos e lê o valor; `curl` confirma o registro; `pdftotext` confirma as linhas.
- A identificação deve aparecer antes do endereço no PDF — teste: `pdftotext -layout` com `grep -n` comparando as posições de "1.1 Identificação" e "1.2 Endereço".
- Nenhum cabeçalho antigo "Dados Cadastrais para Nomeação em Cargo em Comissão" pode sobrar — teste: `pdftotext` sem essa ocorrência, com "1.2", "1.3", "1.4" e "1.5" presentes.
- Dependentes com `IRPF: Sim`/`IRPF: Não` e PIS/PASEP precisam continuar no PDF — teste: `pdftotext` com `grep` desses campos no exemplo da Maria.
- O exemplo do João precisa ficar sem opcionais e o da Maria intacto — teste: `curl` com `node` lendo `parentesco`, `parentes`, `atividade`, `atividades`, `dependentes` de ambos.

---

### Task 1: Campos bancários fixos na tela

**Files:**
- Modify: `src/components/DeclaracaoView.tsx:799-812`

**Interfaces:**
- Consumes: estados existentes `bancoAgencia` (default `'0369'`) e `bancoConta`, já enviados nos payloads de save e PDF.
- Produces: nenhuma interface nova; valores e nomes de estado inalterados.

- [ ] **Step 1: Substituir o bloco 1.5 por um grid de três colunas**

Em `src/components/DeclaracaoView.tsx`, trocar o `<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">` do bloco 1.5 por `grid grid-cols-1 sm:grid-cols-3 gap-4`, com três `.space-y-1.5`:
1. label `Banco`, `<input type="text" value="Caixa Econômica Federal" readOnly className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-[#F3F5F4] text-slate-600" />`
2. label `Agência`, `<input type="text" value={bancoAgencia} readOnly className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-[#F3F5F4] text-slate-600" />`
3. label `Conta`, `<input type="text" value={bancoConta} onChange={(e) => setBancoConta(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />`

Manter o título `1.5 Dados Bancários (Caixa Econômica Federal)` e não alterar `setBancoAgencia`, `setBancoConta`, os payloads nem os handlers de limpar/carregar.

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit && npm run build`
Expected: exit 0, sem erros.

- [ ] **Step 3: Verificar no navegador**

Run: no tab `http://localhost:3000/`, entrar como "Assessor / Vereador", abrir "Declaração Nomeado", ler os três inputs do bloco 1.5.
Expected: `Banco = "Caixa Econômica Federal"`, `Agência = "0369"`, ambos `readOnly`; `Conta` editável; os três no mesmo `grid-row` em largura desktop.

---

### Task 2: PDF com tabela cinza e subseções 1.1–1.5

**Files:**
- Modify: `src/utils/pdfGenerator.ts:390-482`

**Interfaces:**
- Consumes: objeto `dados` já existente em `gerarPdfDeclaracao`, com todos os campos cadastrais e `dependentes` (cada um com `irpf?: 'nao' | 'sim'`).
- Produces: duas funções locais:
  - `escreverSubsecao(titulo: string): void` — título em negrito, fonte 9, cor `14,77,54`, sem linha horizontal, `y += 4` depois.
  - `escreverTabela(linhas: [string, string][]): void` — uma linha por par, altura `5.2`, rótulo bold em coluna de `48` mm a partir de `MARGEM`, valor normal a partir de `MARGEM + 50`, fundo `doc.setFillColor(244, 246, 245)` nas linhas de índice ímpar via `doc.rect(MARGEM, yInicio, pageWidth - MARGEM * 2, 5.2, 'F')`, texto em `yInicio + 3.6`, valor limitado por `maxWidth: pageWidth - MARGEM * 2 - 52`, `checarQuebra(7)` antes de cada linha, `y += 5.2` ao final de cada linha. Usar `doc.setTextColor(0, 0, 0)` e `doc.setFont(FONTE, ...)`; restaurar cor e fonte ao final.

- [ ] **Step 1: Adicionar as duas auxiliares locais**

Em `gerarPdfDeclaracao`, imediatamente após `escrever` (linha ~447), definir `escreverSubsecao` e `escreverTabela` com as assinaturas e os valores da seção Interfaces.

- [ ] **Step 2: Reordenar e agrupar o bloco 1**

Substituir as linhas 449–482 por esta sequência:

1. `escreverSecao('1. Identificação e Dados Cadastrais', 0)` (título principal, mantém a numeração 1–5).
2. `escreverSubsecao('1.1 Identificação do Declarante')` + `escreverTabela([...])` com pares: `Nome`, `CPF`, `E-mail`, `Telefone`, `Cargo pretendido` (este último com o símbolo entre parênteses, como hoje).
3. `escreverSubsecao('1.2 Endereço')` + pares `CEP`, `Logradouro`, `Número`, `Complemento`, `Bairro`, `Cidade`, `Estado`, lidos de `dados.endereco` com `—` para vazio.
4. `escreverSubsecao('1.3 Dados Pessoais e Documentos')` + pares: `Data de nascimento`, `Nacionalidade`, `Naturalidade`, `Estado civil`, `Raça/cor`, `Deficiência` (com o texto `Sim (...)`/`Não` atual), `RG`, `Órgão expedidor`, `PIS/PASEP`, `Título de eleitor`, `Zona`, `Seção`, `CTPS`, `CTPS — Série`, `CTPS — Emitido em`, `Escolaridade`.
5. `escreverSubsecao('1.4 Filiação e Dependentes')` + pares `Filiação` (pai / mãe como hoje) e, para cada dependente, um par cujo valor é `Nome | CPF: ... | Nascimento: dd/mm/aaaa | Código IRPF: ... | IRPF: Sim|Não` (manter o formato atual).
6. `escreverSubsecao('1.5 Dados Bancários')` + pares `Banco` com valor fixo `Caixa Econômica Federal`, `Agência` com `dados.bancoAgencia || '—'` e `Conta` com `dados.bancoConta || '—'`.

Não alterar nada a partir da linha do comentário `// Seção 2 — Vínculo de Parentesco...` em diante.

- [ ] **Step 3: Verificar compilação**

Run: `npx tsc --noEmit && npm run build`
Expected: exit 0, sem erros.

- [ ] **Step 4: Gerar PDF e verificar o texto**

No navegador, com a declaração da Maria carregada (ou preenchida), clicar em "Gerar PDF Oficial"; copiar o download mais recente e executar `pdftotext -layout <arquivo> /tmp/opencode-pdf-tabela.txt`.
Expected: `grep -n` mostra "1.1 IDENTIFICAÇÃO DO DECLARANTE" antes de "1.2 ENDEREÇO"; "1.3", "1.4", "1.5" presentes; "Dados Cadastrais para Nomeação em Cargo em Comissão" ausente; "Banco: Caixa Econômica Federal", "PIS/PASEP", "IRPF: Não", "IRPF: Sim" presentes; seções "2.", "3.", "4.", "5." na mesma ordem e com os mesmos textos de antes.

---

### Task 3: Registro do João como exemplo sem opcionais

**Files:**
- Modify: `data/db.json` (somente via API — não editar o arquivo diretamente)

**Interfaces:**
- Consumes: registro atual com `id = dec_mwkn00ro3ziqi4` e `nomeCompleto = 'João da Silva Nogueira'`.
- Produces: um registro com `parentesco: 'nao'`, `parentes: []`, `atividade: 'nao'`, `atividades: []`, `dependentes: []`; todos os demais campos preservados; novo `id` gerado pelo servidor.

- [ ] **Step 1: Enviar o registro alterado pela API**

Run: script `node` que lê `./data/db.json`, pega o registro do João, faz `fetch('http://localhost:3001/api/declaracoes/<id>', { method: 'DELETE' })`, monta `novo = { ...joao, parentesco: 'nao', parentes: [], atividade: 'nao', atividades: [], dependentes: [] }` (sem o campo `id`) e faz `fetch('http://localhost:3001/api/declaracoes', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(novo) })`.
Expected: `DELETE` retorna `{"ok":true}` e `POST` retorna status 201 com o novo `id`.

- [ ] **Step 2: Confirmar os dois exemplos na API**

Run: `curl -s http://localhost:3001/api/declaracoes` e inspecionar com `node`.
Expected: 2 registros; João com `parentesco: 'nao'`, listas vazias e `temIrpfLegado` irrelevante; Maria com `dependentes` contendo `irpf: 'nao'` e `irpf: 'sim'`, `nacionalidade: 'Brasileira'`, `naturalidade: 'Curitiba/PR'` e os quatro consentimentos `true`.

- [ ] **Step 3: Atualizar o ledger**

Acrescentar em `.superpowers/sdd/2026-11-17-declaracao-dados-cadastrais/progress.md` um registro das três mudanças e das verificações com os comandos executados.

- [ ] **Step 4: Verificação final cruzada**

Run: `npx tsc --noEmit && npm run build` e `pdftotext -layout` no PDF gerado na Task 2.
Expected: exit 0; PDF com ordem e subseções corretas; API com os dois exemplos conforme o passo anterior.
