# Plano de Implementação — Login institucional com Google

**Design aprovado:** `docs/superpowers/specs/2026-11-18-google-login-design.md`
**Repositório:** `diegofmartins/sistema-de-administracao-de-gabinete` (privado, `main`)
**Projeto Firebase:** `admgabinete-46aaa` (Firestore `default`)

## Convenções de execução

- Abla **uma tarefa por vez**, na ordem abaixo. Cada tarefa termina com testes verdes
  e **um commit**. Não agrupe tarefas diferentes no mesmo commit.
- Antes de cada implementação, escreva/esconda o teste e **veja ele falhar** (TDD).
  Depois implemente o mínimo para passar.
- Comando da suíte completa (não existe `npm test`):

  ```bash
  node --import tsx --test tests/*.test.ts
  npm run lint
  npm run build
  ```

- Para rodar só um arquivo de teste:
  `node --import tsx --test tests/dominio.test.ts`.
- Não use `git add -A` sem conferir: `firebase-service-account.json`, `data/db.json`,
  `.env*` e `.superpowers/` são ignorados e **devem continuar fora do repositório**.
- Não tocar em `src/utils/pdfGenerator.ts`, nos PDFs, nas rotas `/api/*` existentes,
  em `.npmrc` nem em `.node-version`.

---

### Task 1: Helper do domínio institucional (base compartilhada)

**Arquivos:** `src/dominio.ts` (novo), `tests/dominio.test.ts` (novo).

**Por que primeiro:** front e back vão importar a mesma função. Uma única fonte de
verdade evita que a tela aceite `@cmc.pr.gov.br` e o servidor recuse (ou vice-versa).

### Teste (escrever first — deve falhar por arquivo inexistente)

`tests/dominio.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import { DOMINIO_INSTITUCIONAL, emailInstitucionalValido } from '../src/dominio';

test('domínio institucional é o da Câmara de Curitiba', () => {
  assert.equal(DOMINIO_INSTITUCIONAL, '@cmc.pr.gov.br');
});

test('emailInstitucionalValido: aceita e-mail institucional em qualquer caixa', () => {
  assert.equal(emailInstitucionalValido('diego.martins@cmc.pr.gov.br'), true);
  assert.equal(emailInstitucionalValido('  DIEGO.MARTINS@CMC.PR.GOV.BR  '), true);
});

test('emailInstitucionalValido: rejeita Gmail, vazio e domínios parecidos', () => {
  for (const email of [
    'pessoal@gmail.com',
    'outro@cmc.pr.gov.br.evil.com',
    '@cmc.pr.gov.br',
    'cmc.pr.gov.br',
    '',
    undefined,
    null,
  ]) {
    assert.equal(emailInstitucionalValido(email), false, String(email));
  }
});
```

### Implementação

`src/dominio.ts`:

```ts
/** Domínio dos e-mails institucionais da Câmara Municipal de Curitiba. */
export const DOMINIO_INSTITUCIONAL = '@cmc.pr.gov.br';

/**
 * True somente quando o e-mail termina em `@cmc.pr.gov.br` e tem algo antes do `@`.
 * O `@` no sufixo impede falsos positivos como `cmc.pr.gov.br.evil.com`.
 */
export function emailInstitucionalValido(email: string | null | undefined): boolean {
  if (typeof email !== 'string') return false;
  const normalizado = email.trim().toLowerCase();
  return (
    normalizado.endsWith(DOMINIO_INSTITUCIONAL) &&
    normalizado.length > DOMINIO_INSTITUCIONAL.length
  );
}
```

### Verificar

```bash
node --import tsx --test tests/dominio.test.ts
npm run lint
git add src/dominio.ts tests/dominio.test.ts && git commit -m "feat: helper de domínio institucional @cmc.pr.gov.br"
```

---

### Task 2: Bloqueio no backend (a defesa real)

**Arquivos:** `src/server/auth.ts` (editar), `src/server/app.ts` (editar),
`tests/auth-api.test.ts` (editar).

**Comportamento:** `verifyIdToken` passa a devolver `email`/`email_verified`.
`verificadorFirebase` lança `ErroAcessoRestrito` se o e-mail não for institucional
verificado. O middleware `/api` converte esse erro em **403**
`{ erro: 'Acesso restrito.' }`. Qualquer outro erro de token continua 401
`{ erro: 'Não autenticado.' }`.

