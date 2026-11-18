import React, { useState } from 'react';
import { Shield, LogIn, Mail, LockKeyhole } from 'lucide-react';

interface LoginViewProps {
  onLogin: (email: string, senha: string) => Promise<void>;
  erro?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, erro }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true);
    try {
      await onLogin(email.trim(), senha);
    } catch {
      // onLogin traduz falhas em mensagem amigável; evita rejeição não tratada.
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F3F1] flex flex-col justify-between font-sans">

      {/* Cabeçalho */}
      <header className="bg-white border-b border-[#D9DEDB] py-4 px-6 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Câmara Municipal de Curitiba"
              className="h-12 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="border-l border-[#D9DEDB] pl-3">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-bold block">Câmara Municipal de Curitiba</span>
              <h1 className="text-sm sm:text-base font-bold text-[#182528] tracking-tight">Sistema de Administração do Gabinete</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Centro: Card de Acesso Restrito */}
      <main className="max-w-md mx-auto px-4 py-16 w-full">
        <div className="bg-white border border-[#D9DEDB] rounded-xl p-8 shadow-sm space-y-6 text-center">
          <div className="w-16 h-16 bg-brand/10 text-brand-ink rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Shield className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#182528]">Acesso Restrito</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Informe seu e-mail e senha institucionais para acessar o sistema.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-xs font-semibold text-[#182528]">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@cmc.pr.gov.br"
                  className="w-full h-11 pl-10 pr-3 border border-[#D9DEDB] rounded-lg text-sm text-[#182528] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-senha" className="block text-xs font-semibold text-[#182528]">Senha</label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-senha"
                  name="senha"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-3 border border-[#D9DEDB] rounded-lg text-sm text-[#182528] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            {erro && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full h-12 bg-brand-fill text-white font-semibold rounded-lg hover:bg-brand-deep transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow text-sm sm:text-base cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <LogIn className="w-5 h-5" />
              <span>{enviando ? 'Entrando...' : 'Entrar'}</span>
            </button>
          </form>
        </div>
      </main>

      {/* Rodapé */}
      <footer className="bg-white border-t border-[#D9DEDB] py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-slate-600">Sistema de Administração do Gabinete — Versão 1.0.0</p>
        </div>
      </footer>

    </div>
  );
};
