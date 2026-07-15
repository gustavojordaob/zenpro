import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertPodeGerenciarPedidoLoja } from "./adminAuth";
import { enfileirarEnvioMelhorEnvio } from "./pedidoPosPagamento";
import { melhorEnvioToken } from "./melhorEnvioShared";

type Payload = {
  tipo?: "loja" | "reposicao";
  lojaId?: string;
  pedidoId?: string;
};

/** Admin: reenfileira geração de etiqueta (pedidos já pagos sem rastreio). */
export const reprocessarEnvioMelhorEnvio = onCall(
  {
    region: "us-central1",
    cors: true,
    secrets: [melhorEnvioToken],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Faça login.");
    }

    const { tipo = "loja", lojaId, pedidoId } = (request.data ??
      {}) as Payload;

    if (!pedidoId) {
      throw new HttpsError("invalid-argument", "pedidoId é obrigatório.");
    }
    if (tipo === "loja" && !lojaId) {
      throw new HttpsError("invalid-argument", "lojaId é obrigatório.");
    }

    if (tipo === "loja" && lojaId) {
      await assertPodeGerenciarPedidoLoja(request.auth.uid, lojaId);
    }

    try {
      const ref = await enfileirarEnvioMelhorEnvio({
        tipo,
        lojaId: lojaId ?? null,
        pedidoId,
        forcar: true,
      });
      return { outboxId: ref.id };
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Falha ao enfileirar envio.";
      throw new HttpsError("failed-precondition", msg);
    }
  },
);