> Decisão: a checagem fica dentro de `verificadorFirebase`, **não** no middleware
> genérico. Assim os testes com `verificadorTeste` (que não têm e-mail) seguem
> funcionando e o contrato do middleware continua simples: ele apenas traduz o
> erro tipado. Em produção, `server.ts` usa exclusivamente `verificadorFirebase`.

### Testes (escrever/adaptar first — devem falhar)

Em `tests/auth-api.test.ts`:

1. importar `ErroAcessoRestrito` ao lado de `verificadorFirebase`;
2. trocar o fake do último teste por um token com e-mail institucional:

```ts
const fakeAuth: AuthLike = {
  verifyIdToken: async () => ({
    uid: 'u1',
    role: 'admin',
    email: 'diego.martins@cmc.pr.gov.br',
    email_verified: true,
  }),
};
const usuario = await verificadorFirebase(fakeAuth)('qualquer-token');
assert.deepEqual(usuario, { uid: 'u1', papel: 'admin' });
```

3. adicionar dois testes:

```ts
await t.test('verificadorFirebase recusa e-mail pessoal', async () => {
  const fakeAuth: AuthLike = {
    verifyIdToken: async () => ({
      uid: 'u2', email: 'pessoal@gmail.com', email_verified: true,
    }),
  };
  await assert.rejects(verificadorFirebase(fakeAuth)('token'), ErroAcessoRestrito);
});

await t.test('verificadorFirebase recusa e-mail não verificado', async () => {
  const fakeAuth: AuthLike = {
    verifyIdToken: async () => ({
      uid: 'u3', email: 'diego.martins@cmc.pr.gov.br', email_verified: false,
    }),
  };
  await assert.rejects(verificadorFirebase(fakeAuth)('token'), ErroAcessoRestrito);
});

await t.test('API devolve 403 para token institucional recusado', async () => {
  const app403 = criarApp(repo, async () => { throw new ErroAcessoRestrito(); });
  const srv403 = app403.listen(0);
  await once(srv403, 'listening');
  try {
    const { port } = srv403.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/api/gabinetes`, {
      headers: { authorization: 'Bearer qualquer' },
    });
    assert.equal(res.status, 403);
    assert.deepEqual(await res.json(), { erro: 'Acesso restrito.' });
  } finally {
    await new Promise<void>((resolve, reject) =>
      srv403.close((err) => (err ? reject(err) : resolve())),
    );
  }
});
```

### Implementação

Em `src/server/auth.ts`:

- importar `emailInstitucionalValido` de `../dominio`;
- exportar `export class ErroAcessoRestrito extends Error {}` com
  `constructor() { super('Acesso restrito.'); this.name = 'ErroAcessoRestrito'; }`;
- ampliar o retorno de `AuthLike.verifyIdToken` para
  `Promise<{ uid: string; role?: string; papel?: string; email?: string; email_verified?: boolean }>`;
- em `verificadorFirebase`, **antes** de calcular o papel:

```ts
if (decoded.email_verified !== true || !emailInstitucionalValido(decoded.email)) {
  throw new ErroAcessoRestrito();
}
```

Em `src/server/app.ts`:

- importar `ErroAcessoRestrito` junto com `semAutenticacao`;
- no `catch` do middleware `/api` (linha ~45), trocar por:

```ts
} catch (erro) {
  if (erro instanceof ErroAcessoRestrito) {
    return res.status(403).json({ erro: 'Acesso restrito.' });
  }
  return res.status(401).json({ erro: 'Não autenticado.' });
}
```

### Verificar

```bash
node --import tsx --test tests/auth-api.test.ts
npm run lint
git add src/server/auth.ts src/server/app.ts tests/auth-api.test.ts && git commit -m "feat: restringe API ao dominio institucional com 403"
```

---

### Task 3: `entrarComGoogle()` no cliente Firebase

**Arquivos:** `src/services/firebase.ts` (editar), `tests/papeis.test.ts` (editar
somente se o lint reclamar — não deve).

**Escopo:** apenas a chamada do SDK. A decisão de aceitar/recusar o e-mail fica no
`App.tsx` (Tarefa 5), conforme o design.

### Teste (confiável sem navegador)

Não há teste de unidade para `signInWithPopup` (ele depende do DOM e de rede).
A prova é o **types check + build**: a função existe, usa o provedor com `hd` e
retorna o `UserCredential`. Não adicione mocks de `firebase/auth`.

### Implementação

Em `src/services/firebase.ts`:

- ampliar o import:
  `import { GoogleAuthProvider, getAuth, signInWithPopup, type Auth, type UserCredential } from 'firebase/auth';`
  (mantendo `getApps`, `initializeApp` de `firebase/app`);
- acrescentar ao final do arquivo:

```ts
/** Abre o popup do Google restringindo a escolha ao domínio institucional. */
export function entrarComGoogle(auth: Auth): Promise<UserCredential> {
  const provedor = new GoogleAuthProvider();
  provedor.setCustomParameters({ hd: 'cmc.pr.gov.br' });
  return signInWithPopup(auth, provedor);
}
```

> Use a string literal `'cmc.pr.gov.br'` no `hd` (o Google espera o domínio **sem**
> `@`). O helper `DOMINIO_INSTITUCIONAL` continua sendo a fonte de verdade para as
> checagens; se quiser evitar a duplicação, derive com
> `DOMINIO_INSTITUCIONAL.slice(1)` — nesse caso importe-o de `../dominio`.

### Verificar

```bash
npm run lint
npm run build
git add src/services/firebase.ts && git commit -m "feat: entrarComGoogle com filtro hd da CMC"
```

---

### Task 4: Tela de login mínima

**Arquivos:** `src/components/LoginView.tsx` (editar — substituir o conteúdo).

**Resultado visual exato:** cabeçalho e rodapé institucionais permanecem (a
identificação “Câmara Municipal de Curitiba” já estava no desenho aprovado); no
centro, somente o título **“Acesse com sua conta institucional”** e, abaixo, um
botão **“Entrar com Google”** com o logotipo do Google. Sem campo de e-mail, sem
campo de senha, sem texto de ajuda, sem mensagem de erro, sem texto “Entrando...”.
O estado `enviando` só desabilita o botão — nunca troca o rótulo.

### Implementação

Substitua o arquivo por (mantendo as classes visuais existentes):

```tsx
import React, { useState } from 'react';

