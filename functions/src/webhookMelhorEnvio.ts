import { onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { atualizarRastreioPedidoPorMeOrder } from "./melhorEnvioEtiqueta";

const webhookSecret = defineString("MELHOR_ENVIO_WEBHOOK_SECRET", {
  default: "",
});

/**
 * Webhook Melhor Envio — atualiza tracking quando a transportadora liberar.
 * URL: https://us-central1-zenpro-capinhas.cloudfunctions.net/webhookMelhorEnvio
 *
 * Não trata coleta: operação Zen Pro é postagem em agência.
 */
export const webhookMelhorEnvio = onRequest(
  {
    region: "us-central1",
    cors: false,
  },
  async (req, res) => {
    if (req.method === "GET") {
      res.status(200).send("ok");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const expected = webhookSecret.value().trim();
    if (expected) {
      const got = String(
        req.get("x-me-hmac-signature") ??
          req.get("x-webhook-secret") ??
          req.query.secret ??
          "",
      );
      if (got !== expected) {
        res.status(401).send("unauthorized");
        return;
      }
    }

    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const data =
        typeof body.data === "object" && body.data
          ? (body.data as Record<string, unknown>)
          : body;

      const orderId = String(
        data.id ?? data.order_id ?? data.orderId ?? body.id ?? "",
      ).trim();
      const tracking = String(
        data.tracking ?? data.self_tracking ?? data.tracking_code ?? "",
      ).trim();
      const status = String(data.status ?? body.event ?? "").trim() || null;

      if (orderId) {
        await atualizarRastreioPedidoPorMeOrder(
          orderId,
          tracking || null,
          status,
        );
      }

      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("webhookMelhorEnvio", error);
      res.status(200).json({ ok: false });
    }
  },
);
