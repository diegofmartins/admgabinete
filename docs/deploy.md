# Deploy — Sistema de Administração de Gabinete (Firebase)

Guia operacional para publicar a API com Firestore + Firebase Auth e manter
produção (`prod_*`) e homologação (`test_*`) isoladas por namespace.

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
falha com `ERESOLVE`; não remova esse arquivo.

Durante a instalação apareceu o aviso:

```
npm warnEBADENGINE Unsupported engine {
  package: '@firebase/storage-compat@0.4.6',
  required: { node: '>=24.12' },
  current:  { node: 'v22.23.4' }
}
```

O aviso é do `@firebase/storage-compat` (dependência transitiva; o projeto não
usa Storage). A instalação e a suíte de testes/build foram concluídas com Node
22.23.4 sem efeitos observáveis. Em produção, prefira Node ≥24.12 para eliminar
o aviso, ou aceite-o com o Node atual.

## 2. Firebase Console

1. **Firestore Database**: habilitar/criar o banco (já existe o database
   `ai-studio-sistemadeaminist-...` no projeto `gen-lang-client-0915661017`).
2. **Authentication → Sign-in method**: habilitar o provedor **E-mail/Senha**.
3. **IAM & Admin → Contas de serviço**: criar conta de serviço com papel de
   acesso a Firestore e Auth, gerar chave JSON e guardar o conteúdo como secret
   `FIREBASE_SERVICE_ACCOUNT` no PaaS (uma linha, JSON completo).
   - Alternativa sem chave: rodar com ADC (`FIREBASE_PROJECT_ID` definido).
   - A chave da conta de serviço **nunca** entra no bundle do front nem no
     repositório; apenas as variáveis `VITE_FIREBASE_*` (públicas) vão no build.

## 3. Variáveis de ambiente

Backend (segredos no PaaS) — ver `.env.example`:

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
FIREBASE_PROJECT_ID=gen-lang-client-0915661017
FIRESTORE_PREFIX=prod
PORT=3001
```

Front (públicas, lidas por `import.meta.env` no build):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=gen-lang-client-0915661017.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gen-lang-client-0915661017
VITE_FIREBASE_APP_ID=1:979156919076:web:a3bf839a95e20f2ddbc9b1
VITE_API_URL=/api
```

`FIRESTORE_PREFIX` ausente ou vazio assume `prod` — nunca aponta para `test` por
acidente. No dev sem credenciais, `npm run api` continua subindo com
`data/db.json` e autenticação local.

## 4. Build e start no PaaS

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

## 6. Seed explícito

`data/db.json` **não é migrado automaticamente**. Para copiar as seis coleções
para o namespace desejado, rode o script com as credenciais no ambiente:

```bash
FIREBASE_SERVICE_ACCOUNT="$FIREBASE_SERVICE_ACCOUNT" \
FIRESTORE_PREFIX=test \
npx tsx scripts/seed-firestore.ts
```

Para criar também o administrador (claims `{ role: 'admin' }`), exporte
`SEED_ADMIN_EMAIL` e `SEED_ADMIN_SENHA` no ambiente antes do comando. A senha é
lida de `process.env` — nunca é literal no código versionado.

**Crie o administrador uma única vez por projeto Firebase.** `criarAdmin` usa
`createUser` puro (sem tratamento de `EMAIL_EXISTS`): repetir as variáveis
`SEED_ADMIN_*` numa segunda execução faz o comando falhar **depois** de os
documentos já terem sido gravados. Portanto, ao semear a segunda instância
(`FIRESTORE_PREFIX=prod`), **omita `SEED_ADMIN_EMAIL`/`SEED_ADMIN_SENHA`**: o
script detecta a ausência, registra o aviso e segue sem criar usuário.

Repita o comando acima com `FIRESTORE_PREFIX=prod` para popular a produção. O
seed é idempotente por id: documentos com o mesmo `id` são sobrescritos via
`set()`.

## 7. Espelho opcional no GitHub Pages

O build já usa `base: './'` e assets relativos, então `dist/` pode ser publicado
por GitHub Actions como vitrine. Sem a API na mesma origem, o espelho não salva
dados: para usá-lo de verdade é preciso definir `VITE_API_URL` com a URL absoluta
da API e liberar CORS. Só habilite depois dessa decisão.

## 8. Bloqueio externo

A validação final contra o **Firestore real** está **BLOQUEADA** até o usuário
fornecer a service account do projeto `gen-lang-client-0915661017`. Todo o código
e os testes desta entrega rodam com fakes; conferir os dados no console Firebase
fica pendente desse insumo.
