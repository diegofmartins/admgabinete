import React, { useState } from 'react';

interface LoginViewProps {
  onLogin: () => Promise<void>;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [enviando, setEnviando] = useState(false);

  const handleClick = async () => {
    if (enviando) return;
    setEnviando(true);
    try {
      await onLogin();
    } catch {
      // Tela sem mensagens: qualquer falha apenas mantém o usuário aqui.
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

      {/* Centro: acesso institucional */}
      <main className="max-w-md mx-auto px-4 py-16 w-full">
        <div className="bg-white border border-[#D9DEDB] rounded-xl p-8 shadow-sm space-y-8 text-center">
          <h2 className="text-xl font-bold text-[#182528]">
            Acesse com sua conta institucional
          </h2>

          <button
            type="button"
            onClick={handleClick}
            disabled={enviando}
            className="w-full h-12 bg-white border border-[#D9DEDB] text-[#182528] font-semibold rounded-lg hover:bg-[#F7F8F7] transition-all flex items-center justify-center gap-3 shadow-sm text-sm sm:text-base cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>Entrar com Google</span>
          </button>
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
