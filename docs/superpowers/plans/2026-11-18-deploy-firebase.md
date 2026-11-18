# Deploy com Firebase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar o sistema funcionando com persistência no Firestore do projeto existente, login via Firebase Auth e ambientes prod/teste isolados no mesmo projeto.

**Architecture:** Extrair a persistência de `server.ts` para um `Repositorio` com três adaptadores (memória para testes, JSON para dev local, Firestore para produção). Um `criarApp(repositorio, verificadorToken)` mantém o contrato `/api` idêntico e permite injetar a verificação de token. O front usa o Web SDK do Firebase para login e envia o ID token no header; o Express já serve o `dist/`, então uma única instância PaaS roda tudo. GitHub Pages fica opcional como espelho estático.

**Tech Stack:** TypeScript, Express, `firebase-admin` (novo), `firebase` Web SDK (já instalado), Vite, `tsx`, runner de testes `node --import tsx --test`.

**Spec:** `docs/superpowers/specs/2026-11-18-deploy-firebase-design.md`

## Global Constraints

- Contrato `/api` inalterado: mesmas rotas, filtros `?gabineteId=` e formatos de resposta.
- `API_URL` padrão continua `/api` (same-origin); só vira URL absoluta se Pages for usado de fato.
- Prefixo de coleção vem de `FIRESTORE_PREFIX`; **valor ausente assume `prod`** (nunca `test`).
- Service account **nunca** entra no bundle do front — apenas secret do backend.
- `UsuarioPerfil.papel` ∈ `'admin' | 'assessor' | 'vereador'` (`src/types.ts:11`).
- Sem `npm test` neste projeto. Runner: `node --import tsx --test tests/<arquivo>.test.ts`. `npm run lint` = `tsc --noEmit`.
- Projeto **não é repositório Git**; o ledger `.superpowers/sdd/2026-11-18-deploy-firebase/progress.md` substitui commits.
- Nenhuma alteração nos quatro geradores de PDF, na tipografia, nos vencimentos CC1–CC9 ou nas assinaturas.

## Review Focus

- **Sem credencial Firebase no dev local:** o servidor deve continuar subindo com `data/db.json`; um `FIREBASE_SERVICE_ACCOUNT` ausente não pode impedir `npm run api`. Teste na Task 2 (`app sobe com repositório JSON e verificador padrão`).
- **Prefixo vazio apontando para teste em produção:** `FIRESTORE_PREFIX` não definido deve gerar `prod_*`. Teste na Task 1 (`prefixo padrão`).
- **Mudança de contrato quebrando as telas:** todas as rotas, filtros e respostas devem permanecer iguais aos atuais. Teste na Task 2 (`teste de contrato das seis coleções`).
- **Requisição sem token em produção:** deve retornar `401` e não expor CPFs. Teste na Task 3 (`401 sem token`, `401 token inválido`, `200 token válido`).
- **ID perdido na ida para o Firestore:** as rotas `/api/.../:id` e o seed precisam preservar `id` como campo e como ID do documento. Testes na Task 1 (`salvar/buscar preservam id`) e Task 6 (`seed preserva ids`).

---

### Task 1: Camada de repositório (memória, JSON e Firestore)

**Files:**
- Create: `src/server/repository.ts`
- Create: `src/server/repositorio-json.ts`
- Create: `src/server/repositorio-firestore.ts`
- Create: `tests/helpers/firestore-fake.ts`
- Create: `tests/repositorio.test.ts`
- Modify: `package.json` (nova dep `firebase-admin`)

