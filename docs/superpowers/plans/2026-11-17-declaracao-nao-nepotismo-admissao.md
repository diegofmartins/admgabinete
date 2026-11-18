# Declaração de não nepotismo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inserir a declaração de não nepotismo no PDF de admissão e tornar obrigatório, na declaração do nomeado, o checkbox de que não há vínculo de parentesco até o terceiro grau.

**Architecture:** O PDF de admissão ganha um parágrafo dinâmico entre a caixa de dados e a data, usando os dados já passados a `gerarPdfAdmissao`. Na tela de declaração, o par de radios é substituído por um único checkbox com validação; o registro continua gravando `parentesco: 'nao'` e `parentes: []` para não mudar o contrato da API nem o PDF da declaração.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, jsPDF local (`public/jspdf.umd.min.js`), API Express com `data/db.json`.

**Spec:** `docs/superpowers/specs/2026-11-17-declaracao-nao-nepotismo-admissao-design.md`

## Global Constraints

- Texto exato do PDF de admissão: `Eu, Vereador(a) <Nome do Vereador>, declaro, para os devidos fins de direito e ciente das sanções legais cabíveis, que a indicação do(a) Sr.(a) <Nome do Indicado> para o cargo em comissão de <Nome do Cargo> obedece rigorosamente à Súmula Vinculante nº 13 do Supremo Tribunal Federal, não configurando nenhuma hipótese de vínculo de parentesco até o terceiro grau ou de nepotismo, direto ou cruzado.`
- `<Nome do Vereador>` = `gabineteSelecionado.vereadorResponsavel` (já enviado como `vereador`); `<Nome do Indicado>` = `nome`; `<Nome do Cargo>` = `cargo`.
- Frase do checkbox (integral): `NÃO POSSUO cônjuge, companheiro ou parente em linha reta, colateral ou por afinidade até o terceiro grau no âmbito da Câmara Municipal de Curitiba.`
- Mensagem de erro exata: `Você deve declarar que não possui vínculo de parentesco até o terceiro grau.` com id `err-declaracaoSemParentesco`.
- Registro/PDF continuam com `parentesco: 'nao'` e `parentes: []`; não alterar seções 3, 4 e 5, validação de CPF/cônjuge/dependentes, consentimentos, API, PDFs de composição/exoneração.
- Projeto não é git: substituir commits por appended lines em `.superpowers/sdd/2026-11-17-declaracao-nao-nepotismo-admissao/progress.md`.
- Verificação obrigatória: `npx tsc --noEmit` e `npm run build` exit 0; conferência do PDF via `pdftotext` e do comportamento no navegador.

## Review Focus

- **Quebra de linha do parágrafo longo no PDF:** deve permanecer entre `Admitir a partir de:` e `Curitiba, ...`, sem sobrepor a data — pinado na Task 1, Step 5.
- **Acentuação e `nº` no jsPDF (WinAnsi):** o texto extraído deve conter `Súmula Vinculante nº 13 do Supremo Tribunal Federal` exatamente — pinado na Task 1, Step 5.
- **Registro antigo com `parentesco: 'sim'` ao carregar:** o checkbox deve ficar desmarcado e exigir nova confirmação — pinado na Task 2, Step 6.
- **Salvar e Gerar PDF sem o checkbox:** devem ser bloqueados com a mensagem exata, sem gravar nem baixar arquivo — pinado na Task 2, Step 6.
- **Migração do exemplo da Maria:** os demais campos devem permanecer byte-a-byte iguais — pinado na Task 3, Step 4.

---

### Task 1: PDF de admissão — declaração de não nepotismo

**Files:**
- Modify: `src/utils/pdfGenerator.ts` (função `gerarPdfAdmissao`, após a caixa de dados e antes de `y += 20` / `Curitiba, ...`)

**Interfaces:**
- Consumes: `dados.vereador`, `dados.nome`, `dados.cargo` (já recebidos por `gerarPdfAdmissao`).
- Produces: nenhuma nova interface; apenas o conteúdo do PDF.

- [ ] **Step 1: RED — confirmar que o texto não existe**

