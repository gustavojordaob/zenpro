import * as admin from "firebase-admin";
import {
  mpFetch,
  montarExternalReference,
  pagamentoAprovado,
  pagamentoPendente,
  parseExternalReference,
  type MpPaymentResponse,
} from "./mercadoPagoShared";
import {
  aplicarPagamentoAprovadoLoja,
  aplicarPagamentoAprovadoReposicao,
  aplicarPagamentoPendenteLoja,
  aplicarPagamentoPendenteReposicao,
  aplicarPagamentoRejeitado,
} from "./pedidoPosPagamento";

type MpPaymentSearchResponse = {
  results?: MpPaymentResponse[];
};

type MpMerchantOrderResponse = {
  payments?: Array<{ id?: number | string; status?: string }>;
};

export async function processarPagamentoMp(
  paymentId: string,
  accessToken: string,
): Promise<void> {
  const payment = await mpFetch<MpPaymentResponse>(
    accessToken,
    `/v1/payments/${paymentId}`,
  );

  const ref = parseExternalReference(payment.external_reference);
  if (!ref) {
    console.warn("external_reference inválida", payment.external_reference);
    return;
  }

  const pagamentoPatch = {
    provider: "mercadopago",
    id: String(payment.id),
    status: payment.status,
    metodoMp: payment.payment_method_id ?? payment.payment_type_id ?? null,
    parcelas: payment.installments ?? null,
    aprovadoEm: payment.date_approved
      ? admin.firestore.Timestamp.fromDate(new Date(payment.date_approved))
      : null,
  };

  if (pagamentoAprovado(payment.status)) {
    if (ref.tipo === "loja") {
      await aplicarPagamentoAprovadoLoja(ref.lojaId, ref.pedidoId, pagamentoPatch);
    } else {
      await aplicarPagamentoAprovadoReposicao(ref.pedidoId, pagamentoPatch);
    }
    return;
  }

  if (pagamentoPendente(payment.status)) {
    if (ref.tipo === "loja") {
      await aplicarPagamentoPendenteLoja(ref.lojaId, ref.pedidoId, pagamentoPatch);
    } else {
      await aplicarPagamentoPendenteReposicao(ref.pedidoId, pagamentoPatch);
    }
    return;
  }

  await aplicarPagamentoRejeitado(ref, pagamentoPatch);
}

export async function sincronizarPagamentoPorPedido(
  accessToken: string,
  opts: {
    tipo: "loja" | "reposicao";
    lojaId?: string;
    pedidoId: string;
    paymentId?: string | null;
  },
): Promise<{ sincronizado: boolean; status?: string }> {
  if (opts.paymentId) {
    await processarPagamentoMp(String(opts.paymentId), accessToken);
    return { sincronizado: true };
  }

  const externalRef =
    opts.tipo === "loja" && opts.lojaId
      ? montarExternalReference({
          tipo: "loja",
          lojaId: opts.lojaId,
          pedidoId: opts.pedidoId,
        })
      : montarExternalReference({ tipo: "reposicao", pedidoId: opts.pedidoId });

  const search = await mpFetch<MpPaymentSearchResponse>(
    accessToken,
    `/v1/payments/search?sort=date_created&criteria=desc&external_reference=${encodeURIComponent(externalRef)}`,
  );

  const results = search.results ?? [];
  if (results.length === 0) {
    return { sincronizado: false };
  }

  const aprovado = results.find((p) => pagamentoAprovado(p.status));
  const alvo = aprovado ?? results[0];
  await processarPagamentoMp(String(alvo.id), accessToken);
  return { sincronizado: true, status: alvo.status };
}

export async function processarMerchantOrderMp(
  merchantOrderId: string,
  accessToken: string,
): Promise<void> {
  const order = await mpFetch<MpMerchantOrderResponse>(
    accessToken,
    `/merchant_orders/${merchantOrderId}`,
  );

  const payments = order.payments ?? [];
  for (const payment of payments) {
    if (!payment.id) continue;
    await processarPagamentoMp(String(payment.id), accessToken);
  }
}

export function extrairIdNotificacaoMp(
  body: Record<string, unknown>,
  query: Record<string, unknown>,
): { topic?: string; id?: string } {
  const topic = String(
    query.topic ?? query.type ?? body.type ?? body.topic ?? "",
  ).trim();
  const id = String(
    query.id ??
      query["data.id"] ??
      (body.data as { id?: string | number } | undefined)?.id ??
      body.id ??
      "",
  ).trim();

  return { topic, id: id || undefined };
}
