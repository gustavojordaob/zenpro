import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineString } from "firebase-functions/params";
import * as nodemailer from "nodemailer";
import { gerarFotoCriativaIA } from "./gerarFotoCriativaIA";
import { criarCheckoutMercadoPago } from "./mercadoPagoCheckout";
import { webhookMercadoPago } from "./mercadoPagoWebhook";
import { sincronizarPagamentoMercadoPago } from "./sincronizarPagamentoMercadoPago";
import { processarNotaFiscalOutbox } from "./processarNotaFiscalOutbox";
import { reemitirNotaFiscalPedido } from "./reemitirNotaFiscalPedido";
import { sincronizarNotaFiscalPedido } from "./sincronizarNotaFiscalPedido";

admin.initializeApp();

export {
  gerarFotoCriativaIA,
  criarCheckoutMercadoPago,
  webhookMercadoPago,
  sincronizarPagamentoMercadoPago,
  processarNotaFiscalOutbox,
  reemitirNotaFiscalPedido,
  sincronizarNotaFiscalPedido,
};

const resendApiKey = defineString("RESEND_API_KEY", { default: "" });
const emailFrom = defineString("EMAIL_FROM", {
  default: "Zen Pro <noreply@zenpro-capinhas.web.app>",
});
const smtpHost = defineString("SMTP_HOST", { default: "" });
const smtpPort = defineString("SMTP_PORT", { default: "587" });
const smtpUser = defineString("SMTP_USER", { default: "" });
const smtpPass = defineString("SMTP_PASS", { default: "" });

type EmailOutboxDoc = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  tipo?: string;
  status?: string;
};

async function enviarViaResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  text: string,
  html?: string,
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html: html || undefined,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

async function enviarViaSmtp(
  host: string,
  port: number,
  user: string,
  pass: string,
  from: string,
  to: string,
  subject: string,
  text: string,
  html?: string,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: html || text.replace(/\n/g, "<br/>"),
  });
}

export const processarEmailOutbox = onDocumentCreated(
  "emails_outbox/{emailId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data() as EmailOutboxDoc;
    const ref = snap.ref;

    if (data.status && data.status !== "pendente") return;

    const to = String(data.to ?? "").trim();
    const subject = String(data.subject ?? "").trim();
    const text = String(data.text ?? "").trim();
    const html = data.html ? String(data.html) : undefined;

    if (!to || !subject || !text) {
      await ref.update({
        status: "erro",
        erro: "Campos obrigatórios ausentes (to, subject, text).",
        processadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    const from = emailFrom.value();

    try {
      const resend = resendApiKey.value();
      if (resend) {
        await enviarViaResend(resend, from, to, subject, text, html);
      } else {
        const host = smtpHost.value();
        const user = smtpUser.value();
        const pass = smtpPass.value();
        const port = Number(smtpPort.value() || "587");

        if (!host || !user || !pass) {
          throw new Error(
            "Configure RESEND_API_KEY ou SMTP_HOST/SMTP_USER/SMTP_PASS na function.",
          );
        }

        await enviarViaSmtp(host, port, user, pass, from, to, subject, text, html);
      }

      await ref.update({
        status: "enviado",
        processadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido ao enviar e-mail.";
      await ref.update({
        status: "erro",
        erro: message,
        processadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  },
);

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
        `Estoque insuficiente loja=${lojaId} produto=${produtoId} (pedido já criado)`,
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

export const decrementarEstoquePedidoLoja = onDocumentCreated(
  "lojas/{lojaId}/pedidos/{pedidoId}",
  async (event) => {
    const data = event.data?.data() as {
      itens?: PedidoItem[];
      origem?: string;
      status?: string;
      pagamento?: { provider?: string };
    } | undefined;
    if (!data?.itens?.length) return;

    if (data.origem === "presencial") return;
    // Pagamentos Mercado Pago decrementam estoque no webhook (após aprovação).
    if (data.pagamento?.provider === "mercadopago") return;
    if (data.status !== "pago") return;

    const lojaId = event.params.lojaId;

    for (const item of data.itens) {
      if (item.personalizacaoId) continue;
      const produtoId = String(item.produtoId ?? "").trim();
      if (!produtoId) continue;
      const qtd = Math.max(1, Number(item.quantidade ?? 1));
      await decrementarEstoqueItem(lojaId, produtoId, qtd);
    }
  },
);
