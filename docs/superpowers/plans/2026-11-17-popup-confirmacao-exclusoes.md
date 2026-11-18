# Popup de Confirmação de Exclusões Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir todos os `window.confirm` por um modal de confirmação do sistema e adicionar confirmação nas exclusões de itens de lista, além de renomear os botões de geração de PDF.

**Architecture:** Um único `ConfirmProvider` montado no `App.tsx` guarda o estado do diálogo e expõe `useConfirm()` com `confirmar({ titulo, mensagem, textoConfirmar? }): Promise<boolean>`. Cada handler de exclusão vira `async` e só prossegue quando a Promise resolve `true`. O modal é um componente controlado pelo provider, com cancelamento via botão, `Esc` ou clique no overlay.

**Tech Stack:** React 19 + TypeScript + Vite; ícones `lucide-react` (`AlertTriangle`); estilos Tailwind já presentes no projeto.

**Spec:** `docs/superpowers/specs/2026-11-17-popup-confirmacao-exclusoes-design.md`

## Global Constraints

- Projeto **não é repositório git**: não criar commits, worktrees, branches ou PRs; registrar o progresso em `.superpowers/sdd/2026-11-17-ajustes-declaracao-pdf-banco/progress.md`.
- Não instalar dependências; usar apenas React e `lucide-react` já presentes.
- Não alterar API, persistência ou regras de validação.
- Todo texto de confirmação deve deixar claro que a ação não pode ser desfeita.
- Verificação obrigatória ao final de cada tarefa: `npx tsc --noEmit` e `npm run build` com exit 0.

## Review Focus

- **Cancelar em qualquer exclusão não deve remover nada** — teste: abrir cada exclusão, clicar em Cancelar, conferir que a lista/registro permanece.
- **`Esc` e clique no overlay cancelam** — teste: abrir diálogo, pressionar `Escape`, conferir `false`; repetir clicando no overlay.
- **Duplo clique em Excluir não deve gerar duas exclusões** — teste: resolver a Promise uma única vez e desmontar o diálogo antes de executar a ação.
- **Exclusões de itens de lista da Declaração** (vínculo, atividade, dependente) não podem acontecer sem popup — teste: clicar em cada botão e conferir que o diálogo aparece antes da remoção.
- **Todas as telas devem exibir `Gerar PDF` sem a palavra `Oficial`** — teste: varredura do texto dos botões nas quatro telas.

---

### Task 1: ConfirmDialog, provider e hook

**Files:**
- Create: `src/components/ConfirmDialog.tsx`
- Modify: `src/App.tsx:1-30` (import) e `src/App.tsx:100-147` (envolver a árvore com o provider)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `ConfirmProvider({ children }: { children: React.ReactNode }): JSX.Element`
  - `useConfirm(): { confirmar: (opcoes: ConfirmarOpcoes) => Promise<boolean> }`
  - `ConfirmarOpcoes = { titulo: string; mensagem: string; textoConfirmar?: string }`
  - Texto padrão do botão confirmar: `Excluir`.

- [ ] **Step 1: Escrever o teste que falha (E2E no navegador)**

Na aba já aberta em `http://localhost:3000`, navegar até a tela de Declaração e avaliar:
```js
(() => ({ temProvider: !!document.querySelector('[data-confirm-dialog]'), temHook: typeof window.__confirmar === 'function' }))()
```
Expected: FAIL — nenhum diálogo montado e nenhuma API de confirmação exposta.

- [ ] **Step 2: Implementar `src/components/ConfirmDialog.tsx`**

Criar o provider com estado `{ opcoes, resolver }`, mantendo a Promise pendente até a escolha. O componente do modal deve:
  - usar `data-confirm-dialog` no overlay;
  - ter `role="dialog"`, `aria-modal="true"` e `aria-labelledby` apontando para o título;
  - renderizar `AlertTriangle`, `titulo`, `mensagem`, botão `Cancelar` e botão com `textoConfirmar ?? 'Excluir'`;
  - chamar `resolver(false)` em Cancelar, `Escape` e clique no overlay, e `resolver(true)` no botão de confirmar;
  - limpar o estado (desmontar) logo após resolver, garantindo uma única resolução;
  - focar o botão `Cancelar` ao abrir.

- [ ] **Step 3: Integrar o provider em `src/App.tsx`**

Envolver o conteúdo retornado pelo componente com `<ConfirmProvider>`, sem alterar o layout existente.

- [ ] **Step 4: Verificar no navegador**

Recarregar a página e conferir que o app carrega sem erro e que o diálogo só existe quando aberto. Enquanto não houver chamada a `confirmar()`, `document.querySelector('[data-confirm-dialog]')` deve ser `null`.

- [ ] **Step 5: Verificar compilação e registrar**

