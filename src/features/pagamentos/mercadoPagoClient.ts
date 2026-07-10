import { httpsCallable } from "firebase/functions";
import type { PedidoLojaFormaPagamentoOnline } from "@/features/multitenant/types";
import { getFirebaseFunctions } from "@/lib/firebase";

export type CheckoutMercadoPagoTipo = "loja" | "reposicao";

export type CriarCheckoutMercadoPagoInput = {
  tipo: CheckoutMercadoPagoTipo;
  lojaId?: string;
  pedidoId: string;
  formaPagamento?: PedidoLojaFormaPagamentoOnline;
  parcelas?: number;
  returnBasePath?: string;
};

export type CriarCheckoutMercadoPagoResult = {
  initPoint: string;
  sandboxInitPoint?: string;
  preferenceId: string;
};

export async function criarCheckoutMercadoPago(
  input: CriarCheckoutMercadoPagoInput,
): Promise<CriarCheckoutMercadoPagoResult> {
  const callable = httpsCallable<
    CriarCheckoutMercadoPagoInput,
    CriarCheckoutMercadoPagoResult
  >(getFirebaseFunctions(), "criarCheckoutMercadoPago");

  const { data } = await callable(input);
  if (!data?.initPoint) {
    throw new Error("Mercado Pago não retornou URL de pagamento.");
  }
  return data;
}

export function urlCheckoutMercadoPago(result: CriarCheckoutMercadoPagoResult): string {
  const sandbox = process.env.NEXT_PUBLIC_MP_SANDBOX === "true";
  if (sandbox && result.sandboxInitPoint) return result.sandboxInitPoint;
  return result.initPoint;
}

export type SincronizarPagamentoMercadoPagoInput = {
  tipo: CheckoutMercadoPagoTipo;
  lojaId?: string;
  pedidoId: string;
  paymentId?: string | null;
};

export type SincronizarPagamentoMercadoPagoResult = {
  sincronizado: boolean;
  origem?: string;
  status?: string;
};

export async function sincronizarPagamentoMercadoPago(
  input: SincronizarPagamentoMercadoPagoInput,
): Promise<SincronizarPagamentoMercadoPagoResult> {
  const callable = httpsCallable<
    SincronizarPagamentoMercadoPagoInput,
    SincronizarPagamentoMercadoPagoResult
  >(getFirebaseFunctions(), "sincronizarPagamentoMercadoPago");

  const { data } = await callable(input);
  return data ?? { sincronizado: false };
}
