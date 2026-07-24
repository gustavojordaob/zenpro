export type SolicitacaoRevendedorStatus = "pendente" | "aprovada" | "recusada";

export type SolicitacaoRevendedorFirestore = {
  nomeCompleto: string;
  email: string;
  telefone: string;
  cnpj: string;
  razaoSocial: string;
  nomeLoja: string;
  slugDesejado: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  observacao: string | null;
  status: SolicitacaoRevendedorStatus;
  criadoEm: unknown;
  processadoEm?: unknown;
  processadoPorUid?: string | null;
  lojaIdCriada?: string | null;
  motivoRecusa?: string | null;
};

export type SolicitacaoRevendedorInput = {
  nomeCompleto: string;
  email: string;
  telefone: string;
  cnpj: string;
  razaoSocial: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  observacao?: string;
};

export const COLECAO_SOLICITACOES_REVENDEDOR = "solicitacoes_revendedor";
