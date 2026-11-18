# Design — Edição de Gabinetes no Painel Administrativo

Data: 2026-11-17
Status: aprovado pelo solicitante

## Intenção e porquê

O Painel Administrativo permite cadastrar e excluir gabinetes, mas não corrigir dados de um gabinete já cadastrado (nome, tipo, responsável, situação). Hoje o único caminho para corrigir um erro de digitação é excluir o gabinete e recriá-lo. O objetivo é permitir editar um gabinete existente no próprio Painel.

## Objetivos

- Editar `nome`, `tipo`, `vereadorResponsavel` e `ativo` de um gabinete cadastrado.
- Botão de editar visível em cada linha da lista "Gerenciar Gabinetes".
- Persistir a alteração na API local (`data/db.json`).

## Não-objetivos

- Alterar exclusão de gabinetes ou o comportamento dos registros vinculados (composições, admissões, exonerações, declarações).
- Editar usuários pelo mesmo mecanismo.
- Criar modal/diálogo genérico ou biblioteca nova.

## Restrições

- Seguir os padrões existentes: Tailwind v4, componentes com classes do painel, cliente `api.*` sobre `fetch`, API Express em `server.ts`, persistência síncrona em `data/db.json`.
- Não introduzir dependências novas.
- Manter mensagens em PT-BR no padrão atual.

## Abordagens consideradas

| Opção | Trade-off | Decisão |
|---|---|---|
| Modal/diálogo | Peso extra para 4 campos | Descartada |
| Reaproveitar o formulário "Cadastrar" como modo edição | Ambíguo sobre qual registro está sendo alterado | Descartada |
| Edição inline na própria linha | Mantém o contexto, reutiliza os campos do cadastro | **Escolhida** |

## Como será feito (decidido)

1. **`server.ts`** — novo endpoint `PUT /api/gabinetes/:id`:
   - 404 se o id não existir; atualiza apenas os campos enviados entre `nome`, `tipo`, `vereadorResponsavel`, `ativo`; `nome` não pode ficar vazio; persiste em disco; responde com o gabinete atualizado.
2. **`src/services/api.ts`** — `atualizarGabinete(id, dados)` chamando `PUT /gabinetes/:id`.
3. **`src/components/AdminView.tsx`**:
   - Estado de edição: `idEmEdicao` e rascunho dos quatro campos.
   - Botão de lápis (`Edit2`) ao lado da lixeira em cada linha.
   - Ao clicar, a linha vira mini-formulário com Nome, Tipo, Responsável e checkbox Ativo, além de botões Salvar e Cancelar.
   - Salvar: valida nome não vazio, chama `api.atualizarGabinete`, `onAtualizarGabinetes()` e sai do modo edição. Cancelar: descarta o rascunho.
   - Enquanto uma linha está em edição, as demais permanecem em modo leitura.

## Decisões deixadas para quem implementa

- Textos exatos do botão (ex.: ícone com `title` acessível "Editar gabinete").
- Estilo exato do mini-formulário (reaproveitar classes do formulário de cadastro).
- Tratamento de erro exibido ao usuário (alert no padrão atual do arquivo).