**Interfaces:**
- Consumes: estrutura atual de `data/db.json` (`gabinetes`, `usuarios`, `composicoes`, `admissoes`, `exoneracoes`, `declaracoes`) e `Banco` em `server.ts:11-18`.
- Produces:
  - `Repositorio` com `listar<T>(colecao): Promise<T[]>`, `buscar<T>(colecao, id): Promise<T | null>`, `salvar<T extends { id: string }>(colecao, documento): Promise<T>`, `excluir(colecao, id): Promise<boolean>`.
  - `Banco` — interface movida de `server.ts:11`, com as seis coleções.
  - `fakeFirestore(): FirestoreLike` em `tests/helpers/firestore-fake.ts` (reutilizada pela Task 6).
  - `repositorioMemoria(inicial?: Record<string, any[]>): Repositorio`
  - `repositorioJson(caminhoArquivo: string): Repositorio`
  - `repositorioFirestore(db: FirestoreLike, prefixo: string): Repositorio`
  - `FirestoreLike` — interface estrutural mínima com `collection(nome): { get(), doc(id): { get(), set(), delete() } }`; `admin.firestore()` a satisfaz e um fake a implementa nos testes.

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/helpers/firestore-fake.ts` exportando `fakeFirestore(): FirestoreLike` — Map<nomeColecao, Map<id, dados>>; `get()` devolve `{ docs: [{ id, data: () => dados }] }`; `doc(id).get()` devolve `{ exists, data }`. Crie `tests/repositorio.test.ts` com `node:test` usando esse helper. Escreva os casos:
  1. `repositorioMemoria`: `salvar('gabinetes', {id:'gab_x', nome:'X'})` → `buscar('gabinetes','gab_x')` devolve o objeto; `listar` devolve `[obj]`; `excluir` devolve `true` e `buscar` passa a devolver `null`.
  2. `repositorioFirestore(fake, '')`: `salvar('gabinetes', {id:'gab_x'})` grava na coleção `prod_gabinetes` (prefixo padrão quando o argumento é vazio) e `buscar` recupera o documento com `id` preservado.
  3. `repositorioFirestore(fake, 'test')`: `listar('declaracoes')` lê `test_declaracoes`, nunca `prod_declaracoes`.
  4. `repositorioJson`: apontando para um arquivo temporário, `salvar` + `listar` preservam os dados e os ids.

- [ ] **Step 2: Rodar o teste e confirmar o RED**

Run: `node --import tsx --test tests/repositorio.test.ts`
Expected: FAIL com `Cannot find module '../src/server/repository'`.

- [ ] **Step 3: Instalar `firebase-admin` e implementar os três adaptadores**

Run: `npm install firebase-admin`
Em `repository.ts`, declarar a interface `Repositorio` e `FirestoreLike` exatamente como na seção Interfaces. Em `repositorio-json.ts`, mover a lógica atual de `lerBanco`/`salvarBanco` (`server.ts:29-53`) para leitura/escrita atômicas com `.tmp` + `rename`. Em `repositorio-firestore.ts`, normalizar o prefixo com `const p = prefixo?.trim() || 'prod'` e compor o nome da coleção como `` `${p}_${colecao}` ``; `salvar` usa `doc(d id).set(documento)` (o `id` vai dentro do documento), `buscar` devolve `{ id, ...data }`.

- [ ] **Step 4: Rodar o teste e confirmar o GREEN**

Run: `node --import tsx --test tests/repositorio.test.ts`
Expected: PASS nos quatro casos.

- [ ] **Step 5: Registrar no ledger**

Escrever `.superpowers/sdd/2026-11-18-deploy-firebase/progress.md` com RED, GREEN e os quatro casos cobertos.

---

### Task 2: App Express extraível com contrato `/api` idêntico

**Files:**
- Create: `src/server/auth.ts`
- Create: `src/server/app.ts`
- Create: `tests/api-contrato.test.ts`
- Modify: `server.ts` (substituir as rotas inline pelo boot do `criarApp`)

**Interfaces:**
- Consumes: `Repositorio`, `Banco`, `repositorioJson`, `repositorioFirestore` da Task 1; `GABINETES_PADRAO` de `src/types`.
- Produces:
  - `UsuarioAutenticado { uid: string; papel?: 'admin' | 'assessor' | 'vereador' }`
  - `VerificadorToken = (token: string) => Promise<UsuarioAutenticado>`
  - `semAutenticacao: VerificadorToken` — devolve `{ uid: 'local' }`, usado no dev.
  - `criarApp(repositorio: Repositorio, verificadorToken?: VerificadorToken): Express` — padrão `semAutenticacao`.
  - `server.ts` escolhe: com `FIREBASE_SERVICE_ACCOUNT`/`FIREBASE_PROJECT_ID` presente usa `repositorioFirestore`, senão `repositorioJson(path.join(__dirname,'data','db.json'))`.

- [ ] **Step 1: Escrever o teste de contrato que falha**

Crie `tests/api-contrato.test.ts`. Suba `criarApp(repositorioMemoria(inicial))` em porta efêmera (`app.listen(0)`). Com `fetch`, verifique para **cada uma das seis coleções**:
  - `GET /api/<colecao>` devolve array; com `?gabineteId=gab_0` devolve só os registros daquele gabinete.
  - `POST /api/<colecao>` com payload válido retorna `201` e o objeto criado contendo `id` (`server.ts:77,147,178,207,236,265`).
  - `DELETE /api/<colecao>/<id>` retorna `{ ok: true }` e o registro desaparece do `GET`.
  - `PUT /api/gabinetes/<id>` retorna o gabinete atualizado (rota de update existente).
  - `GET /api/inexistente` continua caindo no fallback `index.html` do Express (mesmo comportamento atual).

- [ ] **Step 2: Rodar o teste e confirmar o RED**

Run: `node --import tsx --test tests/api-contrato.test.ts`
Expected: FAIL com `Cannot find module '../src/server/app'`.

- [ ] **Step 3: Implementar `auth.ts` e `app.ts`, reduzir `server.ts` ao boot**

Em `auth.ts`, declarar os três símbolos da seção Interfaces. Em `app.ts`, mover **todas** as rotas de `server.ts` trocando apenas as chamadas `banco.<colecao>` por `await repositorio.listar/buscar/salvar/excluir`; manter validações, mensagens de erro, geração de `id` (`'gab_'`, `'cmp_'`, etc.), `salvoEm` e o filtro `?gabineteId=` exatamente como estão. Dois detalhes obrigatórios apontados pela Task 1: (a) se a coleção `gabinetes` estiver vazia no boot, semear com `GABINETES_PADRAO` e ids `gab_0..gab_n`, preservando o antigo `bancoPadrao`; (b) em `usuarios`, a rota usa `uid` — grave `id: uid` no documento para atender `Repositorio.salvar<T extends {id:string}>`, sem mudar a resposta da API. Manter `express.json()`, `express.static(distDir)` e o `app.get('*', ...)` no fim. Em `server.ts`, substituir o conteúdo por: ler env, escolher repositório, `const app = criarApp(repositorio)`, `app.listen(PORT)`.

- [ ] **Step 4: Rodar o teste de contrato e confirmar o GREEN**

Run: `node --import tsx --test tests/api-contrato.test.ts`
Expected: PASS em todas as coleções.

- [ ] **Step 5: Verificar o dev local continua intacto**

Run: `npm run api` em background, `curl -s http://localhost:3001/api/gabinetes | head -c 200`, depois interrompa.
Expected: JSON com os gabinetes (o `data/db.json` continua sendo usado sem credencial).

