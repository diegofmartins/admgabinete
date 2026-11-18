# Sistema de Administração de Gabinetes — Câmara Municipal de Curitiba

App interno (React 19 + TypeScript + Vite + Tailwind v4 + Express local + jsPDF) para gestão de gabinetes e geração de declarações de nomeação em comissão (Lei Municipal nº 16.546/2025, Súmula Vinculante nº 13 STF, LCM nº 86/2012, LGPD).

## Comandos

- `npm run lint` → `tsc --noEmit`
- `npm run build`
- `npm run api` → API Express na porta 3001 (`/api`)
- `npm run dev` → Vite na porta 3000 (proxy `/api` → 3001)

## Estado atual do banco (data/db.json)

- `gabinetes`: 3 registros reais (`gab_0`, `gab_38`, `gab_39`), todos ativos, nomeados conforme o padrão real do vereador.
- `usuarios`, `composicoes`, `admissoes`, `exoneracoes`: vazios.
- `declaracoes`: 1 registro de teste de E2E (João da Silva Nogueira) — residuo a limpar quando aplicável.

## Decisões técnicas recentes

- Edição inline de gabinete no Painel Administrativo (PUT + mini-form) — ver `docs/superpowers/plans/2026-11-17-editar-gabinetes-painel-admin.md`.
- Tema institucional em tons de verde/teal: base `#3E8A8E`, fill `#377F83`, ink `#35787B`, deep `#2A6164`, tint `#EAF3F3`; tokens em `src/index.css` (`@theme`) + `@source not` para evitar scan de docs/dist; accent-color para inputs.
- Retomada de declaração: `src/components/DeclaracaoView.tsx` + `src/utils/pdfGenerator.ts` com unidades declarativas.

## Pendências

- Ajustes finais do plano de edição de gabinetes (corrigidos: validação de tipos PUT, persistência atômica, fallback sem gabinetes fantasmas, labels do form, etc.).
