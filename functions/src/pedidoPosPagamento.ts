import * as admin from "firebase-admin";
import { MARCA_LOJA_ID, type ReferenciaPedido } from "./mercadoPagoShared";

type PagamentoPatch = {
  provider: string;
  id: string | null;
  status: string;
  metodoMp?: string | null;
  parcelas?: number | null;
  aprovadoEm?: admin.firestore.Timestamp | null;
  preferenceId?: string | null;
  checkoutUrl?: string | null;
  formaOnline?: string | null;
};

type PedidoItem = {
  produtoId?: string;
  personalizacaoId?: string | null;
  quantidade?: number;
};

async function decrementarEstoqueItem(
  lojaId: string,
  produtoId: string,
  quantidade: number,
): Promise<void> {
  const db = admin.firestore();
  const produtoRef = db.doc(`produtos/${produtoId}`);
  const estoqueRef = db.doc(`lojas/${lojaId}/estoque/${produtoId}`);

  await db.runTransaction(async (tx) => {
    const produtoSnap = await tx.get(produtoRef);
    if (!produtoSnap.exists) return;

    const produto = produtoSnap.data() ?? {};
    if (produto.personalizavel || produto.controlaEstoque === false) return;

    const estoqueSnap = await tx.get(estoqueRef);
    const estoqueLoja = estoqueSnap.exists
      ? Math.max(0, Number(estoqueSnap.data()?.quantidade ?? 0))
      : 0;
    const central = Math.max(0, Number(produto.estoqueCentral ?? 0));
    const disponivel = Math.min(central, estoqueLoja);

    if (disponivel < quantidade) {
      console.warn(
        `Estoque insuficiente loja=${lojaId} produto=${produtoId}`,
      );
      return;
    }

    tx.set(
      estoqueRef,
      {
        quantidade: estoqueLoja - quantidade,
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

async function decrementarEstoquePedido(
  lojaId: string,
  itens: PedidoItem[],
): Promise<void> {
  for (const item of itens) {
    if (item.personalizacaoId) continue;
    const produtoId = String(item.produtoId ?? "").trim();
    if (!produtoId) continue;
    const qtd = Math.max(1, Number(item.quantidade ?? 1));
    await decrementarEstoqueItem(lojaId, produtoId, qtd);
  }
}

function pedidoTemPersonalizacao(itens: PedidoItem[]): boolean {
  return itens.some((i) => Boolean(i.personalizacaoId));
}

async function espelharPedidoFilaProducaoMarca(
  pedidoOrigemId: string,
  origemLojaId: string,
  origemLojaNome: string | undefined,
  payload: Record<string, unknown>,
): Promise<void> {
  const db = admin.firestore();
  await db.collection(`lojas/${MARCA_LOJA_ID}/pedidos`).add({
    ...payload,
    filaProducaoMarca: true,
    origemLojaId,
    origemLojaNome: origemLojaNome ?? origemLojaId,
    origemPedidoId: pedidoOrigemId,
    observacao: `Produção — pedido da loja ${origemLojaNome ?? origemLojaId}`,
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function enfileirarNotaFiscal(opts: {
  tipo: "loja" | "reposicao";
  lojaId?: string;
  pedidoId: string;
  totalCentavos: number;
  clienteUid?: string | null;
}): Promise<FirebaseFirestore.DocumentReference> {
  const db = admin.firestore();
  return db.collection("notas_fiscais_outbox").add({
    tipo: opts.tipo,
    lojaId: opts.lojaId ?? null,
    pedidoId: opts.pedidoId,
    totalCentavos: opts.totalCentavos,
    clienteUid: opts.clienteUid ?? null,
    status: "pendente",
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Enfileira compra de etiqueta Melhor Envio (postagem em agência, sem coleta).
 * Só cria se o pedido tiver frete.servicoId e ainda não tiver meOrderId/rastreio.
 */
export async function enfileirarEnvioMelhorEnvio(opts: {
  tipo: "loja" | "reposicao";
  lojaId?: string | null;
  pedidoId: string;
  forcar?: boolean;
}): Promise<FirebaseFirestore.DocumentReference> {
  const db = admin.firestore();
  const pedidoRef =
    opts.tipo === "reposicao"
      ? db.doc(`pedidos_reposicao/${opts.pedidoId}`)
      : db.doc(`lojas/${opts.lojaId}/pedidos/${opts.pedidoId}`);

  const pedSnap = await pedidoRef.get();
  if (!pedSnap.exists) {
    throw new Error("Pedido não encontrado para envio.");
  }
  const ped = pedSnap.data() ?? {};
  const frete = (ped.frete as Record<string, unknown> | undefined) ?? {};
  if (!Number(frete.servicoId ?? 0)) {
    throw new Error("Pedido sem cotação Melhor Envio (frete.servicoId).");
  }

  const envio = (ped.envio as Record<string, unknown> | undefined) ?? {};
  if (envio.meOrderId) {
    throw new Error("Pedido já possui etiqueta Melhor Envio.");
  }
  if (!opts.forcar && envio.codigoRastreio) {
    throw new Error("Pedido já possui código de rastreio.");
  }

  if (ped.pagamentoLiberadoEnvio !== true) {
    throw new Error("Pagamento ainda não liberou o envio.");
  }

  return db.collection("envios_outbox").add({
    tipo: opts.tipo,
    lojaId: opts.lojaId ?? null,
    pedidoId: opts.pedidoId,
    status: "pendente",
    modoPostagem: "agencia",
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function atualizarIndiceCliente(
  clienteUid: string,
  pedidoId: string,
  status: string,
): Promise<void> {
  const db = admin.firestore();
  await db.doc(`usuarios/${clienteUid}/pedidos/${pedidoId}`).set(
    {
      statusInicial: status,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function aplicarPagamentoAprovadoLoja(
  lojaId: string,
  pedidoId: string,
  pagamento: PagamentoPatch,
): Promise<void> {
  const db = admin.firestore();
  const ref = db.doc(`lojas/${lojaId}/pedidos/${pedidoId}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const data = snap.data() ?? {};

    if (data.pagamentoLiberadoEnvio === true) return;

    const itens = Array.isArray(data.itens) ? data.itens : [];
    const temPersonalizada = pedidoTemPersonalizacao(itens);
    const novoStatus = temPersonalizada ? "producao" : "pago";

    tx.set(
      ref,
      {
        status: novoStatus,
        pagamentoLiberadoEnvio: true,
        pagamento: {
          ...(data.pagamento as Record<string, unknown> | undefined),
          ...pagamento,
        },
        notaFiscal: data.notaFiscal ?? { status: "pendente" },
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  const snap = await ref.get();
  if (!snap.exists) return;
  const data = snap.data() ?? {};

  const itens = Array.isArray(data.itens) ? (data.itens as PedidoItem[]) : [];
  const temPersonalizada = pedidoTemPersonalizacao(itens);
  const statusAposPagamento = temPersonalizada ? "producao" : "pago";

  if (data.estoqueDecrementado !== true) {
    if (data.origem !== "presencial") {
      await decrementarEstoquePedido(lojaId, itens);
      await ref.set({ estoqueDecrementado: true }, { merge: true });
    }
  }

  if (
    lojaId !== MARCA_LOJA_ID &&
    pedidoTemPersonalizacao(itens) &&
    !data.filaProducaoEspelhada
  ) {
    let nomeLoja = lojaId;
    const lojaSnap = await db.doc(`lojas/${lojaId}`).get();
    if (lojaSnap.exists) {
      nomeLoja = String(lojaSnap.data()?.nome ?? lojaId);
    }
    await espelharPedidoFilaProducaoMarca(pedidoId, lojaId, nomeLoja, {
      ...data,
      status: "producao",
      pagamentoLiberadoEnvio: true,
    });
    await ref.set({ filaProducaoEspelhada: true }, { merge: true });
  }

  const clienteUid = String(data.clienteUid ?? "");
  if (clienteUid) {
    await atualizarIndiceCliente(clienteUid, pedidoId, statusAposPagamento);
  }

  await enfileirarNotaFiscal({
    tipo: "loja",
    lojaId,
    pedidoId,
    totalCentavos: Number(data.totalCentavos ?? 0),
    clienteUid: clienteUid || null,
  });

  const frete = (data.frete as Record<string, unknown> | undefined) ?? {};
  if (Number(frete.servicoId ?? 0) > 0) {
    try {
      await enfileirarEnvioMelhorEnvio({
        tipo: "loja",
        lojaId,
        pedidoId,
      });
    } catch (error) {
      console.warn(
        "enfileirarEnvioMelhorEnvio loja",
        pedidoId,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

export async function aplicarPagamentoPendenteLoja(
  lojaId: string,
  pedidoId: string,
  pagamento: PagamentoPatch,
): Promise<void> {
  const db = admin.firestore();
  const ref = db.doc(`lojas/${lojaId}/pedidos/${pedidoId}`);
  await ref.set(
    {
      status: "aguardando_pagamento",
      pagamentoLiberadoEnvio: false,
      pagamento: pagamento,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function aplicarPagamentoAprovadoReposicao(
  pedidoId: string,
  pagamento: PagamentoPatch,
): Promise<void> {
  const db = admin.firestore();
  const ref = db.doc(`pedidos_reposicao/${pedidoId}`);
  const snap = await ref.get();
  if (!snap.exists) return;
  const data = snap.data() ?? {};

  if (data.pagamentoLiberadoEnvio === true) return;

  await ref.set(
    {
      status: "pago",
      pagamentoLiberadoEnvio: true,
      pagamento,
      notaFiscal: data.notaFiscal ?? { status: "pendente" },
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await enfileirarNotaFiscal({
    tipo: "reposicao",
    pedidoId,
    totalCentavos: Number(data.totalCentavos ?? 0),
    clienteUid: String(data.revendedorUid ?? "") || null,
  });

  const freteRep = (data.frete as Record<string, unknown> | undefined) ?? {};
  if (Number(freteRep.servicoId ?? 0) > 0) {
    try {
      await enfileirarEnvioMelhorEnvio({
        tipo: "reposicao",
        pedidoId,
      });
    } catch (error) {
      console.warn(
        "enfileirarEnvioMelhorEnvio reposicao",
        pedidoId,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

export async function aplicarPagamentoPendenteReposicao(
  pedidoId: string,
  pagamento: PagamentoPatch,
): Promise<void> {
  const db = admin.firestore();
  await db.doc(`pedidos_reposicao/${pedidoId}`).set(
    {
      status: "aguardando_pagamento",
      pagamentoLiberadoEnvio: false,
      pagamento,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function aplicarPagamentoRejeitado(
  ref: ReferenciaPedido,
  pagamento: PagamentoPatch,
): Promise<void> {
  const db = admin.firestore();
  if (ref.tipo === "loja") {
    await db.doc(`lojas/${ref.lojaId}/pedidos/${ref.pedidoId}`).set(
      {
        pagamento,
        pagamentoLiberadoEnvio: false,
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  await db.doc(`pedidos_reposicao/${ref.pedidoId}`).set(
    {
      pagamento,
      pagamentoLiberadoEnvio: false,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export { decrementarEstoquePedido };
