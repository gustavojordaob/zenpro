import type { PedidoLojaFormaPagamentoOnline } from "@/features/multitenant/types";
import { PARCELAMENTO_MAXIMO } from "@/features/pagamentos/pagamentoConfig";

/** Formas / parcelas permitidas por produto no checkout online. */
export type PagamentoProdutoConfig = {
  aceitaPix: boolean;
  aceitaBoleto: boolean;
  aceitaCartao: boolean;
  /** 1–12; padrão 12x. */
  maxParcelasCartao: number;
};

export const PAGAMENTO_PRODUTO_DEFAULT: PagamentoProdutoConfig = {
  aceitaPix: true,
  aceitaBoleto: true,
  aceitaCartao: true,
  maxParcelasCartao: PARCELAMENTO_MAXIMO,
};

export function normalizarPagamentoProduto(
  raw: unknown,
): PagamentoProdutoConfig {
  const o =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const max = Math.min(
    PARCELAMENTO_MAXIMO,
    Math.max(1, Number(o.maxParcelasCartao ?? PARCELAMENTO_MAXIMO) || PARCELAMENTO_MAXIMO),
  );
  return {
    aceitaPix: o.aceitaPix !== false,
    aceitaBoleto: o.aceitaBoleto !== false,
    aceitaCartao: o.aceitaCartao !== false,
    maxParcelasCartao: max,
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