---

### Task 3: Verificação de token do Firebase Auth no backend

**Files:**
- Modify: `src/server/auth.ts`
- Modify: `src/server/app.ts`
- Modify: `server.ts`
- Create: `tests/auth-api.test.ts`

**Interfaces:**
- Consumes: `criarApp`, `VerificadorToken`, `UsuarioAutenticado` da Task 2.
- Produces:
  - `verificadorFirebase(auth: AuthLike): VerificadorToken` — usa `auth.verifyIdToken(token)` e mapeia `token.papel`/claim `role` para `UsuarioAutenticado`.
  - `AuthLike` — interface estrutural `{ verifyIdToken(token: string): Promise<{ uid: string; role?: string; papel?: string }> }`.
  - Middleware em `criarApp`: TODO `/api/*` exceto `GET /api/gabinetes`? **Não** — todos os `/api/*` exigem token em produção; o dev continua com `semAutenticacao`.

- [ ] **Step 1: Escrever o teste que falha**

Em `tests/auth-api.test.ts`, com `repositorioMemoria()` e um verificador de teste que só aceita `'token-valido'`:
  1. `GET /api/gabinetes` sem header → `401` com `{ erro: 'Não autenticado.' }`.
  2. `GET /api/gabinetes` com `Authorization: Bearer token-invalido` → `401`.
  3. `GET /api/gabinetes` com `Bearer token-valido` → `200` e array.
  4. `verificadorFirebase(fakeAuth)` com `verifyIdToken` devolvendo `{uid:'u1', role:'admin'}` → `UsuarioAutenticado { uid:'u1', papel:'admin' }`.