Run: `cd /home/Docs.Locais/sistema-de-aministração-de-gabinete && sed -n '/export async function gerarPdfAdmissao/,/^}/p' src/utils/pdfGenerator.ts | grep -F 'Súmula Vinculante nº 13 do Supremo Tribunal Federal' || echo RED`
Expected: `RED`.

- [ ] **Step 2: registrar o RED no ledger**

Append a `.superpowers/sdd/2026-11-17-declaracao-nao-nepotismo-admissao/progress.md` (criar diretório se necessário): `Task 1 RED: texto de não nepotismo ausente no PDF de admissão.`

- [ ] **Step 3: inserir o parágrafo**

Na função `gerarPdfAdmissao`, imediatamente após o último campo da caixa (`Admitir a partir de:`), antes do `y += 20` da data:
- montar `const declaracao = \`Eu, Vereador(a) ${dados.vereador?.trim() || 'responsável pelo gabinete'}, declaro, para os devidos fins de direito e ciente das sanções legais cabíveis, que a indicação do(a) Sr.(a) ${dados.nome || '—'} para o cargo em comissão de ${dados.cargo || '—'} obedece rigorosamente à Súmula Vinculante nº 13 do Supremo Tribunal Federal, não configurando nenhuma hipótese de vínculo de parentesco até o terceiro grau ou de nepotismo, direto ou cruzado.\`;`
- avançar `y += 12`, usar `doc.setFont('helvetica', 'normal')`, `doc.setFontSize(9)`, `doc.splitTextToSize(declaracao, pageWidth - 30)`, `doc.text(linhas, 15, y)` e `y += linhas.length * 4.7 + 6` antes do `y += 20` existente.
- não alterar o texto da data nem o `doc.save(...)`.

- [ ] **Step 4: GREEN estático**

Run: `cd /home/Docs.Locais/sistema-de-aministração-de-gabinete && sed -n '/export async function gerarPdfAdmissao/,/^}/p' src/utils/pdfGenerator.ts | grep -F 'Súmula Vinculante nº 13 do Supremo Tribunal Federal' && npx tsc --noEmit && npm run build`
Expected: linha encontrada; exit 0.

- [ ] **Step 5: GREEN do PDF gerado**

No navegador (`http://localhost:3000`), login `Assessor / Vereador`, aba `Admissão`, preencher nome `Cristina Fonseca`, cargo `Chefe de Gabinete Parlamentar` (gabinete padrão `Gabinete do Vereador Diego Martins`) e clicar `Gerar PDF`. Baixar o arquivo via `browser.files.list`/`browser.files.get` e executar:

```bash
pdftotext -layout <caminho-do-pdf> - | tr '\n' ' ' | tr -s ' ' > /tmp/opencode-admissao-nepotismo.txt
python3 - <<'PY'
t = open('/tmp/opencode-admissao-nepotismo.txt', encoding='utf-8').read()
esperado = [
  'Eu, Vereador(a) Diego Martins, declaro, para os devidos fins de direito e ciente das sanções legais cabíveis,',
  'que a indicação do(a) Sr.(a) Cristina Fonseca para o cargo em comissão de Chefe de Gabinete Parlamentar',
  'obedece rigorosamente à Súmula Vinculante nº 13 do Supremo Tribunal Federal, não configurando nenhuma',
  'hipótese de vínculo de parentesco até o terceiro grau ou de nepotismo, direto ou cruzado.',
]
i_caixa = t.index('Admitir a partir de:')
i_texto = t.index('Eu, Vereador(a) Diego Martins')
i_data = t.index('Curitiba,')
assert all(s in t for s in esperado), 'texto incompleto'
assert i_caixa < i_texto < i_data, 'ordem errada'
print('PASS')
PY
```

Expected: `PASS`.

- [ ] **Step 6: ledger**

Append: `Task 1 complete — parágrafo de não nepotismo inserido e validado via pdftotext; ordem caixa → texto → data confirmada.`

---

### Task 2: Declaração do nomeado — checkbox obrigatório

**Files:**
- Modify: `src/components/DeclaracaoView.tsx`
  - estado `parentesco` (linha ~63), `parentes` (linha ~64), `carregarItem` (~304), `validar` (~366), payloads de salvar (~239) e PDF (~422), `adicionarParente` (~462), `removerParente` (~469), `renderListaParentes` (~506), UI da seção 2 (~919-947).

