/** Papéis multi-tenant — ver obsidian/fabrica/capinhas-multitenant.md */
export type PapelUsuario = "marca" | "revendedor";

/** `lojas/{lojaId}` */
export type LojaConfig = {
  logo?: string | null;
  cor?: string | null;
  whatsapp?: string | null;
};

export type LojaFirestore = {
  nome: string;
  slug: string;
  donoUid: string;
  /** Cópia do e-mail do dono para listagem admin */
  donoEmail?: string;
  ativo: boolean;
  config: LojaConfig;
  criadoEm: unknown;
  atualizadoEm?: unknown;
};

/** Extensão de `usuarios/{uid}` — campos de papel (cliente final não tem papel) */
export type UsuarioMultitenantFirestore = {
  papel?: PapelUsuario;
  lojaId?: string | null;
};

/** `produtos/{produtoId}` — catálogo central da marca */
export type ProdutoCentralFirestore = {
  nome: string;
  descricao: string;
  precoBaseCentavos: number;
  imagens: string[];
  ativo: boolean;
  /** FK → tipos/{tipoId} */
  tipoId: string;
  /** personalizada | pronta (modo de venda) */
  modoVenda: "personalizada" | "pronta";
  /** Aparece na seção “Personalize com sua foto” (por enquanto só capinha) */
  personalizavel?: boolean;
  categoria: string;
  destaque?: string | null;
  /** Condicional: tipoPersonalizacao === mascara_modelo */
  marcaId?: string | null;
  modelosCompativeis?: string[];
  /** @deprecated legado — preferir tipoId + marcaId */
  modeloId?: string;
  /** @deprecated legado */
  marca?: string;
  /** @deprecated legado — use modoVenda */
  tipo?: "personalizada" | "pronta";
  /** Marca — estoque central (depósito) */
  controlaEstoque?: boolean;
  estoqueCentral?: number;
  criadoEm: unknown;
  atualizadoEm?: unknown;
};

/** `lojas/{lojaId}/estoque/{produtoId}` */
export type EstoqueLojaFirestore = {
  quantidade: number;
  atualizadoEm: unknown;
};

/** `modelos_celular/{modeloId}` — catálogo central de molduras */
export type ModeloCelularCentralFirestore = {
  marca: string;
  modelo: string;
  maskUrl: string;
  overlayUrl: string;
  larguraPx: number;
  alturaPx: number;
  ativo: boolean;
  criadoEm: unknown;
  atualizadoEm?: unknown;
};

/** `lojas/{lojaId}/pedidos/{pedidoId}` */
export type ItemPedidoLojaFirestore = {
  produtoId: string;
  personalizacaoId: string | null;
  precoCentavos: number;
  quantidade: number;
  nomeProduto?: string;
  fotoUrl?: string | null;
  /** Condicional: tipoPersonalizacao === mascara_modelo */
  tipoPersonalizacao?: import("@/features/catalogo/types").TipoPersonalizacao;
  config?: Record<string, unknown> | null;
  /** @deprecated — preferir config.modeloId */
  modeloId?: string;
  /** @deprecated — preferir config.transform */
  transform?: import("@/features/personalizacao/types").Transform | null;
  textos?: import("@/features/personalizacao/caseTextFonts").TextoCapinha[] | null;
  titulo?: string | null;
  descricao?: string | null;
  imagemUrl?: string;
};

export type PedidoLojaStatus =
  | "aguardando_pagamento"
  | "pago"
  | "producao"
  | "enviado";

export type PedidoLojaOrigem = "online" | "presencial";

export type PedidoLojaFormaPagamentoPresencial =
  | "dinheiro"
  | "pix"
  | "cartao"
  | "outro";

/** `lojas/{lojaId}/pedidos/{pedidoId}` */
export type PedidoLojaFirestore = {
  itens: ItemPedidoLojaFirestore[];
  totalCentavos: number;
  status: PedidoLojaStatus;
  cliente: {
    nome: string;
    contato: string;
    endereco: string;
  };
  pagamento: {
    provider: string | null;
    id: string | null;
    status: string | null;
    /** Venda presencial — dinheiro, pix, etc. */
    forma?: PedidoLojaFormaPagamentoPresencial | null;
  };
  /** Checkout online preenche clienteUid; presencial usa registradoPorUid */
  clienteUid?: string | null;
  origem?: PedidoLojaOrigem;
  registradoPorUid?: string | null;
  observacao?: string | null;
  criadoEm: unknown;
  atualizadoEm?: unknown;
};

export const COLECOES = {
  LOJAS: "lojas",
  USUARIOS: "usuarios",
  PRODUTOS: "produtos",
  MODELOS_CELULAR: "modelos_celular",
  PEDIDOS: "pedidos",
  ESTOQUE: "estoque",
} as const;
