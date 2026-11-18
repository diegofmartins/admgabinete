import React, { useState, useEffect } from 'react';
import { CARGOS_GABINETE, LIMITE_FINANCEIRO_GABINETE, MAX_PESSOAS_GABINETE, Gabinete } from '../types';
import { gerarPdfComposicao } from '../utils/pdfGenerator';
import { calcularTotaisComposicao } from '../utils/limiteFinanceiro';
import { formatarSalvoEm } from '../utils/formatarSalvoEm';
import { api } from '../services/api';
import { Download, Save, Trash2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useConfirm } from './ConfirmDialog';

interface ComposicaoViewProps {
  gabineteSelecionado: Gabinete | null;
  usuarioAtual: any;
}

export const ComposicaoView: React.FC<ComposicaoViewProps> = ({ gabineteSelecionado, usuarioAtual }) => {
  const { confirmar } = useConfirm();
  // Estado das quantidades por símbolo (CC1 fixo em 1)
  const [quantidades, setQuantidades] = useState<Record<string, number>>({
    CC1: 1, CC2: 0, CC3: 0, CC4: 0, CC5: 0, CC6: 0, CC7: 0, CC8: 0, CC9: 0
  });

  const [salvos, setSalvos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'ok' | 'err' }>({
    texto: 'Composição válida.',
    tipo: 'ok'
  });
  const [atualId, setAtualId] = useState<string | null>(null);

  // Carregar composições salvas do Firestore
  const carregarSalvos = async () => {
    if (!gabineteSelecionado) return;
    try {
      setCarregando(true);
      const lista = await api.listarComposicoes(gabineteSelecionado.id);
      // Ordenar por data decrescente
      lista.sort((a, b) => new Date(b.salvoEm).getTime() - new Date(a.salvoEm).getTime());
      setSalvos(lista);
    } catch (e) {
      console.error('Erro ao carregar composições:', e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarSalvos();
  }, [gabineteSelecionado]);

  // Cálculos
  const totalPessoas = Object.values(quantidades).reduce((acc, q) => acc + q, 0);
  const { totalValor, excedeLimite } = calcularTotaisComposicao(quantidades);

  const invalido = quantidades.CC1 !== 1 || totalPessoas > MAX_PESSOAS_GABINETE || excedeLimite;

  // Validação em tempo real
  useEffect(() => {
    if (totalPessoas > MAX_PESSOAS_GABINETE) {
      setMensagem({ texto: `Número máximo de pessoas excedido (${totalPessoas}/${MAX_PESSOAS_GABINETE}).`, tipo: 'err' });
    } else if (excedeLimite) {
      setMensagem({ texto: `Limite financeiro excedido (R$ ${totalValor.toLocaleString('pt-BR', {minimumFractionDigits: 2})} / R$ ${LIMITE_FINANCEIRO_GABINETE.toLocaleString('pt-BR', {minimumFractionDigits: 2})}).`, tipo: 'err' });
    } else if (quantidades.CC1 !== 1) {
      setMensagem({ texto: 'O Gabinete deve possuir exatamente 1 Chefe de Gabinete (CC1).', tipo: 'err' });
    } else {
      setMensagem({ texto: 'Composição válida nos termos da Lei 16.546/2025.', tipo: 'ok' });
    }
  }, [quantidades, totalPessoas, totalValor]);

  const alterarQuantidade = (simbolo: string, delta: number) => {
    if (simbolo === 'CC1') return; // CC1 é fixo em 1
    const atual = quantidades[simbolo] || 0;
    const novo = Math.max(0, atual + delta);
    
    // Testar limite de pessoas
    const outrasPessoas = totalPessoas - atual;
    if (delta > 0 && outrasPessoas + novo > MAX_PESSOAS_GABINETE) {
      return;
    }

    setQuantidades(prev => ({ ...prev, [simbolo]: novo }));
  };

  const zerarComposicao = async () => {
    if (!(await confirmar({
      titulo: 'Zerar composição?',
      mensagem: 'Deseja zerar a composição do gabinete? Esta ação não pode ser desfeita.',
    }))) return;
    setQuantidades({ CC1: 1, CC2: 0, CC3: 0, CC4: 0, CC5: 0, CC6: 0, CC7: 0, CC8: 0, CC9: 0 });
    setAtualId(null);
  };

  const salvarComposicao = async () => {
    if (invalido) {
      alert('Composição inválida ou fora dos limites legais.');
      return;
    }
    if (!gabineteSelecionado) return;

    try {
      const dadosRegistro = {
        gabineteId: gabineteSelecionado.id,
        userId: usuarioAtual?.uid || 'anonimo',
        cargos: quantidades,
        salvoEm: new Date().toISOString()
      };

      await api.salvarComposicao(dadosRegistro);
      alert('Composição salva com sucesso no Firestore!');
      carregarSalvos();
    } catch (e) {
      console.error('Erro ao salvar composição:', e);
      alert('Erro ao salvar no Firestore.');
    }
  };

  const excluirSalvo = async (id: string) => {
    if (!(await confirmar({
      titulo: 'Excluir composição?',
      mensagem: 'Deseja excluir esta composição salva? Esta ação não pode ser desfeita.',
    }))) return;
    try {
      await api.excluirComposicao(id);
      carregarSalvos();
    } catch (e) {
      console.error('Erro ao excluir:', e);
    }
  };

  const carregarItemSalvo = (item: any) => {
    if (item.cargos) {
      setQuantidades({ CC1: 1, ...item.cargos });
      setAtualId(item.id);
      setMensagem({ texto: 'Composição carregada com sucesso.', tipo: 'ok' });
    }
  };

  const gerarPdf = async () => {
    if (invalido) {
      alert('Não é possível gerar PDF de composição inválida.');
      return;
    }
    try {
      const cargosComQ = CARGOS_GABINETE.map(c => ({
        ...c,
        q: quantidades[c.simbolo] || 0
      }));
      await gerarPdfComposicao(
        cargosComQ,
        gabineteSelecionado?.nome || 'Gabinete',
        gabineteSelecionado?.vereadorResponsavel || ''
      );
    } catch (e: any) {
      alert('Erro ao gerar PDF: ' + e.message);
    }
  };

  const pctBarra = Math.min(100, (totalValor / LIMITE_FINANCEIRO_GABINETE) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6">
      
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[#D9DEDB] p-6 rounded-lg shadow-xs">
        <div>
          <span className="text-xs font-bold text-brand-ink uppercase tracking-wider">Lei Municipal nº 16.546/2025</span>
          <h2 className="text-2xl font-bold text-[#182528] tracking-tight mt-1">Composição do Gabinete</h2>
          <p className="text-sm text-slate-600 mt-0.5">Gabinete Ativo: <strong>{gabineteSelecionado?.nome}</strong></p>
        </div>
      </div>

      {/* Lista de Cargos (CC1 a CC9) */}
      <div className="bg-white border border-[#D9DEDB] rounded-lg overflow-hidden shadow-xs">
        <div className="bg-slate-50 px-6 py-3 border-b border-[#D9DEDB] flex justify-between items-center text-xs font-bold text-slate-600 uppercase tracking-wider">
          <span>Cargo / Símbolo</span>
          <span>Quantidade / Vencimento</span>
        </div>

        <div className="divide-y divide-[#D9DEDB]">
          {CARGOS_GABINETE.map((cargo) => {
            const q = quantidades[cargo.simbolo] || 0;
            const isCC1 = cargo.simbolo === 'CC1';

            return (
              <div key={cargo.simbolo} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#182528]">{cargo.nome}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded border border-[#D9DEDB]">
                      {cargo.simbolo}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono mt-0.5 block">
                    R$ {cargo.vencimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} cada
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {isCC1 ? (
                    <div className="w-24 text-center py-1.5 bg-slate-100 border border-[#D9DEDB] text-xs font-bold rounded text-slate-700">
                      1 (Fixo)
                    </div>
                  ) : (
                    <div className="flex items-center border border-[#D9DEDB] rounded bg-white overflow-hidden shadow-xs">
                      <button
                        type="button"
                        onClick={() => alterarQuantidade(cargo.simbolo, -1)}
                        className="w-9 h-9 flex items-center justify-center text-lg font-bold text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="text"
                        readOnly
                        value={q}
                        className="w-10 text-center font-mono text-sm font-bold text-[#182528] bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => alterarQuantidade(cargo.simbolo, 1)}
                        disabled={totalPessoas >= MAX_PESSOAS_GABINETE}
                        className="w-9 h-9 flex items-center justify-center text-lg font-bold text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Caixa de Resumo e Indicadores */}
      <div className="bg-white border border-[#D9DEDB] rounded-lg p-6 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          <div className="bg-[#F2F3F1] p-4 rounded border border-[#D9DEDB]">
            <span className="text-xs font-bold text-slate-500 uppercase">Total de Pessoas</span>
            <div className="text-2xl font-bold font-mono text-[#182528] mt-1">
              {totalPessoas} <span className="text-xs text-slate-500">/ {MAX_PESSOAS_GABINETE} máx</span>
            </div>
          </div>

          <div className="bg-[#F2F3F1] p-4 rounded border border-[#D9DEDB]">
            <span className="text-xs font-bold text-slate-500 uppercase">Custo Total Mensal</span>
            <div className={`text-2xl font-bold font-mono mt-1 ${excedeLimite ? 'text-red-600' : 'text-brand-ink'}`}>
              R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-[#F2F3F1] p-4 rounded border border-[#D9DEDB]">
            <span className="text-xs font-bold text-slate-500 uppercase">Limite Legal (Teto)</span>
            <div className="text-2xl font-bold font-mono text-slate-800 mt-1">
              R$ {LIMITE_FINANCEIRO_GABINETE.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

        </div>

        {/* Barra de Progresso */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${invalido ? 'bg-red-600' : 'bg-brand-fill'}`}
              style={{ width: `${pctBarra}%` }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            {invalido ? (
              <span className="text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> {mensagem.texto}
              </span>
            ) : (
              <span className="text-brand-ink flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {mensagem.texto}
              </span>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#D9DEDB]">
          <button
            type="button"
            onClick={salvarComposicao}
            disabled={invalido}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-fill text-white text-sm font-semibold rounded hover:bg-brand-deep disabled:opacity-40 transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Composição</span>
          </button>

          <button
            type="button"
            onClick={gerarPdf}
            disabled={invalido}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-brand-ink border border-brand text-sm font-semibold rounded hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Gerar PDF</span>
          </button>

          <button
            type="button"
            onClick={zerarComposicao}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-slate-700 border border-[#D9DEDB] text-sm font-semibold rounded hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Zerar</span>
          </button>
        </div>

      </div>

      {/* Lista de Composições Salvas */}
      <div className="bg-white border border-[#D9DEDB] rounded-lg p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-[#182528]">Composições Salvas para {gabineteSelecionado?.nome}</h3>
        
        {carregando ? (
          <p className="text-xs text-slate-500">Carregando composições...</p>
        ) : salvos.length === 0 ? (
          <p className="text-xs text-slate-500">Nenhuma composição salva no momento.</p>
        ) : (
          <div className="space-y-2">
            {salvos.map(item => {
              const pes = Object.values(item.cargos || {}).reduce((a: any, b: any) => a + (Number(b) || 0), 0);
              const val = Object.entries(item.cargos || {}).reduce((acc: number, [sim, qtd]: any) => {
                const c = CARGOS_GABINETE.find(x => x.simbolo === sim);
                return acc + (c ? Number(qtd) * c.vencimento : 0);
              }, 0);

              return (
                <div 
                  key={item.id}
                  onClick={() => carregarItemSalvo(item)}
                  className="flex items-center justify-between p-4 border border-[#D9DEDB] rounded hover:border-brand cursor-pointer bg-slate-50/50 transition-colors"
                >
                  <div>
                    <span className="font-bold text-sm text-[#182528] block">
                      {Number(pes)} pessoas — R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-slate-500">Salvo em {formatarSalvoEm(item.salvoEm)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      excluirSalvo(item.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Excluir composição"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
