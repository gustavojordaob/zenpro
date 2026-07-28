import type { PedidoLojaFormaPagamentoOnline } from "@/features/multitenant/types";
import { PARCELAMENTO_MAXIMO } from "@/features/pagamentos/pagamentoConfig";

/** Formas / parcelas / desconto PIX — produto + padrão da loja. */
export type PagamentoProdutoConfig = {
  aceitaPix: boolean;
  aceitaBoleto: boolean;
  aceitaCartao: boolean;
  /** 1–12; padrão 12x. */
  maxParcelasCartao: number;
  /** % desconto no PIX (0–100). */
  descontoPixPercentual: number;
};

export type PagamentoLojaPadrao = {
  maxParcelasCartao?: number;
  descontoPixPercentual?: number;
};

export const PAGAMENTO_PRODUTO_DEFAULT: PagamentoProdutoConfig = {
  aceitaPix: true,
  aceitaBoleto: true,
  aceitaCartao: true,
  maxParcelasCartao: PARCELAMENTO_MAXIMO,
  descontoPixPercentual: 0,
};

function clampParcelas(n: unknown, fallback: number): number {
  return Math.min(
    PARCELAMENTO_MAXIMO,
    Math.max(1, Number(n ?? fallback) || fallback),
  );
}

function clampDesconto(n: unknown, fallback: number): number {
  if (n == null || n === "") return fallback;
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(100, Math.max(0, v));
}

/**
 * Normaliza pagamento do produto.
 * Campos omitidos no produto usam `lojaPadrao`, depois default global.
 */
export function normalizarPagamentoProduto(
  raw: unknown,
  lojaPadrao?: PagamentoLojaPadrao | null,
): PagamentoProdutoConfig {
  const o =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const padMax = clampParcelas(
    lojaPadrao?.maxParcelasCartao,
    PARCELAMENTO_MAXIMO,
  );
  const padPix = clampDesconto(lojaPadrao?.descontoPixPercentual, 0);

  const max =
    o.maxParcelasCartao != null
      ? clampParcelas(o.maxParcelasCartao, padMax)
      : padMax;

  const descontoPix =
    o.descontoPixPercentual != null && o.descontoPixPercentual !== ""
      ? clampDesconto(o.descontoPixPercentual, padPix)
      : padPix;

  return {
    aceitaPix: o.aceitaPix !== false,
    aceitaBoleto: o.aceitaBoleto !== false,
    aceitaCartao: o.aceitaCartao !== false,
    maxParcelasCartao: max,
    descontoPixPercentual: descontoPix,
  };
}

/** Interseção das regras dos itens do carrinho (o mais restritivo vale). */
export function intersecaoPagamentoProdutos(
  configs: PagamentoProdutoConfig[],
): PagamentoProdutoConfig {
  if (configs.length === 0) return { ...PAGAMENTO_PRODUTO_DEFAULT };
  return configs.reduce(
    (acc, c) => ({
      aceitaPix: acc.aceitaPix && c.aceitaPix,
      aceitaBoleto: acc.aceitaBoleto && c.aceitaBoleto,
      aceitaCartao: acc.aceitaCartao && c.aceitaCartao,
      maxParcelasCartao: Math.min(acc.maxParcelasCartao, c.maxParcelasCartao),
      // Desconto PIX: menor % entre os itens (mais conservador)
      descontoPixPercentual: Math.min(
        acc.descontoPixPercentual,
        c.descontoPixPercentual,
      ),
    }),
    { ...PAGAMENTO_PRODUTO_DEFAULT },
  );
}

export function formasPermitidasDoPagamento(
  cfg: PagamentoProdutoConfig,
): PedidoLojaFormaPagamentoOnline[] {
  const out: PedidoLojaFormaPagamentoOnline[] = [];
  if (cfg.aceitaPix) out.push("pix");
  if (cfg.aceitaCartao) out.push("cartao");
  if (cfg.aceitaBoleto) out.push("boleto");
  return out;
}

export function formaPadraoPermitida(
  formas: PedidoLojaFormaPagamentoOnline[],
): PedidoLojaFormaPagamentoOnline {
  if (formas.includes("pix")) return "pix";
  if (formas.includes("cartao")) return "cartao";
  if (formas.includes("boleto")) return "boleto";
  return "pix";
}

/** Desconto PIX em centavos sobre o subtotal de produtos. */
export function descontoPixCentavos(
  subtotalProdutosCentavos: number,
  percentual: number,
): number {
  if (percentual <= 0 || subtotalProdutosCentavos <= 0) return 0;
  return Math.round((subtotalProdutosCentavos * percentual) / 100);
}