**Interfaces:**
- Consumes: `msg.texto` para exibir o erro; `confirmar()` do `ConfirmDialog` (continua usado pelas outras exclusões).
- Produces: novo estado local `declaracaoSemParentesco: boolean` (padrão `false`); payloads de `api.salvarDeclaracao` e `gerarPdfDeclaracao` com `parentesco: 'nao'`, `parentes: []`.

- [ ] **Step 1: RED — confirmar estado atual**

Run: `cd /home/Docs.Locais/sistema-de-aministração-de-gabinete && grep -c 'POSSUO vínculo de parentesco.\|+ Adicionar vínculo' src/components/DeclaracaoView.tsx && (grep -c 'declaracaoSemParentesco' src/components/DeclaracaoView.tsx || true)`
Expected: `2` e `0`.

- [ ] **Step 2: estado e carregamento**

Adicionar `const [declaracaoSemParentesco, setDeclaracaoSemParentesco] = useState(false);` ao lado dos demais estados de declaração. Em `carregarItem`, substituir `setParentesco(item.parentesco || 'nao')` / `setParentes(item.parentes || [])` por `setDeclaracaoSemParentesco(item.parentesco === 'nao')`. Em `limparForm`, adicionar `setDeclaracaoSemParentesco(false)`.

- [ ] **Step 3: remover lista e botão**

Remover inteiramente: o estado `parentes`, `adicionarParente`, `removerParente`, `renderListaParentes`, o radio `POSSUO vínculo de parentesco.` e o bloco `{parentesco === 'sim' && (...)}`; remover `VinculoParentesco` do import de `../types` (o campo `parentesco` de `filiacao` **deve permanecer** — é o grau em relação ao declarante). Nos dois payloads de nível superior (salvar e PDF), trocar `parentesco,` por `parentesco: 'nao',` e `parentes,` por `parentes: [],`. Conferir com `grep -n 'setParentes\|renderListaParentes\|adicionarParente\|removerParente' src/components/DeclaracaoView.tsx`: nenhuma ocorrência.

- [ ] **Step 4: checkbox e erro**

Substituir o radio `NÃO POSSUO...` por um `input type="checkbox" checked={declaracaoSemParentesco} onChange={(e) => setDeclaracaoSemParentesco(e.target.checked)}`, mantendo o `<span>` com a frase integral e as classes do label do item 4. O parágrafo explicativo (`Declaro, para fins de nomeação...`) deve ficar visível sempre. Logo abaixo do label, adicionar:

```tsx
<div id="err-declaracaoSemParentesco" className="text-[11px] text-red-600 font-semibold">{msg.texto && !declaracaoSemParentesco ? 'Você deve declarar que não possui vínculo de parentesco até o terceiro grau.' : ''}</div>
```

- [ ] **Step 5: validação**

Em `validar`, substituir as duas linhas `if (!parentesco)... else if (parentesco === 'sim'...)` por `if (!declaracaoSemParentesco) falhar('Você deve declarar que não possui vínculo de parentesco até o terceiro grau.');`, mantendo a posição antes da validação de `atividade`.

- [ ] **Step 6: GREEN no navegador**

Recarregar a aplicação, login `Assessor / Vereador`, abrir `Declaração Nomeado`. Verificar por `document.body.textContent`: ausência de `POSSUO vínculo de parentesco.` e de `+ Adicionar vínculo`; presença da frase integral e de `input[type=checkbox]` dentro da seção 2. Com os demais campos obrigatórios preenchidos, clicar `Salvar Declaração` com o checkbox desmarcado: deve aparecer a mensagem exata, `#err-declaracaoSemParentesco` preenchido e nenhuma requisição POST (`api/declaracoes`) nova. Marcar o checkbox e clicar `Salvar Declaração`: deve salvar. Repetir o bloqueio com `Gerar PDF` desmarcado. Para o caso de registro antigo com `'sim'`, criar via API um registro temporário com `parentesco: 'sim'`, carregá-lo para edição e confirmar que o checkbox fica desmarcado; excluir o temporário depois.

- [ ] **Step 7: ledger**

