# Sistema de Administração de Gabinete

Sistema interno da Câmara Municipal de Curitiba para gestão da composição de gabinetes e geração dos documentos de nomeação em comissão (Lei Municipal nº 16.546/2025, Súmula Vinculante nº 13 do STF, LCM nº 86/2012 e LGPD).

## Stack

- React 19 + TypeScript + Vite + Tailwind CSS v4
- API local em Express (porta `3001`) com persistência em arquivo JSON
- jsPDF carregado localmente em `public/` para geração dos PDFs

## Pré-requisitos

- Node.js (com npm)

## Executando localmente

```bash
npm install       # instalar dependências
npm run api       # API Express em http://localhost:3001
npm run dev       # aplicação em http://localhost:3000
```

O Vite faz proxy de `/api` para `http://localhost:3001`, então deixe a API rodando antes de usar a interface.

## Comandos

| Comando | Descrição |
| --- | --- |
| `npm run api` | Inicia a API de persistência (porta 3001) |
| `npm run dev` | Inicia a aplicação (porta 3000) |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run preview` | Serve localmente o conteúdo de `dist/` |
| `npm run lint` | Verificação de tipos (`tsc --noEmit`) |

## Banco de dados local

A API grava os registros em `data/db.json` (criado automaticamente com os gabinetes padrão). Para reiniciar do zero: pare a API, exclua a pasta `data/` e inicie a API novamente.

## Estrutura

```
src/
  components/   telas e componentes de interface
  services/     cliente da API
  utils/        geração de PDF, validação e formatação
  types.ts      tipos e dados padrão
server.ts       API Express
data/db.json    persistência local
public/         logo e biblioteca jsPDF
docs/           especificações e planos de implementação
```

## Deploy e Firebase

A configuração do projeto Firebase mantida para integração futura está em `firebase-applet-config.json`, e as variáveis de ambiente de referência em `.env.example`. A camada de persistência atual é a API local; quando da publicação, ela deve ser trocada pelo backend definitivo mantendo o mesmo contrato de `/api`.