interface LoginViewProps {
  onLogin: () => Promise<void>;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [enviando, setEnviando] = useState(false);

  const handleClick = async () => {
    if (enviando) return;
    setEnviando(true);
    try {
      await onLogin();
    } catch {
      // Tela sem mensagens: qualquer falha apenas mantém o usuário aqui.
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F3F1] flex flex-col justify-between font-sans">
      {/* Cabeçalho — copiar EXATAMENTE o bloco <header> do arquivo atual. */}

      <main className="max-w-md mx-auto px-4 py-16 w-full">
        <div className="bg-white border border-[#D9DEDB] rounded-xl p-8 shadow-sm space-y-8 text-center">
          <h2 className="text-xl font-bold text-[#182528]">
            Acesse com sua conta institucional
          </h2>

          <button
            type="button"
            onClick={handleClick}
            disabled={enviando}
            className="w-full h-12 bg-white border border-[#D9DEDB] text-[#182528] font-semibold rounded-lg hover:bg-[#F7F8F7] transition-all flex items-center justify-center gap-3 shadow-sm text-sm sm:text-base cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {/*Logotipo do Google em SVG inline — copiar o bloco abaixo.*/}
            <span>Entrar com Google</span>
          </button>
        </div>
      </main>

      {/* Rodapé — copiar EXATAMENTE o bloco <footer> do arquivo atual. */}
    </div>
  );
};
```

SVG do botão (colar onde indicado):

```tsx
<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
  <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z"/>
  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
