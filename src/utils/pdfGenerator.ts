// Utilitário de Geração de PDFs Oficiais - Padrão CMC (Câmara Municipal de Curitiba)

import { CARGOS_GABINETE, LIMITE_FINANCEIRO_GABINETE } from '../types';

async function carregarLogoBase64(): Promise<string | null> {
  try {
    const r = await fetch(`${import.meta.env?.BASE_URL ?? '/'}logo.png`);
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Não foi possível carregar a logo para o PDF', e);
    return null;
  }
}

const formatarMoeda = (val: number) => 
  val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatarDataBr = (valor?: string) => {
  if (!valor) return '—';
  const partes = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : valor;
};

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

// 1. PDF de Composição de Gabinete
export async function gerarPdfComposicao(
  cargosConfig: { nome: string; simbolo: string; vencimento: number; q: number }[],
  nomeGabinete: string = 'GABINETE DO VEREADOR',
  nomeVereador: string = ''
) {
  if (!(window as any).jspdf) {
    throw new Error('Biblioteca jsPDF não carregada.');
  }
  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF({ compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const logo = await carregarLogoBase64();
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 15, 10, 28, 0);
    } catch (e) {
      // Ignora erro se imagem falhar
    }
  }

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(46, 10, 46, 30);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('FORMULÁRIO DE ESCOLHA DE COMPOSIÇÃO DE GABINETE PARLAMENTAR', 52, 16);
  doc.text('LEI MUNICIPAL Nº 16.546/2025', 52, 21);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Câmara Municipal de Curitiba', 52, 27);

  let y = 45;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('EXCELENTÍSSIMO SENHOR PRESIDENTE DA COMISSÃO EXECUTIVA,', 15, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const intro = `O(A) Vereador(a) ${nomeVereador.trim() || '______________________'}, na escolha da organização de seu Gabinete Parlamentar, nos termos do Art. 4º da Lei Municipal 16.546/2025, opta pela seguinte composição:`;
  const splitIntro = doc.splitTextToSize(intro, pageWidth - 30);
  doc.text(splitIntro, 15, y);
  y += (splitIntro.length * 5) + 8;

  const linhas: string[] = [];
  cargosConfig.forEach(c => {
    for (let i = 0; i < c.q; i++) {
      linhas.push(c.simbolo === 'CC1' ? '1 Chefe de Gabinete Parlamentar' : '1 Assessor de Gabinete Parlamentar');
    }
  });

  linhas.forEach((texto, i) => {
    const simbolo = cargosConfig.flatMap(c => Array(c.q).fill(c.simbolo))[i];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(texto, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.text(simbolo, pageWidth - 15, y, { align: 'right' });
    y += 5;
  });

  y += 3;
  const totalVal = cargosConfig.reduce((a, c) => a + c.q * c.vencimento, 0);
  const totalPes = cargosConfig.reduce((a, c) => a + c.q, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Total: ${totalPes} pessoa(s) — R$ ${formatarMoeda(totalVal)}`, 15, y);
  y += 8;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  const obs = 'Obs.: Nos termos do Art. 4º, §1º do respectivo diploma legal, o limite máximo de despesa com pessoal do gabinete com os cargos previstos deverá respeitar o somatório dos vencimentos dos cargos do CC-1 ao CC-6 mais dois cargos CC-7 (total de R$ ' + formatarMoeda(LIMITE_FINANCEIRO_GABINETE) + ').';
  const splitObs = doc.splitTextToSize(obs, pageWidth - 30);
  doc.text(splitObs, 15, y);
  y += (splitObs.length * 3.5) + 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const agora = new Date();
  doc.text(`Curitiba, ${String(agora.getDate()).padStart(2, '0')} de ${MESES[agora.getMonth()]} de ${agora.getFullYear()}`, pageWidth - 15, y, { align: 'right' });
  y += 30;

  doc.setDrawColor(0, 0, 0);
  doc.line(pageWidth / 2 - 45, y, pageWidth / 2 + 45, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(nomeVereador.trim().toUpperCase() || '______________________', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('VENCIMENTOS VIGENTES CONFORME SÍMBOLO:', 15, y);
  y += 3;

  const fmt = (indice: number) => `R$ ${formatarMoeda(CARGOS_GABINETE[indice].vencimento)}`;
  const venc = [
    ['CHEFE DE GABINETE PARLAMENTAR CC-1', fmt(0), 'ASSESSOR DE GABINETE PARLAMENTAR CC-6', fmt(5)],
    ['ASSESSOR DE GABINETE PARLAMENTAR CC-2', fmt(1), 'ASSESSOR DE GABINETE PARLAMENTAR CC-7', fmt(6)],
    ['ASSESSOR DE GABINETE PARLAMENTAR CC-3', fmt(2), 'ASSESSOR DE GABINETE PARLAMENTAR CC-8', fmt(7)],
    ['ASSESSOR DE GABINETE PARLAMENTAR CC-4', fmt(3), 'ASSESSOR DE GABINETE PARLAMENTAR CC-9', fmt(8)],
    ['ASSESSOR DE GABINETE PARLAMENTAR CC-5', fmt(4), '', '']
  ];
  const colW = [62, 28, 62, 28];
  const margem = 15;
  doc.setFontSize(6);
  venc.forEach(row => {
    const h = 7;
    row.forEach((cell, ci) => {
      const xo = margem + colW.slice(0, ci).reduce((a, b) => a + b, 0);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(xo, y, colW[ci], h);
    });
    row.forEach((cell, ci) => {
      if (!cell) return;
      const xo = margem + colW.slice(0, ci).reduce((a, b) => a + b, 0);
      doc.setTextColor(0, 0, 0);
      if (ci % 2 === 0) {
        doc.setFont('helvetica', 'bold');
        doc.text(cell, xo + 2, y + 4.5, { align: 'left', maxWidth: colW[ci] - 3 });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.text(cell, xo + colW[ci] - 2, y + 4.5, { align: 'right', maxWidth: colW[ci] - 3 });
      }
    });
    y += h;
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.text('Página 1 de 1', pageWidth - 20, pageHeight - 10, { align: 'right' });

  doc.save(`Composicao_Gabinete_${nomeGabinete.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

// 2. PDF de Admissão de Servidor
export async function gerarPdfAdmissao(dados: {
  nome: string;
  vereador: string;
  cargo: string;
  simbolo: string;
  lotacao: string;
  dataAdmissao: string;
}) {
  if (!(window as any).jspdf) {
    throw new Error('jsPDF não carregado.');
  }
  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF({ compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const FONTE = 'helvetica';
  const TAM_TITULO = 10.5;
  const TAM_TITULO_SEC = 9.5;
  const TAM_TEXTO = 8.5;
  const ENTRELINHA = 4.2;
  const MARGEM = 15;
  const ESPACO_CAIXA = 6; // espaço livre visível, em mm, entre a caixa e os parágrafos
  const logo = await carregarLogoBase64();
  if (logo) {
    try { doc.addImage(logo, 'PNG', 15, 10, 28, 0); } catch (e) {}
  }
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(46, 10, 46, 30);
  doc.setTextColor(0, 0, 0);
  doc.setFont(FONTE, 'bold');
  doc.setFontSize(TAM_TITULO);
  doc.text('INDICAÇÃO DE ADMISSÃO EM CARGO EM COMISSÃO', 52, 16);
  doc.setFontSize(TAM_TEXTO);
  doc.setFont(FONTE, 'normal');
  doc.text('Câmara Municipal de Curitiba — Gabinete Parlamentar', 52, 23);
  let y = 45;
  doc.setFont(FONTE, 'bold');
  doc.setFontSize(TAM_TITULO_SEC);
  doc.text('EXCELENTÍSSIMO SENHOR PRESIDENTE DA COMISSÃO EXECUTIVA,', MARGEM, y);
  y += 10;
  doc.setFont(FONTE, 'normal');
  doc.setFontSize(TAM_TEXTO);
  const texto = `O(A) Vereador(a) ${dados.vereador?.trim() || 'responsável pelo gabinete'}, indica a pessoa abaixo identificada, qualificada conforme dados cadastrais apontados na Declaração Unificada, para exercer Cargo em Comissão da Estrutura de Apoio à Atividade Político Parlamentar desta Câmara Municipal.`;
  const linhasTexto = doc.splitTextToSize(texto, pageWidth - MARGEM * 2) as string[];
  doc.text(linhasTexto, MARGEM, y);
  // A última linha termina ~0,2 mm acima da baseline; mediada a partir dela.
  y += (linhasTexto.length - 1) * ENTRELINHA + ESPACO_CAIXA - 0.2;
  // Caixa de dados
  const topoCaixa = y;
  doc.setDrawColor(180, 180, 180);
  doc.setFillColor(245, 246, 245);
  doc.rect(MARGEM, y, pageWidth - MARGEM * 2, 35, 'FD');
  y += 7;
  doc.setFont(FONTE, 'bold'); doc.text('Nome do(a) Indicado(a):', MARGEM + 3, y);
  doc.setFont(FONTE, 'normal'); doc.text(dados.nome || '—', 65, y);
  y += 7;
  doc.setFont(FONTE, 'bold'); doc.text('Cargo / Símbolo:', MARGEM + 3, y);
  doc.setFont(FONTE, 'normal'); doc.text(`${dados.cargo || '—'} (${dados.simbolo || '—'})`, 65, y);
  y += 7;
  doc.setFont(FONTE, 'bold'); doc.text('Lotação:', MARGEM + 3, y);
  doc.setFont(FONTE, 'normal'); doc.text(dados.lotacao || 'GABINETE', 65, y);
  y += 7;
  doc.setFont(FONTE, 'bold'); doc.text('Admitir a partir de:', MARGEM + 3, y);
  doc.setFont(FONTE, 'normal'); doc.text(formatarDataBr(dados.dataAdmissao), 65, y);
  const declaracao = `Eu, Vereador(a) ${dados.vereador?.trim() || 'responsável pelo gabinete'}, declaro, para os devidos fins de direito e ciente das sanções legais cabíveis, que a indicação do(a) Sr.(a) ${dados.nome || '—'} para o cargo em comissão de ${dados.cargo || '—'} obedece rigorosamente à Súmula Vinculante nº 13 do Supremo Tribunal Federal, não configurando nenhuma hipótese de vínculo de parentesco até o terceiro grau ou de nepotismo, direto ou cruzado.`;
  // O topo da declaração fica ~2 mm acima da baseline; medido a partir da borda inferior.
  y = topoCaixa + 35 + ESPACO_CAIXA + 2;
  doc.setFont(FONTE, 'normal');
  doc.setFontSize(TAM_TEXTO);
  const linhasDeclaracao = doc.splitTextToSize(declaracao, pageWidth - MARGEM * 2) as string[];
  doc.text(linhasDeclaracao, MARGEM, y);
  y += linhasDeclaracao.length * ENTRELINHA + 6;
  y += 20;
  const agora = new Date();
  doc.text(`Curitiba, ${String(agora.getDate()).padStart(2, '0')} de ${MESES[agora.getMonth()]} de ${agora.getFullYear()}`, pageWidth - MARGEM, y, { align: 'right' });
  y += 35;
  doc.setDrawColor(0, 0, 0);
  doc.line(pageWidth / 2 - 45, y, pageWidth / 2 + 45, y);
  y += 5;
  doc.setFontSize(TAM_TITULO_SEC);
  doc.setFont(FONTE, 'bold');
  doc.text(dados.vereador?.trim().toUpperCase() || '______________________', pageWidth / 2, y, { align: 'center' });
  doc.setFont(FONTE, 'normal');
  doc.setFontSize(8); doc.setTextColor(150, 150, 150);
  doc.text('Página 1 de 1', pageWidth - MARGEM, pageHeight - 10, { align: 'right' });
  doc.save(`Admissao_${(dados.nome || 'servidor').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}
// 3. PDF de Exoneração de Servidor
export async function gerarPdfExoneracao(dados: {
  nome: string;
  vereador: string;
  matricula: string;
  cargo: string;
  simbolo: string;
  lotacao: string;
  dataExoneracao: string;
}) {
  if (!(window as any).jspdf) {
    throw new Error('jsPDF não carregado.');
  }
  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF({ compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const FONTE = 'helvetica';
  const TAM_TITULO = 10.5;
  const TAM_TITULO_SEC = 9.5;
  const TAM_TEXTO = 8.5;
  const ENTRELINHA = 4.2;
  const MARGEM = 15;
  const logo = await carregarLogoBase64();
  if (logo) {
    try { doc.addImage(logo, 'PNG', 15, 10, 28, 0); } catch (e) {}
  }
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(46, 10, 46, 30);
  doc.setTextColor(0, 0, 0);
  doc.setFont(FONTE, 'bold');
  doc.setFontSize(TAM_TITULO);
  doc.text('INDICAÇÃO DE EXONERAÇÃO DE CARGO EM COMISSÃO', 52, 16);
  doc.setFontSize(TAM_TEXTO);
  doc.setFont(FONTE, 'normal');
  doc.text('Câmara Municipal de Curitiba — Gabinete Parlamentar', 52, 23);
  let y = 45;
  doc.setFont(FONTE, 'bold');
  doc.setFontSize(TAM_TITULO_SEC);
  doc.text('EXCELENTÍSSIMO SENHOR PRESIDENTE DA COMISSÃO EXECUTIVA,', MARGEM, y);
  y += 10;
  doc.setFont(FONTE, 'normal');
  doc.setFontSize(TAM_TEXTO);
  const texto = `O(A) Vereador(a) ${dados.vereador?.trim() || 'responsável pelo gabinete'} indica a pessoa abaixo identificada, para que seja exonerada do Cargo em Comissão da Estrutura de Apoio à Atividade Político Parlamentar desta Câmara Municipal.`;
  const linhasTexto = doc.splitTextToSize(texto, pageWidth - MARGEM * 2) as string[];
  doc.text(linhasTexto, MARGEM, y);
  y += linhasTexto.length * ENTRELINHA + 4;
  doc.setDrawColor(180, 180, 180);
  doc.setFillColor(245, 246, 245);
  doc.rect(MARGEM, y, pageWidth - MARGEM * 2, 42, 'FD');
  y += 7;
  doc.setFont(FONTE, 'bold'); doc.text('Nome do(a) Servidor(a):', MARGEM + 3, y);
  doc.setFont(FONTE, 'normal'); doc.text(dados.nome || '—', 65, y);
  y += 7;
  doc.setFont(FONTE, 'bold'); doc.text('Matrícula:', MARGEM + 3, y);
  doc.setFont(FONTE, 'normal'); doc.text(dados.matricula || '—', 65, y);
  y += 7;
  doc.setFont(FONTE, 'bold'); doc.text('Cargo / Símbolo:', MARGEM + 3, y);
  doc.setFont(FONTE, 'normal'); doc.text(`${dados.cargo || '—'} (${dados.simbolo || '—'})`, 65, y);
  y += 7;
  doc.setFont(FONTE, 'bold'); doc.text('Lotação:', MARGEM + 3, y);
  doc.setFont(FONTE, 'normal'); doc.text(dados.lotacao || 'GABINETE', 65, y);
  y += 7;
  doc.setFont(FONTE, 'bold'); doc.text('Exonerar a partir de:', MARGEM + 3, y);
  doc.setFont(FONTE, 'normal'); doc.text(formatarDataBr(dados.dataExoneracao), 65, y);
  y += 20;
  const agora = new Date();
  doc.setFontSize(TAM_TEXTO);
  doc.setFont(FONTE, 'normal');
  doc.text(`Curitiba, ${String(agora.getDate()).padStart(2, '0')} de ${MESES[agora.getMonth()]} de ${agora.getFullYear()}`, pageWidth - MARGEM, y, { align: 'right' });
  y += 35;
  doc.setDrawColor(0, 0, 0);
  doc.line(pageWidth / 2 - 45, y, pageWidth / 2 + 45, y);
  y += 5;
  doc.setFontSize(TAM_TITULO_SEC);
  doc.setFont(FONTE, 'bold');
  doc.text(dados.vereador?.trim().toUpperCase() || '______________________', pageWidth / 2, y, { align: 'center' });
  y += 18;
  doc.setFontSize(TAM_TITULO_SEC);
  doc.setFont(FONTE, 'bold');
  doc.text('INFORMAÇÕES IMPORTANTES', pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(TAM_TEXTO);
  doc.setFont(FONTE, 'normal');
  const info1 = 'Para efetivação da exoneração deverão ser entregues o Crachá Funcional (inclusive provisórios) e o Comprovante de pagamento de Auxílio Saúde equivalente aos meses recebidos e ainda não apresentados.';
  const linhasInfo1 = doc.splitTextToSize(info1, pageWidth - MARGEM * 2) as string[];
  doc.text(linhasInfo1, MARGEM, y);
  y += linhasInfo1.length * ENTRELINHA + 3;
  const info2 = 'Atenção: Caso não apresente os comprovantes, as parcelas de auxílio-saúde recebidas serão descontadas do valor da rescisão do servidor.';
  doc.text(doc.splitTextToSize(info2, pageWidth - MARGEM * 2) as string[], MARGEM, y);
  doc.setFont(FONTE, 'normal');
  doc.setFontSize(8); doc.setTextColor(150, 150, 150);
  doc.text('Página 1 de 1', pageWidth - MARGEM, pageHeight - 10, { align: 'right' });
  doc.save(`Exoneracao_${(dados.nome || 'servidor').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}
// 4. PDF de Declaração do Servidor Nomeado (Modelo Unificado)

export async function gerarPdfDeclaracao(dados: {
  nomeCompleto: string;
  cpf: string;
  email: string;
  telefone: string;
  cargoPretendido: string;
  simbolo: string;
  parentesco: 'nao' | 'sim';
  parentes: { nome: string; cargo: string; grau: string; lotacao: string }[];
  atividade: 'nao' | 'sim';
  atividades: { tipo: string; entidade: string; cnpj: string; cargo: string; carga: string; tel: string }[];
  dependentes: { nome: string; cpf: string; nasc: string; cod: string; irpf?: 'nao' | 'sim'; tipo?: 'conjuge' }[];
  declaracaoImpedimento: boolean;
  autorizaUsoDadosLGPD: boolean;
  declaracaoVeracidade: boolean;
  autorizaContatoCampanhas?: boolean;
  dataNasc?: string;
  endereco?: { cep?: string; logradouro?: string; bairro?: string; complemento?: string; cidade?: string; estado?: string; numero?: string };
  rg?: string;
  orgaoExpedidor?: string;
  pisPasep?: string;
  tituloEleitoral?: string;
  tituloEleitoralZona?: string;
  tituloEleitoralSecao?: string;
  estadoCivil?: string;
  racaCor?: string;
  nacionalidade?: string;
  naturalidade?: string;
  deficiencia?: boolean;
  deficienciaEspecifica?: string;
  ctps?: string;
  ctpsSerie?: string;
  ctpsEmitidoEm?: string;
  escolaridade?: string;
  escolaridadeCompleta?: string;
  bancoAgencia?: string;
  bancoConta?: string;
  filiacao?: { nome: string; cpf: string; nasc: string; parentesco?: string; irpf?: 'nao' | 'sim'; cod?: string }[];
  gabinete?: string;
  localData?: string;
}) {
  if (!(window as any).jspdf) {
    throw new Error('jsPDF não carregado.');
  }
  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF({ compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const FONTE = 'helvetica';
  const TAM_TEXTO = 8.5;
  const ENTRELINHA = 4.2;
  const CHEQUE_LINHA = ENTRELINHA + 2;
  const ALTURA_TITULO = 8;
  const MARGEM = 15;

  const logo = await carregarLogoBase64();
  if (logo) {
    try { doc.addImage(logo, 'PNG', 15, 10, 28, 0); } catch (e) {}
  }

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(46, 10, 46, 30);

  doc.setTextColor(0, 0, 0);
  doc.setFont(FONTE, 'bold');
  doc.setFontSize(10.5);
  doc.text('DECLARAÇÃO UNIFICADA DO(A) SERVIDOR(A) NOMEADO(A)', 52, 16);
  doc.setFontSize(8.5);
  doc.setFont(FONTE, 'normal');
  doc.text('Lei Municipal nº 16.546/2025 · Gabinete: ' + (dados.gabinete || 'GABINETE'), 52, 21);
  doc.text('Câmara Municipal de Curitiba', 52, 27);

  let y = 42;

  const checarQuebra = (espaco = 15) => {
    if (y + espaco > pageHeight - 15) {
      doc.addPage();
      y = 20;
    }
  };

  // O título fica pendente até que o primeiro texto da seção seja escrito.
  // Assim a quebra de página empurra título e texto juntos, sem título órfão.
  let tituloPendente: string | null = null;
  const desenharTitulo = (titulo: string) => {
    tituloPendente = null;
    doc.setFont(FONTE, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(14, 77, 54);
    doc.text(titulo.toUpperCase(), MARGEM, y);
    y += 2;
    doc.setDrawColor(14, 77, 54);
    doc.setLineWidth(0.4);
    doc.line(MARGEM, y, pageWidth - MARGEM, y);
    y += 6;
    doc.setTextColor(0, 0, 0);
    doc.setFont(FONTE, 'normal');
    doc.setFontSize(TAM_TEXTO);
  };
  const escreverSecao = (titulo: string, espacoAntes = 8, desenharAgora = false) => {
    y += espacoAntes;
    if (desenharAgora) {
      checarQuebra(15);
      desenharTitulo(titulo);
    } else {
      tituloPendente = titulo;
    }
  };
  const escrever = (texto: string, espacoDepois = 4, negrito = false, reservaFinal = 0) => {
    doc.setFont(FONTE, negrito ? 'bold' : 'normal');
    doc.setFontSize(TAM_TEXTO);
    const linhas = doc.splitTextToSize(texto, pageWidth - (MARGEM * 2)) as string[];
    // Com título pendente, usa a mesma métrica da quebra por linha e soma
    // a altura do título: se o texto não couber, ambos vão juntos.
    const porLinha = tituloPendente ? CHEQUE_LINHA : ENTRELINHA;
    const alturaReserva = linhas.length * porLinha + espacoDepois + reservaFinal
      + (tituloPendente ? ALTURA_TITULO : 0);
    checarQuebra(alturaReserva);
    if (tituloPendente) desenharTitulo(tituloPendente);
    linhas.forEach((linha) => {
      checarQuebra(ENTRELINHA + 2);
      doc.text(linha, MARGEM, y);
      y += ENTRELINHA;
    });
    y += espacoDepois;
  };
  const escreverSubsecao = (titulo: string) => {
    y += 2;
    checarQuebra(12 + (tituloPendente ? ALTURA_TITULO : 0));
    if (tituloPendente) desenharTitulo(tituloPendente);
    doc.setFont(FONTE, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(14, 77, 54);
    doc.text(titulo, MARGEM, y);
    y += 4.5;
    doc.setTextColor(0, 0, 0);
    doc.setFont(FONTE, 'normal');
    doc.setFontSize(TAM_TEXTO);
  };
  const escreverTabela = (linhas: [string, string][]) => {
    const largura = pageWidth - MARGEM * 2;
    const alturaLinha = (TAM_TEXTO * 1.15 * 25.4) / 72;
    linhas.forEach(([rotulo, valor], indice) => {
      doc.setTextColor(0, 0, 0);
      doc.setFont(FONTE, 'bold');
      doc.setFontSize(TAM_TEXTO);
      const rotuloLinhas = doc.splitTextToSize(rotulo, 46) as string[];
      doc.setFont(FONTE, 'normal');
      const valorLinhas = doc.splitTextToSize(String(valor || '—'), largura - 52) as string[];
      const totalLinhas = Math.max(rotuloLinhas.length, valorLinhas.length, 1);
      const altura = totalLinhas * alturaLinha + 1.7;
      checarQuebra(altura + 2);
      if (indice % 2 === 1) {
        doc.setFillColor(244, 246, 245);
        doc.rect(MARGEM, y - 2.8, largura, (totalLinhas - 1) * alturaLinha + 4.2, 'F');
      }
      doc.setFont(FONTE, 'bold');
      doc.text(rotuloLinhas, MARGEM + 2, y);
      doc.setFont(FONTE, 'normal');
      doc.text(valorLinhas, MARGEM + 50, y);
      y += altura;
    });
  };

  const escreverCamposEmPares = (linhas: [string, string][]) => {
    const larguraUtil = pageWidth - MARGEM * 2;
    const metade = (larguraUtil - 8) / 2;
    const alturaLinha = (TAM_TEXTO * 1.15 * 25.4) / 72;

    const medir = (rotulo: string, valor: string, largura: number, reservaRotulo: number) => {
      doc.setFont(FONTE, 'bold');
      doc.setFontSize(TAM_TEXTO);
      const larguraRotulo = doc.getTextWidth(rotulo);
      const rotuloLinhas = doc.splitTextToSize(rotulo, reservaRotulo - 2) as string[];
      doc.setFont(FONTE, 'normal');
      const textoValor = String(valor || '—');
      return {
        rotuloLinhas,
        valorLinhas: doc.splitTextToSize(textoValor, largura - reservaRotulo) as string[],
        deslocamentoValor: reservaRotulo,
        cabe: larguraRotulo + 4 + doc.getTextWidth(textoValor) <= largura
      };
    };

    let indice = 0;
    let faixa = 0;
    while (indice < linhas.length) {
      const [rotulo, valor] = linhas[indice];
      const proximo = linhas[indice + 1];
      const atual = medir(rotulo, valor, metade, 32);
      const prox = proximo ? medir(proximo[0], proximo[1], metade, 32) : null;
      const pares: { rotuloLinhas: string[]; valorLinhas: string[]; deslocamentoValor: number; x: number }[] = [];

      if (prox && atual.cabe && prox.cabe) {
        pares.push({ ...atual, x: MARGEM + 2 });
        pares.push({ ...prox, x: MARGEM + metade + 6 });
        indice += 2;
      } else {
        pares.push({ ...medir(rotulo, valor, larguraUtil, 46), x: MARGEM + 2 });
        indice += 1;
      }

      const totalLinhas = Math.max(...pares.map((p) => Math.max(p.rotuloLinhas.length, p.valorLinhas.length)));
      const altura = totalLinhas * alturaLinha + 1.7;
      checarQuebra(altura + 2);
      if (faixa % 2 === 1) {
        doc.setFillColor(244, 246, 245);
        doc.rect(MARGEM, y - 2.8, larguraUtil, (totalLinhas - 1) * alturaLinha + 4.2, 'F');
      }
      pares.forEach((par) => {
        doc.setTextColor(0, 0, 0);
        doc.setFont(FONTE, 'bold');
        doc.setFontSize(TAM_TEXTO);
        doc.text(par.rotuloLinhas, par.x, y);
        doc.setFont(FONTE, 'normal');
        doc.text(par.valorLinhas, par.x + par.deslocamentoValor, y);
      });
      y += altura;
      faixa++;
    }
  };

  // Seção 1 — Identificação e Dados Cadastrais
  // (nome/CPF/e-mail/telefone já são impressos em "1. Identificação do Declarante" — sem duplicação)
  checarQuebra(16);
  escreverSecao('1. Identificação e Dados Cadastrais', 0, true);

  escreverSubsecao('1.1 Identificação do Declarante');
  escreverCamposEmPares([
    ['Nome', dados.nomeCompleto || '—'],
    ['CPF', dados.cpf || '—'],
    ['E-mail', dados.email || '—'],
    ['Telefone', dados.telefone || '—'],
    ['Cargo pretendido', `${dados.cargoPretendido || '—'} (${dados.simbolo || '—'})`],
  ]);

  escreverSubsecao('1.2 Endereço');
  const end = dados.endereco || {};
  escreverCamposEmPares([
    ['CEP', end.cep || '—'],
    ['Logradouro', end.logradouro || '—'],
    ['Número', end.numero || '—'],
    ['Complemento', end.complemento || '—'],
    ['Bairro', end.bairro || '—'],
    ['Cidade', end.cidade || '—'],
    ['Estado', end.estado || '—'],
  ]);

  escreverSubsecao('1.3 Dados Pessoais e Documentos');
  escreverCamposEmPares([
    ['Data de nascimento', formatarDataBr(dados.dataNasc)],
    ['Nacionalidade', dados.nacionalidade || '—'],
    ['Naturalidade', dados.naturalidade || '—'],
    ['Estado civil', dados.estadoCivil || '—'],
    ['Raça/cor', dados.racaCor || '—'],
    ['Deficiência', dados.deficiencia ? `Sim (${dados.deficienciaEspecifica || '—'})` : 'Não'],
    ['RG', dados.rg || '—'],
    ['Órgão expedidor', dados.orgaoExpedidor || '—'],
    ['Título de eleitor', dados.tituloEleitoral || '—'],
    ['Zona', dados.tituloEleitoralZona || '—'],
    ['Seção', dados.tituloEleitoralSecao || '—'],
    ['CTPS', dados.ctps || '—'],
    ['CTPS — Série', dados.ctpsSerie || '—'],
    ['CTPS — Emitido em', formatarDataBr(dados.ctpsEmitidoEm)],
    ['PIS/PASEP', dados.pisPasep || '—'],
    ['Escolaridade', `${dados.escolaridade || '—'} (${dados.escolaridadeCompleta || '—'})`],
  ]);

  escreverSubsecao('1.4 Filiação, Familiares e Dependentes');
  const responsaveis = dados.filiacao || [];
  const linhasFiliacao: [string, string][] = responsaveis.length
    ? responsaveis.map((f) => [
        f.parentesco || 'Responsável',
        `${f.nome || '—'} | CPF: ${f.cpf || '—'} | Nascimento: ${formatarDataBr(f.nasc)}`
          + (f.irpf === 'sim'
            ? ` | IRPF: Sim | Código IRPF: ${f.cod || '—'}`
            : ' | IRPF: Não'),
      ])
    : [['Filiação', '—']];
  let numeroDependente = 0;
  (dados.dependentes || []).forEach((d) => {
    const nascFmt = formatarDataBr(d.nasc);
    linhasFiliacao.push([
      d.tipo === 'conjuge' ? 'Cônjuge/Companheiro(a)' : `Dependente ${++numeroDependente}`,
      `${d.nome || '—'} | CPF: ${d.cpf || '—'} | Nascimento: ${nascFmt} | Código IRPF: ${d.cod || '—'} | IRPF: ${d.irpf === 'sim' ? 'Sim' : 'Não'}`,
    ]);
  });
  escreverCamposEmPares(linhasFiliacao);

  escreverSubsecao('1.5 Dados Bancários');
  escreverCamposEmPares([
    ['Banco', 'Caixa Econômica Federal'],
    ['Agência', dados.bancoAgencia || '—'],
    ['Conta', dados.bancoConta || '—'],
  ]);

  // Seção 2 — Vínculo de Parentesco (Súmula Vinculante nº 13 STF)
  escreverSecao('2. Vínculo de Parentesco (Súmula Vinculante nº 13 do STF)');
  escrever(`Possui parentesco: ${dados.parentesco === 'sim' ? 'SIM' : 'NÃO'}`, 4, true);
  if (dados.parentesco === 'nao') {
    escrever('Declaro, para fins de nomeação no Cargo em Comissão acima indicado, que NÃO me encontro na condição de cônjuge, companheiro ou parente em linha reta, colateral por consanguinidade ou afinidade, até o terceiro grau, com Agentes Políticos do Município nos cargos de Secretários, Dirigentes e Diretores da Administração Direta e Indireta, inclusive, conforme a Súmula Vinculante nº 13 do STF, da autoridade nomeante ou de servidor da Câmara Municipal de Curitiba, investido em cargo de direção, chefia ou de cargos em comissão de assessoramento.', 0);
  } else {
    dados.parentes.forEach((p, idx) => {
      escrever(`Vínculo ${idx + 1}: ${p.nome || '—'}`, 2, true);
      escrever(`Cargo/Função: ${p.cargo || '—'} | Grau: ${p.grau || '—'} | Lotação: ${p.lotacao || '—'}`, 0);
    });
  }

  // Seção 3 — Atividade Remunerada
  escreverSecao('3. Atividade Remunerada');
  escrever(`Exercício de outra atividade remunerada: ${dados.atividade === 'sim' ? 'SIM' : 'NÃO'}`, 4, true);
  if (dados.atividade === 'nao') {
    escrever('Declaro, para os devidos fins, que não percebo vencimentos ou qualquer outra vantagem pecuniária de outro órgão da Administração Direta ou Indireta do Governo Federal, Estadual ou Municipal, ou de outros órgãos, bem como não me encontro na condição de empregado, proprietário ou sócio de empresa privada, não exercendo outra atividade profissional em horário incompatível com o expediente da Câmara Municipal de Curitiba. Declaro, ainda, que estou ciente das vedações previstas na Legislação Federal quanto aos temas das informações prestadas, bem como do disposto na Lei Municipal nº 15.591/2020 — Estatuto dos Servidores da Câmara de Curitiba.', 0);
  } else {
    dados.atividades.forEach((a, idx) => {
      escrever(`Atividade ${idx + 1}: ${a.entidade || '—'} (${a.tipo || '—'})`, 2, true);
      escrever(`CNPJ/Órgão: ${a.cnpj || '—'} | Cargo: ${a.cargo || '—'} | Carga Horária: ${a.carga || '—'} | Telefone: ${a.tel || '—'}`, 4);
    });
    escrever('Declaro que a entidade/empresa acima mencionada não possui vínculo contratual com a Administração Direta ou Indireta do Governo Federal, Estadual ou Municipal, ou de outros órgãos, e que não exerço essa atividade em horário incompatível com o expediente da Câmara Municipal de Curitiba. Declaro, ainda, que estou ciente das vedações previstas na Legislação Federal quanto aos temas das informações prestadas, bem como do disposto na Lei Municipal nº 15.591/2020 — Estatuto dos Servidores da Câmara de Curitiba.', 0);
  }

  // Seção 4 — Inexistência de Impedimento (LCM nº 86/2012) — texto integral da tela
  escreverSecao('4. Inexistência de Impedimento (LCM nº 86/2012)');
  escrever('DECLARO ter conhecimento das vedações constantes da Lei Complementar Municipal nº 86, de 22 de junho de 2012, e respectiva regulamentação, que estabelecem as hipóteses impeditivas da nomeação para o exercício de cargos em comissão, por pessoas que incidam nas hipóteses de inelegibilidade previstas na legislação federal.');
  escrever('DECLARO, ainda, não ter incorrido em qualquer das vedações acima referidas e que me encontro em condições de exercer regularmente o cargo em comissão para o qual fui nomeado.');
  escrever('DECLARO, sob pena de responsabilização nas esferas civil, criminal e administrativa, que as informações aqui prestadas são verdadeiras, comprometendo-me a apresentar as devidas certidões ou declarações comprobatórias da regularidade da situação jurídica junto à Justiça Federal, Eleitoral, Estadual ou Distrital, do Trabalho ou Militar, bem como nos Tribunais de Contas da União ou dos Estados e ainda no Cadastro Nacional de Condenações Cíveis por Ato de Improbidade Administrativa do Conselho Nacional de Justiça, no conselho ou órgão profissional competente ou nos entes públicos em que eu tenha trabalhado, sempre que solicitado pela Administração da Câmara Municipal de Curitiba e no prazo regulamentar.');
  escrever('COMPROMETO-ME, independentemente de solicitação, a renovar a presente declaração anualmente, até 31 de janeiro, enquanto permanecer no exercício do cargo para o qual fui nomeado, ratificando com isso a inexistência de impedimento ora declarada.');
  escrever('DECLARO, finalmente, a ciência de que a verificação de existência de impedimento, independentemente do contido na presente declaração, bem como a não apresentação da ratificação anual ou das certidões ou declarações, quando requeridas, implicarão em minha imediata exoneração do cargo em comissão ora exercido.', 0);

  // Seção 5 — Consentimento e Veracidade
  escreverSecao('5. Consentimento e Veracidade');
  escrever('Ao assinar o presente termo, consinto e concordo que a Câmara Municipal de Curitiba, CNPJ nº 77.636.520/0001-10, doravante denominada Controlador, tome decisões referentes ao tratamento de seus dados pessoais, conforme a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD).');
  escrever('Concordo com a disponibilização do meu contato pessoal para campanhas internas da Câmara Municipal de Curitiba e para participação em grupos internos de trabalho (grupos de mensagens institucionais em WhatsApp).');
  escrever('Declaro, sob as penas da lei, que todas as informações prestadas neste formulário são verdadeiras.', 8, false, 40);

  // segurança: nenhum título deve ficar sem ser desenhado
  if (tituloPendente) {
    checarQuebra(40 + ALTURA_TITULO);
    desenharTitulo(tituloPendente);
  }
  // Encerramento — a quebra do bloco final ja foi reservada pela ultima chamada de escrever
  const agora = new Date();
  doc.setFont(FONTE, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Curitiba, ${String(agora.getDate()).padStart(2, '0')} de ${MESES[agora.getMonth()]} de ${agora.getFullYear()}`, pageWidth - MARGEM, y, { align: 'right' });
  y += 25;
  doc.setDrawColor(0, 0, 0);
  doc.line(pageWidth / 2 - 45, y, pageWidth / 2 + 45, y);
  y += 5;
  doc.setFont(FONTE, 'bold');
  doc.text((dados.nomeCompleto?.trim() || '______________________').toUpperCase(), pageWidth / 2, y, { align: 'center' });

  // Rodapé com paginação real
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFont(FONTE, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${totalPaginas}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
  }

  doc.save(`Declaracao_Servidor_${(dados.nomeCompleto || 'nomeado').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}
