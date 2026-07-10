import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertPodeGerenciarPedidoLoja } from "./adminAuth";
import { enfileirarNotaFiscal } from "./pedidoPosPagamento";

type ReemitirPayload = {
  lojaId?: string;
  pedidoId?: string;
};

const STATUS_PAGO = new Set([
  "pago",
  "producao",
  "enviado",
  "entregue",
]);

function pagamentoLiberado(data: Record<string, unknown>): boolean {
  if (Boolean(data.pagamentoLiberadoEnvio)) return true;
  const status = String(data.status ?? "");
  return STATUS_PAGO.has(status);
}

export const reemitirNotaFiscalPedido = onCall(
  {
    region: "us-central1",
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Faça login no admin.");
    }

    const { lojaId, pedidoId } = (request.data ?? {}) as ReemitirPayload;
    if (!lojaId || !pedidoId) {
      throw new HttpsError(
        "invalid-argument",
        "lojaId e pedidoId são obrigatórios.",
      );
    }

    await assertPodeGerenciarPedidoLoja(request.auth.uid, lojaId);

    const db = admin.firestore();
    const ref = db.doc(`lojas/${lojaId}/pedidos/${pedidoId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Pedido não encontrado.");
    }

    const data = snap.data() ?? {};
    const nota = (data.notaFiscal as { status?: string } | undefined) ?? {};
    if (nota.status !== "erro") {
      throw new HttpsError(
        "failed-precondition",
        "Só é possível reemitir quando a nota está com status erro.",
      );
    }

    if (!pagamentoLiberado(data)) {
      throw new HttpsError(
        "failed-precondition",
        "Nota fiscal só pode ser emitida após pagamento confirmado.",
      );
    }

    await ref.set(
      {
        notaFiscal: {
          status: "pendente",
          provedor: "focusnfe",
          erro: null,
        },
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const outboxRef = await enfileirarNotaFiscal({
      tipo: "loja",
      lojaId,
      pedidoId,
      totalCentavos: Number(data.totalCentavos ?? 0),
      clienteUid: String(data.clienteUid ?? "") || null,
    });

    return {
      enfileirado: true,
      outboxId: outboxRef.id,
    };
  },
);