</svg>
```

### Verificar

```bash
npm run lint
npm run build
git add src/components/LoginView.tsx && git commit -m "feat: tela de login so com botao Google"
```

> O `npm run lint` vai falhar neste momento porque `App.tsx` ainda passa
> `onLogin(email, senha)` e `erro`. Isso é esperado: a Tarefa 5 resolve. Se quiser
> commits sempre verdes, faça Tarefa 4 e 5 juntas em um único commit
> `feat: login institucional com Google (tela + App)`.

---

### Task 5: `App.tsx`: login, observer e checagem silenciosa

**Arquivos:** `src/App.tsx` (editar).

### Implementação

1. Imports:
   - remover `signInWithEmailAndPassword` de `firebase/auth`;
   - em `./services/firebase`, trocar `mapearPapel` por
     `{ entrarComGoogle, mapearPapel }`;
   - acrescentar `import { emailInstitucionalValido } from './dominio';`.
2. Remover por completo `const [erroLogin, setErroLogin] = ...` e todas as
   chamadas a `setErroLogin` (elas só existem em `onLogin`).
3. No `onAuthStateChanged` (linha ~85), **logo após** o `if (!user)`:

```ts
if (!emailInstitucionalValido(user.email)) {
  // Conta pessoal: encerra a sessão sem aviso, antes de buscar claims ou perfil.
  authSeqRef.current += 1;
  await signOut(getAuth());
  setUsuarioAtual(null);
  setPerfilUsuario(null);
  return;
}
```

4. Substituir `onLogin` inteiro (linhas ~130–154) por:

```ts
const onLogin = async (): Promise<void> => {
  if (!firebaseIniciado()) {
    console.warn('[Auth] Firebase não configurado; login indisponível.');
    return;
  }
  try {
    const credencial = await entrarComGoogle(getAuth());
    if (!emailInstitucionalValido(credencial.user.email)) {
      authSeqRef.current += 1;
      await signOut(getAuth());
      setUsuarioAtual(null);
      setPerfilUsuario(null);
    }
  } catch {
    // Sem mensagem na tela: popup cancelado ou falha de rede apenas retorna.
  }
};
```

5. Trocar a renderização (linha ~184) por:

```tsx
return <LoginView onLogin={onLogin} />;
```

6. Checar que não sobrou nenhuma referência a `erroLogin`, `senha` ou
   `signInWithEmailAndPassword` em `src/App.tsx` e `src/components/LoginView.tsx`.

### Verificar

```bash
grep -R -n "signInWithEmailAndPassword\|erroLogin\|SEED_ADMIN_SENHA" src || echo "ok"
node --import tsx --test tests/*.test.ts
npm run lint
npm run build
git add src/App.tsx && git commit -m "feat: App usa Google e descarta contas pessoais sem aviso"
```

---

### Task 6: Administrador por e-mail (sem senha)

**Arquivos:** `scripts/seed-firestore.ts` (editar), `tests/seed.test.ts` (editar),
`.env.example` (editar).

### Testes (escrever first — devem falhar)

Em `tests/seed.test.ts`:

- trocar o import para
  `import { concederAdmin, seed, type AdminAuthLike } from '../scripts/seed-firestore';`;
- remover `SENHA_SENTINELA`;
- substituir o teste `criarAdmin(...)` por:

```ts
test('concederAdmin: promove usuário existente com claim role=admin', async () => {
  const chamadas: Array<Record<string, unknown>> = [];
  const fakeAuth: AdminAuthLike = {
    async getUserByEmail(email) {
      chamadas.push({ metodo: 'getUserByEmail', email });
      return { uid: 'uid-admin' };
    },
    async setCustomUserClaims(uid, claims) {
      chamadas.push({ metodo: 'setCustomUserClaims', uid, claims });
    },
  };

  await concederAdmin(fakeAuth, 'diego.martins@cmc.pr.gov.br');

  assert.deepEqual(chamadas, [
    { metodo: 'getUserByEmail', email: 'diego.martins@cmc.pr.gov.br' },
    { metodo: 'setCustomUserClaims', uid: 'uid-admin', claims: { role: 'admin' } },
  ]);
});

test('concederAdmin: usuário ainda não entrou com Google gera instrução clara', async () => {
  const fakeAuth: AdminAuthLike = {
    async getUserByEmail() { throw new Error('auth/user-not-found'); },
    async setCustomUserClaims() { throw new Error('não deveria ser chamado'); },
  };
  await assert.rejects(
    concederAdmin(fakeAuth, 'diego.martins@cmc.pr.gov.br'),
    /Entre uma vez com o Google/,
  );
});

test('concederAdmin: recusa e-mail fora do domínio institucional', async () => {
  const fakeAuth: AdminAuthLike = {
    async getUserByEmail() { return { uid: 'x' }; },
    async setCustomUserClaims() {},
  };
  await assert.rejects(concederAdmin(fakeAuth, 'admin@gmail.com'), /@cmc\.pr\.gov\.br/);
});

test('código versionado não contém senha de administrador', () => {
  for (const termo of ['SEED_ADMIN_SENHA', 'createUser(']) {
    const grep = spawnSync('grep', ['-R', '-F', '-l', termo, 'src', 'scripts'], {
      cwd: RAIZ, encoding: 'utf8',
    });
    assert.equal(grep.status, 1, `${termo} vazou em src/ ou scripts/`);
  }
});
```

### Implementação

Em `scripts/seed-firestore.ts`:

- importar `emailInstitucionalValido` de `../src/dominio`;
- trocar `AdminAuthLike` por:

```ts
export interface AdminAuthLike {
  getUserByEmail(email: string): Promise<{ uid: string }>;
  setCustomUserClaims(uid: string, claims: Record<string, unknown>): Promise<void>;
}
```

- substituir `criarAdmin` por:

```ts
/** Concede claim `role: 'admin'` a um usuário que já entrou com o Google. */
export async function concederAdmin(
  auth: AdminAuthLike,
  email: string,
): Promise<void> {
  const normalizado = email?.trim().toLowerCase();
  if (!emailInstitucionalValido(normalizado)) {
    throw new Error('O administrador deve usar um e-mail @cmc.pr.gov.br.');
  }
  let usuario: { uid: string };
  try {
    usuario = await auth.getUserByEmail(normalizado);
  } catch {
    throw new Error(
      `Usuário ${normalizado} ainda não existe no Firebase Auth. ` +
        'Entre uma vez com o Google e execute o comando novamente.',
    );
  }
  await auth.setCustomUserClaims(usuario.uid, { role: 'admin' });
  console.log(`[seed] administrador concedido: ${normalizado}`);
}
```

- em `main()` (linhas ~105–112), remover `SEED_ADMIN_SENHA` e chamar
  `concederAdmin(auth, email)` quando `SEED_ADMIN_EMAIL` estiver definido;
  caso contrário, logar
  `'[seed] SEED_ADMIN_EMAIL ausente: administrador não concedido.'`.

Em `.env.example`:

- apagar `SEED_ADMIN_SENHA=""` e o comentário da senha (linhas 25–28);
- manter `SEED_ADMIN_EMAIL=""` com comentário:
  `# E-mail institucional a promover a admin (usuário já deve ter entrado uma vez).`

