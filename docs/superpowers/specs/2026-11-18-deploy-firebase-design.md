# Design — Deploy com Firebase (sistema funcionando)

Data: 18/11/2026

## Intenção

Publicar o sistema de gabinete de forma que ele **funcione com dados reais**, com
persistência no Firebase (projeto existente) e login real via Firebase Auth.
O GitHub Pages, perguntado na origem, **não consegue executar o backend**: ele
serve apenas arquivos estáticos. Este design explica por quê e propõe a
arquitetura mínima que faz o sistema funcionar, mantendo o Pages apenas como
espelho opcional.

## O que o código mostra hoje (medido)

| Aspecto | Estado atual | Consequência no deploy |
|---|---|---|
| Frontend | Vite + React; `src="/assets/..."` absoluto no `dist/index.html` | Quebra em `https://<user>.github.io/<repo>/` (subpath) |
| API | `src/services/api.ts` usa `API_URL='/api'`; proxy só no dev (`vite.config.ts:16`) | No Pages, `/api` não existe; as telas não carregam dados |
| Assets | `index.html` carrega `/jspdf.umd.min.js`; `logo.png` referenciado na raiz em vários componentes | Também quebram em subpath |
| Backend | `server.ts` Express; persistência em `data/db.json` (`lerBanco`/`salvarBanco`, linhas 29-53) | Sistemas PaaS têm filesystem efêmero: os dados somem a cada deploy/restart |
| Servir front | `server.ts:281` já faz `express.static(dist)` + fallback para `index.html` | Uma única instância Node entrega front e API — não precisa de Pages para funcionar |
| Login | `LoginView` é só seleção de perfil, sem senha (`App.tsx:90`) | Inseguro para dados pessoais (14 CPFs no `data/db.json`) |
| Firebase | `firebase` (Web SDK) já está no `package.json`, mas não é usado no código ativo; `firebase-applet-config.json` aponta para `gen-lang-client-0915661017` | Projeto existe; falta Admin SDK no backend e Auth no front |

## Decisões do usuário (coletadas)

1. Objetivo: **sistema funcionando**, não vitrine.
2. Banco: **Firebase Firestore**, usando o **projeto existente**.
3. Autenticação: **Firebase Auth no mesmo projeto**.
4. Produção e testes: **mesmo projeto Firebase**, separados por prefixo de coleção.

## Metas

- Sistema acessível pela internet, com as telas carregando e salvando dados no Firestore.
- Login real com Firebase Auth (e-mail/senha), substituindo o seletor de perfil.
- Produção e homologação isoladas por prefixo de coleção no mesmo Firestore.
- Nenhuma credencial de service account versionada ou exposta no front.
- Contrato `/api` inalterado — as views continuam chamando `src/services/api.ts`.
- Opcional: espelho estático no GitHub Pages (sem API, apenas apresentação visual).

## Não metas

- Não reescrever as quatro telas nem os geradores de PDF.
- Não alterar redação, tipografia, limites salariais ou regras dos PDFs.
- Não criar app mobile.
- Não usar o Firestore Web SDK direto no navegador para escrever dados (exigiria regras de segurança complexas e exporia CPFs).
- Não migrar os 14 CPFs existentes para o Firestore sem o usuário pedir — a migração é uma etapa explícita e opcional (ver "Seed").

## Arquitetura escolhida

Uma **única instância PaaS** (Render, Railway, Fly.io ou Cloud Run) roda:

```
Navegador  --HTTPS-->  Express (dist/ + /api)  --Admin SDK-->  Firestore
                          |
                          +-- verifica ID token do Firebase Auth
```

- O Express já serve o `dist/` (linha 281), então front e API saem do mesmo
  domínio: **não há CORS** e o `API_URL='/api'` continua válido.
- O `server.ts` troca apenas a camada de persistência: `lerBanco`/`salvarBanco`
  viram chamadas assíncronas ao Firestore via **Admin SDK**. As rotas e os
  formatos de resposta permanecem idênticos.
