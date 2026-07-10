import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import {
  mapFormaParaMp,
  montarExternalReference,
  mpAccessToken,
  mpFetch,
  PARCELAMENTO_MAXIMO,
  siteUrl,
  type MpPreferenceBody,
  type MpPreferenceResponse,
} from "./mercadoPagoShared";

type CheckoutPayload = {
  tipo?: "loja" | "reposicao";
  lojaId?: string;
  pedidoId?: string;
  formaPagamento?: "pix" | "boleto" | "cartao";
  parcelas?: number;
  returnBasePath?: string;
};

type ItemPedido = {
  nomeProduto?: string;
  nome?: string;
  quantidade?: number;
  precoCentavos?: number;
};

function webhookUrl(projectId: string): string {
  return `https://us-central1-${projectId}.cloudfunctions.net/webhookMercadoPago`;
}

function buildReturnUrls(
  basePath: string,
  pedidoId: string,
  lojaId?: string,
) {
  const base = basePath.replace(/\/$/, "");
  const params = new URLSearchParams({ pedido: pedidoId });
  if (lojaId) params.set("loja", lojaId);
  const q = params.toString();
  return {
    success: `${base}/checkout/retorno?status=success&${q}`,
    failure: `${base}/checkout/retorno?status=failure&${q}`,
    pending: `${base}/checkout/retorno?status=pending&${q}`,
  };
}

async function carregarPedidoLoja(lojaId: string, pedidoId: string) {
  const db = admin.firestore();
  const snap = await db.doc(`lojas/${lojaId}/pedidos/${pedidoId}`).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Pedido não encontrado.");
  }
  return { ref: snap.ref, data: snap.data() as Record<string, unknown> };
}

async function montarPayerMercadoPago(
  uid: string,
  email?: string,
): Promise<MpPreferenceBody["payer"] | undefined> {
  const snap = await admin.firestore().doc(`usuarios/${uid}`).get();
  const data = snap.exists ? snap.data() ?? {} : {};
  const cpf = String(data.cpf ?? "").replace(/\D/g, "");
  const nomeCompleto = String(data.nomeCompleto ?? "").trim();
  const partes = nomeCompleto.split(/\s+/).filter(Boolean);

  const payer: NonNullable<MpPreferenceBody["payer"]> = {};
  if (email) payer.email = email;
  if (partes.length) {
    payer.name = partes[0];
    payer.surname = partes.slice(1).join(" ") || partes[0];
  }
  if (cpf.length === 11) {
    payer.identification = { type: "CPF", number: cpf };
  }
  const cep = String(data.cep ?? "").replace(/\D/g, "");
  const logradouro = String(data.logradouro ?? "").trim();
  if (cep.length === 8 && logradouro) {
    payer.address = {
      zip_code: cep,
      street_name: logradouro,
      street_number: String(data.numero ?? "s/n"),
    };
  }

  if (!payer.email && !payer.identification && !payer.name) return undefined;
  return payer;
}

async function carregarPedidoReposicao(pedidoId: string) {
  const db = admin.firestore();
  const snap = await db.doc(`pedidos_reposicao/${pedidoId}`).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Pedido de reposição não encontrado.");
  }
  return { ref: snap.ref, data: snap.data() as Record<string, unknown> };
}

function itensParaMp(itens: ItemPedido[], tituloFallback: string) {
  const mapped = itens.map((item, index) => ({
    id: String(index + 1),
    title: String(item.nomeProduto ?? item.nome ?? tituloFallback).slice(0, 120),
    quantity: Math.max(1, Number(item.quantidade ?? 1)),
    unit_price: Number(item.precoCentavos ?? 0) / 100,
    currency_id: "BRL",
  }));

  if (mapped.length === 0) {
    return [
      {
        id: "1",
        title: tituloFallback,
        quantity: 1,
        unit_price: 0,
        currency_id: "BRL",
      },
    ];
  }
  return mapped;
}

