# Edição de Gabinetes no Painel Administrativo — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir editar nome, tipo, responsável e situação (ativo) de um gabinete já cadastrado, direto no Painel Administrativo.

**Architecture:** Um endpoint `PUT /api/gabinetes/:id` no Express atualiza o registro no `data/db.json`; o cliente `api.ts` ganha `atualizarGabinete`; o `AdminView` transforma a linha da lista em um mini-formulário inline com Salvar/Cancelar.

**Tech Stack:** React 19 + TypeScript + Vite, Express 4, Tailwind CSS v4, lucide-react. Sem framework de testes no projeto — verificação por `tsc`, `curl` na API e teste E2E manual no navegador.

**Spec:** `docs/superpowers/specs/2026-11-17-editar-gabinetes-painel-admin-design.md`

## Global Constraints

- Não adicionar dependências.
- Tailwind v4; reaproveitar as classes já usadas no `AdminView` (ex.: `border-[#D9DEDB]`, `text-[#0E4D36]`, `bg-slate-50`).
- Mensagens de erro/confirm em PT-BR, no padrão do arquivo (`alert`, `window.confirm`).
- O projeto **não é um repositório git**: não há passo de commit; cada tarefa termina com verificação.
- Não alterar exclusão de gabinetes, usuários ou entidades vinculadas.
- `data/db.json` é a fonte persistida; a API escreve nele de forma síncrona.

## Review Focus

- Nome vazio ou só espaços ao salvar → deve ser bloqueado no cliente e recusado pela API (400), sem persistir.
- Gabinete removido em outra aba/sessão (id inexistente) → API responde 404 e a tela informa o erro sem quebrar.
- Cancelar a edição → nenhuma alteração deve persistir.
- Desmarcar "Ativo" → deve persistir `ativo: false` e continuar aparecendo na lista (o app não filtra ativos).
- Nome com acentos/símbolos → deve persistir e reexibir corretamente (JSON UTF-8).
- Abrir edição em outra linha → só uma linha em edição por vez; a anterior é descartada.

---

### Task 1: Endpoint de atualização de gabinete

**Files:**
- Modify: `server.ts:71-79` (inserir entre o `DELETE /api/gabinetes/:id` e o bloco `// ---------- Usuários ----------`)

**Interfaces:**
- Consumes: `banco` (array `gabinetes`), `salvarBanco(banco)` — já existentes.
- Produces: `PUT /api/gabinetes/:id` → `200` com o gabinete atualizado; `400 { erro }` se `nome` vier vazio; `404 { erro }` se o id não existir.

- [ ] **Step 1: Escrever a verificação que deve falhar primeiro (API ainda sem PUT)**

Com a API rodando (`npm run api`), execute:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X PUT http://localhost:3001/api/gabinetes/gab_0 \
  -H 'Content-Type: application/json' -d '{"nome":"Teste"}'
```

Esperado: `404` (rota inexistente no Express).

- [ ] **Step 2: Implementar a rota em `server.ts`**

```ts
app.put('/api/gabinetes/:id', (req, res) => {
  const { id } = req.params;
  const dados = req.body ?? {};
  const index = banco.gabinetes.findIndex((g) => g.id === id);
  if (index === -1) {
    return res.status(404).json({ erro: 'Gabinete não encontrado.' });
  }
  if (dados.nome !== undefined && !String(dados.nome).trim()) {
    return res.status(400).json({ erro: 'Nome do gabinete é obrigatório.' });
  }
  const permitidos = ['nome', 'tipo', 'vereadorResponsavel', 'ativo'];
  const atualizacoes: Record<string, unknown> = {};
  for (const chave of permitidos) {
    if (dados[chave] !== undefined) atualizacoes[chave] = dados[chave];
  }
  const atualizado = { ...banco.gabinetes[index], ...atualizacoes };
  banco.gabinetes[index] = atualizado;
  salvarBanco(banco);
  res.json(atualizado);
});
```

- [ ] **Step 3: Verificar os três casos**

```bash
# 1) atualização válida
curl -s -X PUT http://localhost:3001/api/gabinetes/gab_0 \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Gabinete Editado","tipo":"vereador","vereadorResponsavel":"Diego Martins","ativo":true}'

