import React from 'react';
import { Building2, UserPlus, UserMinus, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Gabinete } from '../types';

interface InicioViewProps {
  setAbaAtiva: (aba: 'inicio' | 'gabinete' | 'admissao' | 'exoneracao' | 'declaracao' | 'admin') => void;
  gabineteSelecionado: Gabinete | null;
}

export const InicioView: React.FC<InicioViewProps> = ({ setAbaAtiva, gabineteSelecionado }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      
      {/* Indicador de Gabinete Ativo */}
      <div className="bg-white border border-[#D9DEDB] rounded-lg p-5 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-500 font-bold block">Gabinete em Operação</span>
          <h2 className="text-lg font-bold text-[#182528] mt-0.5">{gabineteSelecionado?.nome || 'Nenhum gabinete selecionado'}</h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-ink bg-brand/10 px-3 py-1.5 rounded">
          <CheckCircle2 className="w-4 h-4" />
          <span>Ativo</span>
        </div>
      </div>

      {/* Módulos de Acesso Rápido */}
      <div>
        <h3 className="text-sm font-bold text-[#182528] uppercase tracking-wider mb-3">Módulos do Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div 
            onClick={() => setAbaAtiva('gabinete')}
            className="bg-white border border-[#D9DEDB] p-6 rounded-lg hover:border-brand transition-all cursor-pointer group shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded bg-brand/10 text-brand-ink flex items-center justify-center mb-4 group-hover:bg-brand-fill group-hover:text-white transition-colors">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#182528]">Composição do Gabinete</h4>
              <p className="text-xs text-slate-600 mt-1">
                Gerenciamento de cargos em comissão (CC1 a CC9) conforme Lei Municipal nº 16.546/2025.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-brand-ink">
              <span>Acessar</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div 
            onClick={() => setAbaAtiva('admissao')}
            className="bg-white border border-[#D9DEDB] p-6 rounded-lg hover:border-brand transition-all cursor-pointer group shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded bg-brand/10 text-brand-ink flex items-center justify-center mb-4 group-hover:bg-brand-fill group-hover:text-white transition-colors">
                <UserPlus className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#182528]">Admissão de Servidor</h4>
              <p className="text-xs text-slate-600 mt-1">
                Indicação para provimento em cargo em comissão e geração de PDF oficial.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-brand-ink">
              <span>Acessar</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div 
            onClick={() => setAbaAtiva('exoneracao')}
            className="bg-white border border-[#D9DEDB] p-6 rounded-lg hover:border-brand transition-all cursor-pointer group shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded bg-brand/10 text-brand-ink flex items-center justify-center mb-4 group-hover:bg-brand-fill group-hover:text-white transition-colors">
                <UserMinus className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#182528]">Exoneração de Servidor</h4>
              <p className="text-xs text-slate-600 mt-1">
                Indicação para exoneração de cargo em comissão e emissão de requerimento em PDF.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-brand-ink">
              <span>Acessar</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div 
            onClick={() => setAbaAtiva('declaracao')}
            className="bg-white border border-[#D9DEDB] p-6 rounded-lg hover:border-brand transition-all cursor-pointer group shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded bg-brand/10 text-brand-ink flex items-center justify-center mb-4 group-hover:bg-brand-fill group-hover:text-white transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#182528]">Declaração do Servidor Nomeado</h4>
              <p className="text-xs text-slate-600 mt-1">
                Formulário de declarações legais (Súmula Vinculante nº 13, IRPF, LCM 86/2012 e LGPD).
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-brand-ink">
              <span>Acessar</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
