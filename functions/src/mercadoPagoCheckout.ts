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
  maxParcelas?: number;
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

function precoReais(centavos: number): number {
  return Math.round(Math.max(0, Number(centavos) || 0)) / 100;
}

function descricaoItemMp(titulo: string, detalhe?: string): string {
  const base = detalhe?.trim() || titulo.trim() || "Produto Zen Pro";
  return base.slice(0, 256);
}

function itensParaMp(itens: ItemPedido[], tituloFallback: string) {
  const mapped = itens.map((item, index) => {
    const title = String(item.nomeProduto ?? item.nome ?? tituloFallback).slice(
      0,
      120,
    );
    return {
      id: String(index + 1),
      title,
      description: descricaoItemMp(
        title,
        `Capinha / acessório Zen Pro — ${title}`,
      ),
      quantity: Math.max(1, Number(item.quantidade ?? 1)),
      unit_price: precoReais(Number(item.precoCentavos ?? 0)),
      currency_id: "BRL",
      category_id: "others",
    };
  });

  if (mapped.length === 0) {
    return [
      {
        id: "1",
        title: tituloFallback,
        description: descricaoItemMp(tituloFallback),
        quantity: 1,
        unit_price: 0,
        currency_id: "BRL",
        category_id: "others",
      },
    ];
  }
  return mapped;
}

/** Garante que a soma dos itens bate com o total do pedido (evita trava no Checkout). */
function alinharItensAoTotal(
  items: MpPreferenceBody["items"],
  totalCentavos: number,
  titulo: string,
): MpPreferenceBody["items"] {
  const total = precoReais(totalCentavos);
  if (total <= 0) return garantirDescricoesItens(items);
  const soma = items.reduce(
    (acc, i) => acc + Number(i.unit_price) * Number(i.quantity),
    0,
  );
  if (Math.abs(soma - total) <= 0.02) return garantirDescricoesItens(items);
  return garantirDescricoesItens([
    {
      id: "pedido",
      title: titulo.slice(0, 120),
      description: descricaoItemMp(
        titulo,
        `Pedido Zen Pro — ${titulo}`,
      ),
      quantity: 1,
      unit_price: total,
      currency_id: "BRL",
      category_id: "others",
    },
  ]);
}

function garantirDescricoesItens(
  items: MpPreferenceBody["items"],
): MpPreferenceBody["items"] {
  return items.map((item) => ({
    ...item,
    description:
      item.description?.trim() ||
      descricaoItemMp(item.title, `Item Zen Pro — ${item.title}`),
    category_id: item.category_id ?? "others",
  }));
}

export const criarCheckoutMercadoPago = onCall(
  {
    secrets: [mpAccessToken],
    region: "us-central1",
    cors: true,
    /** Evita cold start no “Confirmar e pagar”. */
    minInstances: 1,
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
      maxParcelas,
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
    let totalPedidoCentavos = 0;

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
      const frete = (data.frete as Record<string, unknown> | undefined) ?? {};
      const freteCentavos = Math.max(0, Number(frete.precoCentavos ?? 0));
      if (freteCentavos > 0) {
        const freteTitulo = String(frete.nome ?? "Frete").slice(0, 120);
        const freteEmpresa = String(frete.empresa ?? "").trim();
        items = [
          ...items,
          {
            id: "frete",
            title: freteTitulo,
            description: descricaoItemMp(
              freteTitulo,
              freteEmpresa
                ? `Frete ${freteEmpresa} — ${freteTitulo}`
                : `Frete de entrega — ${freteTitulo}`,
            ),
            quantity: 1,
            unit_price: precoReais(freteCentavos),
            currency_id: "BRL",
            category_id: "others",
          },
        ];
      }
      totalPedidoCentavos = Math.max(0, Number(data.totalCentavos ?? 0));
      const cliente = (data.cliente as Record<string, unknown> | undefined) ?? {};
      // Contato do pedido pode ser telefone — e-mail do Auth é preferível no payer.
      payerEmail =
        request.auth.token.email ??
        (String(cliente.contato ?? "").includes("@")
          ? String(cliente.contato)
          : undefined);
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
      totalPedidoCentavos = Math.max(0, Number(data.totalCentavos ?? 0));
      payerEmail = request.auth.token.email ?? String(data.revendedorEmail ?? "");
      externalRef = montarExternalReference({ tipo: "reposicao", pedidoId });
      titulo = `Reposição ${pedidoId.slice(-8).toUpperCase()}`;
    }

    items = alinharItensAoTotal(items, totalPedidoCentavos, titulo);

    const tetoParcelas = Math.min(
      PARCELAMENTO_MAXIMO,
      Math.max(1, Number(maxParcelas ?? PARCELAMENTO_MAXIMO) || PARCELAMENTO_MAXIMO),
    );
    const parcelasValidas =
      formaPagamento === "cartao"
        ? Math.min(tetoParcelas, Math.max(1, Number(parcelas ?? 1)))
        : 1;

    const payer = await montarPayerMercadoPago(request.auth.uid, payerEmail);

    const paymentMethods: NonNullable<MpPreferenceBody["payment_methods"]> = {
      ...mapFormaParaMp(formaPagamento, parcelasValidas),
    };
    // Reforça teto + padrão = parcelas escolhidas no site (ex.: 4x).
    // Na 1ª tela do Checkout Pro só aparece “Cartão”; as parcelas (1…N)
    // aparecem depois de escolher o cartão, com N pré-selecionado.
    if (formaPagamento === "cartao") {
      paymentMethods.installments = parcelasValidas;
      paymentMethods.default_installments = parcelasValidas;
    } else if (
      !formaPagamento &&
      paymentMethods.installments == null
    ) {
      paymentMethods.installments = tetoParcelas;
      paymentMethods.default_installments = parcelasValidas;
    }

    if (formaPagamento === "cartao" && parcelasValidas > 1 && items[0]) {
      const baseDesc = items[0].description ?? items[0].title;
      items[0] = {
        ...items[0],
        description: `${baseDesc} — cartão em até ${parcelasValidas}x`.slice(
          0,
          256,
        ),
      };
    }

    const preferenceBody: MpPreferenceBody = {
      items,
      payer,
      back_urls: backUrls,
      auto_return: "approved",
      external_reference: externalRef,
      notification_url: webhookUrl(projectId),
      // Só letras/números (espaço quebra em algumas contas).
      statement_descriptor: "ZENPRO",
      binary_mode: false,
      payment_methods: paymentMethods,
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
