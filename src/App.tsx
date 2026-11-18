import React, { useState, useEffect, useRef } from 'react';
import { getApps } from 'firebase/app';
import {
  getAuth,
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { Gabinete, UsuarioPerfil, GABINETES_PADRAO } from './types';
import { api } from './services/api';
import { deveAplicarUsuarioAuth } from './services/authSequencia';
import { mapearPapel } from './services/firebase';
import { LoginView } from './components/LoginView';
import { CabecalhoInstitucional } from './components/CabecalhoInstitucional';
import { InicioView } from './components/InicioView';
import { ComposicaoView } from './components/ComposicaoView';
import { AdmissaoView } from './components/AdmissaoView';
import { ExoneracaoView } from './components/ExoneracaoView';
import { DeclaracaoView } from './components/DeclaracaoView';
import { AdminView } from './components/AdminView';
import { ConfirmProvider } from './components/ConfirmDialog';

type AbaAtiva = 'inicio' | 'gabinete' | 'admissao' | 'exoneracao' | 'declaracao' | 'admin';

function AppContent() {
  const [usuarioAtual, setUsuarioAtual] = useState<any>(null);
  const [perfilUsuario, setPerfilUsuario] = useState<UsuarioPerfil | null>(null);
  const [erroLogin, setErroLogin] = useState<string | undefined>(undefined);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('inicio');

  const gabinetesIniciais: Gabinete[] = GABINETES_PADRAO.map((g, i) => ({ id: 'gab_' + i, ...g }));
  const [gabinetes, setGabinetes] = useState<Gabinete[]>(gabinetesIniciais);
  const [todosGabinetes, setTodosGabinetes] = useState<Gabinete[]>(gabinetesIniciais);
  const [gabineteSelecionado, setGabineteSelecionado] = useState<Gabinete | null>(
    gabinetesIniciais.find((g) => g.nome.includes('Diego Martins')) || gabinetesIniciais[0]
  );
  const [carregandoDados, setCarregandoDados] = useState<boolean>(true);

  // Referência atualizada para o observer do Auth usar o gabinete mais recente.
  const gabinetesRef = useRef<Gabinete[]>(gabinetesIniciais);
  useEffect(() => {
    gabinetesRef.current = gabinetes;
  }, [gabinetes]);

  const firebaseIniciado = () => getApps().length > 0;

  // Invalida callbacks assíncronos do observer após logout/troca de sessão.
  const authSeqRef = useRef(0);

  const carregarGabinetes = async () => {
    try {
      const lista = await api.listarGabinetes();
      setTodosGabinetes(lista);
      // Se todos estiverem inativos, usa a lista real (não os dados de exemplo),
      // evitando ids órfãos em composições/admissões/exonerações/declarações.
      const base = lista.length > 0 ? lista : gabinetesIniciais;
      const ativos = base.filter((g) => g.ativo);
      const fonte = ativos.length > 0 ? ativos : base;
      setGabinetes(fonte);
      const atual = fonte.find((g) => g.id === gabineteSelecionado?.id) || null;
      if (!atual) {
        const diego = fonte.find((g) => g.nome.includes('Diego Martins')) || fonte[0];
        setGabineteSelecionado(diego);
      }
    } catch (e) {
      console.warn('Usando gabinetes locais padrão:', e);
    } finally {
      setCarregandoDados(false);
    }
  };

  useEffect(() => {
    carregarGabinetes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // O observer preenche usuário/perfil a partir do usuário autenticado e de suas
  // custom claims. Sem Firebase configurado, nada é registrado e a tela de login
  // continua disponível (com aviso amigável ao tentar entrar).
  useEffect(() => {
    if (!firebaseIniciado()) return;

    const unsubscribe = onAuthStateChanged(getAuth(), async (user: User | null) => {
      const seq = ++authSeqRef.current;
      if (!user) {
        setUsuarioAtual(null);
        setPerfilUsuario(null);
        return;
      }

      try {
        const { claims } = await getIdTokenResult(user);
        // Logout ou troca de usuário durante o await invalida este callback.
        if (!deveAplicarUsuarioAuth(authSeqRef.current, seq, getAuth().currentUser?.uid, user.uid)) {
          return;
        }
        const role = (claims.role ?? claims.papel) as string | undefined;
        const papel = mapearPapel(role);
        const nome = user.displayName || user.email || 'Usuário';

        setUsuarioAtual({
          uid: user.uid,
          email: user.email,
          displayName: nome,
          papel,
        });
        setPerfilUsuario({
          uid: user.uid,
          email: user.email || '',
          nome,
          papel,
          gabineteId: gabinetesRef.current[0]?.id || '',
          criadoEm: new Date().toISOString(),
        });
        setAbaAtiva('inicio');
        // A chamada do mount ocorre antes do login e pode ter recebido 401;
        // com o id token disponível, recarrega a lista autorizada.
        carregarGabinetes();
      } catch (e) {
        console.warn('Não foi possível carregar o perfil do usuário autenticado:', e);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogin = async (email: string, senha: string): Promise<void> => {
    setErroLogin(undefined);
    if (!firebaseIniciado()) {
      setErroLogin('Autenticação não configurada. Contate o administrador do sistema.');
      return;
    }

    try {
      await signInWithEmailAndPassword(getAuth(), email, senha);
    } catch (erro: any) {
      const codigo = erro?.code as string | undefined;
      if (
        codigo === 'auth/invalid-credential' ||
        codigo === 'auth/wrong-password' ||
        codigo === 'auth/user-not-found' ||
        codigo === 'auth/invalid-email'
      ) {
        setErroLogin('E-mail ou senha inválidos.');
      } else if (codigo === 'auth/too-many-requests') {
        setErroLogin('Muitas tentativas. Tente novamente mais tarde.');
      } else {
        setErroLogin('Não foi possível entrar. Tente novamente.');
      }
    }
  };

  const fazerLogout = async () => {
    // Invalida callbacks pendentes e só limpa o estado depois que a sessão real
    // foi encerrada; se signOut falhar, o usuário continua autenticado na UI.
    authSeqRef.current += 1;
    if (firebaseIniciado()) {
      try {
        await signOut(getAuth());
      } catch (erro) {
        console.warn('Não foi possível encerrar a sessão no Firebase:', erro);
        return;
      }
    }
    setUsuarioAtual(null);
    setPerfilUsuario(null);
  };

  if (carregandoDados) {
    return (
      <div className="min-h-screen bg-[#F2F3F1] flex items-center justify-center font-sans">
        <div className="bg-white p-8 rounded-lg border border-[#D9DEDB] text-center space-y-3 shadow-sm">
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-[#182528]">Carregando Portal do Vereador (CMC)...</p>
        </div>
      </div>
    );
  }

  if (!usuarioAtual) {
    return <LoginView onLogin={onLogin} erro={erroLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#F2F3F1] text-[#182528] font-sans antialiased selection:bg-brand-fill selection:text-white">
      {/* O ramo "sem usuário" do cabeçalho é inalcançável: App já renderiza LoginView. */}
      <CabecalhoInstitucional
        abaAtiva={abaAtiva}
        setAbaAtiva={setAbaAtiva}
        usuarioAtual={usuarioAtual}
        perfilUsuario={perfilUsuario}
        gabinetes={gabinetes}
        gabineteSelecionado={gabineteSelecionado}
        setGabineteSelecionado={setGabineteSelecionado}
        onSelecionarPerfil={() => {}}
        onLogout={fazerLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {abaAtiva === 'inicio' && (
          <InicioView setAbaAtiva={setAbaAtiva} gabineteSelecionado={gabineteSelecionado} />
        )}

        {abaAtiva === 'gabinete' && (
          <ComposicaoView gabineteSelecionado={gabineteSelecionado} usuarioAtual={usuarioAtual} />
        )}

        {abaAtiva === 'admissao' && (
          <AdmissaoView gabineteSelecionado={gabineteSelecionado} usuarioAtual={usuarioAtual} />
        )}

        {abaAtiva === 'exoneracao' && (
          <ExoneracaoView gabineteSelecionado={gabineteSelecionado} usuarioAtual={usuarioAtual} />
        )}

        {abaAtiva === 'declaracao' && (
          <DeclaracaoView gabineteSelecionado={gabineteSelecionado} usuarioAtual={usuarioAtual} />
        )}

        {abaAtiva === 'admin' && (
          <AdminView
            gabinetes={gabinetes}
            todosGabinetes={todosGabinetes}
            onAtualizarGabinetes={carregarGabinetes}
            usuarioAtual={usuarioAtual}
            perfilUsuario={perfilUsuario}
          />
        )}
      </main>

      <footer className="bg-white border-t border-[#D9DEDB] mt-16 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-bold text-[#182528]">Câmara Municipal de Curitiba</p>
          <p>Versão 1.00.00 de 17/11/2026</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ConfirmProvider>
      <AppContent />
    </ConfirmProvider>
  );
}
