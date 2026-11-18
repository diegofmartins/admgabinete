# Design — Login institucional com Google (admgabinete-46aaa)

## Intenção e motivo

A Câmara Municipal de Curitiba usa Google Workspace e todos os servidores já têm
e-mail institucional `@cmc.pr.gov.br`. O login atual pede e-mail e senha criados
pelo sistema; isso obriga a distribuir senhas e a controlar usuários manualmente.
Trocar por **Login com Google** elimina esse trabalho e permite restringir o acesso
ao domínio institucional.

## Objetivos

- Tela inicial mínima: o título **“Acesse com sua conta institucional”** e, abaixo,
  um botão **“Entrar com Google”**. Sem textos explicativos, sem mensagens de erro,
  sem campo de senha.
- Só contas `@cmc.pr.gov.br` entram. O bloqueio vale também para chamadas diretas à
  API, porque o sistema contém CPFs, e-mails e telefones.
- Usuário administrador: `diego.martins@cmc.pr.gov.br`, marcado uma única vez.
- Projeto Firebase: **`admgabinete-46aaa`** (banco Firestore `default`).
- Manter o contrato `/api` (mesmas rotas e formatos de resposta) e os quatro PDFs
  intactos — conteúdo, tipografia, salários e assinaturas.

## Não-objetivos

- Login por e-mail/senha (removido).
- Novas rotas na API.
- RBAC por papel no backend (fora do plano anterior; mantido o papel
  `admin`/`assessor`/`vereador` via custom claims).
- Mudanças em PDFs ou na arquitetura de persistência.

## Restrições

- Runner de testes: `node --import tsx --test tests/*.test.ts` (não existe `npm test`).
  Lint: `npm run lint` (`tsc --noEmit`). Build: `npm run build`.
- Node fixado em `24.22.1` (`.node-version`); `.npmrc` mantém `legacy-peer-deps=true`.
- O JSON da conta de serviço fica em `Downloads` e deve ser copiado para
  `firebase-service-account.json` (ignorado pelo Git). **Nunca versionar.**
- O repositório GitHub agora existe (`diegofmartins/sistema-de-administracao-de-gabinete`,
  privado, branch `main`); este documento deve ser enviado junto.
- Configuração do projeto novo:
  - `projectId`: `admgabinete-46aaa`
  - `authDomain`: `admgabinete-46aaa.firebaseapp.com`
  - `apiKey`: `AIzaSyCNAwBguNmcNRsEHtgmPywRkW5dqYD32XE`
  - `appId`: `1:332315734910:web:e08201de1d6c66d8aa792f`

## Abordagens consideradas

| Abordagem | Descrição | Desfecho |
|---|---|---|
| **A — bloqueio no servidor + admin por e-mail** | O provedor Google filtra contas pelo domínio (`hd`), o backend reconfere o e-mail do token e o admin é marcado uma vez via Admin SDK. | **Escolhida.** Segura mesmo contra chamadas diretas à API; não altera rotas. |
| B — bloqueio só no botão | Usar apenas `hd` no cliente. | Rejeitada: qualquer pessoa poderia chamar a API com conta pessoal e ver CPFs. |
| C — lista de e-mails no Render | Definir e-mails permitidos/administradores por variáveis de ambiente. | Rejeitada: exigiria nova rota de perfil e espalharia a regra em dois lugares. |

## Como será feito

1. **Configuração**: constante única `DOMINIO_INSTITUCIONAL = '@cmc.pr.gov.br'`
   (sem opção de troca) e valores novos do Firebase em `.env.example` e
   `docs/deploy.md`. `firebase-applet-config.json` não é lido pela aplicação e fica
   como está.
2. **`src/services/firebase.ts`**: função `entrarComGoogle()` com
   `signInWithPopup` + `GoogleAuthProvider` e `setCustomParameters({ hd: 'cmc.pr.gov.br' })`.
   Mantêm-se `iniciarFirebase(): Auth | null`, `obterTokenFirebase()` e `mapearPapel`.
3. **`src/components/LoginView.tsx`**: props `onLogin: () => Promise<void>`; tela com
   apenas o título e o botão Google. Nenhuma mensagem em condição normal; falhas
   apenas mantêm o usuário na tela.
4. **`src/App.tsx`**: `onLogin` chama `entrarComGoogle()`; se o e-mail não terminar em
   `@cmc.pr.gov.br`, encerra a sessão silenciosamente e não entra. O observer
   `onAuthStateChanged` repete a checagem (defesa em profundidade). Papel continua
   vindo de `claims.role`.
5. **`src/server/app.ts`**: no middleware `/api`, após `verifyIdToken`, exigir
   `email_verified === true` e e-mail terminado em `@cmc.pr.gov.br`; caso contrário,
   `403 { erro: 'Acesso restrito.' }`. Sem novas rotas.
6. **`scripts/seed-firestore.ts`**: substituir `criarAdmin(email, senha)` por
   `concederAdmin(email)` — `getUserByEmail` + `setCustomUserClaims({ role: 'admin' })`.
   Sem senha. Se o usuário ainda não existir no Auth, o script falha com instrução
   clara: entrar uma vez com o Google antes de promover. CLI usa apenas
   `SEED_ADMIN_EMAIL = diego.martins@cmc.pr.gov.br`.
7. **Firebase Console (operador)**: ativar provedor Google; adicionar em
   Authentication → Settings → Authorized domains os domínios `localhost`,
   `admgabinete-46aaa.firebaseapp.com` e os domínios `*.onrender.com` das duas
   instâncias.
8. **Seed e deploy**: copiar o JSON da conta de serviço; rodar o seed em `test` e
   `prod`; fazer o primeiro login com `diego.martins@cmc.pr.gov.br`; rodar a concessão
   de admin; criar os dois Web Services no Render com `FIRESTORE_PREFIX=test` e
   `prod`.

## Testes previstos

- Helper puro de domínio: aceita `...@cmc.pr.gov.br`, rejeita Gmail e domínios
  parecidos (ex.: `cmc.pr.gov.br.evil.com`); comparação por sufixo com `@`.
- Middleware da API: token com e-mail institucional passa; token com e-mail pessoal
  recebe 403 sem expor detalhes.
- Seed: `concederAdmin` chama `getUserByEmail` e `setCustomUserClaims` com a claim
  correta; usuário inexistente gera erro claro; nenhuma senha aparece em `src/` ou
  `scripts/`.
- Suíte completa, lint e build ao final.

## Decisões do controlador

- Tela sem mensagens adicionais, inclusive para e-mail fora do domínio.
- Domínio fixo no código (uma única fonte de verdade), não configurável no Render.
- Popup do Google (não redirect) — adequado ao uso em desktop na Câmara.
- A definição de admin continua sendo uma ação única e explícita, não automática.

## Pendências para o operador

- Ativar o provedor Google e autorizar os domínios no console Firebase.
- Informar os nomes das duas instâncias no Render para a lista de domínios
  autorizados (ou usar os nomes padrão `gabinete-test` / `gabinete-prod`).
