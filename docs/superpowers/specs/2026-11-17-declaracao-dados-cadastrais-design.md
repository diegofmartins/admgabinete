# Design — Declaração do Servidor Nomeado com Dados Cadastrais (Formulário 2)

**Data:** 2026-11-17
**Status:** aprovado pelo solicitante (2026-11-17)

## Intent

Transformar a tela **"Declaração do Servidor Nomeado"** em um formulário unificado que reúne, em um único registro e PDF, a **declaração legal** (itens atuais) e os **dados cadastrais** do documento em anexo — o formulário "Formulário 2 – Dados Cadastrais para Nomeação em Cargo em Comissão".

## Goals

- Preencher os campos cadastrais do anexo (endereço, documentos, filiação/dependentes, dados bancários etc.) **sem duplicar** nome/CPF/e-mail/celular já existentes no item 1 da identificação.
- Incluir o novo consentimento (disponibilização de contato pessoal para campanhas internas e participação em grupos internos de WhatsApp) junto aos consensos já existentes.
- Impedir geração de PDF (e salvamento) sem os consensos obrigatórios.

## Non-Goals

- Definir a obrigatoriedade individual de cada campo cadastrais (aberto).

## Anti-Goals

- Renumerar os itens declarativos (itens 2–6 da declaração) — mudam-se semanticamente, não numericamente.
- Alterar os textos das declarações legais.

## Constraints

- Um único registro (`declaracoes`) e um único gerador de PDF compartilham o payload.
- jsPDF, React state, validação local existente.

## Approaches

- **A — Expandir o item 1** em subgrupos (1.1 Identificação; 1.2 Endereço; 1.3 Documentos; 1.4 Filiação e dependentes; 1.5 Dados bancários), mantendo a numeração declarativa intacta. **Escolhida** pelo solicitante.
- B — Abas "Dados Cadastrais / Declarações". Descartada.
- C — Bloco "7. Dados Cadastrais" ao final. Descartada.

## How decided (decisões do solicitante)

- Consentimentos: **obrigatórios** (LGPD; inexistência de impedimento; veracidade) + novo consentimento de campanhas internas/grupos internos de WhatsApp. PDF/Salvar só ocorrem com os três (novo) consentidos.
- Nome do item 6 alterado para **"Consentimento e Veracidade"**.
- Dependentes: validação de CPF incluída no fluxo.
- Telefone: máscara `(XX) XXXXX-XXXX`.
- Endereço: CEP em primeiro campo, com lookup de logradouro via API ViaCEP (`https://viacep.com.br/ws/{cep}/json/`).

## Open items (decidir no plano)

- Obrigatoriedade per-field dos novos campos cadastrais.
- Estratégia ViaCEP/CORS (cliente direto vs. proxy no servidor).

## Success criteria

- Tela com item 1 expandido + dados cadastrais; PDF com dados cadastrais + declaração; consensos obrigatórios; CPF/máscara/CEP funcionando; tsc/build e E2E OK.
