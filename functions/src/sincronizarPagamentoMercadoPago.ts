import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { mpAccessToken } from "./mercadoPagoShared";
import {
  processarPagamentoMp,
  sincronizarPagamentoPorPedido,
} from "./mercadoPagoPagamento";

type SyncPayload = {
  tipo?: "loja" | "reposicao";
  lojaId?: string;
  pedidoId?: string;
  paymentId?: string | null;
};

export const sincronizarPagamentoMercadoPago = onCall(
  {
    secrets: [mpAccessToken],
    region: "us-central1",
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Faça login.");
    }

    const { tipo, lojaId, pedidoId, paymentId } = (request.data ??
      {}) as SyncPayload;

    if (!tipo || !pedidoId) {
      throw new HttpsError("invalid-argument", "tipo e pedidoId são obrigatórios.");
    }

    const token = mpAccessToken.value();
    if (!token) {
      throw new HttpsError(
        "failed-precondition",
        "Mercado Pago não configurado.",
      );
    }

    if (tipo === "loja") {
      if (!lojaId) {
        throw new HttpsError("invalid-argument", "lojaId é obrigatório.");
      }
      const snap = await admin
        .firestore()
        .doc(`lojas/${lojaId}/pedidos/${pedidoId}`)
        .get();
      if (!snap.exists) {
        throw new HttpsError("not-found", "Pedido não encontrado.");
      }
      const data = snap.data() ?? {};
      if (String(data.clienteUid ?? "") !== request.auth.uid) {
        throw new HttpsError("permission-denied", "Pedido de outro usuário.");
      }
    } else {
      const snap = await admin
        .firestore()
        .doc(`pedidos_reposicao/${pedidoId}`)
        .get();
      if (!snap.exists) {
        throw new HttpsError("not-found", "Pedido não encontrado.");
      }
      if (String(snap.data()?.revendedorUid ?? "") !== request.auth.uid) {
        throw new HttpsError("permission-denied", "Pedido de outro usuário.");
      }
    }

    if (paymentId) {
      await processarPagamentoMp(String(paymentId), token);
      return { sincronizado: true, origem: "payment_id" };
    }

    const resultado = await sincronizarPagamentoPorPedido(token, {
      tipo,
      lojaId,
      pedidoId,
    });

    return { ...resultado, origem: "search" };
  },
);
