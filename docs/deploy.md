# Deploy — Sistema de Administração de Gabinete (Firebase + Google)

Guia operacional para publicar a API com Firestore + Firebase Auth (login com
conta Google institucional) e manter produção (`prod_*`) e homologação
(`test_*`) isoladas por namespace.

**Projeto Firebase:** `admgabinete-46aaa` · **Banco:** `default` ·
**Domínio permitido:** `@cmc.pr.gov.br` (fixo no código, em `src/dominio.ts`).

## 1. Registro da instalação de dependências

O `firebase-admin` foi adicionado com:

```bash
npm install firebase-admin --legacy-peer-deps
```

A flag `--legacy-peer-deps` foi necessária por um **conflito de peer preexistente
entre `esbuild` e `vite`** no projeto — sem ela o npm recusa o install. Para que
isso não dependa de ninguém lembrar da flag, o arquivo `.npmrc` na raiz fixa
`legacy-peer-deps=true`: **tanto `npm install` quanto `npm ci` funcionam em
máquina limpa** (inclusive no Render). Foi verificado que `npm ci` sem o `.npmrc`
falha com `ERESOLVE`; **não remova esse arquivo**.

O Node está fixado em **`24.22.1`** no arquivo `.node-version`. Com essa versão o
aviso antigo de `@firebase/storage-compat` (dependência transitiva; o projeto não
usa Storage) não se aplica.

## 2. Firebase Console (cliques no site)

1. Abra **https://console.firebase.google.com/** e entre no projeto
   **`admgabinete-46aaa`**.
2. **Build → Firestore Database**: o banco `default` já existe — não precisa criar
   outro. Confira se a regra de segurança não permite leitura pública.
3. **Build → Authentication → Sign-in method**: ative o provedor **Google**
   (não use E-mail/Senha — foi removido do sistema).
4. **Authentication → Settings → Authorized domains**: adicione estes domínios:
   - `localhost`
   - `admgabinete-46aaa.firebaseapp.com`
   - `gabinete-test.onrender.com`
   - `gabinete-prod.onrender.com`
   
   Sem isso, o botão Google falha ao abrir no endereço publicado.
5. **Project settings → Service accounts → Generate new private key**: baixa um
   `.json`. Guarde o conteúdo como secret `FIREBASE_SERVICE_ACCOUNT` no PaaS
   (uma linha, JSON completo).
   - Alternativa sem chave: rodar com ADC (`FIREBASE_PROJECT_ID` definido).
   - A chave da conta de serviço **nunca** entra no bundle do front nem no
     repositório; apenas as variáveis `VITE_FIREBASE_*` (públicas) vão no build.

## 3. Variáveis de ambiente

Backend (segredos no PaaS) — ver `.env.example`:

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
FIREBASE_PROJECT_ID=admgabinete-46aaa
FIRESTORE_PREFIX=prod
PORT=3001
```

Front (públicas, lidas por `import.meta.env` no build):

```
VITE_FIREBASE_API_KEY=AIzaSyCNAwBguNmcNRsEHtgmPywRkW5dqYD32XE
VITE_FIREBASE_AUTH_DOMAIN=admgabinete-46aaa.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=admgabinete-46aaa
VITE_FIREBASE_APP_ID=1:332315734910:web:e08201de1d6c66d8aa792f
VITE_API_URL=/api
```

`FIRESTORE_PREFIX` ausente ou vazio assume `prod` — nunca aponta para `test` por
acidente. No dev sem credenciais, `npm run api` continua subindo com
`data/db.json` e autenticação local.

> O domínio `@cmc.pr.gov.br` **não** é variável de ambiente: ele está fixo em
> `src/dominio.ts` e é usado pela tela, pelo cliente e pelo servidor. A API
> devolve `403 { erro: 'Acesso restrito.' }` para qualquer outro e-mail, mesmo
> em chamada direta.

## 4. Build e start no PaaS (Render)

| Campo no Render | Valor |
|---|---|
| Build Command | `npm ci && npm run build` |
| Start Command | `npm run api` |
| Node Version | `24.22.1` (via `.node-version`) |
| Health Check Path | `/api/gabinetes` (com token inválido devolve 401, mas responde) |

```bash
npm ci
npm run build      # vite build -> dist/
npm run api        # tsx server.ts, porta $PORT (padrão 3001)
```

## 5. Duas instâncias

| Instância | `FIRESTORE_PREFIX` | Coleções |
|---|---|---|
| `gabinete-prod` | `prod` | `prod_gabinetes`, `prod_usuarios`, ... |
| `gabinete-test` | `test` | `test_gabinetes`, `test_usuarios`, ... |

As duas usam o mesmo código e o mesmo projeto Firebase; o prefixo do adaptador
`repositorioFirestore` garante que os dados não se misturem. A instância `test`
é o "servidor de testes" pedido: aponte a bateria de PDFs/homologação para ela.

## 6. Seed e primeiro administrador (nesta ordem)

`data/db.json` **não é migrado automaticamente** e contém CPFs/e-mails/telefones —
por isso o seed roda **no seu computador**, nunca no Render. O arquivo está
ignorado pelo Git.

1. Copie o JSON baixado do Firebase (`Downloads`) para
   `firebase-service-account.json` na raiz do projeto (arquivo ignorado).
2. Popule a homologação, **sem** `SEED_ADMIN_EMAIL`:

   ```bash
   FIREBASE_SERVICE_ACCOUNT="$(cat firebase-service-account.json)" \
   FIRESTORE_PREFIX=test \
   npx tsx scripts/seed-firestore.ts
   ```

   > O script lê o JSON da variável de ambiente; o `$(cat ...)` acima é o que
   > transforma o arquivo no valor esperado.

3. Abra `gabinete-test.onrender.com` e **entre uma vez** com
   `diego.martins@cmc.pr.gov.br`. Isso cria o usuário no Firebase Auth.
4. Conceda a permissão de administrador:

   ```bash
   FIREBASE_SERVICE_ACCOUNT="$(cat firebase-service-account.json)" \
   FIRESTORE_PREFIX=test \
   SEED_ADMIN_EMAIL=diego.martins@cmc.pr.gov.br \
   npx tsx scripts/seed-firestore.ts
   ```

   O comando regrava os documentos (seguro: o seed é idempotente por `id`) e
   depois marca a claim `{ role: 'admin' }`. Repetê-lo apenas reescreve a claim.
   Se o usuário ainda não tiver entrado, o script falha com a instrução
   “Entre uma vez com o Google e execute o comando novamente” — por isso a ordem
   do passo 3 importa (`getUserByEmail` não encontra usuário inexistente).
5. Repita os passos 2–4 com `FIRESTORE_PREFIX=prod` para a produção.

## 7. Espelho opcional no GitHub Pages

O build já usa `base: './'` e assets relativos, então `dist/` pode ser publicado
por GitHub Actions como vitrine. Sem a API na mesma origem, o espelho não salva
dados: para usá-lo de verdade é preciso definir `VITE_API_URL` com a URL absoluta
da API e liberar CORS. Só habilite depois dessa decisão.

## 8. Estado da validação

Todo o código e a suíte de testes rodam com fakes do Firestore e do Auth. A
validação contra o **Firestore real** depende do seed executado no computador do
operador (seção 6) — os dados sensíveis de `data/db.json` e a chave da conta de
serviço não são versionados. Depois do seed, confira no console Firebase se as
coleções `test_*` e `prod_*` existem e se o usuário administrador tem a claim
`role: 'admin'`.
