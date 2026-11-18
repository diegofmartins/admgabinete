export type TipoGabinete = 'vereador' | 'lideranca' | 'presidencia' | 'secretaria';

export interface Gabinete {
  id: string;
  nome: string;
  tipo: TipoGabinete;
  vereadorResponsavel?: string;
  ativo: boolean;
}

export type PapelUsuario = 'admin' | 'assessor' | 'vereador';

export interface UsuarioPerfil {
  uid: string;
  email: string;
  nome: string;
  papel: PapelUsuario;
  gabineteId: string;
  criadoEm: string;
}

export interface ComposicaoGabinete {
  id?: string;
  gabineteId: string;
  userId: string;
  cargos: Record<string, number>;
  salvoEm: string;
}

export interface AdmissaoPedido {
  id?: string;
  gabineteId: string;
  userId: string;
  nome: string;
  matricula?: string;
  cargo: string;
  simbolo: string;
  lotacao: string;
  dataAdmissao: string;
  salvoEm: string;
}

export interface ExoneracaoPedido {
  id?: string;
  gabineteId: string;
  userId: string;
  nome: string;
  matricula: string;
  cargo: string;
  simbolo: string;
  lotacao: string;
  dataExoneracao: string;
  salvoEm: string;
}

export interface DeclaracaoNomeadoDados {
  id?: string;
  userId: string;
  gabineteId: string;
  nomeCompleto: string;
  cpf: string;
  rg: string;
  orgaoExpedidor: string;
  cargoPretendido: string;
  simbolo: string;
  lotacao: string;
  temParentescoPrefeitoViceVereador: boolean;
  detalhesParentesco?: string;
  possuiOutroCargoPublico: boolean;
  detalhesOutroCargo?: string;
  possuiAtividadePrivadaIncompativel: boolean;
  detalhesAtividadePrivada?: string;
  dependentesIRPF: string;
  possuiDeclaracaoBens: boolean;
  autorizaUsoDadosLGPD: boolean;
  localData: string;
  salvoEm: string;
}

export interface VinculoParentesco {
  nome: string;
  cargo: string;
  grau: string;
  lotacao: string;
}

export interface AtividadeRendida {
  tipo: string;
  entidade: string;
  cnpj: string;
  cargo: string;
  carga: string;
  tel: string;
}

export interface DependenteIRPF {
  nome: string;
  cpf: string;
  nasc: string;
  cod: string;
  irpf?: 'nao' | 'sim';
  tipo?: 'conjuge';
}

export interface CargoConfig {
  nome: string;
  simbolo: string;
  vencimento: number;
}

export const CARGOS_GABINETE: CargoConfig[] = [
  { nome: 'Chefe de Gabinete Parlamentar', simbolo: 'CC1', vencimento: 19451.52 },
  { nome: 'Assessor de Gabinete Parlamentar', simbolo: 'CC2', vencimento: 17290.22 },
  { nome: 'Assessor de Gabinete Parlamentar', simbolo: 'CC3', vencimento: 15129.04 },
  { nome: 'Assessor de Gabinete Parlamentar', simbolo: 'CC4', vencimento: 12967.76 },
  { nome: 'Assessor de Gabinete Parlamentar', simbolo: 'CC5', vencimento: 10806.40 },
  { nome: 'Assessor de Gabinete Parlamentar', simbolo: 'CC6', vencimento: 8645.14 },
  { nome: 'Assessor de Gabinete Parlamentar', simbolo: 'CC7', vencimento: 6483.84 },
  { nome: 'Assessor de Gabinete Parlamentar', simbolo: 'CC8', vencimento: 4322.49 },
  { nome: 'Assessor de Gabinete Parlamentar', simbolo: 'CC9', vencimento: 3241.97 }
];

export const LIMITE_FINANCEIRO_GABINETE = 97257.76;
export const MAX_PESSOAS_GABINETE = 9;