### Verificar

```bash
node --import tsx --test tests/seed.test.ts
node --import tsx --test tests/*.test.ts
npm run lint
git add scripts/seed-firestore.ts tests/seed.test.ts .env.example && git commit -m "feat: admin por e-mail institucional via Admin SDK"
```

---

### Task 7: Configuração do projeto novo e documentação

**Arquivos:** `.env.example` (editar), `docs/deploy.md` (editar),
`firebase-applet-config.json` (**não editar** — não é lido pela aplicação).

### Implementação — `.env.example`

Substituir os valores antigos:

```
FIREBASE_PROJECT_ID="admgabinete-46aaa"
VITE_FIREBASE_API_KEY="AIzaSyCNAwBguNmcNRsEHtgmPywRkW5dqYD32XE"
VITE_FIREBASE_AUTH_DOMAIN="admgabinete-46aaa.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="admgabinete-46aaa"
VITE_FIREBASE_APP_ID="1:332315734910:web:e08201de1d6c66d8aa792f"
```

### Implementação — `docs/deploy.md`

Reescrever as seções 2, 3, 5 e 6:

- **Seção 1:** trocar a referência a Node 22.23.4 por “Node fixado em `24.22.1`
  (`.node-version`); o aviso de `@firebase/storage-compat` não se aplica” e manter
  o parágrafo do `.npmrc` (`legacy-peer-deps=true`, não remover).
- **Seção 2 (Console):** banco `default` em `admgabinete-46aaa`; habilitar provedor
  **Google** (não E-mail/Senha); em *Authentication → Settings → Authorized
  domains* adicionar `localhost`, `admgabinete-46aaa.firebaseapp.com`,
  `gabinete-test.onrender.com` e `gabinete-prod.onrender.com`; conta de serviço →
  chave JSON → secret `FIREBASE_SERVICE_ACCOUNT`.
- **Seção 3:** valores novos acima, mantendo `FIRESTORE_PREFIX=prod` no prod e
  `test` na homologação. Aviso explícito: domínio `@cmc.pr.gov.br` é fixo no código
  (`src/dominio.ts`), não é variável de ambiente.
- **Seção 5:** manter as duas instâncias `gabinete-prod` / `gabinete-test`.
- **Seção 6:** ordem correta do seed:
  1. copiar o JSON de `Downloads` para `firebase-service-account.json` (ignorado);
  2. rodar o seed em `test` **sem** `SEED_ADMIN_EMAIL`;
  3. entrar uma vez no `gabinete-test` com `diego.martins@cmc.pr.gov.br`;
  4. rodar novamente só a concessão com `SEED_ADMIN_EMAIL=diego.martins@cmc.pr.gov.br`;
  5. repetir 2–4 com `FIRESTORE_PREFIX=prod`.
  Registrar que `getUserByEmail` falha se o usuário ainda não existe — por isso a
  ordem importa. repetir a concessão é seguro (apenas reescreve a claim).
