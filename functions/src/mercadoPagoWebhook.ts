import { onRequest } from "firebase-functions/v2/https";
import { mpAccessToken } from "./mercadoPagoShared";
import {
  extrairIdNotificacaoMp,
  processarMerchantOrderMp,
  processarPagamentoMp,
} from "./mercadoPagoPagamento";

export const webhookMercadoPago = onRequest(
  {
    secrets: [mpAccessToken],
    region: "us-central1",
    cors: false,
  },
  async (req, res) => {
    if (req.method === "GET") {
      const token = mpAccessToken.value();
      const query = (req.query ?? {}) as Record<string, unknown>;
      const { topic, id } = extrairIdNotificacaoMp({}, query);

      if (token && topic && id) {
        try {
          await processarNotificacaoMp(topic, id, token);
        } catch (error) {
          console.error("Erro webhook MP (GET)", topic, id, error);
        }
      }

      res.status(200).send("ok");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    res.status(200).send("ok");

    const token = mpAccessToken.value();
    if (!token) {
      console.error("MP_ACCESS_TOKEN ausente");
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const query = (req.query ?? {}) as Record<string, unknown>;
    const { topic, id } = extrairIdNotificacaoMp(body, query);

    if (!id) {
      console.warn("Webhook MP sem id", { body, query });
      return;
    }

    const topicNorm = topic?.toLowerCase() ?? "payment";

    try {
      await processarNotificacaoMp(topicNorm, id, token);
    } catch (error) {
      console.error("Erro ao processar webhook MP", topicNorm, id, error);
    }
  },
);

async function processarNotificacaoMp(
  topic: string,
  id: string,
  accessToken: string,
): Promise<void> {
  if (topic === "merchant_order" || topic === "topic_merchant_order_wh") {
    await processarMerchantOrderMp(id, accessToken);
    return;
  }

  if (
    topic === "payment" ||
    topic === "topic_payment" ||
    topic === "topic_payments" ||
    topic.includes("payment")
  ) {
    await processarPagamentoMp(id, accessToken);
    return;
  }

  console.warn("Webhook MP tópico não tratado", topic, id);
}
