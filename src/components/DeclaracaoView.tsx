import React, { useState, useEffect, useRef } from 'react';
import { Gabinete, CARGOS_GABINETE, AtividadeRendida, DependenteIRPF } from '../types';
import { gerarPdfDeclaracao } from '../utils/pdfGenerator';
import { validarCPF, formatarCPF } from '../utils/validador';
import { formatarSalvoEm } from '../utils/formatarSalvoEm';
import { api } from '../services/api';
import { Download, Save, Trash2, FileText, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useConfirm } from './ConfirmDialog';

interface DeclaracaoViewProps {
  gabineteSelecionado: Gabinete | null;
  usuarioAtual: any;
}

const codigosIrpf: Record<string, string> = {
  '1': '1. Companheiro(a) com quem o contribuinte tenha filho ou viva há mais de 5 anos, ou cônjuge.',
  '2': '2. Filho(a) ou enteado(a), até 21 anos, ou em qualquer idade quando incapacitado física ou mentalmente.',
  '3': '3. Filho(a) ou enteado(a) universitário ou cursando escola técnica de segundo grau, até 24 anos.',
  '4': '4. Irmão, neto ou bisneto, sem arrimo dos pais, guarda judicial, até 21 anos ou incapacitado.',
  '5': '5. Irmão, neto ou bisneto, sem arrimo dos pais, de 21 a 24 anos, cursando ensino superior ou técnica.',
  '6': '6. Pais, avós ou bisavós que tenham recebido rendimentos tributáveis ou não, até R$ 22.847,76.',
  '7': '7. Menor pobre até 21 anos que o contribuinte crie e eduque e de quem detém a guarda judicial.',
  '8': '8. Pessoa absolutamente incapaz, da qual o contribuinte seja tutor ou curador.',
  '9': '9. Em caso de pais separados, o filho sob guarda judicial ou acordo homologado.'
};