# 2) nome vazio -> 400
curl -s -o /dev/null -w "%{http_code}\n" -X PUT http://localhost:3001/api/gabinetes/gab_0 \
  -H 'Content-Type: application/json' -d '{"nome":"   "}'

# 3) id inexistente -> 404
curl -s -o /dev/null -w "%{http_code}\n" -X PUT http://localhost:3001/api/gabinetes/nao_existe \
  -H 'Content-Type: application/json' -d '{"nome":"X"}'
```

Esperado: (1) JSON com `nome: "Gabinete Editado"`; (2) `400`; (3) `404`. Confirme a persistência com `grep "Gabinete Editado" data/db.json`.

- [ ] **Step 4: Restaurar o nome original de `gab_0`** via outro `PUT` com o nome atual (`Gabinete do Vereador Diego Martins`).

---

### Task 2: Método `atualizarGabinete` no cliente da API

**Files:**
- Modify: `src/services/api.ts:22-27` (bloco `// Gabinetes`)

**Interfaces:**
- Consumes: `request<T>(caminho, init)` já existente no arquivo.
- Produces: `atualizarGabinete(id: string, dados: Partial<Omit<Gabinete, 'id'>>): Promise<Gabinete>`.

- [ ] **Step 1: Adicionar o método logo após `criarGabinete`**

```ts
atualizarGabinete: (id: string, dados: Partial<Omit<Gabinete, 'id'>>): Promise<Gabinete> =>
  request<Gabinete>(`/gabinetes/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Esperado: sem erros (o método ainda não é chamado).

---

### Task 3: Edição inline no `AdminView`

**Files:**
- Modify: `src/components/AdminView.tsx`

**Interfaces:**
- Consumes: `api.atualizarGabinete(id, dados)` (Task 2); props `gabinetes` e `onAtualizarGabinetes` já existentes.
- Produces: nenhuma exportação nova; comportamento de edição na lista.

- [ ] **Step 1: Adicionar o estado de edição**

Logo após `const [novoVereadorGab, setNovoVereadorGab] = useState('');`:

```tsx
// Edição inline de gabinete
const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
const [edicaoNome, setEdicaoNome] = useState('');
const [edicaoTipo, setEdicaoTipo] = useState<TipoGabinete>('vereador');
const [edicaoResponsavel, setEdicaoResponsavel] = useState('');
const [edicaoAtivo, setEdicaoAtivo] = useState(true);
```

- [ ] **Step 2: Adicionar os handlers, antes de `salvarUsuario`**

```tsx
const iniciarEdicao = (gab: Gabinete) => {
  setIdEmEdicao(gab.id);
  setEdicaoNome(gab.nome);
  setEdicaoTipo(gab.tipo);
  setEdicaoResponsavel(gab.vereadorResponsavel || '');
  setEdicaoAtivo(gab.ativo);
};

const cancelarEdicao = () => {
  setIdEmEdicao(null);
  setEdicaoNome('');
  setEdicaoResponsavel('');
};

const salvarEdicao = async (id: string) => {
  if (!edicaoNome.trim()) {
    alert('Nome do gabinete é obrigatório.');
    return;
  }
  try {
    await api.atualizarGabinete(id, {
      nome: edicaoNome.trim(),
      tipo: edicaoTipo,
      vereadorResponsavel: edicaoResponsavel.trim(),
      ativo: edicaoAtivo
    });
    setIdEmEdicao(null);
    await onAtualizarGabinetes();
  } catch (e) {
    console.error('Erro ao atualizar gabinete:', e);
    alert('Erro ao atualizar gabinete.');
  }
};
```

- [ ] **Step 3: Trocar o `map` da lista de gabinetes pelo modo leitura/edição**

Substituir o bloco `{gabinetes.map(gab => (...))}` (linhas ~185-199) por:

