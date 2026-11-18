# Compactação dos campos da declaração unificada — design curto

Data: 2026-11-17

## Intenção

Manter integralmente o visual atual dos PDFs (cores, fonte Helvetica, tamanhos, faixas cinza, logotipo, redação) e apenas reorganizar os campos cadastrais da declaração para ocupar menos altura, evitando que a assinatura apareça sozinha numa terceira página.

## Situação medida

O PDF de exemplo (`Declaracao_Servidor_Maria_Aparecida_de_Oliveira_Santos.pdf`) tem 3 páginas:

- página 1: seções 1.1 a 1.5, um campo por linha, rótulo negrito e valor à direita;
- página 2: seções 2 a 5;
- página 3: somente `Curitiba, ...`, linha de assinatura, nome e legenda.

## Goals

- Nas seções 1.1 a 1.5, imprimir **dois pares rótulo/valor por linha** quando ambos couberem na metade da largura útil.
- Valores longos (nome completo, e-mail, logradouro, escolaridade, filiação/dependentes, observações) ocupam a **linha inteira** e continuam quebrando texto normalmente — sem truncamento.
- Preservar a ordem de leitura da lista de campos (da esquerda para a direita, de cima para baixo) e o zebra claro atual.
- Manter o bloco final (data + linha + nome + legenda) como uma unidade; se não couber, o último parágrafo da seção 5 vai junto, para que nunca exista uma página só com a assinatura.
- Não alterar o conteúdo jurídico, os consentimentos nem os dados impressos.

## Non-goals

- Não mudar fontes, tamanhos, cores, logotipo, margens ou qualquer texto.
- Não alterar os PDFs de admissão, exoneração e composição.
- Não mexer na interface web, na API, no banco de dados ou no `pdfGenerator` fora de `gerarPdfDeclaracao`.
- Não reduzir o tamanho da fonte para ganhar espaço.

## Constraints

- jsPDF com fontes padrão Helvetica; A4; margem lateral de 15 mm; tabela com fonte 8,5 pt.
- A largura disponível por par na metade da página será medida com `doc.getTextWidth()`; se rótulo + valor excederem o espaço, o campo cai inteiro na linha seguinte.
- A altura de cada linha continua derivada do tamanho da fonte e do número de linhas quebradas, para não sobrepor o zebra.

## Abordagens

1. **Pares curtos + valores longos em linha inteira — escolhida.** Mantém a aparência e a ordem atuais; só muda o empilhamento. Alcança a compactação sem perder legibilidade.
2. **Duas colunas fixas com rótulo acima do valor — descartada.** Mais compacta, mas troca a leitura horizontal dos pares por blocos empilhados e se afasta do modelo aprovado.
3. **Reduzir apenas espaçamentos — descartada.** Não libera altura suficiente e manteria a assinatura isolada.

## Detalhes da implementação

- Novo auxiliar local dentro de `gerarPdfDeclaracao`, por exemplo `escreverCamposEmPares(linhas: [string,string][])`, usado no lugar de `escreverTabela` nas seções 1.1 a 1.5.
- O auxiliar mede cada par; se o par couber em metade da largura útil, agenda-o para a coluna da esquerda e tenta alocar o par seguinte à direita; caso contrário, fecha a linha atual e imprime o par em largura total.
- Cada linha híbrida usa a mesma altura do maior dos dois pares. O zebra continua alternando por linha impressa.
- O bloco final passa a usar uma reserva de altura maior em `checarQuebra`, incluindo o último parágrafo da seção 5.

## Verificação

- RED: gerar a declaração de exemplo antes da mudança e confirmar 3 páginas, com a terceira contendo só a assinatura.
- GREEN: `npx tsc --noEmit` e `npm run build` com exit 0; PDF regenerado pela tela com no máximo 2 páginas para o exemplo; `pdftotext` confirma que a última página contém texto da seção 5 junto com data e assinatura; todos os rótulos e valores das seções 1.1 a 1.5 continuam presentes; nenhuma sobreposição ou campo truncado.
- Conferir no navegador que o botão “Gerar PDF” da declaração continua funcionando e que o arquivo baixado é o validado.
