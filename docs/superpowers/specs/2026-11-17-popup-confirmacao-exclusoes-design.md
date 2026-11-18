# Popup de confirmação de exclusões + rótulo dos botões de PDF

## Intenção
Evitar exclusões acidentais e deixar todas elas com a mesma aparência, além de remover a palavra "Oficial" dos botões de geração de PDF.

## Por que
Hoje as exclusões de registros salvos usam `window.confirm` (popup nativo do navegador), enquanto os botões de lista da Declaração excluem sem perguntar. Isso gera experiências diferentes dentro do mesmo sistema e risco de perda acidental de vínculo, atividade ou dependente.

## Objetivos
- Confirmação visual consistente em **todas** as exclusões.
- Mesmo padrão de texto: título, pergunta clara e aviso de que a ação não pode ser desfeita.
- Botões de PDF rotulados apenas **Gerar PDF** nas quatro telas.

## Não objetivos
- Alterar a lógica de persistência ou a API.
- Criar confirmação para ações que não excluem dados (limpar formulário, salvar, gerar PDF).
- Refatorar os componentes além do necessário para invocar a confirmação.

## Abordagens consideradas
1. **Modal do sistema com provider global (escolhida)** — um componente `ConfirmDialog` e um `ConfirmProvider` montados no `App.tsx`, com hook `useConfirm()` que retorna `Promise<boolean>`. Cada handler de exclusão passa a ser `async` e chama `if (!(await confirmar({...}))) return;`. Centraliza visual e comportamento, evita repetir estado/markup em cinco telas e permite textos específicos por exclusão.
2. **`window.confirm` nos 3 handlers faltantes** — mudança mínima, mas mantém popup nativo e experiências diferentes entre telas. Foi descartada porque o usuário pediu um popup do sistema, não o do navegador.

## Desenho
### Novo arquivo
- `src/components/ConfirmDialog.tsx`: provider + hook + modal.
  - API: `confirmar({ titulo, mensagem, textoConfirmar? }): Promise<boolean>`.
  - Visual: overlay escuro translúcido, card branco central, ícone `AlertTriangle`, título em negrito, mensagem, botões **Cancelar** (secundário) e **Excluir** (vermelho).
  - Comportamento: fecha com `Cancelar`, `Esc` ou clique no overlay (retorna `false`); `Excluir` retorna `true`; foco inicial em `Cancelar`; `role="dialog"` e `aria-modal="true"`.

### Integração
- `src/App.tsx`: envolver a árvore com `ConfirmProvider`.
- `src/components/DeclaracaoView.tsx`: usar `confirmar()` em `excluirSalvo`, `removerParente`, `removerAtividade` e `removerDependente`.
- `src/components/ComposicaoView.tsx`: usar `confirmar()` em `zerarComposicao` e `excluirSalvo`.
- `src/components/AdmissaoView.tsx` e `src/components/ExoneracaoView.tsx`: usar `confirmar()` em `excluirSalvo`.
- `src/components/AdminView.tsx`: usar `confirmar()` em `excluirGabinete` e `excluirUsuario`.

### Rótulos
- Substituir `Gerar PDF Oficial` por `Gerar PDF` em ComposicaoView, DeclaracaoView, AdmissaoView e ExoneracaoView.

## Verificação prevista
- `npx tsc --noEmit` e `npm run build`.
- Navegador: cancelar e confirmar cada tipo de exclusão; nenhuma exclusão sem popup; `Esc` e clique no overlay cancelam; quatro botões exibem `Gerar PDF`.
