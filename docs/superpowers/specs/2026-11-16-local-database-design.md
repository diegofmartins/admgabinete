# Design — Sistema de Administração de Gabinete (Fase Local)

**Data:** 2026-11-16
**Status:** Aprovado (conforme decisões tomadas na conversa)

## Intent

Migrar o sistema de uma arquitetura Firebase (Auth + Firestore) para uma
arquitetura local de desenvolvimento: API REST + persistência em arquivo JSON,
com sessão local (sem login real) e seleção de perfil de usuário (admin ou
assessor/vereador).

Motivação: o projeto foi iniciado no Google AI Studio (de onde vinham as
integrações Gemini e as referências ao Firebase); as integrações de IA foram
abandonadas e o fluxo segue em outro lugar. Antes de conectar o "banco verdadeiro",
o sistema precisa de uma versão usável local.

## Decisões

1. **Abandono da integração Gemini** — dependência e referências removidas do
   fluxo ativo (fora o arquivo de configuração original do template).
2. **Arquitetura de dados local (Opção 1):** API REST com Express + persistência
   em arquivo JSON (`data/db.json`), com as mesmas "colleções" conceituais:
   `gabinetes`, `usuarios`, `composicoes`, `admissoes`, `exoneracoes`, `declaracoes`.
3. **Autenticação local:** sessão sem login real; o usuário acessível é
   selecionado na tela de login (perfis: `admin` e `assessor`/`vereador`).

## Goals / Non-goals / Anti-goals

- **Goals:** app funcional localmente com persistência em disco; perfis de teste
  (admin/assessor); mesma estrutura de dados para facilitar a futura ponte com o
  banco real.
- **Non-goals:** substituir o Firebase Auth real; implementar multi-usuário real;
  reativar IA.

## Como a ponte com o banco real vai funcionar

A camada de acesso à API (`src/services/api.ts`) será o único ponto de consumo
HTTP. Quando o backend real existir, basta implementar as mesmas rotas/contratos
sob outro host — sem mudar as views.

## Restrições / Fora de escopo

- Sem testes automatizados (não faz parte do escopo desta fase).
- Sem deploy (fase local).

## Próximos passos

1. Criar `server.ts` (Express + JSON file) com rotas CRUD por coleção.
2. Criar `src/services/api.ts` (client HTTP) e migrar as views de Firestore → API.
3. Trocar login Google por seleção de perfil local no frontend.
4. Adicionar proxy `/api` no Vite e script `api` no package.json.
5. Validar com typecheck e execução local.