Append: `Task 2 complete — radios/lista/botão removidos; checkbox obrigatório validado; payloads mantêm parentesco: 'nao' e parentes: [].`

---

### Task 3: Migrar o exemplo da Maria

**Files:**
- Modify: `data/db.json` (registro `dec_mwks7jtd3givx6`)
- Backup: `/tmp/opencode/backup-db-nepotismo-20261117/db.json`

**Interfaces:**
- Consumes: registro atual com `parentesco: 'sim'` e 1 vínculo.
- Produces: mesmo registro com `parentesco: 'nao'`, `parentes: []`, id e demais campos inalterados.

- [ ] **Step 1: RED e snapshot**

Run:

```bash
cd /home/Docs.Locais/sistema-de-aministração-de-gabinete
python3 - <<'PY'
import json
d = json.load(open('data/db.json'))
r = next(x for x in d['declaracoes'] if x['id'] == 'dec_mwks7jtd3givx6')
print('RED' if r.get('parentesco') == 'sim' and len(r.get('parentes') or []) == 1 else 'JÁ MIGRADO')
json.dump(r, open('/tmp/opencode-maria-antes.json','w'), ensure_ascii=False, sort_keys=True)
PY
```

Expected: `RED`.

- [ ] **Step 2: backup, edição e restart da API**

Fazer backup de `data/db.json` para `/tmp/opencode/backup-db-nepotismo-20261117/db.json`. Parar o processo da API (`npm run api`), editar `data/db.json` com Python alterando **apenas** `parentesco` para `'nao'` e `parentes` para `[]` no registro `dec_mwks7jtd3givx6`, reiniciar `npm run api` (a API carrega o banco no boot). Não usar a UI para salvar: o endpoint de declarações é POST e criaria um novo id.

- [ ] **Step 3: GREEN pela API**

Run: `curl -s http://localhost:3001/api/declaracoes | python3 -c "import json,sys; r=next(x for x in json.load(sys.stdin) if x['id']=='dec_mwks7jtd3givx6'); print(r['parentesco'], len(r.get('parentes') or []))"`
Expected: `nao 0`.

- [ ] **Step 4: comparar os demais campos**

Run:

```bash
cd /home/Docs.Locais/sistema-de-aministração-de-gabinete
python3 - <<'PY'
import json, urllib.request
antes = json.load(open('/tmp/opencode-maria-antes.json'))
depois = next(x for x in json.load(urllib.request.urlopen('http://localhost:3001/api/declaracoes')) if x['id'] == 'dec_mwks7jtd3givx6')
for campo in ('parentesco', 'parentes'):
    antes.pop(campo, None); depois.pop(campo, None)
assert antes == depois, 'outros campos foram alterados'
print('PASS')
PY
```

Expected: `PASS`.

- [ ] **Step 5: ledger**

Append: `Task 3 complete — exemplo da Maria migrado via edição do db.json + restart da API; demais campos preservados.`

---

### Task 4: Verificação final e revisão

**Files:**
- Modify: `.superpowers/sdd/2026-11-17-declaracao-nao-nepotismo-admissao/progress.md`

- [ ] **Step 1: verificações estáticas**

Run: `cd /home/Docs.Locais/sistema-de-aministração-de-gabinete && npx tsc --noEmit && npm run build && (grep -rn 'POSSUO vínculo de parentesco.\|+ Adicionar vínculo' src || echo 'sem opção de possuir vínculo')`
Expected: exit 0 e `sem opção de possuir vínculo`.

- [ ] **Step 2: conferir a declaração no PDF da declaração salva**

Abrir a declaração da Maria na tela, gerar PDF e conferir via `pdftotext` que ainda imprime `Possui parentesco: NÃO` e o parágrafo da Súmula Vinculante nº 13 (compatibilidade com o contrato atual).

- [ ] **Step 3: revisão final**

Disparar subagente `code-reviewer` com o escopo das 3 tarefas, pedindo apenas achados acionáveis com severidade; corrigir Minor baratos se houver e nenhum Critical/Important.

- [ ] **Step 4: ledger final**

Append: resumo com TSC/BUILD/PDF/E2E/revisão e a decisão de manter `parentesco: 'nao'` no registro por compatibilidade.
