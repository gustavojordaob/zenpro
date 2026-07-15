/** Papéis multi-tenant — ver obsidian/fabrica/capinhas-multitenant.md */
export type PapelUsuario = "marca" | "revendedor";

/** Remetente na etiqueta de envio (Melhor Envio / Correios). */
export type EnderecoExpedicao = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  /** Razão social ou nome na etiqueta */
  nomeRemetente?: string | null;
};

/** `lojas/{lojaId}` */
export type LojaConfig = {
  logo?: string | null;
  cor?: string | null;
  whatsapp?: string | null;
  /** Limite de crédito B2B definido pela Zen Pro (centavos). */
  limiteCreditoCentavos?: number | null;
  /** Pedido mínimo para este revendedor (centavos); padrão global se omitido. */
  pedidoMinimoCentavos?: number | null;
  /** Comissão % sobre itens vendidos pelo revendedor. */
  comissaoPercentual?: number | null;
  /** Prazo de entrega (dias) quando o item está no estoque do revendedor. */
  prazoEntregaDiasLocal?: number | null;
  /** Prazo de entrega (dias) quando só há estoque na Seven Tech / Zen Pro. */
  prazoEntregaDiasZenPro?: number | null;
  /** CEP/endereço de onde esta loja expede produtos prontos. */
  expedicao?: EnderecoExpedicao | null;
  /**
   * Só na loja oficial (zenpro): metas + benefícios dos níveis dos revendedores.
   * Ouro ≥ ouroMin; Prata ≥ prataMin e &lt; ouro; Bronze abaixo.
   */
  niveisRevendedor?: {
    ouroMinCentavos: number;
    prataMinCentavos: number;
    emailContatoZenPro?: string;
    beneficios?: {
      ouro?: {
        descontoPercentual?: number;
        freteGratis?: boolean;
        chanceSorteioPremios?: boolean;
        descricaoExtra?: string;
      };
      prata?: {
        descontoPercentual?: number;
        freteGratis?: boolean;
        chanceSorteioPremios?: boolean;
        descricaoExtra?: string;
      };
      bronze?: {
        descontoPercentual?: number;
        freteGratis?: boolean;
        chanceSorteioPremios?: boolean;
        descricaoExtra?: string;
      };
    };
  } | null;
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

/** Faixa de preço atacado (quantidade inclusiva). `quantidadeMax` null = sem teto. */
export type FaixaPrecoRevendedor = {
  quantidadeMin: number;
  quantidadeMax: number | null;
  precoCentavos: number;
};

/** `produtos/{produtoId}` — catálogo central da marca */
export type ProdutoCentralFirestore = {
  nome: string;
  descricao: string;
  /** Preço ao consumidor final (loja B2C). */
  precoBaseCentavos: number;
  /**
   * Preço cobrado do revendedor na reposição B2B.
   * Se omitido/0, a reposição usa `precoBaseCentavos`.
   */
  precoRevendedorCentavos?: number | null;
  /** Valor minimo da linha no pedido B2B (qty x preco >= este valor). */
  pedidoMinimoRevendedorCentavos?: number | null;
  /** Faixas de quantidade -> preco unitario (site /revendedor). */
  faixasPrecoRevendedor?: FaixaPrecoRevendedor[];
  imagens: string[];
  ativo: boolean;
  /** FK → tipos/{tipoId} */
  tipoId: string;
  /** personalizada | pronta (modo de venda) */
  modoVenda: "personalizada" | "pronta";
  /** Aparece na seção “Personalize com sua foto” (por enquanto só capinha) */
  personalizavel?: boolean;
  /** Material / acabamento da variante — ex.: couro, silicone, acrilico */
  material?: string | null;
  /** Overrides visuais desta variante (sobrescreve specs do modelo de celular) */
  visualPersonalizacao?: import("@/features/catalogo/personalizacaoVisual").PersonalizacaoVisualFirestore;
  /** Dimensões para cotação Melhor Envio (obrigatório para frete preciso). */
  pesoGramas?: number | null;
  alturaCm?: number | null;
  larguraCm?: number | null;
  comprimentoCm?: number | null;
  /**
   * Formas de pagamento online permitidas neste produto.
   * Default: PIX + boleto + cartão até 12x.
   */
  pagamento?: {
    aceitaPix?: boolean;
    aceitaBoleto?: boolean;
    aceitaCartao?: boolean;
    maxParcelasCartao?: number;
  } | null;
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
  /** Arte final (foto + texto) para produção. */
  arteProducaoUrl?: string | null;
  /** Só a foto do cliente. */
  arteFotoUrl?: string | null;
  /** Só o texto do cliente (fundo transparente). */
  arteTextoUrl?: string | null;
  imagemUrl?: string;
};

export type PedidoLojaStatus =
  | "aguardando_pagamento"
  | "pago"
  | "producao"
  | "enviado"
  | "entregue"
  | "cancelado";

export type PedidoLojaOrigem = "online" | "presencial";

export type PedidoLojaFormaPagamentoPresencial =
  | "dinheiro"
  | "pix"
  | "cartao"
  | "outro";

export type PedidoLojaFormaPagamentoOnline = "pix" | "boleto" | "cartao";

export type PedidoFreteCotacao = {
  servicoId: number;
  nome: string;
  empresa: string;
  companyId?: number | null;
  precoCentavos: number;
  prazoDias?: number | null;
  cepOrigem: string;
  cepDestino: string;
  origemLojaId?: string;
};

export type PedidoEnvioFirestore = {
  transportadora?: string | null;
  codigoRastreio?: string | null;
  urlRastreio?: string | null;
  etiquetaUrl?: string | null;
  meOrderId?: string | null;
  meProtocol?: string | null;
  meAgencyId?: number | null;
  meAgencyName?: string | null;
  /** Postagem em agência — dono leva o pacote (sem coleta ME). */
  modoPostagem?: "agencia" | null;
  statusMelhorEnvio?: string | null;
  erroMelhorEnvio?: string | null;
  enviadoEm?: unknown;
  previsaoEntregaEm?: unknown;
};

export type NotaFiscalStatus =
  | "pendente"
  | "processando"
  | "emitida"
  | "erro"
  | "cancelada";

export type NotaFiscalFirestore = {
  status: NotaFiscalStatus;
  numero?: string | null;
  serie?: string | null;
  chaveAcesso?: string | null;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
  emitidaEm?: unknown;
  provedor?: string | null;
  referencia?: string | null;
  erro?: string | null;
};

/** `lojas/{lojaId}/pedidos/{pedidoId}` */
export type PedidoLojaFirestore = {
  itens: ItemPedidoLojaFirestore[];
  totalCentavos: number;
  /** Subtotal produtos (sem frete), após descontos. */
  totalProdutosCentavos?: number;
  frete?: PedidoFreteCotacao | null;
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
    /** Checkout online — pix, boleto ou cartão */
    formaOnline?: PedidoLojaFormaPagamentoOnline | null;
    preferenceId?: string | null;
    checkoutUrl?: string | null;
    metodoMp?: string | null;
    parcelas?: number | null;
    aprovadoEm?: unknown;
  };
  /** Só true após confirmação do Mercado Pago (boleto/PIX/cartão aprovado). */
  pagamentoLiberadoEnvio?: boolean;
  envio?: PedidoEnvioFirestore | null;
  notaFiscal?: NotaFiscalFirestore | null;
  /** Checkout online preenche clienteUid; presencial usa registradoPorUid */
  clienteUid?: string | null;
  origem?: PedidoLojaOrigem;
  registradoPorUid?: string | null;
  observacao?: string | null;
  /** Pedido espelhado na fila de produção da marca (lojas/zenpro). */
  filaProducaoMarca?: boolean;
  /** Loja revendedora de origem (quando filaProducaoMarca). */
  origemLojaId?: string | null;
  origemLojaNome?: string | null;
  /** ID do pedido na loja revendedora (quando filaProducaoMarca). */
  origemPedidoId?: string | null;
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
