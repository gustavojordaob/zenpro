/** Dados cadastrais em `usuarios/{uid}` */
export type PerfilUsuario = {
  uid: string;
  email: string;
  nomeCompleto: string;
  cpf: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};

export type PerfilUsuarioFirestore = Omit<PerfilUsuario, "uid"> & {
  atualizadoEm: unknown;
};

export const PERFIL_VAZIO: Omit<PerfilUsuario, "uid" | "email"> = {
  nomeCompleto: "",
  cpf: "",
  telefone: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

export const UFS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;