- O `firebase` Web SDK (já instalado) entra no front para login; o ID token
  viaja no header `Authorization: Bearer ...` e o backend o verifica com
  `admin.auth().verifyIdToken()`.
- **GitHub Pages fica como espelho opcional**: publica o `dist/` para show visual,
  mas sem a API as telas não carregam dados. Não é o caminho recomendado para
  uso real.

### Por que não Pages + API separada

Exigiria: `base` relativo no Vite, `VITE_API_URL` apontando para outro host,
CORS com allowlist no Express e um secrets store para a URL. São mais peças e
mais pontos de falha para o mesmo resultado. A instância única evita tudo isso.

## Modelo de dados no Firestore

Mesmas seis coleções conceituais do `Banco` (`server.ts:11-18`). Para separar
produção e testes no mesmo projeto, usa-se um **prefixo configurável por
ambiente**, vindo de `FIRESTORE_PREFIX`:

| Collection no Firestore | Produção (`FIRESTORE_PREFIX=prod`) | Testes (`FIRESTORE_PREFIX=test`) |
|---|---|---|
| Gabinetes | `prod_gabinetes` | `test_gabinetes` |
| Usuários | `prod_usuarios` | `test_usuarios` |
| Composições | `prod_composicoes` | `test_composicoes` |
| Admissões | `prod_admissoes` | `test_admissoes` |
| Exonerações | `prod_exoneracoes` | `test_exoneracoes` |
| Declarações | `prod_declaracoes` | `test_declaracoes` |

- Cada documento mantém o `id` atual (`gab_0`, `u_...`, etc.) como campo e como
  ID do documento, para que as rotas `/api/.../:id` sigam funcionando sem mudança.
- O prefixo é lido uma vez no boot do servidor; uma variável de ambiente por
  instância (produção vs. homologação) garante o isolamento.
- `FIRESTORE_PREFIX` sem valor assume `prod` (fail-safe: nunca aponta
  acidentalmente para dados de teste em produção).

## Autenticação

- **Front**: substituir `LoginView` por formulário e-mail/senha usando
  `signInWithEmailAndPassword` do `firebase/auth`; observer `onAuthStateChanged`
  em `App.tsx` para popular `usuarioAtual`.
- **Perfis**: o papel (`admin` / `assessor`) passa a vir de **custom claims** do
  Firebase Auth (`role`), com fallback para a collection `*_usuarios` durante a
  transição. O `perfilUsuario` usado hoje pelo `CabecalhoInstitutional` continua
  existindo com o mesmo formato.
- **Backend**: middleware `verificarToken` aplicado a todas as rotas `/api`;
  ele chama `admin.auth().verifyIdToken(token)` e rejeita sem token com `401`.
- **Rotas públicas**: apenas `GET /api/gabinetes` pode ficar aberta se o usuário
  decidir permitir; por padrão, toda a API exige token.
- **Seed de usuários**: o bootstrap cria o primeiro usuário admin via script
  Node usando Admin SDK (`createUser` + `setCustomUserClaims`), com a senha vinda
  de variável de ambiente — nunca hardcoded.

## Mudanças por arquivo

| Arquivo | Mudança |
|---|---|
| `server.ts` | Adicionar `firebase-admin`; init com service account; funções `lerColecao`/`salvarDocumento`/`excluirDocumento` assíncronas; rotas viram `async`; middleware de token; manter `express.static(dist)` e o PORT |
| `src/services/api.ts` | `request()` passa a anexar `Authorization: Bearer <idToken>`; `API_URL` vira `import.meta.env.VITE_API_URL ?? '/api'` (same-origin por padrão) |
| `src/main.tsx` / `src/App.tsx` | Inicializar Firebase; `onAuthStateChanged`; `usuarioAtual`/passar a vir do usuário autenticado |
| `src/components/LoginView.tsx` | Formulário de login real |
| `vite.config.ts` | `base: './'` para compatibilidade com subpath (Pages); sem efeito na instância única |
| `index.html` | `<script src="./jspdf.umd.min.js">`; referências a `/logo.png` viram `${import.meta.env.BASE_URL}logo.png` nos componentes |
| `package.json` | Nova dep `firebase-admin`; script `deploy:seed` opcional |
| `.env.example` | Novas variáveis (ver abaixo) |
| `scripts/seed-firestore.ts` (novo) | Importa `data/db.json` e cria usuário admin |