- [ ] **Step 2: Rodar o teste e confirmar o RED**

Run: `node --import tsx --test tests/auth-api.test.ts`
Expected: FAIL — as requisições sem token retornam `200` (middleware ainda não existe).

- [ ] **Step 3: Implementar o middleware e o verificador**

Em `auth.ts`, implementar `verificadorFirebase` com o mapeamento `role`/`papel` → `papel` (valores válidos `'admin' | 'assessor' | 'vereador'`, senão `undefined`). Em `app.ts`, aplicar antes das rotas: ler `req.headers.authorization`, exigir prefixo `Bearer `, chamar `verificadorToken(token)`, responder `401` com `{ erro: 'Não autenticado.' }` em falta/erro e guardar o resultado em `req.usuario`. Em `server.ts`, passar `verificadorFirebase(admin.auth())` quando houver credencial; caso contrário manter `semAutenticacao`.

- [ ] **Step 4: Rodar o teste e confirmar o GREEN**

Run: `node --import tsx --test tests/auth-api.test.ts`
Expected: PASS nos quatro casos.

- [ ] **Step 5: Rodar o contrato novamente**

Run: `node --import tsx --test tests/api-contrato.test.ts`
Expected: PASS — o verificador padrão `semAutenticacao` preserva o contrato no dev.

---

### Task 4: Cliente HTTP com token + assets relativos para subpath

**Files:**
- Modify: `src/services/auth.ts` (novo) — provedor de token injetável
- Modify: `src/services/api.ts`
- Modify: `vite.config.ts`
- Modify: `index.html`
- Create: `tests/api-cliente.test.ts`

**Interfaces:**
- Consumes: nenhuma das tarefas anteriores (este é o lado do navegador).
- Produces:
  - `configurarTokenProvider(fn: () => Promise<string | null>): void` e `obterIdToken(): Promise<string | null>` em `src/services/auth.ts`.
  - `api` em `src/services/api.ts` continua com os mesmos métodos; `request()` passa a anexar `Authorization: Bearer <token>` quando houver token.

- [ ] **Step 1: Escrever o teste que falha**

Em `tests/api-cliente.test.ts`, substituir `globalThis.fetch` por um stub que captura `(url, init)`:
  1. Com `configurarTokenProvider(async () => 'abc')`, chamar `api.listarGabinetes()` → o `init.headers` deve conter `Authorization: 'Bearer abc'`.
  2. Com provedor devolvendo `null`, chamar `api.listarGabinetes()` → nenhum header `Authorization`.
  3. Com `fetch` devolvendo `{ ok:false, status:401 }` e `{ erro:'Não autenticado.' }`, `api.listarGabinetes()` deve rejeitar com essa mensagem (comportamento atual do `request`).

- [ ] **Step 2: Rodar o teste e confirmar o RED**

