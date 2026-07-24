/** Mock local — sem redirecionar ao Mercado Pago. */
export function pagamentoMockAtivo(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_PAGAMENTO === "true";
}

export function siteUrlBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "https://usezenpro.com.br";
}

export const PARCELAMENTO_MAXIMO = 12;
/**
 * Só à vista (1x) é anunciado como sem juros.
 * A partir de 2x o Mercado Pago aplica juros (configurar no painel MP).
 */
export const PARCELAMENTO_SEM_JUROS = 1;

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
    descricao: `Até ${PARCELAMENTO_MAXIMO}x — à vista sem juros`,
  },
  {
    id: "boleto",
    rotulo: "Boleto",
    descricao: "Envio liberado após compensação",
  },
];
