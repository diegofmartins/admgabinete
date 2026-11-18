import React, { useState, useEffect } from 'react';
import { Gabinete, UsuarioPerfil, TipoGabinete } from '../types';
import { api } from '../services/api';
import { Shield, Plus, Trash2, Edit2, Check, X, Building2, Users } from 'lucide-react';
import { useConfirm } from './ConfirmDialog';

interface AdminViewProps {
  gabinetes: Gabinete[];
  todosGabinetes?: Gabinete[];
  onAtualizarGabinetes: () => void;
  usuarioAtual: any;
  perfilUsuario: UsuarioPerfil | null;
}

export const AdminView: React.FC<AdminViewProps> = ({ gabinetes, todosGabinetes, onAtualizarGabinetes, usuarioAtual, perfilUsuario }) => {
  const { confirmar } = useConfirm();
  // A gestão lista todos os gabinetes (inclusive inativos, para permitir reativar);
  // os seletores de usuário continuam usando apenas os ativos.
  const gabinetesGerenciados = todosGabinetes ?? gabinetes;
  const [usuarios, setUsuarios] = useState<UsuarioPerfil[]>([]);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);
  
  // Novo Gabinete Form
  const [novoNomeGab, setNovoNomeGab] = useState('');
  const [novoTipoGab, setNovoTipoGab] = useState<TipoGabinete>('vereador');
  const [novoVereadorGab, setNovoVereadorGab] = useState('');

  // Edição inline de gabinete
  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const [edicaoNome, setEdicaoNome] = useState('');
  const [edicaoTipo, setEdicaoTipo] = useState<TipoGabinete>('vereador');
  const [edicaoResponsavel, setEdicaoResponsavel] = useState('');
  const [edicaoAtivo, setEdicaoAtivo] = useState(true);

  // Novo Usuário Form
  const [novoEmailUser, setNovoEmailUser] = useState('');
  const [novoNomeUser, setNovoNomeUser] = useState('');
  const [novoPapelUser, setNovoPapelUser] = useState<'admin' | 'assessor' | 'vereador'>('assessor');
  const [novoGabIdUser, setNovoGabIdUser] = useState(gabinetes[0]?.id || '');

  const carregarUsuarios = async () => {
    try {
      setCarregandoUsuarios(true);
      const lista = await api.listarUsuarios();
      setUsuarios(lista);
    } catch (e) {
      console.error('Erro ao carregar usuários:', e);
    } finally {
      setCarregandoUsuarios(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  // Se o gabinete selecionado para o novo usuário deixar de estar ativo,
  // move a seleção para o primeiro ativo disponível.
  useEffect(() => {
    if (!gabinetes.some((g) => g.id === novoGabIdUser)) {
      setNovoGabIdUser(gabinetes[0]?.id || '');
    }
  }, [gabinetes, novoGabIdUser]);

  const adicionarGabinete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNomeGab.trim()) return;

    try {
      await api.criarGabinete({
        nome: novoNomeGab,
        tipo: novoTipoGab,
        vereadorResponsavel: novoVereadorGab,
        ativo: true
      });
      setNovoNomeGab('');
      setNovoVereadorGab('');
      await onAtualizarGabinetes();
      alert('Gabinete cadastrado com sucesso!');
    } catch (err) {
      console.error('Erro ao cadastrar gabinete:', err);
      alert('Erro ao cadastrar gabinete.');
    }
  };

  const excluirGabinete = async (id: string) => {
    if (!(await confirmar({
      titulo: 'Excluir gabinete?',
      mensagem: 'Deseja excluir este gabinete? Esta ação não pode ser desfeita.',
    }))) return;
    try {
      await api.excluirGabinete(id);
      await onAtualizarGabinetes();
    } catch (e) {
      console.error('Erro ao excluir gabinete:', e);
    }
  };

  const iniciarEdicao = (gab: Gabinete) => {
    setIdEmEdicao(gab.id);
    setEdicaoNome(gab.nome);
    setEdicaoTipo(gab.tipo);
    setEdicaoResponsavel(gab.vereadorResponsavel || '');
    setEdicaoAtivo(gab.ativo);
  };

  const cancelarEdicao = () => {
    setIdEmEdicao(null);
    setEdicaoNome('');
    setEdicaoResponsavel('');
  };

  const salvarEdicao = async (id: string) => {
    if (!edicaoNome.trim()) {
      alert('Nome do gabinete é obrigatório.');
      return;
    }
    try {
      await api.atualizarGabinete(id, {
        nome: edicaoNome.trim(),
        tipo: edicaoTipo,
        vereadorResponsavel: edicaoResponsavel.trim(),
        ativo: edicaoAtivo
      });
      setIdEmEdicao(null);
      await onAtualizarGabinetes();
    } catch (e) {
      console.error('Erro ao atualizar gabinete:', e);
      alert('Erro ao atualizar gabinete.');
    }
  };

  const salvarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoEmailUser.trim() || !novoNomeUser.trim()) return;

    try {
      await api.criarUsuario({
        email: novoEmailUser,
        nome: novoNomeUser,
        papel: novoPapelUser,
        gabineteId: novoGabIdUser || gabinetes[0]?.id || ''
      });
      setNovoEmailUser('');
      setNovoNomeUser('');
      carregarUsuarios();
      alert('Usuário cadastrado com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
      alert('Erro ao salvar usuário.');
    }
  };

  const excluirUsuario = async (uid: string) => {
    if (!(await confirmar({
      titulo: 'Remover usuário?',
      mensagem: 'Deseja remover este usuário? Esta ação não pode ser desfeita.',
    }))) return;
    try {
      await api.excluirUsuario(uid);
      carregarUsuarios();
    } catch (e) {
      console.error('Erro ao excluir usuário:', e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      
      {/* Cabeçalho */}
      <div className="bg-white border border-[#D9DEDB] p-6 rounded-lg shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-brand-ink uppercase tracking-wider">Acesso Restrito</span>
          <h2 className="text-2xl font-bold text-[#182528] tracking-tight mt-1">Painel Administrativo do Sistema</h2>
          <p className="text-sm text-slate-600 mt-0.5">Gestão de gabinetes (38 vereadores, lideranças, presidência e secretarias) e controle de usuários.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-brand/10 text-brand-ink px-3 py-1.5 rounded font-bold text-xs">
          <Shield className="w-4 h-4" />
          <span>Admin CMC</span>
        </div>
      </div>

      {/* Grid de Gestão */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Gestão de Gabinetes */}
        <div className="bg-white border border-[#D9DEDB] rounded-lg p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-[#D9DEDB] pb-3">
            <Building2 className="w-5 h-5 text-brand-ink" />
            <h3 className="text-base font-bold text-[#182528]">Gerenciar Gabinetes ({gabinetesGerenciados.length})</h3>
          </div>

          {/* Formulário Novo Gabinete */}
          <form onSubmit={adicionarGabinete} className="space-y-4 bg-slate-50 p-4 rounded border border-[#D9DEDB]">
            <h4 className="text-xs font-bold text-slate-700 uppercase">Cadastrar Novo Gabinete</h4>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Nome do Gabinete</label>
              <input
                type="text"
                value={novoNomeGab}
                onChange={(e) => setNovoNomeGab(e.target.value)}
                placeholder="Ex: Gabinete do Vereador Nome"
                className="w-full h-10 px-3 border border-[#D9DEDB] rounded text-sm bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Tipo</label>
                <select
                  value={novoTipoGab}
                  onChange={(e) => setNovoTipoGab(e.target.value as TipoGabinete)}
                  className="w-full h-10 px-3 border border-[#D9DEDB] rounded text-sm bg-white"
                >
                  <option value="vereador">Vereador(a)</option>
                  <option value="lideranca">Liderança</option>
                  <option value="presidencia">Presidência</option>
                  <option value="secretaria">Secretaria</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Responsável</label>
                <input
                  type="text"
                  value={novoVereadorGab}
                  onChange={(e) => setNovoVereadorGab(e.target.value)}
                  placeholder="Nome do(a) vereador(a)"
                  className="w-full h-10 px-3 border border-[#D9DEDB] rounded text-sm bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-10 bg-brand-fill text-white text-xs font-semibold rounded hover:bg-brand-deep transition-colors"
            >
              Adicionar Gabinete
            </button>
          </form>

          {/* Lista de Gabinetes */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {gabinetesGerenciados.map(gab => (
              idEmEdicao === gab.id ? (
                <div key={gab.id} className="p-3 border border-brand rounded bg-slate-50 space-y-3 text-xs">
                  <div className="space-y-1.5">
                    <label htmlFor="edicao-nome" className="text-[10px] font-bold text-slate-600 uppercase">Nome do Gabinete</label>
                    <input
                      id="edicao-nome"
                      type="text"
                      value={edicaoNome}
                      onChange={(e) => setEdicaoNome(e.target.value)}
                      className="w-full h-9 px-2 border border-[#D9DEDB] rounded text-sm bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label htmlFor="edicao-tipo" className="text-[10px] font-bold text-slate-600 uppercase">Tipo</label>
                      <select
                        id="edicao-tipo"
                        value={edicaoTipo}
                        onChange={(e) => setEdicaoTipo(e.target.value as TipoGabinete)}
                        className="w-full h-9 px-2 border border-[#D9DEDB] rounded text-sm bg-white"
                      >
                        <option value="vereador">Vereador(a)</option>
                        <option value="lideranca">Liderança</option>
                        <option value="presidencia">Presidência</option>
                        <option value="secretaria">Secretaria</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="edicao-responsavel" className="text-[10px] font-bold text-slate-600 uppercase">Responsável</label>
                      <input
                        id="edicao-responsavel"
                        type="text"
                        value={edicaoResponsavel}
                        onChange={(e) => setEdicaoResponsavel(e.target.value)}
                        className="w-full h-9 px-2 border border-[#D9DEDB] rounded text-sm bg-white"
                      />
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={edicaoAtivo}
                      onChange={(e) => setEdicaoAtivo(e.target.checked)}
                      className="h-4 w-4 text-brand-ink border-[#D9DEDB] rounded"
                    />
                    Ativo
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => salvarEdicao(gab.id)}
                      className="inline-flex items-center gap-1 px-3 h-8 bg-brand-fill text-white font-semibold rounded hover:bg-brand-deep transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Salvar
                    </button>
                    <button
                      type="button"
                      onClick={cancelarEdicao}
                      className="inline-flex items-center gap-1 px-3 h-8 bg-white text-slate-700 border border-[#D9DEDB] font-semibold rounded hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div key={gab.id} className="flex items-center justify-between p-3 border border-[#D9DEDB] rounded bg-white text-xs">
                  <div>
                    <span className="font-bold text-[#182528] block">{gab.nome}</span>
                    <span className="text-slate-500 uppercase text-[10px]">
                      {gab.tipo}{gab.ativo ? '' : ' · inativo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => iniciarEdicao(gab)}
                      title="Editar gabinete"
                      className="p-1.5 text-brand-ink hover:bg-brand/10 rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => excluirGabinete(gab.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Gestão de Usuários */}
        <div className="bg-white border border-[#D9DEDB] rounded-lg p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-[#D9DEDB] pb-3">
            <Users className="w-5 h-5 text-brand-ink" />
            <h3 className="text-base font-bold text-[#182528]">Gerenciar Usuários & Acessos</h3>
          </div>

          {/* Formulário Novo Usuário */}
          <form onSubmit={salvarUsuario} className="space-y-4 bg-slate-50 p-4 rounded border border-[#D9DEDB]">
            <h4 className="text-xs font-bold text-slate-700 uppercase">Cadastrar Novo Usuário</h4>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">E-mail (Google)</label>
              <input
                type="email"
                value={novoEmailUser}
                onChange={(e) => setNovoEmailUser(e.target.value)}
                placeholder="usuario@cmc.pr.gov.br"
                className="w-full h-10 px-3 border border-[#D9DEDB] rounded text-sm bg-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Nome</label>
              <input
                type="text"
                value={novoNomeUser}
                onChange={(e) => setNovoNomeUser(e.target.value)}
                placeholder="Nome completo"
                className="w-full h-10 px-3 border border-[#D9DEDB] rounded text-sm bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Papel</label>
                <select
                  value={novoPapelUser}
                  onChange={(e) => setNovoPapelUser(e.target.value as any)}
                  className="w-full h-10 px-3 border border-[#D9DEDB] rounded text-sm bg-white"
                >
                  <option value="assessor">Assessor</option>
                  <option value="vereador">Vereador(a)</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Gabinete Vinculado</label>
                <select
                  value={novoGabIdUser}
                  onChange={(e) => setNovoGabIdUser(e.target.value)}
                  className="w-full h-10 px-3 border border-[#D9DEDB] rounded text-sm bg-white"
                >
                  {gabinetes.map(g => (
                    <option key={g.id} value={g.id}>{g.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-10 bg-brand-fill text-white text-xs font-semibold rounded hover:bg-brand-deep transition-colors"
            >
              Cadastrar Usuário
            </button>
          </form>

          {/* Lista de Usuários */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {carregandoUsuarios ? (
              <p className="text-xs text-slate-500">Carregando usuários...</p>
            ) : usuarios.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum usuário cadastrado.</p>
            ) : (
              usuarios.map(u => (
                <div key={u.uid} className="flex items-center justify-between p-3 border border-[#D9DEDB] rounded bg-white text-xs">
                  <div>
                    <span className="font-bold text-[#182528] block">{u.nome} ({u.email})</span>
                    <span className="text-slate-500 text-[10px] uppercase">Papel: {u.papel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => excluirUsuario(u.uid)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
