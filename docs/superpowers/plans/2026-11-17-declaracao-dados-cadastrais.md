# Declaração com Dados Cadastrais — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar os campos cadastrais do Formulário 2 (PDF anexo) à tela "Declaração do Servidor Nomeado" e ao PDF final, com consensos obrigatórios e validações (CPF dependente, máscara de telefone, CEP + ViaCEP).

**Architecture:** A tela mantém um único payload salvo em `/api/declaracoes` e um único gerador jsPDF; o item 1 ganha subgrupos (1.1–1.5) para os novos campos sem duplicar dados já existentes; o PDF passa a compor dados cadastrais + declaração.

**Tech Stack:** React 19 + TS + Vite, jsPDF, validador local (`validarCPF`, `formatarCPF`).

**Spec:** `docs/superpowers/specs/2026-11-17-declaracao-dados-cadastrais-design.md`

## Global Constraints

- Nunca duplicar nome/CPF/e-mail/celular do item 1 nas novas seções (campos cadastrais = endereço, documentos, filiação, dependentes, banco).
- Consensos obrigatórios: LGPD, inexistência de impedimento, veracidade + novo consentimento (campanhas internas/grupos WhatsApp). Sem o conjunto completo, não salva nem gera PDF.
- Nome do item 6: **"Consentimento e Veracidade"**.
- Dependentes exigem CPF válido (validarCPF).
- Telefone: máscara `(XX) XXXXX-XXXX`.
- CEP: campo primeiro; lookup ViaCEP (`https://viacep.com.br/ws/{cep}/json/`) preenche logradouro/bairro/cidade/estado.

## Review Focus

1. Consenso obrigatório não bloqueia salvamento/PDF (os três + novo).
2. CPF de dependente invalidado bloqueia PDF/salvamento quando houver dependente.
3. CEP inválido/limpo não quebra o fluxo; lookup preenche campos.
4. Telefone com máscara mantém validação por dígitos.
5. Dados cadastrais aparecem no PDF; declarações salvas antigas carregam com defaults.

---

### Task 1: Estender tipos e estado da Declaração

**Files:**
- Modify: `src/types.ts` (se houver tipo de payload), `src/components/DeclaracaoView.tsx:25-48` (state).

**Interfaces:**
- Consumes: estado atual da tela.
- Produces: campos cadastrais novos no payload (`endereco`, `documentos`, `filiacao`, `dependentes`, `banco`).

- [ ] **Step 1: Estender estado com campos cadastrais**
- [ ] **Step 2: Preencher payload de save/PDF**
- [ ] **Step 3: Carregar item salvo (defaults)**

### Task 2: UI — Expansão do item 1 em subgrupos

**Files:** Modify `src/components/DeclaracaoView.tsx` (bloco SEÇÃO 1, ~375-424).

- [ ] **Step 1: Subdividir item 1** em Identificação / Endereço / Documentos / Filiação & Dependentes / Dados bancários, sem duplicar.
- [ ] **Step 2: Dependentes com CPF** (adicionar/remover, validação).
- [ ] **Step 3: Telefone com máscara** `(XX) XXXXX-XXXX`.
- [ ] **Step 4: CEP + ViaCEP** (lookup → preenchimento).

### Task 3: Consensos obrigatórios e nome do item 6

**Files:** Modify `src/components/DeclaracaoView.tsx` (validar/salvar/PDF + bloco SEÇÃO 6).

- [ ] **Step 1: Novo consentimento** (campanhas internas/grupos WhatsApp).
- [ ] **Step 2:** exigir os 3 consensos; renomear item 6 para "Consentimento e Veracidade".
- [ ] **Step 3:** validar CPF dependente; bloquear save/PDF sem consents.

### Task 4: PDF final (dados cadastrais + declaração + consents)

**Files:** Modify `src/utils/pdfGenerator.ts` (gerarPdfDeclaracao).

- [ ] **Step 1:** incluir bloco de dados cadastrais antes da declaração.
- [ ] **Step 2:** item 6 com texto completo e novo consentimento.
- [ ] **Step 3:** verificação de conformidade (campos + consensos obrigatórios).

### Task 5: Verificação final

- [ ] **Step 1:** `npx tsc --noEmit && npm run build`.
- [ ] **Step 2:** E2E: preencher dados cadastrais, consentir todos, gerar PDF; confirmar campos no PDF.
- [ ] **Step 3:** Confirmar dados restaurados no banco.

---

*Plano escrito pela skill superpowers:writing-plans. Aguardando execução.*