export const DeclaracaoView: React.FC<DeclaracaoViewProps> = ({ gabineteSelecionado, usuarioAtual }) => {
  const { confirmar } = useConfirm();
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cargoPretendido, setCargoPretendido] = useState('Assessor de Gabinete Parlamentar');
  const [simbolo, setSimbolo] = useState('CC6');

  // Dados Cadastrais (Formulário 2 – Dados Cadastrais para Nomeação)
  const [dataNasc, setDataNasc] = useState('');
  const [endereco, setEndereco] = useState({ cep: '', logradouro: '', bairro: '', complemento: '', cidade: '', estado: '', numero: '' });
  const [rg, setRg] = useState('');
  const [orgaoExpedidor, setOrgaoExpedidor] = useState('');
  const [pisPasep, setPisPasep] = useState('');
  const [tituloEleitoral, setTituloEleitoral] = useState('');
  const [tituloEleitoralZona, setTituloEleitoralZona] = useState('');
  const [tituloEleitoralSecao, setTituloEleitoralSecao] = useState('');
  const [estadoCivil, setEstadoCivil] = useState('');
  const [racaCor, setRacaCor] = useState('');
  const [nacionalidade, setNacionalidade] = useState('Brasileira');
  const [naturalidade, setNaturalidade] = useState('');
  const [deficiencia, setDeficiencia] = useState(false);
  const [deficienciaEspecifica, setDeficienciaEspecifica] = useState('');
  const [ctps, setCtps] = useState('');
  const [ctpsSerie, setCtpsSerie] = useState('');
  const [ctpsEmitidoEm, setCtpsEmitidoEm] = useState('');
  const [escolaridade, setEscolaridade] = useState('');
  const [escolaridadeCompleta, setEscolaridadeCompleta] = useState('');
  const [bancoAgencia, setBancoAgencia] = useState('0369');
  const [bancoConta, setBancoConta] = useState('');
  const [filiacao, setFiliacao] = useState<{ nome: string; cpf: string; nasc: string; parentesco?: string; irpf?: 'nao' | 'sim'; cod?: string }[]>([
    { nome: '', cpf: '', nasc: '', parentesco: '' },
    { nome: '', cpf: '', nasc: '', parentesco: '' },
  ]);

  const [declaracaoSemParentesco, setDeclaracaoSemParentesco] = useState(false);

  const [atividade, setAtividade] = useState<'nao' | 'sim'>('nao');
  const [atividades, setAtividades] = useState<AtividadeRendida[]>([]);

  const [dependentes, setDependentes] = useState<DependenteIRPF[]>([]);

  const [declaracaoImpedimento, setDeclaracaoImpedimento] = useState(false);
  const [autorizaUsoDadosLGPD, setAutorizaUsoDadosLGPD] = useState(false);
  const [declaracaoVeracidade, setDeclaracaoVeracidade] = useState(false);
  const [autorizaContatoCampanhas, setAutorizaContatoCampanhas] = useState(false);

  const [salvos, setSalvos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState({ texto: '', tipo: 'ok' as 'ok' | 'err' });

  useEffect(() => {
    if (gabineteSelecionado) {
      carregarSalvos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gabineteSelecionado]);

  const exigeConjuge = (estado: string) => estado === 'Casado(a)' || estado === 'União estável';
  const novoTipoConjuge = (): DependenteIRPF => ({ nome: '', cpf: '', nasc: '', cod: '1', irpf: 'sim', tipo: 'conjuge' });
  const conjugeGuardado = useRef<DependenteIRPF | null>(null);

  const alterarEstadoCivil = (novoEstado: string) => {
    const temConjuge = dependentes.some((d) => d.tipo === 'conjuge');
    if (exigeConjuge(novoEstado) && !temConjuge) {
      const conjuge = conjugeGuardado.current || novoTipoConjuge();
      conjugeGuardado.current = null;
      setDependentes((prev) => [conjuge, ...prev]);
    } else if (!exigeConjuge(novoEstado) && temConjuge) {
      conjugeGuardado.current = dependentes.find((d) => d.tipo === 'conjuge') || null;
      setDependentes((prev) => prev.filter((d) => d.tipo !== 'conjuge'));
    }
    setEstadoCivil(novoEstado);
  };

  const cpfNumeros = cpf.replace(/[^\d]/g, '');
  const cpfValido = cpfNumeros.length === 11 ? validarCPF(cpf) : null;

  const formatarTelefoneCadastro = (valor: string) => {
    const d = valor.replace(/\D/g, '').slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
  };

  const formatarCEP = (valor: string) => {
    const d = valor.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  };

  const buscarCep = async (cep: string) => {
    const limpo = cep.replace(/\D/g, '').slice(0, 8);
    if (limpo.length < 8) {
      setMsg({ texto: 'Informe um CEP válido (8 dígitos).', tipo: 'err' });
      return;
    }
    let data: any = null;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      data = await res.json();
    } catch (e) {
      console.error('Erro ao buscar CEP via ViaCEP:', e);
      data = null;
    }
    if (data && data.status === 'OK') {
      setEndereco((prev) => ({
        ...prev,
        cep: formatarCEP(limpo),
        logradouro: data.logradouro || prev.logradouro,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado
      }));
      setMsg({ texto: 'Endereço encontrado para o CEP informado.', tipo: 'ok' });
      return;
    }
    // Fallback: OpenCEP
    try {
      const res = await fetch(`https://opencep.com/v1/${limpo}`);
      const d2 = await res.json();
      if (d2 && d2.cep) {
        setEndereco((prev) => ({
          ...prev,
          cep: formatarCEP(limpo),
          logradouro: d2.logradouro || prev.logradouro,
          bairro: d2.bairro || prev.bairro,
          cidade: d2.localidade || prev.cidade,
          estado: d2.uf || prev.estado
        }));
        setMsg({ texto: 'Endereço encontrado para o CEP informado.', tipo: 'ok' });
        return;
      }
    } catch (e) {
      console.error('Erro ao buscar CEP via OpenCEP:', e);
    }
    setMsg({ texto: 'CEP não encontrado.', tipo: 'err' });
  };

  const carregarSalvos = async () => {
    if (!gabineteSelecionado) return;
    try {
      setCarregando(true);
      const lista = await api.listarDeclaracoes(gabineteSelecionado.id);
      lista.sort((a, b) => new Date(b.salvoEm).getTime() - new Date(a.salvoEm).getTime());
      setSalvos(lista);
    } catch (e) {
      console.error('Erro ao carregar declarações:', e);
    } finally {
      setCarregando(false);
    }
  };

  const limparFormulario = () => {
    setNomeCompleto('');
    setCpf('');
    setEmail('');
    setTelefone('');
    setCargoPretendido('Assessor de Gabinete Parlamentar');
    setSimbolo('CC6');
    setAtividade('nao');
    setAtividades([]);
    setDependentes([]);
    conjugeGuardado.current = null;
    setDeclaracaoImpedimento(false);
    setAutorizaUsoDadosLGPD(false);
    setDeclaracaoVeracidade(false);
    setAutorizaContatoCampanhas(false);
    setDataNasc('');
    setEndereco({ cep: '', logradouro: '', bairro: '', complemento: '', cidade: '', estado: '', numero: '' });
    setRg('');
    setOrgaoExpedidor('');
    setPisPasep('');
    setTituloEleitoral('');
    setTituloEleitoralZona('');
    setTituloEleitoralSecao('');
    setEstadoCivil('');
    setRacaCor('');
    setNacionalidade('Brasileira');
    setNaturalidade('');
    setDeficiencia(false);
    setDeficienciaEspecifica('');
    setCtps('');
    setCtpsSerie('');
    setCtpsEmitidoEm('');
    setEscolaridade('');
    setEscolaridadeCompleta('');
    setBancoAgencia('0369');
    setBancoConta('');
    setFiliacao([{ nome: '', cpf: '', nasc: '', parentesco: '' }, { nome: '', cpf: '', nasc: '', parentesco: '' }]);
    setDeclaracaoSemParentesco(false);
    setMsg({ texto: '', tipo: 'ok' });
  };

  const salvarDeclaracao = async () => {
    if (!validar()) return;
    if (!gabineteSelecionado) return;

    try {
      const dados = {
        gabineteId: gabineteSelecionado.id,
        userId: usuarioAtual?.uid || 'anonimo',
        nomeCompleto,
        cpf,
        email,
        telefone,
        cargoPretendido,
        simbolo,
        parentesco: 'nao',
        parentes: [],
        atividade,
        atividades,
        dependentes,
        declaracaoImpedimento,
        autorizaUsoDadosLGPD,
        declaracaoVeracidade,
        autorizaContatoCampanhas: autorizaContatoCampanhas,
        localData: new Date().toLocaleDateString('pt-BR'),
        salvoEm: new Date().toISOString(),
        // Dados Cadastrais (Formulário 2 – Dados Cadastrais para Nomeação)
        dataNasc,
        endereco,
        rg,
        orgaoExpedidor,
        pisPasep,
        tituloEleitoral,
        tituloEleitoralZona,
        tituloEleitoralSecao,
        estadoCivil,
        racaCor,
        nacionalidade,
        naturalidade,
        deficiencia,
        deficienciaEspecifica,
        ctps,
        ctpsSerie,
        ctpsEmitidoEm,
        escolaridade,
        escolaridadeCompleta,
        bancoAgencia,
        bancoConta,
        filiacao
      };

      await api.salvarDeclaracao(dados);
      setMsg({ texto: 'Declaração salva com sucesso no Firestore!', tipo: 'ok' });
      carregarSalvos();
    } catch (e) {
      console.error('Erro ao salvar declaração:', e);
      setMsg({ texto: 'Erro ao salvar no Firestore.', tipo: 'err' });
    }
  };

  const excluirSalvo = async (id: string) => {
    if (!(await confirmar({
      titulo: 'Excluir declaração?',
      mensagem: 'Deseja excluir esta declaração salva? Esta ação não pode ser desfeita.',
    }))) return;
    try {
      await api.excluirDeclaracao(id);
      carregarSalvos();
    } catch (e) {
      console.error('Erro ao excluir:', e);
    }
  };

  const carregarItem = (item: any) => {
    setNomeCompleto(item.nomeCompleto || '');
    setCpf(item.cpf || '');
    setEmail(item.email || '');
    setTelefone(item.telefone || '');
    setCargoPretendido(item.cargoPretendido || 'Assessor de Gabinete Parlamentar');
    setSimbolo(item.simbolo || 'CC6');
    setDeclaracaoSemParentesco(item.parentesco === 'nao');
    setAtividade(item.atividade || 'nao');
    setAtividades(item.atividades || []);
    const estado = item.estadoCivil || '';
    const lista = (item.dependentes || []) as DependenteIRPF[];
    const conjuge = lista.find((d) => d.tipo === 'conjuge');
    if (exigeConjuge(estado)) {
      conjugeGuardado.current = null;
      setDependentes(conjuge ? lista : [novoTipoConjuge(), ...lista]);
    } else {
      conjugeGuardado.current = conjuge || null;
      setDependentes(lista.filter((d) => d.tipo !== 'conjuge'));
    }
    setDeclaracaoImpedimento(!!item.declaracaoImpedimento);
    setAutorizaUsoDadosLGPD(!!item.autorizaUsoDadosLGPD);
    setDeclaracaoVeracidade(!!item.declaracaoVeracidade);
    setAutorizaContatoCampanhas(!!item.autorizaContatoCampanhas);
    setDataNasc(item.dataNasc || '');
    setEndereco({ logradouro: '', bairro: '', complemento: '', cidade: '', estado: '', numero: '', ...(item.endereco || {}), cep: formatarCEP(item.endereco?.cep || '') });
    setRg(item.rg || '');
    setOrgaoExpedidor(item.orgaoExpedidor || '');
    setPisPasep(item.pisPasep || '');
    setTituloEleitoral(item.tituloEleitoral || '');
    setTituloEleitoralZona(item.tituloEleitoralZona || '');
    setTituloEleitoralSecao(item.tituloEleitoralSecao || '');
    setEstadoCivil(estado);
    setRacaCor(item.racaCor || '');
    setNacionalidade(item.nacionalidade || 'Brasileira');
    setNaturalidade(item.naturalidade || '');
    setDeficiencia(!!item.deficiencia);
    setDeficienciaEspecifica(item.deficienciaEspecifica || '');
    setCtps(item.ctps || '');
    setCtpsSerie(item.ctpsSerie || '');
    setCtpsEmitidoEm(item.ctpsEmitidoEm || '');
    setEscolaridade(item.escolaridade || '');
    setEscolaridadeCompleta(item.escolaridadeCompleta || '');
    setBancoAgencia(item.bancoAgencia || '0369');
    setBancoConta(item.bancoConta || '');
    setFiliacao((item.filiacao || [{ nome: '', cpf: '', nasc: '' }, { nome: '', cpf: '', nasc: '' }]).map((f: any) => ({
      ...f,
      irpf: f.irpf || 'nao',
      cod: f.cod || (f.irpf === 'sim' ? '6' : ''),
    })));
    setMsg({ texto: 'Declaração carregada para edição.', tipo: 'ok' });
  };

  const validar = (): boolean => {
    let valido = true;
    let mensagemErro = '';
    const falhar = (texto: string) => {
      if (!mensagemErro) mensagemErro = texto;
      valido = false;
    };

    if (!nomeCompleto.trim()) falhar('Preencha o nome completo.');
    if (!validarCPF(cpf)) falhar('CPF inválido. Verifique os dígitos informados.');
    if (!email.trim() || !email.includes('@')) falhar('Informe um e-mail válido.');
    if (telefone.replace(/[^\d]/g, '').length < 10) falhar('Informe um telefone válido.');
    if (!cargoPretendido) falhar('Selecione o cargo pretendido.');
    if (!simbolo) falhar('Selecione o símbolo.');

    if (!declaracaoSemParentesco) falhar('Você deve declarar que não possui vínculo de parentesco até o terceiro grau.');

    if (!atividade) falhar('Selecione uma opção.');
    else if (atividade === 'sim' && atividades.length === 0) falhar('Adicione pelo menos uma atividade remunerada.');

    if (exigeConjuge(estadoCivil) && !dependentes.some((d) => d.tipo === 'conjuge')) {
      falhar('Informe os dados do(a) cônjuge/companheiro(a).');
    }

    for (const d of dependentes) {
      if (d.tipo === 'conjuge' && exigeConjuge(estadoCivil)) {
        if (!d.nome.trim() || !d.nasc) {
          falhar('Preencha o nome e a data de nascimento do(a) cônjuge/companheiro(a).');
          break;
        }
        const cpfConjuge = d.cpf.replace(/[^\d]/g, '');
        if (cpfConjuge.length !== 11 || !validarCPF(d.cpf)) {
          falhar('CPF inválido do(a) cônjuge/companheiro(a).');
          break;
        }
        continue;
      }
      if (!d.nome.trim() && !d.cpf.trim() && !d.nasc) continue;
      const cpfDep = d.cpf.replace(/[^\d]/g, '');
      if (cpfDep.length !== 11 || !validarCPF(cpfDep)) {
        falhar('CPF inválido no dependente informado.');
        break;
      }
    }

    if (!declaracaoImpedimento) falhar('Você deve declarar a inexistência de impedimentos (LCM nº 86/2012).');
    if (!autorizaUsoDadosLGPD) falhar('Você deve consentir com os termos da LGPD.');
    if (!autorizaContatoCampanhas) falhar('Você deve consentir com o uso de contato para campanhas internas e grupos internos de trabalho.');
    if (!declaracaoVeracidade) falhar('Você deve declarar a veracidade das informações.');

    if (!valido) {
      setMsg({ texto: mensagemErro || 'Preencha todos os campos obrigatórios e aceite as declarações para gerar o PDF.', tipo: 'err' });
    } else {
      setMsg({ texto: '', tipo: 'ok' });
    }

    return valido;
  };

  const gerarPdf = async () => {
    if (!validar()) return;
    if (!gabineteSelecionado) return;
    try {
      await gerarPdfDeclaracao({
        nomeCompleto,
        cpf,
        email,
        telefone,
        cargoPretendido,
        simbolo,
        parentesco: 'nao',
        parentes: [],
        atividade,
        atividades,
        dependentes,
        declaracaoImpedimento,
        autorizaUsoDadosLGPD,
        declaracaoVeracidade,
        autorizaContatoCampanhas,
        dataNasc,
        endereco,
        rg,
        orgaoExpedidor,
        pisPasep,
        tituloEleitoral,
        tituloEleitoralZona,
        tituloEleitoralSecao,
        estadoCivil,
        racaCor,
        nacionalidade,
        naturalidade,
        deficiencia,
        deficienciaEspecifica,
        ctps,
        ctpsSerie,
        ctpsEmitidoEm,
        escolaridade,
        escolaridadeCompleta,
        bancoAgencia,
        bancoConta,
        filiacao,
        gabinete: gabineteSelecionado?.nome || 'GABINETE DO VEREADOR',
        localData: new Date().toLocaleDateString('pt-BR')
      });
      setMsg({ texto: 'PDF gerado com sucesso!', tipo: 'ok' });
    } catch (e: any) {
      setMsg({ texto: 'Erro ao gerar PDF: ' + e.message, tipo: 'err' });
    }
  };

  const adicionarAtividade = () => {
    setAtividades((prev) => [
      ...prev,
      { tipo: 'Servidor de órgão público ou de empresa pública, fundação, sociedade de economia mista ou autarquia', entidade: '', cnpj: '', cargo: '', carga: '', tel: '' }
    ]);
  };

  const removerAtividade = async (i: number) => {
    if (!(await confirmar({
      titulo: 'Remover atividade?',
      mensagem: 'Deseja remover esta atividade remunerada? Esta ação não pode ser desfeita.',
    }))) return;
    setAtividades((prev) => prev.filter((_, idx) => idx !== i));
  };

  const adicionarDependente = () => {
    setDependentes((prev) => [...prev, { nome: '', cpf: '', nasc: '', cod: '1', irpf: 'nao' }]);
  };

  const removerDependente = async (i: number) => {
    if (!(await confirmar({
      titulo: 'Remover dependente?',
      mensagem: 'Deseja remover este dependente? Esta ação não pode ser desfeita.',
    }))) return;
    setDependentes((prev) => prev.filter((_, idx) => idx !== i));
  };

  const alterarCargoPretendido = (cargo: string) => {
    setCargoPretendido(cargo);
    setSimbolo(cargo === 'Chefe de Gabinete Parlamentar' ? 'CC1' : 'CC2');
  };

  const renderListaAtividades = () => (
    <div>
      {atividades.map((a, i) => (
        <div key={i} className="bg-[#F9FAFA] border border-[#D9DEDB] p-3 mb-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Tipo de atividade</label>
            <select value={a.tipo} onChange={(e) => setAtividades((prev) => prev.map((x, idx) => (idx === i ? { ...x, tipo: e.target.value } : x)))} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white">
              <option>Servidor de órgão público ou de empresa pública, fundação, sociedade de economia mista ou autarquia</option>
              <option>Empregado, proprietário ou sócio de empresa privada</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Nome da entidade/empresa</label>
              <input type="text" value={a.entidade} onChange={(e) => setAtividades((prev) => prev.map((x, idx) => (idx === i ? { ...x, entidade: e.target.value } : x)))} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">CNPJ ou órgão</label>
              <input type="text" value={a.cnpj} onChange={(e) => setAtividades((prev) => prev.map((x, idx) => (idx === i ? { ...x, cnpj: e.target.value } : x)))} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Cargo/função</label>
              <input type="text" value={a.cargo} onChange={(e) => setAtividades((prev) => prev.map((x, idx) => (idx === i ? { ...x, cargo: e.target.value } : x)))} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Carga horária</label>
              <input type="text" value={a.carga} onChange={(e) => setAtividades((prev) => prev.map((x, idx) => (idx === i ? { ...x, carga: e.target.value } : x)))} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
            </div>
          </div>
          <div className="space-y-1.5 mt-2">
            <label className="text-xs font-bold text-slate-700">Telefone</label>
            <input type="text" value={a.tel} onChange={(e) => setAtividades((prev) => prev.map((x, idx) => (idx === i ? { ...x, tel: e.target.value } : x)))} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
          </div>
          <button type="button" onClick={() => removerAtividade(i)} className="mt-2 text-red-600 hover:bg-red-50 text-xs font-bold px-3 py-2 rounded transition-colors">Remover atividade</button>
        </div>
      ))}
    </div>
  );

  const renderListaDependentes = () => (
    <div>
      {dependentes.map((d, i) => (
        <div key={i} className="bg-[#F9FAFA] border border-[#D9DEDB] p-3 mb-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">{d.tipo === 'conjuge' ? 'Nome do(a) cônjuge/companheiro(a)' : 'Nome do dependente'}</label>
              <input type="text" value={d.nome} onChange={(e) => setDependentes((prev) => prev.map((x, idx) => (idx === i ? { ...x, nome: e.target.value } : x)))} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">CPF</label>
              <input type="text" value={d.cpf} onChange={(e) => setDependentes((prev) => prev.map((x, idx) => (idx === i ? { ...x, cpf: formatarCPF(e.target.value) } : x)))} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Data de nascimento</label>
              <input type="date" value={d.nasc} onChange={(e) => setDependentes((prev) => prev.map((x, idx) => (idx === i ? { ...x, nasc: e.target.value } : x)))} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Código IRPF</label>
              <select value={d.cod} onChange={(e) => setDependentes((prev) => prev.map((x, idx) => (idx === i ? { ...x, cod: e.target.value } : x)))} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white">
                {Object.keys(codigosIrpf).map((k) => (
                  <option key={k} value={k}>{k}. {codigosIrpf[k]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Utilizado para fins de IRPF?</label>
              <select value={d.irpf || 'nao'} onChange={(e) => setDependentes((prev) => prev.map((x, idx) => (idx === i ? { ...x, irpf: e.target.value as 'nao' | 'sim' } : x)))} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white">
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
              </select>
            </div>
          </div>
          <button type="button" onClick={() => removerDependente(i)} className="mt-2 text-red-600 hover:bg-red-50 text-xs font-bold px-3 py-2 rounded transition-colors">Remover dependente</button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6">
      <div className="bg-white border border-[#D9DEDB] p-6 rounded-lg shadow-xs">
        <span className="text-xs font-bold text-brand-ink uppercase tracking-wider">Formulário Unificado</span>
        <h2 className="text-2xl font-bold text-[#182528] tracking-tight mt-1">Declaração do Servidor Nomeado</h2>
        <p className="text-sm text-slate-600 mt-0.5">Súmula Vinculante nº 13 (STF), Acumulação, IRPF, LCM 86/2012 e LGPD</p>
      </div>

      <div className="bg-white border border-[#D9DEDB] p-6 rounded-lg shadow-xs space-y-6">
        {/* SEÇÃO 1 */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#182528] uppercase tracking-wider border-b border-[#D9DEDB] pb-2">1. Identificação e Dados Cadastrais</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Nome Completo</label>
              <input type="text" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">CPF</label>
              <div className="relative">
                <input type="text" value={cpf} onChange={(e) => setCpf(formatarCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} className={`w-full h-9 px-3 border rounded text-sm ${cpfValido === false ? 'border-red-500 bg-red-50/30' : 'border-[#D9DEDB]'}`} />
                {cpfNumeros.length === 11 && (
                  <div className="absolute right-3 top-3.5">
                    {cpfValido ? <CheckCircle2 className="w-4 h-4 text-brand-fill" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                  </div>
                )}
              </div>
              {cpfValido === false && <span className="text-[11px] text-red-600 font-semibold block mt-1">CPF inválido (verifique os dígitos)</span>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu.email@exemplo.com" className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Telefone celular</label>
              <input type="tel" value={telefone} onChange={(e) => setTelefone(formatarTelefoneCadastro(e.target.value))} placeholder="(XX) XXXXX-XXXX" maxLength={13} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Cargo Pretendido</label>
              <select value={cargoPretendido} onChange={(e) => alterarCargoPretendido(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white">
                <option value="Chefe de Gabinete Parlamentar">Chefe de Gabinete Parlamentar</option>
                <option value="Assessor de Gabinete Parlamentar">Assessor de Gabinete Parlamentar</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Símbolo</label>
              <select value={simbolo} onChange={(e) => setSimbolo(e.target.value)} disabled={cargoPretendido === 'Chefe de Gabinete Parlamentar'} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white disabled:bg-slate-100 disabled:text-slate-600">
                {simbolo === 'CC1' ? (
                  <option value="CC1">CC1 — R$ {CARGOS_GABINETE[0].vencimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</option>
                ) : (
                  CARGOS_GABINETE.filter((c) => c.simbolo !== 'CC1').map((c) => (
                    <option key={c.simbolo} value={c.simbolo}>{c.simbolo} — R$ {c.vencimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* 1.2 — Endereço */}
          <div className="pt-4 border-t border-[#D9DEDB] space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">1.2 Endereço</h4>
            <div className="grid grid-cols-12 gap-x-3 gap-y-2">
              <div className="col-span-6 sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">CEP</label>
                <input type="text" value={endereco.cep} onChange={(e) => setEndereco({ ...endereco, cep: formatarCEP(e.target.value) })} onBlur={(e) => buscarCep(e.target.value)} placeholder="00000-000" maxLength={9} className="w-full h-9 px-2 border border-[#D9DEDB] rounded text-sm bg-white" />
              </div>
              <div className="col-span-6 sm:col-span-10 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Logradouro</label>
                <input type="text" value={endereco.logradouro} onChange={(e) => setEndereco({ ...endereco, logradouro: e.target.value })} className="w-full h-9 px-2 border border-[#D9DEDB] rounded text-sm bg-white" />
              </div>
              <div className="col-span-4 sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Número</label>
                <input type="text" value={endereco.numero} onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })} placeholder="000" className="w-full h-9 px-2 border border-[#D9DEDB] rounded text-sm bg-white" />
              </div>
              <div className="col-span-4 sm:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Complemento</label>
                <input type="text" value={endereco.complemento} onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })} placeholder="APTO / BL" className="w-full h-9 px-2 border border-[#D9DEDB] rounded text-sm bg-white" />
              </div>
              <div className="col-span-4 sm:col-span-7 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Bairro</label>
                <input type="text" value={endereco.bairro} onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })} className="w-full h-9 px-2 border border-[#D9DEDB] rounded text-sm bg-white" />
              </div>
              <div className="col-span-8 sm:col-span-9 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Cidade</label>
                <input type="text" value={endereco.cidade} onChange={(e) => setEndereco({ ...endereco, cidade: e.target.value })} className="w-full h-9 px-2 border border-[#D9DEDB] rounded text-sm bg-white" />
              </div>
              <div className="col-span-4 sm:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Estado</label>
                <input type="text" value={endereco.estado} onChange={(e) => setEndereco({ ...endereco, estado: e.target.value })} className="block w-full h-9 px-2 border border-[#D9DEDB] rounded text-sm bg-white sm:max-w-[6rem]" />
              </div>
            </div>
          </div>

          {/* 1.3 — Dados Pessoais e Documentos */}
          <div className="pt-4 border-t border-[#D9DEDB] space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">1.3 Dados Pessoais e Documentos</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Data de nascimento</label>
                <input type="date" value={dataNasc} onChange={(e) => setDataNasc(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Estado civil</label>
                <select value={estadoCivil} onChange={(e) => alterarEstadoCivil(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white">
                  <option value="">Selecione</option>
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                  <option value="União estável">União estável</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nacionalidade</label>
                <input type="text" value={nacionalidade} onChange={(e) => setNacionalidade(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" placeholder="Brasileira" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Naturalidade</label>
                <input type="text" value={naturalidade} onChange={(e) => setNaturalidade(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" placeholder="Cidade/UF" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Raça/cor</label>
                <select value={racaCor} onChange={(e) => setRacaCor(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white">
                  <option value="">Não informar</option>
                  <option value="Indígena">Indígena</option>
                  <option value="Branca">Branca</option>
                  <option value="Preta">Preta</option>
                  <option value="Amarela">Amarela</option>
                  <option value="Parda">Parda</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Possui deficiência?</label>
                <label className="inline-flex items-center gap-2 ml-2 text-sm text-slate-700">
                  <input type="checkbox" checked={deficiencia} onChange={(e) => setDeficiencia(e.target.checked)} className="h-4 w-4 text-brand-ink border-[#D9DEDB] rounded focus:ring-brand" />
                  Sim
                </label>
                {deficiencia && (
                  <input type="text" value={deficienciaEspecifica} onChange={(e) => setDeficienciaEspecifica(e.target.value)} placeholder="Especifique" className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Escolaridade</label>
                <select value={escolaridade} onChange={(e) => setEscolaridade(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white">
                  <option value="">Selecione</option>
                  <option value="Fundamental">Fundamental</option>
                  <option value="Médio">Médio</option>
                  <option value="Técnico">Técnico</option>
                  <option value="Superior">Superior</option>
                  <option value="Pós-graduação">Pós-graduação</option>
                  <option value="Mestrado">Mestrado</option>
                  <option value="Doutorado">Doutorado</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Escolaridade (completo/incompleto)</label>
                <select value={escolaridadeCompleta} onChange={(e) => setEscolaridadeCompleta(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white">
                  <option value="">Selecione</option>
                  <option value="Completo">Completo</option>
                  <option value="Incompleto">Incompleto</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">RG</label>
                <input type="text" value={rg} onChange={(e) => setRg(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Órgão expedidor</label>
                <input type="text" value={orgaoExpedidor} onChange={(e) => setOrgaoExpedidor(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
              </div>
              <div className="sm:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Título de eleitor — Nº</label>
                    <input type="text" value={tituloEleitoral} onChange={(e) => setTituloEleitoral(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Título de eleitor — Zona</label>
                    <input type="text" value={tituloEleitoralZona} onChange={(e) => setTituloEleitoralZona(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Título de eleitor — Seção</label>
                    <input type="text" value={tituloEleitoralSecao} onChange={(e) => setTituloEleitoralSecao(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">CTPS — Nº</label>
                    <input type="text" value={ctps} onChange={(e) => setCtps(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">CTPS — Série</label>
                    <input type="text" value={ctpsSerie} onChange={(e) => setCtpsSerie(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">CTPS — Emitido em</label>
                    <input type="date" value={ctpsEmitidoEm} onChange={(e) => setCtpsEmitidoEm(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">PIS/PASEP</label>
                    <input type="text" value={pisPasep} onChange={(e) => setPisPasep(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 1.4 — Filiação e Dependentes */}
          <div className="pt-4 border-t border-[#D9DEDB] space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">1.4 Filiação, Familiares e Dependentes</h4>
            {filiacao.map((f, i) => (
              <div key={i} className="bg-[#F9FAFA] border border-[#D9DEDB] p-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Nome</label>
                    <input type="text" value={f.nome} onChange={(e) => setFiliacao((prev) => prev.map((x, idx) => (idx === i ? { ...x, nome: e.target.value } : x)))} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">CPF</label>
                    <input type="text" value={f.cpf} onChange={(e) => setFiliacao((prev) => prev.map((x, idx) => (idx === i ? { ...x, cpf: formatarCPF(e.target.value) } : x)))} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Data de nascimento</label>
                    <input type="date" value={f.nasc} onChange={(e) => setFiliacao((prev) => prev.map((x, idx) => (idx === i ? { ...x, nasc: e.target.value } : x)))} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Parentesco</label>
                    <select value={f.parentesco || ''} onChange={(e) => setFiliacao((prev) => prev.map((x, idx) => (idx === i ? { ...x, parentesco: e.target.value } : x)))} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white">
                      <option value="">Selecione</option>
                      <option value="Pai">Pai</option>
                      <option value="Mãe">Mãe</option>
                      <option value="Outro(a)">Outro(a)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#E5E9E7]">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Utilizado para fins de IRPF?</label>
                    <select
                      value={f.irpf || 'nao'}
                      onChange={(e) => setFiliacao((prev) => prev.map((x, idx) => (idx === i ? { ...x, irpf: e.target.value as 'nao' | 'sim', cod: e.target.value === 'sim' ? '6' : '' } : x)))}
                      className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white"
                    >
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </div>
                  {f.irpf === 'sim' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Código IRPF</label>
                      <select
                        value={f.cod || '6'}
                        onChange={(e) => setFiliacao((prev) => prev.map((x, idx) => (idx === i ? { ...x, cod: e.target.value } : x)))}
                        className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white"
                      >
                        {Object.keys(codigosIrpf).map((k) => (
                          <option key={k} value={k}>{k}. {codigosIrpf[k]}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {renderListaDependentes()}
            <button type="button" onClick={adicionarDependente} className="inline-flex items-center gap-2 px-4 py-2 bg-white text-brand-ink border border-brand text-xs font-semibold rounded hover:bg-slate-50 transition-colors">+ Adicionar dependente</button>
          </div>

          {/* 1.5 — Dados Bancários */}
          <div className="pt-4 border-t border-[#D9DEDB] space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">1.5 Dados Bancários (Caixa Econômica Federal)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Banco</label>
                <input type="text" value="Caixa Econômica Federal" readOnly className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-[#F3F5F4] text-slate-600" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Agência</label>
                <input type="text" value={bancoAgencia} readOnly className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-[#F3F5F4] text-slate-600" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Conta</label>
                <input type="text" value={bancoConta} onChange={(e) => setBancoConta(e.target.value)} className="w-full h-9 px-3 border border-[#D9DEDB] rounded text-sm bg-white" />
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO 2 */}
        <div className="space-y-4 pt-4 border-t border-[#D9DEDB]">
          <h3 className="text-sm font-bold text-[#182528] uppercase tracking-wider">2. Vínculo de Parentesco — Súmula Vinculante nº 13 do STF</h3>
          <div className="p-4 bg-slate-50 rounded border border-[#D9DEDB] space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={declaracaoSemParentesco} onChange={(e) => setDeclaracaoSemParentesco(e.target.checked)} className="mt-1 h-4 w-4 text-brand-ink border-[#D9DEDB] rounded focus:ring-brand" />
              <span className="text-xs sm:text-sm text-slate-800 font-medium">NÃO POSSUO cônjuge, companheiro ou parente em linha reta, colateral ou por afinidade até o terceiro grau no âmbito da Câmara Municipal de Curitiba.</span>
            </label>
            <div id="err-declaracaoSemParentesco" className="text-[11px] text-red-600 font-semibold">{msg.texto && !declaracaoSemParentesco ? 'Você deve declarar que não possui vínculo de parentesco até o terceiro grau.' : ''}</div>
            <div className="bg-[#F9FAFA] border-l-4 border-brand p-3 text-xs text-slate-500 leading-relaxed">
              Declaro, para fins de nomeação no Cargo em Comissão acima indicado, que NÃO me encontro na condição de cônjuge, companheiro ou parente em linha reta, colateral por consanguinidade ou afinidade, até o terceiro grau, com Agentes Políticos do Município nos cargos de Secretários, Dirigentes e Diretores da Administração Direta e Indireta, inclusive, conforme a Súmula Vinculante nº 13 do STF, da autoridade nomeante ou de servidor da Câmara Municipal de Curitiba, investido em cargo de direção, chefia ou de cargos em comissão de assessoramento.
            </div>
          </div>
        </div>
        {/* SEÇÃO 3 */}
        <div className="space-y-4 pt-4 border-t border-[#D9DEDB]">
          <h3 className="text-sm font-bold text-[#182528] uppercase tracking-wider">3. Atividade Remunerada</h3>
          <div className="p-4 bg-slate-50 rounded border border-[#D9DEDB] space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="radio" name="atividade" checked={atividade === 'nao'} onChange={() => setAtividade('nao')} className="mt-1 h-4 w-4 text-brand-ink border-[#D9DEDB] rounded focus:ring-brand" />
              <span className="text-xs sm:text-sm text-slate-800 font-medium">NÃO EXERÇO outra atividade remunerada em cargo, emprego ou função pública, nem privada incompatível com a jornada integral.</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="radio" name="atividade" checked={atividade === 'sim'} onChange={() => setAtividade('sim')} className="mt-1 h-4 w-4 text-brand-ink border-[#D9DEDB] rounded focus:ring-brand" />
              <span className="text-xs sm:text-sm text-slate-800 font-medium">EXERÇO outra atividade remunerada.</span>
            </label>
            {atividade === 'nao' && (
              <div className="bg-[#F9FAFA] border-l-4 border-brand p-3 text-xs text-slate-500 leading-relaxed">
                Declaro, para os devidos fins, que não percebo vencimentos ou qualquer outra vantagem pecuniária de outro órgão da Administração Direta ou Indireta do Governo Federal, Estadual ou Municipal, ou de outros órgãos, bem como não me encontro na condição de empregado, proprietário ou sócio de empresa privada, não exercendo outra atividade profissional em horário incompatível com o expediente da Câmara Municipal de Curitiba. Declaro, ainda, que estou ciente das vedações previstas na Legislação Federal quanto aos temas das informações prestadas, bem como do disposto na Lei Municipal nº 15.591/2020 — Estatuto dos Servidores da Câmara de Curitiba.
              </div>
            )}
            {atividade === 'sim' && (
              <div className="space-y-2">
                {renderListaAtividades()}
                <button type="button" onClick={adicionarAtividade} className="inline-flex items-center gap-2 px-4 py-2 bg-white text-brand-ink border border-brand text-xs font-semibold rounded hover:bg-slate-50 transition-colors">+ Adicionar atividade</button>
                <div className="bg-[#F9FAFA] border-l-4 border-brand p-3 text-xs text-slate-500 leading-relaxed">
                  Declaro que a entidade/empresa acima mencionada não possui vínculo contratual com a Administração Direta ou Indireta do Governo Federal, Estadual ou Municipal, ou de outros órgãos, e que não exerço essa atividade em horário incompatível com o expediente da Câmara Municipal de Curitiba. Declaro, ainda, que estou ciente das vedações previstas na Legislação Federal quanto aos temas das informações prestadas, bem como do disposto na Lei Municipal nº 15.591/2020 — Estatuto dos Servidores da Câmara de Curitiba.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SEÇÃO 4 */}
        <div className="space-y-4 pt-4 border-t border-[#D9DEDB]">
          <h3 className="text-sm font-bold text-[#182528] uppercase tracking-wider">4. Inexistência de Impedimento — Lei Complementar Municipal nº 86/2012</h3>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={declaracaoImpedimento} onChange={(e) => setDeclaracaoImpedimento(e.target.checked)} className="mt-1 h-4 w-4 text-brand-ink border-[#D9DEDB] rounded focus:ring-brand" />
            <span className="text-xs sm:text-sm text-slate-800 font-medium">
              DECLARO ter conhecimento das vedações constantes da Lei Complementar Municipal nº 86, de 22 de junho de 2012, e respectiva regulamentação, que estabelecem as hipóteses impeditivas da nomeação para o exercício de cargos em comissão, por pessoas que incidam nas hipóteses de inelegibilidade previstas na legislação federal.<br /><br />
              DECLARO, ainda, não ter incorrido em qualquer das vedações acima referidas e que me encontro em condições de exercer regularmente o cargo em comissão para o qual fui nomeado.<br /><br />
              DECLARO, sob pena de responsabilização nas esferas civil, criminal e administrativa, que as informações aqui prestadas são verdadeiras, comprometendo-me a apresentar as devidas certidões ou declarações comprobatórias da regularidade da situação jurídica junto à Justiça Federal, Eleitoral, Estadual ou Distrital, do Trabalho ou Militar, bem como nos Tribunais de Contas da União ou dos Estados e ainda no Cadastro Nacional de Condenações Cíveis por Ato de Improbidade Administrativa do Conselho Nacional de Justiça, no conselho ou órgão profissional competente ou nos entes públicos em que eu tenha trabalhado, sempre que solicitado pela Administração da Câmara Municipal de Curitiba e no prazo regulamentar.<br /><br />
              COMPROMETO-ME, independentemente de solicitação, a renovar a presente declaração anualmente, até 31 de janeiro, enquanto permanecer no exercício do cargo para o qual fui nomeado, ratificando com isso a inexistência de impedimento ora declarada.<br /><br />
              DECLARO, finalmente, a ciência de que a verificação de existência de impedimento, independentemente do contido na presente declaração, bem como a não apresentação da ratificação anual ou das certidões ou declarações, quando requeridas, implicarão em minha imediata exoneração do cargo em comissão ora exercido.
            </span>
          </label>
          <div id="err-declaracaoImpedimento" className="text-[11px] text-red-600 font-semibold">{msg.texto && !declaracaoImpedimento ? 'Você deve declarar a inexistência de impedimentos (LCM nº 86/2012).' : ''}</div>
        </div>

        {/* SEÇÃO 5 */}
        <div className="space-y-4 pt-4 border-t border-[#D9DEDB]">
          <h3 className="text-sm font-bold text-[#182528] uppercase tracking-wider">5. Consentimento e Veracidade</h3>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={autorizaUsoDadosLGPD} onChange={(e) => setAutorizaUsoDadosLGPD(e.target.checked)} className="mt-1 h-4 w-4 text-brand-ink border-[#D9DEDB] rounded focus:ring-brand" />
            <span className="text-xs sm:text-sm text-slate-800 font-medium">
              Ao assinar o presente termo, consinto e concordo que a Câmara Municipal de Curitiba, CNPJ nº 77.636.520/0001-10, doravante denominada Controlador, tome decisões referentes ao tratamento de seus dados pessoais, conforme a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD).
            </span>
          </label>
          <div id="err-checkLgpd" className="text-[11px] text-red-600 font-semibold">{msg.texto && !autorizaUsoDadosLGPD ? 'Você deve consentir com os termos da LGPD.' : ''}</div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={autorizaContatoCampanhas} onChange={(e) => setAutorizaContatoCampanhas(e.target.checked)} className="mt-1 h-4 w-4 text-brand-ink border-[#D9DEDB] rounded focus:ring-brand" />
            <span className="text-xs sm:text-sm text-slate-800 font-medium">
              Concordo com a disponibilização do meu contato pessoal para campanhas internas da Câmara Municipal de Curitiba e para participação em grupos internos de trabalho (grupos de mensagens institucionais em WhatsApp).
            </span>
          </label>
          <div id="err-checkContato" className="text-[11px] text-red-600 font-semibold">{msg.texto && !autorizaContatoCampanhas ? 'Você deve consentir com o uso de contato para campanhas internas e grupos internos de trabalho.' : ''}</div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={declaracaoVeracidade} onChange={(e) => setDeclaracaoVeracidade(e.target.checked)} className="mt-1 h-4 w-4 text-brand-ink border-[#D9DEDB] rounded focus:ring-brand" />
            <span className="text-xs sm:text-sm text-slate-800 font-medium">Declaro, sob as penas da lei, que todas as informações prestadas neste formulário são verdadeiras.</span>
          </label>
          <div id="err-checkVeracidade" className="text-[11px] text-red-600 font-semibold">{msg.texto && !declaracaoVeracidade ? 'Você deve declarar a veracidade das informações.' : ''}</div>
        </div>

        {msg.texto && (
          <div className={`p-3 rounded text-xs font-bold ${msg.tipo === 'err' ? 'bg-red-50 text-red-700' : 'bg-brand-tint text-brand-ink'}`}>
            {msg.texto}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#D9DEDB]">
          <button type="button" onClick={salvarDeclaracao} className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-fill text-white text-sm font-semibold rounded hover:bg-brand-deep transition-colors shadow-xs">
            <Save className="w-4 h-4" />
            <span>Salvar Declaração</span>
          </button>
          <button type="button" onClick={gerarPdf} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-brand-ink border border-brand text-sm font-semibold rounded hover:bg-slate-50 transition-colors shadow-xs">
            <Download className="w-4 h-4" />
            <span>Gerar PDF</span>
          </button>
          <button type="button" onClick={limparFormulario} className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-slate-700 border border-[#D9DEDB] text-sm font-semibold rounded hover:bg-slate-100 transition-colors">
            <RefreshCw className="w-4 h-4" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#D9DEDB] rounded-lg p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-[#182528]">Declarações Salvas</h3>
        {carregando ? (
          <p className="text-xs text-slate-500">Carregando declarações...</p>
        ) : salvos.length === 0 ? (
          <p className="text-xs text-slate-500">Nenhuma declaração salva.</p>
        ) : (
          <div className="space-y-2">
            {salvos.map((item) => (
              <div key={item.id} onClick={() => carregarItem(item)} className="flex items-center justify-between p-4 border border-[#D9DEDB] rounded hover:border-brand cursor-pointer bg-slate-50/50 transition-colors">
                <div>
                  <span className="font-bold text-sm text-[#182528] block">{item.nomeCompleto} (CPF: {item.cpf})</span>
                  <span className="text-xs text-slate-500">{item.cargoPretendido} ({item.simbolo}) — Salvo em {formatarSalvoEm(item.salvoEm)}</span>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); excluirSalvo(item.id); }} className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors">
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