## Configuração (variáveis de ambiente)

**Backend (secretos no PaaS):**
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
FIRESTORE_PREFIX=prod            # ou "test" na instância de homologação
FIREBASE_PROJECT_ID=gen-lang-client-0915661017
PORT=3001
```

**Front (público, prefixo VITE_; vai no build):**
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=gen-lang-client-0915661017.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gen-lang-client-0915661017
VITE_FIREBASE_APP_ID=1:979156919076:web:a3bf839a95e20f2ddbc9b1
VITE_API_URL=/api                # same-origin; preencher URL absoluta só se usar Pages
```

> A `apiKey` do Web SDK **não é segredo** (é identificador público); o segredo é a
> service account, que fica só no backend e nunca entra no bundle.

## Deploy na prática

1. **Firebase Console**: habilitar Firestore Database (já existe, database
   `ai-studio-sistemadeaminist-...`) e Authentication → provedor E-mail/Senha.
2. **Service account**: IAM → contas de serviço → criar chave JSON; guardar o
   conteúdo como secret `FIREBASE_SERVICE_ACCOUNT` no PaaS.
3. **Build/start no PaaS**: `npm ci && npm run build` / `npm run api`
   (`tsx server.ts`, já definido). Porta via `PORT`.
4. **Duas instâncias**: `gabinete-prod` com `FIRESTORE_PREFIX=prod` e
   `gabinete-test` com `FIRESTORE_PREFIX=test` — o "servidor de testes" pedido.
5. **Pages opcional**: GitHub Actions publica `dist/`; lembrar que sem API é
   vitrine. Só habilitar depois de decidir sobre `VITE_API_URL` + CORS.

## Estratégia de testes

- Não existe `npm test` hoje. A verificação disponível é `npm run lint`
  (`tsc --noEmit`), `npm run build` e os scripts Python de PDF em `.superpowers/sdd/`.
- Para homologação: apontar a instância `test` para `test_*` e rodar a bateria de
  PDFs lá; os dados de teste não misturam com produção.
- Firestore Emulator pode ser usado no CI local (sem custo) se quisermos testes
  automatizados de rotas no futuro — fora do escopo deste deploy.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Perda de dados com filesystem efêmero | Firestore substitui `db.json` — dado sobrevive a restart |
| Service account vazando | Só no secret do PaaS; `.gitignore` já ignora `.env*` |
| Qualquer visitante ler CPFs | Firebase Auth + verificação de token no backend |
| Produção e testes se misturarem | Prefixo `prod_`/`test_` por variável de ambiente |
| Build quebrar no subpath do Pages | `base: './'` + assets relativos (só se Pages for usado) |
| Rotas mudarem de formato e quebrarem as telas | Contrato `/api` idêntico; teste com as telas existentes |

## Obtenção da credencial (pendente do usuário)

O usuário escolheu "usar o projeto existente", mas ainda não forneceu a chave da
service account. Antes da implementação, preciso de uma destas:

- o JSON da service account (guardado como secret, nunca no código); **ou**
- autorização para que eu documente o passo a passo e o usuário gere a chave no
  console Firebase (IAM → Contas de serviço → Gerar nova chave).

Sem isso, consigo preparar código e configuração, mas não validar a conexão real
com o Firestore.
