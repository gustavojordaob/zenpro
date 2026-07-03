import type { TextoCapinha } from "@/features/personalizacao/caseTextFonts";
import type { Transform } from "@/features/personalizacao/types";

/** Documento em `personalizacoes/{id}` */
export type PersonalizacaoFirestore = {
  userId: string;
  tipoPersonalizacao: import("@/features/catalogo/types").TipoPersonalizacao;
  fotoUrl: string;
  config: Record<string, unknown>;
  /** Legado — espelha config para capinha */
  modeloId?: string;
  transform?: Transform;
  textos?: TextoCapinha[] | null;
  titulo?: string | null;
  descricao?: string | null;
  arteProducaoUrl: string | null;
  /** Só a foto do cliente (sem texto). */
  arteFotoUrl?: string | null;
  /** Só o texto do cliente (fundo transparente). */
  arteTextoUrl?: string | null;
  criadoEm: unknown;
};

export type ItemPedidoFirestore = {
  tipo: "personalizada" | "pronta";
  produtoId: string;
  nomeProduto: string;
  personalizacaoId: string | null;
  modeloId: string;
  fotoUrl: string | null;
  transform: Transform | null;
  precoCentavos: number;
  rotuloModelo: string;
  titulo?: string | null;
  descricao?: string | null;
  textos?: TextoCapinha[] | null;
  arteProducaoUrl?: string | null;
  arteFotoUrl?: string | null;
  arteTextoUrl?: string | null;
  imagemUrl?: string | null;
  gradienteCapa?: string | null;
};

export type ClientePedidoFirestore = {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  cep: string;
  endereco: string;
};

/** Documento em `pedidos/{id}` */
export type PedidoFirestore = {
  itens: ItemPedidoFirestore[];
  totalCentavos: number;
  status: "aguardando_pagamento";
  clienteUid: string;
  cliente: ClientePedidoFirestore;
  criadoEm: unknown;
};

export const PEDIDO_STATUS = {
  AGUARDANDO_PAGAMENTO: "aguardando_pagamento",
} as const;

/** Documento em `contatos/{id}` — mensagens do formulário público */
export type ContatoFirestore = {
  nome: string;
  email: string;
  telefone: string;
  comentario: string;
  emailDestino: string;
  status: "novo";
  criadoEm: unknown;
};