export const GABINETES_PADRAO: Omit<Gabinete, 'id'>[] = [
  { nome: 'Gabinete do Vereador Diego Martins', tipo: 'vereador', vereadorResponsavel: 'Diego Martins', ativo: true },
  { nome: 'Gabinete do Vereador Abelardo da Silva', tipo: 'vereador', vereadorResponsavel: 'Abelardo da Silva', ativo: true },
  { nome: 'Gabinete da Vereadora Ana Paula', tipo: 'vereador', vereadorResponsavel: 'Ana Paula', ativo: true },
  { nome: 'Gabinete do Vereador Bruno Santos', tipo: 'vereador', vereadorResponsavel: 'Bruno Santos', ativo: true },
  { nome: 'Gabinete do Vereador Carlos Eduardo', tipo: 'vereador', vereadorResponsavel: 'Carlos Eduardo', ativo: true },
  { nome: 'Gabinete do Vereador Daniel Oliveira', tipo: 'vereador', vereadorResponsavel: 'Daniel Oliveira', ativo: true },
  { nome: 'Gabinete da Vereadora Eliane Ramos', tipo: 'vereador', vereadorResponsavel: 'Eliane Ramos', ativo: true },
  { nome: 'Gabinete do Vereador Fernando Costa', tipo: 'vereador', vereadorResponsavel: 'Fernando Costa', ativo: true },
  { nome: 'Gabinete do Vereador Gilberto Lima', tipo: 'vereador', vereadorResponsavel: 'Gilberto Lima', ativo: true },
  { nome: 'Gabinete do Vereador Helio Ribeiro', tipo: 'vereador', vereadorResponsavel: 'Helio Ribeiro', ativo: true },
  { nome: 'Gabinete da Vereadora Irene Souza', tipo: 'vereador', vereadorResponsavel: 'Irene Souza', ativo: true },
  { nome: 'Gabinete do Vereador Joao Pedro', tipo: 'vereador', vereadorResponsavel: 'Joao Pedro', ativo: true },
  { nome: 'Gabinete do Vereador Kleber Mendes', tipo: 'vereador', vereadorResponsavel: 'Kleber Mendes', ativo: true },
  { nome: 'Gabinete da Vereadora Larissa Matos', tipo: 'vereador', vereadorResponsavel: 'Larissa Matos', ativo: true },
  { nome: 'Gabinete do Vereador Marcio Nogueira', tipo: 'vereador', vereadorResponsavel: 'Marcio Nogueira', ativo: true },
  { nome: 'Gabinete do Vereador Nelson Freitas', tipo: 'vereador', vereadorResponsavel: 'Nelson Freitas', ativo: true },
  { nome: 'Gabinete do Vereador Otavio Rocha', tipo: 'vereador', vereadorResponsavel: 'Otavio Rocha', ativo: true },
  { nome: 'Gabinete da Vereadora Patricia Prado', tipo: 'vereador', vereadorResponsavel: 'Patricia Prado', ativo: true },
  { nome: 'Gabinete do Vereador Quintino Souza', tipo: 'vereador', vereadorResponsavel: 'Quintino Souza', ativo: true },
  { nome: 'Gabinete da Vereadora Raquel Torres', tipo: 'vereador', vereadorResponsavel: 'Raquel Torres', ativo: true },
  { nome: 'Gabinete do Vereador Sergio Ramos', tipo: 'vereador', vereadorResponsavel: 'Sergio Ramos', ativo: true },
  { nome: 'Gabinete da Vereadora Tatiana Mello', tipo: 'vereador', vereadorResponsavel: 'Tatiana Mello', ativo: true },
  { nome: 'Gabinete do Vereador Ulisses Cunha', tipo: 'vereador', vereadorResponsavel: 'Ulisses Cunha', ativo: true },
  { nome: 'Gabinete do Vereador Vicente Paula', tipo: 'vereador', vereadorResponsavel: 'Vicente Paula', ativo: true },
  { nome: 'Gabinete da Vereadora Wagner Silva', tipo: 'vereador', vereadorResponsavel: 'Wagner Silva', ativo: true },
  { nome: 'Gabinete do Vereador Xisto Moreira', tipo: 'vereador', vereadorResponsavel: 'Xisto Moreira', ativo: true },
  { nome: 'Gabinete da Vereadora Yara Farias', tipo: 'vereador', vereadorResponsavel: 'Yara Farias', ativo: true },
  { nome: 'Gabinete do Vereador Zico Alencar', tipo: 'vereador', vereadorResponsavel: 'Zico Alencar', ativo: true },
  { nome: 'Gabinete do Vereador Alan Souza', tipo: 'vereador', vereadorResponsavel: 'Alan Souza', ativo: true },
  { nome: 'Gabinete da Vereadora Bianca Lima', tipo: 'vereador', vereadorResponsavel: 'Bianca Lima', ativo: true },
  { nome: 'Gabinete do Vereador Caio Cesar', tipo: 'vereador', vereadorResponsavel: 'Caio Cesar', ativo: true },
  { nome: 'Gabinete do Vereador Dante Alighieri', tipo: 'vereador', vereadorResponsavel: 'Dante Alighieri', ativo: true },
  { nome: 'Gabinete da Vereadora Estela Maris', tipo: 'vereador', vereadorResponsavel: 'Estela Maris', ativo: true },
  { nome: 'Gabinete do Vereador Fabricio Witzel', tipo: 'vereador', vereadorResponsavel: 'Fabricio Witzel', ativo: true },
  { nome: 'Gabinete do Vereador Gustavo Lima', tipo: 'vereador', vereadorResponsavel: 'Gustavo Lima', ativo: true },
  { nome: 'Gabinete da Vereadora Heloisa Helena', tipo: 'vereador', vereadorResponsavel: 'Heloisa Helena', ativo: true },
  { nome: 'Gabinete do Vereador Igor Carmo', tipo: 'vereador', vereadorResponsavel: 'Igor Carmo', ativo: true },
  { nome: 'Gabinete do Vereador Jonas Ribeiro', tipo: 'vereador', vereadorResponsavel: 'Jonas Ribeiro', ativo: true },
  { nome: 'Liderança de Bloco / Partidária', tipo: 'lideranca', vereadorResponsavel: '', ativo: true },
  { nome: 'Gabinete da Presidência', tipo: 'presidencia', vereadorResponsavel: '', ativo: true },
  { nome: 'Secretaria Executiva da Mesa', tipo: 'secretaria', vereadorResponsavel: '', ativo: true },
  { nome: 'Secretaria de Recursos Humanos', tipo: 'secretaria', vereadorResponsavel: '', ativo: true }
];
