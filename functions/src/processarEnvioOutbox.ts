import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { comprarEGerarEtiquetaMelhorEnvio } from "./melhorEnvioEtiqueta";
import { melhorEnvioToken } from "./melhorEnvioShared";

type EnvioOutboxDoc = {
  tipo?: "loja" | "reposicao";
  lojaId?: string | null;
  pedidoId?: string;
  status?: string;
};

/**
 * Gera etiqueta Melhor Envio (compra no saldo) e grava rastreio no pedido.
 * Modo postagem em agência — não solicita coleta/retirada.
 */
export const processarEnvioOutbox = onDocumentCreated(
  {
    document: "envios_outbox/{docId}",
    region: "us-central1",
    timeoutSeconds: 300,
    secrets: [melhorEnvioToken],
    memory: "512MiB",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data() as EnvioOutboxDoc;
    const ref = snap.ref;

    if (data.status && data.status !== "pendente") return;

    const pedidoId = String(data.pedidoId ?? "");
    const tipo = data.tipo ?? "loja";
    const lojaId = data.lojaId ?? null;

    if (!pedidoId) {
      await ref.update({
        status: "erro",
        erro: "pedidoId ausente",
        processadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    const token = melhorEnvioToken.value();
    if (!token) {
      await ref.update({
        status: "aguardando_manual",
        mensagem:
          "MELHOR_ENVIO_TOKEN não configurado — cadastre o rastreio manualmente no admin.",
        processadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    await ref.update({
      status: "processando",
      processandoEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      const resultado = await comprarEGerarEtiquetaMelhorEnvio({
        token,
        tipo,
        lojaId,
        pedidoId,
      });

      await ref.update({
        status: "gerado",
        resultado,
        processadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao gerar etiqueta ME.";
      console.error("processarEnvioOutbox", pedidoId, message);
      // Não sobrescreve pedido que já tem etiqueta (ex.: retry com saldo baixo).
      if (!/já possui etiqueta/i.test(message)) {
        await marcarErroEnvioPedido(tipo, lojaId, pedidoId, message);
      }
      await ref.update({
        status: "erro",
        erro: message,
        processadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  },
);

async function marcarErroEnvioPedido(
  tipo: string,
  lojaId: string | null,
  pedidoId: string,
  erro: string,
): Promise<void> {
  const db = admin.firestore();
  const ref =
    tipo === "reposicao"
      ? db.doc(`pedidos_reposicao/${pedidoId}`)
      : db.doc(`lojas/${lojaId}/pedidos/${pedidoId}`);

  const snap = await ref.get();
  if (!snap.exists) return;
  const prev = (snap.data()?.envio as Record<string, unknown>) ?? {};
  if (prev.meOrderId || prev.codigoRastreio) {
    // Pedido já OK — não grava erro vermelho por tentativa antiga/retry.
    return;
  }
  await ref.set(
    {
      envio: {
        ...prev,
        statusMelhorEnvio: "erro",
        erroMelhorEnvio: erro.slice(0, 500),
      },
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
