import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { assertPodeGerenciarPedidoLoja } from "./adminAuth";
import {
  buildFocusNfeAuthHeader,
  consultarNotaFocusNfe,
  extrairMensagemErroFocus,
  mapearRespostaFocusNfe,
  resolverFocusNfeBaseUrl,
} from "./focusNfeHelpers";

const focusNfeToken = defineString("FOCUS_NFE_TOKEN", { default: "" });
const focusNfeAmbiente = defineString("FOCUS_NFE_AMBIENTE", { default: "homologacao" });

type SincronizarPayload = {
  lojaId?: string;
  pedidoId?: string;
};

export const sincronizarNotaFiscalPedido = onCall(
  {
    region: "us-central1",
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Faça login no admin.");
    }

    const { lojaId, pedidoId } = (request.data ?? {}) as SincronizarPayload;
    if (!lojaId || !pedidoId) {
      throw new HttpsError(
        "invalid-argument",
        "lojaId e pedidoId são obrigatórios.",
      );
    }

    await assertPodeGerenciarPedidoLoja(request.auth.uid, lojaId);

    const token = focusNfeToken.value();
    if (!token) {
      throw new HttpsError(
        "failed-precondition",
        "FOCUS_NFE_TOKEN não configurado.",
      );
    }

    const db = admin.firestore();
    const pedidoRef = db.doc(`lojas/${lojaId}/pedidos/${pedidoId}`);
    const snap = await pedidoRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Pedido não encontrado.");
    }

    const referencia = `loja-${pedidoId}`;
    const baseUrl = resolverFocusNfeBaseUrl(focusNfeAmbiente.value());
    const authHeader = buildFocusNfeAuthHeader(token);
    const json = await consultarNotaFocusNfe(baseUrl, referencia, authHeader);
    const status = String(json.status ?? "");

    if (status === "autorizado") {
      const nota = mapearRespostaFocusNfe(
        json,
        referencia,
        admin.firestore.FieldValue.serverTimestamp(),
      );
      await pedidoRef.set(
        {
          notaFiscal: nota,
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return { status: "emitida", nota };
    }

    if (status === "processando_autorizacao" || status === "processando") {
      await pedidoRef.set(
        {
          notaFiscal: {
            status: "processando",
            provedor: "focusnfe",
            referencia,
            erro:
              "NF ainda em processamento na Sefaz. Tente consultar novamente em instantes.",
          },
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return { status: "processando" };
    }

    if (status === "erro_autorizacao" || status === "denegado") {
      const erro = extrairMensagemErroFocus(json);
      await pedidoRef.set(
        {
          notaFiscal: {
            status: "erro",
            provedor: "focusnfe",
            referencia,
            erro,
          },
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return { status: "erro", erro };
    }

    throw new HttpsError(
      "not-found",
      status
        ? `NF com status «${status}» na Focus.`
        : "NF não encontrada na Focus para este pedido.",
    );
  },
);
