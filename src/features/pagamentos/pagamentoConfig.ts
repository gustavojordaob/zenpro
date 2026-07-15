/** Mock local — sem redirecionar ao Mercado Pago. */
export function pagamentoMockAtivo(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_PAGAMENTO === "true";
}

export function siteUrlBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "https://zenpro-capinhas.web.app";
}

export const PARCELAMENTO_MAXIMO = 12;
/**
 * Até quantas parcelas o site anuncia como “sem juros”.
 * A regra real de “sem acréscimo” fica no painel Mercado Pago
 * (Oferecer parcelamento sem juros) — o Checkout Pro lê dali.
 */
export const PARCELAMENTO_SEM_JUROS = 2;

/** Rótulo da opção de parcelas no checkout (valor por parcela). */
export function rotuloParcelaCheckout(
  totalCentavos: number,
  parcelas: number,
): string {
  const valorParcelaCentavos = Math.ceil(totalCentavos / parcelas);
  const valor = (valorParcelaCentavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  if (parcelas <= PARCELAMENTO_SEM_JUROS) {
    return `${parcelas}x de ${valor} sem juros`;
  }
  return `${parcelas}x de aprox. ${valor} com juros*`;
}

export const FORMAS_PAGAMENTO_ONLINE: {
  id: import("@/features/multitenant/types").PedidoLojaFormaPagamentoOnline;
  rotulo: string;
  descricao: string;
}[] = [
  {
    id: "pix",
    rotulo: "PIX",
    descricao: "Aprovação em segundos",
  },
  {
    id: "cartao",
    rotulo: "Cartão de crédito",
    descricao: `Até ${PARCELAMENTO_MAXIMO}x — ${PARCELAMENTO_SEM_JUROS}x sem juros`,
  },
  {
    id: "boleto",
    rotulo: "Boleto",
    descricao: "Envio liberado após compensação",
  },
];