Run: `npx tsc --noEmit && npm run build`
Expected: exit 0. Registrar no ledger.

---

### Task 2: Aplicar a confirmação em todas as exclusões

**Files:**
- Modify: `src/components/DeclaracaoView.tsx:282-289` (`excluirSalvo`), `:461-482` (`removerParente`, `removerAtividade`, `removerDependente`)
- Modify: `src/components/ComposicaoView.tsx:83-121` (`zerarComposicao`, `excluirSalvo`)
- Modify: `src/components/AdmissaoView.tsx:99-106` (`excluirSalvo`)
- Modify: `src/components/ExoneracaoView.tsx:99-106` (`excluirSalvo`)
- Modify: `src/components/AdminView.tsx:84-91` (`excluirGabinete`), `:149-156` (`excluirUsuario`)

**Interfaces:**
- Consumes: `useConfirm()` de `src/components/ConfirmDialog.tsx` (Task 1).
- Produces: nenhuma.

- [ ] **Step 1: Escrever o teste que falha (E2E no navegador)**

Na tela de Declaração, com um dependente cadastrado, clicar em `Remover dependente` e avaliar:
```js
(() => ({ dialogo: !!document.querySelector('[data-confirm-dialog]'), qtd: document.querySelectorAll('input[placeholder="Especifique"]').length }))()
```
Expected: FAIL — `dialogo: false` e o dependente é removido imediatamente.

- [ ] **Step 2: Converter `excluirSalvo` nas quatro telas de registros salvos**

Para cada handler, substituir `if (!window.confirm('...')) return;` por:
```ts
if (!(await confirmar({
  titulo: '<título específico>',
  mensagem: '<pergunta específica> Esta ação não pode ser desfeita.',
}))) return;
```
Textos: Declaração — `Excluir declaração?` / `Deseja excluir esta declaração salva?`; Composição — `Excluir composição?` / `Deseja excluir esta composição salva?`; Admissão — `Excluir pedido de admissão?` / `Deseja excluir este pedido salvo?`; Exoneração — `Excluir pedido de exoneração?` / `Deseja excluir este pedido salvo?`.

- [ ] **Step 3: Converter `zerarComposicao`, `excluirGabinete` e `excluirUsuario`**

Mesmo padrão do passo 2, com os textos:
  - `Zerar composição?` / `Deseja zerar a composição do gabinete?`
  - `Excluir gabinete?` / `Deseja excluir este gabinete?`
  - `Remover usuário?` / `Deseja remover este usuário?`

- [ ] **Step 4: Adicionar confirmação aos três handlers de lista da Declaração**

Tornar `removerParente`, `removerAtividade` e `removerDependente` assíncronos e usar `confirmar()` antes do `set...filter`, com os textos:
  - `Remover vínculo?` / `Deseja remover este vínculo de parentesco?`
  - `Remover atividade?` / `Deseja remover esta atividade remunerada?`
  - `Remover dependente?` / `Deseja remover este dependente?`

- [ ] **Step 5: Verificar no navegador (todas as exclusões)**

Para cada um dos nove pontos de exclusão: abrir o diálogo, clicar em `Cancelar` e conferir que nada foi removido; repetir com `Excluir` e conferir a remoção. Conferir também `Escape` e clique no overlay em pelo menos um deles. Nenhum `window.confirm` deve restar em `src/`.

- [ ] **Step 6: Verificar compilação e registrar**

Run: `npx tsc --noEmit && npm run build && grep -rn 'window.confirm' src || true`
Expected: exit 0 e nenhuma ocorrência de `window.confirm`. Registrar no ledger.

---

### Task 3: Renomear os botões de PDF

**Files:**
- Modify: `src/components/ComposicaoView.tsx:291`, `src/components/DeclaracaoView.tsx:1012`, `src/components/AdmissaoView.tsx:243`, `src/components/ExoneracaoView.tsx:243`

**Interfaces:**
- Consumes: nada.
- Produces: nenhuma.

- [ ] **Step 1: Escrever o teste que falha (varredura de texto)**

Run: `grep -rn 'Gerar PDF Oficial' src --include=*.tsx`
Expected: FAIL — quatro ocorrências.

- [ ] **Step 2: Substituir o texto**

Trocar `<span>Gerar PDF Oficial</span>` por `<span>Gerar PDF</span>` nos quatro arquivos.

- [ ] **Step 3: Verificar no navegador e na busca**

Abrir cada uma das quatro telas e conferir o rótulo `Gerar PDF`; rodar `grep -rn 'Oficial' src --include=*.tsx` e esperar nenhuma ocorrência relacionada a botão de PDF.

- [ ] **Step 4: Verificação final e registro**

Run: `npx tsc --noEmit && npm run build`
Expected: exit 0. Atualizar o ledger e submeter revisão final de código.
