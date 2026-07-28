import { defineSecret, defineString } from "firebase-functions/params";

export const mpAccessToken = defineSecret("MP_ACCESS_TOKEN");
export const siteUrl = defineString("SITE_URL", {
  default: "https://usezenpro.com.br",
});

export const MARCA_LOJA_ID = "zenpro";
export const MP_API = "https://api.mercadopago.com";
export const PARCELAMENTO_MAXIMO = 12;

export type ReferenciaPedido =
  | { tipo: "loja"; lojaId: string; pedidoId: string }
  | { tipo: "reposicao"; pedidoId: string };

export function montarExternalReference(ref: ReferenciaPedido): string {
  if (ref.tipo === "loja") {
    return `zenpro:loja:${ref.lojaId}:${ref.pedidoId}`;
  }
  return `zenpro:reposicao:${ref.pedidoId}`;
}

export function parseExternalReference(
  value: string | null | undefined,
): ReferenciaPedido | null {
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length < 3 || parts[0] !== "zenpro") return null;

  if (parts[1] === "loja" && parts.length >= 4) {
    return { tipo: "loja", lojaId: parts[2], pedidoId: parts[3] };
  }
  if (parts[1] === "reposicao" && parts.length >= 3) {
    return { tipo: "reposicao", pedidoId: parts[2] };
  }
  return null;
}

export async function mpFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await res.json().catch(() => ({}))) as T & {
    message?: string;
    cause?: unknown;
  };

  if (!res.ok) {
    const msg =
      typeof body.message === "string"
        ? body.message
        : `Mercado Pago HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body;
}

export type MpPreferenceItem = {
  id?: string;
  title: string;
  /** Recomendado pelo MP para reduzir recusas do antifraude. */
  description?: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
  category_id?: string;
};

export type MpPreferenceBody = {
  items: MpPreferenceItem[];
  payer?: {
    name?: string;
    surname?: string;
    email?: string;
    identification?: { type: string; number: string };
    address?: {
      zip_code?: string;
      street_name?: string;
      street_number?: string;
    };
  };
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return?: "approved" | "all";
  external_reference: string;
  notification_url: string;
  statement_descriptor?: string;
  binary_mode?: boolean;
  payment_methods?: {
    installments?: number;
    default_installments?: number;
    default_payment_method_id?: string;
    excluded_payment_types?: Array<{ id: string }>;
    excluded_payment_methods?: Array<{ id: string }>;
  };
  metadata?: Record<string, string | number>;
};

export type MpPreferenceResponse = {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
};

export type MpPaymentResponse = {
  id: number;
  status: string;
  status_detail?: string;
  external_reference?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  transaction_amount?: number;
  installments?: number;
  date_approved?: string;
};

export function mapFormaParaMp(
  forma?: string,
  parcelas?: number,
): NonNullable<MpPreferenceBody["payment_methods"]> {
  if (forma === "pix") {
    // PIX = bank_transfer / método pix. NÃO excluir bank_transfer (some o PIX).
    // NÃO excluir account_money — o MP rejeita com "account_money cannot be excluded".
    return {
      excluded_payment_types: [
        { id: "credit_card" },
        { id: "debit_card" },
        { id: "ticket" },
        { id: "atm" },
        { id: "prepaid_card" },
      ],
      default_payment_method_id: "pix",
      installments: 1,
    };
  }
  if (forma === "boleto") {
    return {
      excluded_payment_types: [
        { id: "credit_card" },
        { id: "debit_card" },
        { id: "bank_transfer" },
        { id: "atm" },
        { id: "prepaid_card" },
      ],
      installments: 1,
    };
  }
  if (forma === "cartao") {
    const n = Math.min(
      PARCELAMENTO_MAXIMO,
      Math.max(1, Number(parcelas ?? 1) || 1),
    );
    // Só crédito; teto = parcelas escolhidas no site (ex.: 2x → até 2x no MP).
    return {
      excluded_payment_types: [
        { id: "ticket" },
        { id: "bank_transfer" },
        { id: "atm" },
        { id: "debit_card" },
        { id: "prepaid_card" },
      ],
      installments: n,
      default_installments: n,
    };
  }
  return {};
}

export function pagamentoAprovado(status: string): boolean {
  return status === "approved";
}

export function pagamentoPendente(status: string): boolean {
  return ["pending", "in_process", "authorized"].includes(status);
}