Run: `node --import tsx --test tests/api-cliente.test.ts`
Expected: FAIL — `configurarTokenProvider` não existe e o header não é enviado.

- [ ] **Step 3: Implementar o provedor e o header**

Crie `src/services/auth.ts` com uma variável de módulo `tokenProvider: () => Promise<string | null>` default `async () => null`, mais `configurarTokenProvider` e `obterIdToken`. Em `api.ts`, `const API_URL = import.meta.env?.VITE_API_URL ?? '/api'` (use `?.` para o módulo também rodar no Node) e monte os headers com `...(token ? { Authorization: \`Bearer ${token}\` } : {})`. Em `vite.config.ts`, adicione `base: './'`. Em `index.html`, troque `src="/jspdf.umd.min.js"` por `src="./jspdf.umd.min.js"`.

- [ ] **Step 4: Rodar o teste e confirmar o GREEN**

Run: `node --import tsx --test tests/api-cliente.test.ts`
Expected: PASS nos três casos.

- [ ] **Step 5: Ajustar as imagens da raiz**

Substituir cada `src="/logo.png"` nos componentes por `` src={`${import.meta.env.BASE_URL}logo.png`} ``. Localize com `grep -rn 'src="/logo.png"' src/`. Rodar `npm run build` e conferir que `dist/index.html` e os chunks não contêm caminhos absolutos `/assets/` nem `/logo.png`.

---

### Task 5: Login real com Firebase Auth no front

**Files:**
- Create: `src/services/firebase.ts`
- Modify: `src/components/LoginView.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Create: `tests/papeis.test.ts`

**Interfaces:**
- Consumes: `configurarTokenProvider` da Task 4; `UsuarioPerfil`/`PapelUsuario` de `src/types.ts`.
- Produces:
  - `iniciarFirebase(): Auth` — inicializa o app com as variáveis `VITE_FIREBASE_*`.
  - `obterTokenFirebase(): Promise<string | null>` — lê `getAuth().currentUser?.getIdToken()`.
  - `mapearPapel(role: string | undefined): PapelUsuario` — `admin`/`assessor`/`vereador`, fallback `'assessor'`.
  - `LoginView` troca a prop `onSelecionarPerfil` por `onLogin(email, senha): Promise<void>` e `erro?: string`.

- [ ] **Step 1: Escrever o teste que falha**

Em `tests/papeis.test.ts`: `mapearPapel('admin') === 'admin'`, `mapearPapel('vereador') === 'vereador'`, `mapearPapel('qualquer') === 'assessor'`, `mapearPapel(undefined) === 'assessor'`.

- [ ] **Step 2: Rodar o teste e confirmar o RED**

Run: `node --import tsx --test tests/papeis.test.ts`
Expected: FAIL com `Cannot find module '../src/services/firebase'`.

- [ ] **Step 3: Implementar Firebase, login e mapeamento**

Em `src/services/firebase.ts`, usar `initializeApp` + `getAuth` com `import.meta.env.VITE_FIREBASE_*`; exportar `iniciarFirebase` e `mapearPapel`. Em `LoginView.tsx`, trocar os botões de perfil por inputs e-mail/senha e botão "Entrar", chamando `onLogin`; manter o layout institucional. Em `App.tsx`, trocar `onSelecionarPerfil` por `onLogin` que chama `signInWithEmailAndPassword`; registrar `onAuthStateChanged` para preencher `usuarioAtual` com `{ uid, email, nome, papel: mapearPapel(claims?.role), gabineteId, criadoEm }`. Em `main.tsx`, chamar `iniciarFirebase()` e `configurarTokenProvider(obterTokenFirebase)`.

- [ ] **Step 4: Rodar o teste e confirmar o GREEN**

Run: `node --import tsx --test tests/papeis.test.ts`
Expected: PASS nos quatro casos.

- [ ] **Step 5: Verificação no navegador**

Com `npm run dev` e `npm run api` ativos, abrir `http://localhost:3000`. Sem credenciais reais, confirmar que a tela de login aparece com e-mail/senha e que o console não registra erro de inicialização do Firebase (o app pode ficar sem usuário autenticado — isso é esperado sem o projeto configurado). Rodar `npm run lint` e `npm run build`.
Expected: lint=0, build=0, console sem erros fatais.