export const criarCheckoutMercadoPago = onCall(
  {
    secrets: [mpAccessToken],
    region: "us-central1",
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Faça login para pagar.");
    }

    const {
      tipo,
      lojaId,
      pedidoId,
      formaPagamento,
      parcelas,
      returnBasePath,
    } = (request.data ?? {}) as CheckoutPayload;

    if (!tipo || !pedidoId) {
      throw new HttpsError("invalid-argument", "tipo e pedidoId são obrigatórios.");
    }

    const token = mpAccessToken.value();
    if (!token) {
      throw new HttpsError(
        "failed-precondition",
        "Mercado Pago não configurado (MP_ACCESS_TOKEN).",
      );
    }

    const site = siteUrl.value().replace(/\/$/, "");
    const basePath = (returnBasePath ?? site).replace(/\/$/, "");
    const backUrls = buildReturnUrls(
      basePath,
      pedidoId,
      tipo === "loja" ? lojaId : undefined,
    );
    const projectId = process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT ?? "";

    let externalRef;
    let items: MpPreferenceBody["items"];
    let payerEmail: string | undefined;
    let titulo = "Pedido Zen Pro";

    if (tipo === "loja") {
      if (!lojaId) {
        throw new HttpsError("invalid-argument", "lojaId é obrigatório.");
      }
      const { data } = await carregarPedidoLoja(lojaId, pedidoId);
      const clienteUid = String(data.clienteUid ?? "");
      if (clienteUid !== request.auth.uid) {
        throw new HttpsError("permission-denied", "Pedido de outro usuário.");
      }
      if (data.status !== "aguardando_pagamento") {
        throw new HttpsError(
          "failed-precondition",
          "Este pedido não está aguardando pagamento.",
        );
      }
      const itens = Array.isArray(data.itens) ? (data.itens as ItemPedido[]) : [];
      items = itensParaMp(itens, "Case Zen Pro");
      const cliente = (data.cliente as Record<string, unknown> | undefined) ?? {};
      payerEmail = String(cliente.contato ?? "").includes("@")
        ? String(cliente.contato)
        : request.auth.token.email ?? undefined;
      externalRef = montarExternalReference({ tipo: "loja", lojaId, pedidoId });
      titulo = `Pedido ${pedidoId.slice(-8).toUpperCase()}`;
    } else {
      const { data } = await carregarPedidoReposicao(pedidoId);
      const revendedorUid = String(data.revendedorUid ?? "");
      if (revendedorUid !== request.auth.uid) {
        throw new HttpsError("permission-denied", "Pedido de outro revendedor.");
      }
      const status = String(data.status ?? "");
      if (!["aguardando_pagamento", "solicitado"].includes(status)) {
        throw new HttpsError(
          "failed-precondition",
          "Este pedido não está aguardando pagamento.",
        );
      }
      const itens = Array.isArray(data.itens) ? (data.itens as ItemPedido[]) : [];
      items = itensParaMp(itens, "Reposição Zen Pro");
      payerEmail = request.auth.token.email ?? String(data.revendedorEmail ?? "");
      externalRef = montarExternalReference({ tipo: "reposicao", pedidoId });
      titulo = `Reposição ${pedidoId.slice(-8).toUpperCase()}`;
    }

    const parcelasValidas =
      formaPagamento === "cartao"
        ? Math.min(
            PARCELAMENTO_MAXIMO,
            Math.max(1, Number(parcelas ?? 1)),
          )
        : 1;

    const payer = await montarPayerMercadoPago(request.auth.uid, payerEmail);

    const paymentMethodsBase =
      formaPagamento === "cartao" || !formaPagamento
        ? {
            installments: PARCELAMENTO_MAXIMO,
            default_installments: parcelasValidas,
          }
        : {};

    const preferenceBody: MpPreferenceBody = {
      items,
      payer,
      back_urls: backUrls,
      auto_return: "approved",
      external_reference: externalRef,
      notification_url: webhookUrl(projectId),
      statement_descriptor: "ZEN PRO",
      binary_mode: false,
      payment_methods: {
        ...paymentMethodsBase,
        ...mapFormaParaMp(formaPagamento),
      },
      metadata: {
        tipo,
        pedidoId,
        lojaId: lojaId ?? "",
        formaPagamento: formaPagamento ?? "todos",
        parcelas: parcelasValidas,
      },
    };

    const preference = await mpFetch<MpPreferenceResponse>(
      token,
      "/checkout/preferences",
      {
        method: "POST",
        body: JSON.stringify(preferenceBody),
      },
    ).catch((error: unknown) => {
      const msg =
        error instanceof Error
          ? error.message
          : "Falha ao criar checkout no Mercado Pago.";
      console.error("criarCheckoutMercadoPago MP", msg, preferenceBody);
      throw new HttpsError("failed-precondition", msg);
    });

    const pagamentoPatch = {
      provider: "mercadopago",
      preferenceId: preference.id,
      checkoutUrl: preference.init_point,
      formaOnline: formaPagamento ?? null,
      parcelas: formaPagamento === "cartao" ? parcelasValidas : null,
      status: null,
      id: null,
    };

    if (tipo === "loja" && lojaId) {
      await admin
        .firestore()
        .doc(`lojas/${lojaId}/pedidos/${pedidoId}`)
        .set(
          {
            pagamento: pagamentoPatch,
            atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    } else {
      await admin
        .firestore()
        .doc(`pedidos_reposicao/${pedidoId}`)
        .set(
          {
            pagamento: pagamentoPatch,
            status: "aguardando_pagamento",
            atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    }

    return {
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      preferenceId: preference.id,
      titulo,
    };
  },
);