- **Seção 8:** remover o texto "BLOQUEADO até ... gen-lang-client-0915661017" e
  registrar que a validação no Firestore real ainda depende do seed feito no
  computador do operador (dados sensíveis não versionados).

### Verificar

```bash
grep -R -n "gen-lang-client-0915661017\|E-mail/Senha\|SEED_ADMIN_SENHA" docs .env.example || echo "ok"
npm run lint && npm run build
git add .env.example docs/deploy.md && git commit -m "docs: deploy com projeto admgabinete-46aaa e login Google"
```

---

### Task 8: Verificação final e entrega

### Comandos (todos precisam passar)

```bash
cd "/home/Docs.Locais/sistema-de-aministração-de-gabinete"
npm ci --dry-run
node --import tsx --test tests/*.test.ts
npm run lint
npm run build
git status --short
git push origin main
```

**Critério:** 47 testes originais + novos (alvo ≈ 55) sem falhas; lint e build
limpos; nenhum arquivo sensível no `git status`; `Services` no Render continuam
com o mesmo comando de start (`npm run api`) e mesma porta (`$PORT`).

### Checklist para o operador (na hora da parametrização)

- [ ] Firebase: provedor **Google** ativado.
- [ ] Firebase: 4 domínios autorizados (localhost, firebaseapp.com, 2 onrender).
- [ ] JSON da conta de serviço copiado para `firebase-service-account.json`.
- [ ] Seed rodado em `test` e em `prod` (nesta ordem).
- [ ] Primeiro login com `diego.martins@cmc.pr.gov.br` em cada instância.
- [ ] Concessão de admin executada em `test` e em `prod`.
- [ ] Render: 2 Web Services, Build `npm ci && npm run build`, Start `npm run api`,
      `PORT` preenchido pelo Render, `FIRESTORE_PREFIX` = `test` / `prod`.
- [ ] Render: `FIREBASE_SERVICE_ACCOUNT` e as 4 `VITE_FIREBASE_*` preenchidas.

---

## Auto-revisão do plano (contra o design aprovado)

| Item do design | Onde o plano cobre |
|---|---|
| Tela só com título + botão Google, sem mensagens | Tarefa 4 e Tarefa 5 (catch silencioso, sem `erroLogin`) |
| Só `@cmc.pr.gov.br`, inclusive chamadas diretas à API | Tarefas 1 e 2 (403 no middleware) |
| Login por popup com `hd` | Tarefa 3 |
| Admin `diego.martins@cmc.pr.gov.br`, uma vez, via e-mail | Tarefa 6 e checklist da Tarefa 8 |
| Projeto `admgabinete-46aaa`, banco `default` | Tarefa 7 |
| Contrato `/api` e PDFs intactos | Tarefa 2 não cria rotas; convenção "não tocar" no topo |
| Service account fora do bundle e do Git | Tarefas 7/8 e convenção no topo |
| Domínio fixo no código, não configurável | Tarefa 1 (`DOMINIO_INSTITUCIONAL`) + texto do deploy |
| Testes/lint/build | Verificação ao final de cada tarefa + Tarefa 8 |

**Riscos apontados pela revisão:** (1) Tarefa 4 deixa o lint vermelho até a Tarefa 5 —
resolvido com a nota de agrupar os commits se quiser histórico sempre verde;
(2) `getUserByEmail` exige login prévio — resolvido com a ordem explícita do seed;
(3) `signInWithPopup` pode ser bloqueado por popup blocker — fora de escopo (decisão
aprovada foi popup, não redirect); (4) `instanceof ErroAcessoRestrito` é seguro aqui
porque o `tsconfig.json` usa `target: ES2022` e `module: ESNext` (um único módulo
ESM); (5) o teste “sem senha” usa `createUser(` e `SEED_ADMIN_SENHA`, que hoje só
existem em `scripts/seed-firestore.ts` e serão removidos na Tarefa 6 — conferido,
sem falso positivo em `src/`; (6) a Seção 1 do deploy também foi incluída na
Tarefa 7 para não deixar o guia com Node antigo.