---

### Task 6: Seed, variáveis de ambiente e verificação final

**Files:**
- Create: `scripts/seed-firestore.ts`
- Modify: `.env.example`
- Create: `tests/seed.test.ts`
- Create: `docs/deploy.md`

**Interfaces:**
- Consumes: `repositorioFirestore`, `FirestoreLike`, `Banco` da Task 1; `fakeFirestore()` de `tests/helpers/firestore-fake.ts`; `data/db.json`.
- Produces:
  - `seed(repositorio: Repositorio, bancoLocal: Banco, prefixo: string): Promise<{ escritos: number }>` — grava as seis coleções no repositório com o prefixo aplicado pelo adaptador.
  - `criarAdmin(auth: AuthLike, email: string, senha: string): Promise<void>` — usa `createUser` + `setCustomUserClaims({ role: 'admin' })`.

- [ ] **Step 1: Escrever o teste que falha**

Em `tests/seed.test.ts`, com `fakeFirestore()` importado de `tests/helpers/firestore-fake.ts`:
  1. `seed(repo, bancoLocal, 'test')` grava os 6 CPFs e 3 gabinetes do `data/db.json` e devolve `escritos === ...` (soma dos tamanhos das seis coleções).
  2. Nenhum documento aparece em coleções `prod_*` quando o prefixo é `test`.
  3. Os ids originais (`gab_0`, etc.) continuam presentes como campo `id` e como ID do documento.
  4. `criarAdmin(fakeAuth, 'admin@gabinete.test', 'senha-vinda-de-env')` chama `setCustomUserClaims` com `{ role: 'admin' }` e a senha não aparece em nenhum arquivo versionado (busque por `senha-vinda-de-env` em `src/` e `scripts/` via `grep`).

- [ ] **Step 2: Rodar o teste e confirmar o RED**

Run: `node --import tsx --test tests/seed.test.ts`
Expected: FAIL com `Cannot find module '../scripts/seed-firestore'`.

- [ ] **Step 3: Implementar o seed, o `.env.example` e o guia de deploy**

Implementar `seed` e `criarAdmin` conforme as assinaturas. Atualizar `.env.example` com todas as variáveis da spec (backend e `VITE_FIREBASE_*`), mantendo os comentários atuais de `GEMINI_API_KEY`/`APP_URL`. Escrever `docs/deploy.md` com: habilitar Auth e Firestore no console, gerar service account, configurar secrets no PaaS, build `npm ci && npm run build`, start `npm run api`, duas instâncias (`FIRESTORE_PREFIX=prod` e `test`), Pages opcional e o comando de seed.

- [ ] **Step 4: Rodar o teste e confirmar o GREEN**

Run: `node --import tsx --test tests/seed.test.ts`
Expected: PASS nos quatro casos.

- [ ] **Step 5: Suíte completa e registros**

Rode, em sequência, e anote os resultados no ledger:
```bash
node --import tsx --test tests/*.test.ts
npm run lint
npm run build
npm run api   # subir, curl /api/gabinetes, interromper
```
Expected: todos exit 0. Atualize `.superpowers/sdd/2026-11-18-deploy-firebase/progress.md` com o resultado consolidado e com o registro explícito de que a conexão real ao Firestore está **bloqueada** até o usuário fornecer a service account.

## Bloqueio externo (não resolvível pelo executor)

A validação contra o Firestore real depende da service account do projeto
`gen-lang-client-0915661017`, ainda não fornecida. O plano foi escrito para que
todo o código e os testes rodem com fakes; a etapa final de "conectar e conferir
dados no console Firebase" fica pendente desse insumo.
