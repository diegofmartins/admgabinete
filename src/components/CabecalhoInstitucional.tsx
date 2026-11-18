import React from 'react';
import { User, Shield, LogIn, LogOut, Building2, FileText, UserPlus, UserMinus, Home } from 'lucide-react';
import { Gabinete, UsuarioPerfil } from '../types';

interface CabecalhoInstitucionalProps {
  abaAtiva: 'inicio' | 'gabinete' | 'admissao' | 'exoneracao' | 'declaracao' | 'admin';
  setAbaAtiva: (aba: 'inicio' | 'gabinete' | 'admissao' | 'exoneracao' | 'declaracao' | 'admin') => void;
  usuarioAtual: any;
  perfilUsuario: UsuarioPerfil | null;
  gabinetes: Gabinete[];
  gabineteSelecionado: Gabinete | null;
  setGabineteSelecionado: (gab: Gabinete) => void;
  onSelecionarPerfil: (papel: 'admin' | 'assessor') => void;
  onLogout: () => void;
}

export const CabecalhoInstitucional: React.FC<CabecalhoInstitucionalProps> = ({
  abaAtiva,
  setAbaAtiva,
  usuarioAtual,
  perfilUsuario,
  gabinetes,
  gabineteSelecionado,
  setGabineteSelecionado,
  onSelecionarPerfil,
  onLogout
}) => {
  return (
    <header className="bg-white border-b border-[#D9DEDB] sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo e Título CMC */}
          <div className="flex items-center gap-3">
            <img 
              src={`${import.meta.env.BASE_URL}logo.png`} 
              alt="Câmara Municipal de Curitiba" 
              className="h-11 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="border-l border-[#D9DEDB] pl-3">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Câmara Municipal de Curitiba</span>
              <h1 className="text-base sm:text-lg font-bold text-[#182528] tracking-tight">Portal do Vereador — Gestão de Gabinetes</h1>
            </div>
          </div>

          {/* Autenticação e Seleção de Gabinete */}
          <div className="flex items-center gap-3">
            {usuarioAtual ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-[#182528]">{perfilUsuario?.nome || usuarioAtual.displayName || 'Usuário'}</span>
                  <span className="text-[10px] text-slate-500">
                    {perfilUsuario?.papel === 'admin' ? 'Administrador' : perfilUsuario?.papel === 'vereador' ? 'Vereador(a)' : 'Assessor'}
                  </span>
                </div>
                
                <button
                  onClick={onLogout}
                  title="Sair do sistema"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D9DEDB] bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-600" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => onSelecionarPerfil('admin')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-fill text-white text-xs sm:text-sm font-semibold rounded hover:bg-brand-deep transition-colors shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar com Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Seletor de Gabinete Ativo e Menu de Navegação */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 border-t border-[#D9DEDB]/60 gap-3">
          
          {/* Navegação por Abas */}
          <nav className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setAbaAtiva('inicio')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded transition-colors whitespace-nowrap ${
                abaAtiva === 'inicio' ? 'bg-brand-fill text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Início</span>
            </button>

            <button
              onClick={() => setAbaAtiva('gabinete')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded transition-colors whitespace-nowrap ${
                abaAtiva === 'gabinete' ? 'bg-brand-fill text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Composição</span>
            </button>

            <button
              onClick={() => setAbaAtiva('admissao')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded transition-colors whitespace-nowrap ${
                abaAtiva === 'admissao' ? 'bg-brand-fill text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Admissão</span>
            </button>

            <button
              onClick={() => setAbaAtiva('exoneracao')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded transition-colors whitespace-nowrap ${
                abaAtiva === 'exoneracao' ? 'bg-brand-fill text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <UserMinus className="w-4 h-4" />
              <span>Exoneração</span>
            </button>

            <button
              onClick={() => setAbaAtiva('declaracao')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded transition-colors whitespace-nowrap ${
                abaAtiva === 'declaracao' ? 'bg-brand-fill text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Declaração Nomeado</span>
            </button>

            {(perfilUsuario?.papel === 'admin' || !usuarioAtual) && (
              <button
                onClick={() => setAbaAtiva('admin')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded transition-colors whitespace-nowrap ${
                  abaAtiva === 'admin' ? 'bg-brand-fill text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Painel Admin</span>
              </button>
            )}
          </nav>

          {/* Seletor de Gabinete Ativo */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Gabinete:</span>
            <select
              value={gabineteSelecionado?.id || ''}
              onChange={(e) => {
                const gab = gabinetes.find(g => g.id === e.target.value);
                if (gab) setGabineteSelecionado(gab);
              }}
              className="bg-white border border-[#D9DEDB] text-slate-800 text-xs font-semibold rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {gabinetes.map(gab => (
                <option key={gab.id} value={gab.id}>
                  {gab.nome}
                </option>
              ))}
            </select>
          </div>

        </div>

      </div>
    </header>
  );
};
