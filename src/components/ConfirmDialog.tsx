import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmarOpcoes {
  titulo: string;
  mensagem: string;
  textoConfirmar?: string;
}

interface EstadoConfirmacao extends ConfirmarOpcoes {
  resolver: (valor: boolean) => void;
}

interface ConfirmContextValue {
  confirmar: (opcoes: ConfirmarOpcoes) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoConfirmacao | null>(null);
  const estadoRef = useRef<EstadoConfirmacao | null>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const dialogoRef = useRef<HTMLDivElement>(null);
  const elementoAnteriorRef = useRef<HTMLElement | null>(null);
  const abertoEmRef = useRef(0);

  const confirmar = useCallback((opcoes: ConfirmarOpcoes) => new Promise<boolean>((resolve) => {
    estadoRef.current?.resolver(false);
    estadoRef.current = { ...opcoes, resolver: resolve };
    abertoEmRef.current = Date.now();
    setEstado(estadoRef.current);
  }), []);

  const fechar = useCallback((valor: boolean) => {
    const atual = estadoRef.current;
    if (!atual) return;
    estadoRef.current = null;
    setEstado(null);
    atual.resolver(valor);
  }, []);

  useEffect(() => {
    if (!estado) return;
    elementoAnteriorRef.current = document.activeElement as HTMLElement | null;
    cancelarRef.current?.focus();
    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        fechar(false);
        return;
      }
      if (event.key !== 'Tab' || !dialogoRef.current) return;
      const focaveis = Array.from(dialogoRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (!focaveis.length) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (event.shiftKey && document.activeElement === primeiro) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primeiro.focus();
      }
    };
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
      elementoAnteriorRef.current?.focus();
    };
  }, [estado, fechar]);

  const valorContexto = useMemo(() => ({ confirmar }), [confirmar]);

  return (
    <ConfirmContext.Provider value={valorContexto}>
      {children}
      {estado && (
        <div
          data-confirm-dialog
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && Date.now() - abertoEmRef.current > 200) fechar(false);
          }}
        >
          <div
            ref={dialogoRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-titulo"
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="space-y-2">
                <h2 id="confirm-dialog-titulo" className="text-base font-bold text-[#182528]">{estado.titulo}</h2>
                <p className="text-sm text-slate-600">{estado.mensagem}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                ref={cancelarRef}
                type="button"
                onClick={() => fechar(false)}
                className="px-4 py-2 rounded border border-[#D9DEDB] bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => fechar(true)}
                className="px-4 py-2 rounded bg-red-600 text-sm font-semibold text-white hover:bg-red-700"
              >
                {estado.textoConfirmar || 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const contexto = useContext(ConfirmContext);
  if (!contexto) {
    throw new Error('useConfirm deve ser usado dentro de ConfirmProvider');
  }
  return contexto;
}