```tsx
{gabinetes.map(gab => (
  idEmEdicao === gab.id ? (
    <div key={gab.id} className="p-3 border border-[#0E4D36] rounded bg-slate-50 space-y-3 text-xs">
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-600 uppercase">Nome do Gabinete</label>
        <input
          type="text"
          value={edicaoNome}
          onChange={(e) => setEdicaoNome(e.target.value)}
          className="w-full h-9 px-2 border border-[#D9DEDB] rounded text-sm bg-white"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-600 uppercase">Tipo</label>
          <select
            value={edicaoTipo}
            onChange={(e) => setEdicaoTipo(e.target.value as TipoGabinete)}
            className="w-full h-9 px-2 border border-[#D9DEDB] rounded text-sm bg-white"
          >
            <option value="vereador">Vereador(a)</option>
            <option value="lideranca">Liderança</option>
            <option value="presidencia">Presidência</option>
            <option value="secretaria">Secretaria</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-600 uppercase">Responsável</label>
          <input
            type="text"
            value={edicaoResponsavel}
            onChange={(e) => setEdicaoResponsavel(e.target.value)}
            className="w-full h-9 px-2 border border-[#D9DEDB] rounded text-sm bg-white"
          />
        </div>
      </div>
      <label className="inline-flex items-center gap-2 font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={edicaoAtivo}
          onChange={(e) => setEdicaoAtivo(e.target.checked)}
          className="h-4 w-4 text-[#0E4D36] border-[#D9DEDB] rounded"
        />
        Ativo
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => salvarEdicao(gab.id)}
          className="inline-flex items-center gap-1 px-3 h-8 bg-[#0E4D36] text-white font-semibold rounded hover:bg-[#0b3d2b] transition-colors"
        >
          <Check className="w-3.5 h-3.5" /> Salvar
        </button>
        <button
          type="button"
          onClick={cancelarEdicao}
          className="inline-flex items-center gap-1 px-3 h-8 bg-white text-slate-700 border border-[#D9DEDB] font-semibold rounded hover:bg-slate-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Cancelar
        </button>
      </div>
    </div>
  ) : (
    <div key={gab.id} className="flex items-center justify-between p-3 border border-[#D9DEDB] rounded bg-white text-xs">
      <div>
        <span className="font-bold text-[#182528] block">{gab.nome}</span>
        <span className="text-slate-500 uppercase text-[10px]">
          {gab.tipo}{gab.ativo ? '' : ' · inativo'}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => iniciarEdicao(gab)}
          title="Editar gabinete"
          className="p-1.5 text-[#0E4D36] hover:bg-[#0E4D36]/10 rounded transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => excluirGabinete(gab.id)}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
))}
```

- [ ] **Step 4: Verificar tipos e build**

Run: `npx tsc --noEmit && npm run build`
Esperado: sem erros; build `✓ built`.

- [ ] **Step 5: Verificar no navegador (fluxo principal)**

Com `npm run api` e `npm run dev` rodando, em http://localhost:3000:
1. Entrar como Administrador → Painel Admin.
2. Clicar no lápis de um gabinete; alterar o nome para `Gabinete Teste Edição` e o responsável; Salvar.
3. Esperado: a linha volta ao modo leitura exibindo o novo nome; `curl http://localhost:3001/api/gabinetes` contém o novo nome.

- [ ] **Step 6: Verificar casos de borda**

1. Abrir edição, apagar todo o nome e Salvar → `alert('Nome do gabinete é obrigatório.')` e nada é persistido.
2. Abrir edição, alterar o nome, clicar Cancelar → nome antigo permanece.
3. Desmarcar "Ativo", Salvar → linha mostra `· inativo` e o JSON persistido tem `"ativo": false`.
4. Abrir edição em uma linha e depois no lápis de outra → apenas a segunda fica em edição.
5. Renomear com acentos (ex.: `Gabinete da Vereadora Ana Paula — Ação`) → persiste e reexibe corretamente.

---

### Task 4: Verificação final e restauração dos dados

**Files:**
- Nenhum arquivo alterado (apenas verificação).

**Interfaces:**
- Consumes: tudo das tarefas anteriores.
- Produces: confirmação de que o fluxo funciona ponta a ponta.

- [ ] **Step 1: Conferir que os dados de teste não ficaram no banco**

```bash
grep -n "Gabinete Teste Edição\|Ação" data/db.json
```

Se existirem, restaurar o nome/tipo/responsável originais via `PUT` (ou pela própria tela) e confirmar com `curl http://localhost:3001/api/gabinetes`.

- [ ] **Step 2: Rodar a verificação completa do projeto**

Run: `npx tsc --noEmit && npm run build`
Esperado: sem erros e build concluído.
