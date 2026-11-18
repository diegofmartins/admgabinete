import React, { useState, useEffect } from 'react';
import { Gabinete, CARGOS_GABINETE } from '../types';
import { gerarPdfExoneracao } from '../utils/pdfGenerator';
import { formatarSalvoEm } from '../utils/formatarSalvoEm';
import { api } from '../services/api';
import { Download, Save, Trash2, UserMinus, RefreshCw } from 'lucide-react';
import { useConfirm } from './ConfirmDialog';

interface ExoneracaoViewProps {
  gabineteSelecionado: Gabinete | null;
  usuarioAtual: any;
}

export const ExoneracaoView: React.FC<ExoneracaoViewProps> = ({ gabineteSelecionado, usuarioAtual }) => {
  const { confirmar } = useConfirm();
  const [nome, setNome] = useState('');
  const [matricula, setMatricula] = useState('');
  const [cargo, setCargo] = useState('Assessor de Gabinete Parlamentar');
  const [simbolo, setSimbolo] = useState('CC6');
  const [lotacao, setLotacao] = useState(gabineteSelecionado ? gabineteSelecionado.nome.toUpperCase() : 'GABINETE DO VEREADOR');
  const [dataExoneracao, setDataExoneracao] = useState(new Date().toISOString().split('T')[0]);
  
  const [salvos, setSalvos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState({ texto: '', tipo: 'ok' as 'ok' | 'err' });

  useEffect(() => {
    if (gabineteSelecionado) {
      setLotacao(gabineteSelecionado.nome.toUpperCase());
    }
  }, [gabineteSelecionado]);

  // Lógica de vínculo Cargo -> Símbolo
  useEffect(() => {
    if (cargo === 'Chefe de Gabinete Parlamentar') {
      setSimbolo('CC1');
    } else if (cargo === 'Assessor de Gabinete Parlamentar') {
      if (simbolo === 'CC1') {
        setSimbolo('CC6');
      }
    }
  }, [cargo]);

  const carregarSalvos = async () => {
    if (!gabineteSelecionado) return;
    try {
      setCarregando(true);
      const lista = await api.listarExoneracoes(gabineteSelecionado.id);
      // Ordenar por data decrescente
      lista.sort((a, b) => new Date(b.salvoEm).getTime() - new Date(a.salvoEm).getTime());
      setSalvos(lista);
    } catch (e) {
      console.error('Erro ao carregar exonerações:', e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarSalvos();
  }, [gabineteSelecionado]);

  const limparFormulario = () => {
    setNome('');
    setMatricula('');
    setCargo('Assessor de Gabinete Parlamentar');
    setSimbolo('CC6');
    setDataExoneracao(new Date().toISOString().split('T')[0]);
    setMsg({ texto: '', tipo: 'ok' });
  };

  const salvarExoneracao = async () => {
    if (!nome.trim()) {
      setMsg({ texto: 'Preencha o nome do(a) servidor(a).', tipo: 'err' });
      return;
    }
    if (!gabineteSelecionado) return;

    try {
      const dados = {
        gabineteId: gabineteSelecionado.id,
        userId: usuarioAtual?.uid || 'anonimo',
        nome,
        matricula,
        cargo,
        simbolo,
        lotacao,
        dataExoneracao,
        salvoEm: new Date().toISOString()
      };

      await api.salvarExoneracao(dados);
      setMsg({ texto: 'Pedido de exoneração salvo com sucesso!', tipo: 'ok' });
      carregarSalvos();
    } catch (e) {
      console.error('Erro ao salvar exoneração:', e);
      setMsg({ texto: 'Erro ao salvar no Firestore.', tipo: 'err' });
    }
  };

  const excluirSalvo = async (id: string) => {
    if (!(await confirmar({
      titulo: 'Excluir pedido de exoneração?',
      mensagem: 'Deseja excluir este pedido salvo? Esta ação não pode ser desfeita.',
    }))) return;
    try {
      await api.excluirExoneracao(id);
      carregarSalvos();
    } catch (e) {
      console.error('Erro ao excluir:', e);
    }
  };

  const carregarItem = (item: any) => {
    setNome(item.nome || '');
    setMatricula(item.matricula || '');
    setCargo(item.cargo || '');
    setSimbolo(item.simbolo || 'CC6');
    setLotacao(item.lotacao || '');
    setDataExoneracao(item.dataExoneracao || '');
    setMsg({ texto: 'Pedido carregado para edição.', tipo: 'ok' });
  };

  const gerarPdf = async () => {
    if (!nome.trim()) {
      setMsg({ texto: 'Preencha o nome do(a) servidor(a) para gerar o PDF.', tipo: 'err' });
      return;
    }
    try {
      await gerarPdfExoneracao({
        nome,
        vereador: gabineteSelecionado?.vereadorResponsavel || '',
        matricula,
        cargo,
        simbolo,
        lotacao,
        dataExoneracao,
      });
      setMsg({ texto: 'PDF de exoneração gerado com sucesso.', tipo: 'ok' });
    } catch (e: any) {
      setMsg({ texto: 'Erro ao gerar PDF: ' + e.message, tipo: 'err' });
    }
  };

  const simbolosDisponiveis = cargo === 'Chefe de Gabinete Parlamentar'
    ? CARGOS_GABINETE.filter(c => c.simbolo === 'CC1')
    : CARGOS_GABINETE.filter(c => c.simbolo !== 'CC1');

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6">
      
      <div className="bg-white border border-[#D9DEDB] p-6 rounded-lg shadow-xs">
        <span className="text-xs font-bold text-brand-ink uppercase tracking-wider">Exoneração de Cargo em Comissão</span>
        <h2 className="text-2xl font-bold text-[#182528] tracking-tight mt-1">Exoneração de Servidor</h2>
        <p className="text-sm text-slate-600 mt-0.5">Gabinete: <strong>{gabineteSelecionado?.nome}</strong></p>
      </div>

      <div className="bg-white border border-[#D9DEDB] p-6 rounded-lg shadow-xs space-y-4">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Nome Completo</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo do(a) servidor(a)"
              className="w-full h-11 px-3 border border-[#D9DEDB] rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Matrícula</label>
            <input
              type="text"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="N.º da matrícula"
              className="w-full h-11 px-3 border border-[#D9DEDB] rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Cargo</label>
            <select
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="w-full h-11 px-3 border border-[#D9DEDB] rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="Chefe de Gabinete Parlamentar">Chefe de Gabinete Parlamentar</option>
              <option value="Assessor de Gabinete Parlamentar">Assessor de Gabinete Parlamentar</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Símbolo</label>
            <select
              value={simbolo}
              onChange={(e) => setSimbolo(e.target.value)}
              disabled={cargo === 'Chefe de Gabinete Parlamentar'}
              className="w-full h-11 px-3 border border-[#D9DEDB] rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-100 disabled:text-slate-600"
            >
              {simbolosDisponiveis.map(c => (
                <option key={c.simbolo} value={c.simbolo}>{c.simbolo} — R$ {c.vencimento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Lotação</label>
            <input
              type="text"
              value={lotacao}
              onChange={(e) => setLotacao(e.target.value)}
              className="w-full h-11 px-3 border border-[#D9DEDB] rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Exonerar a partir de</label>
            <input
              type="date"
              value={dataExoneracao}
              onChange={(e) => setDataExoneracao(e.target.value)}
              className="w-full h-11 px-3 border border-[#D9DEDB] rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {msg.texto && (
          <div className={`p-3 rounded text-xs font-bold ${msg.tipo === 'err' ? 'bg-red-50 text-red-700' : 'bg-brand-tint text-brand-ink'}`}>
            {msg.texto}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#D9DEDB]">
          <button
            type="button"
            onClick={salvarExoneracao}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-fill text-white text-sm font-semibold rounded hover:bg-brand-deep transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Exoneração</span>
          </button>

          <button
            type="button"
            onClick={gerarPdf}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-brand-ink border border-brand text-sm font-semibold rounded hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Gerar PDF</span>
          </button>

          <button
            type="button"
            onClick={limparFormulario}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-slate-700 border border-[#D9DEDB] text-sm font-semibold rounded hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Limpar</span>
          </button>
        </div>

      </div>

      <div className="bg-white border border-[#D9DEDB] rounded-lg p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-[#182528]">Pedidos de Exoneração Salvos</h3>
        
        {carregando ? (
          <p className="text-xs text-slate-500">Carregando pedidos...</p>
        ) : salvos.length === 0 ? (
          <p className="text-xs text-slate-500">Nenhum pedido de exoneração salvo.</p>
        ) : (
          <div className="space-y-2">
            {salvos.map(item => (
              <div
                key={item.id}
                onClick={() => carregarItem(item)}
                className="flex items-center justify-between p-4 border border-[#D9DEDB] rounded hover:border-brand cursor-pointer bg-slate-50/50 transition-colors"
              >
                <div>
                  <span className="font-bold text-sm text-[#182528] block">{item.nome}</span>
                  <span className="text-xs text-slate-500">{item.cargo} ({item.simbolo}) — Vigência: {item.dataExoneracao} — Salvo em {formatarSalvoEm(item.salvoEm)}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    excluirSalvo(item.id);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
