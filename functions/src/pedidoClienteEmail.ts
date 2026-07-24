import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { siteUrl } from "./mercadoPagoShared";

type PedidoData = Record<string, unknown>;

function soEmail(v: unknown): string | null {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s.includes("@") ? s : null;
}

async function resolverEmailCliente(
  ped: PedidoData,
): Promise<{ email: string; nome: string } | null> {
  const cliente = (ped.cliente as Record<string, unknown> | undefined) ?? {};
  const nome = String(cliente.nome ?? "Cliente").trim() || "Cliente";
  const doPedido = soEmail(cliente.contato);
  const uid = String(ped.clienteUid ?? "").trim();

  if (uid) {
    const uSnap = await admin.firestore().doc(`usuarios/${uid}`).get();
    if (uSnap.exists) {
      const u = uSnap.data() ?? {};
      const email = soEmail(u.email) ?? doPedido;
      if (email) {
        return {
          email,
          nome: String(u.nomeCompleto ?? nome).trim() || nome,
        };
      }
    }
  }

  if (doPedido) return { email: doPedido, nome };
  return null;
}

async function enfileirarEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  tipo: string;
  lojaId: string;
  pedidoId: string;
}): Promise<void> {
  await admin.firestore().collection("emails_outbox").add({
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    tipo: opts.tipo,
    status: "pendente",
    meta: { lojaId: opts.lojaId, pedidoId: opts.pedidoId },
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function numeroCurto(pedidoId: string): string {
  return pedidoId.slice(-8).toUpperCase();
}

function linkMeusPedidos(): string {
  return `${siteUrl.value().replace(/\/$/, "")}/meus-pedidos`;
}

async function marcarNotificacao(
  ref: FirebaseFirestore.DocumentReference,
  flag: string,
): Promise<boolean> {
  const db = admin.firestore();
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    const flags =
      (snap.data()?.notificacoesEmail as Record<string, unknown> | undefined) ??
      {};
    if (flags[flag]) return false;
    tx.set(
      ref,
      {
        notificacoesEmail: {
          ...flags,
          [flag]: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );
    return true;
  });
}

function textoAguardoPagamento(forma: string | null | undefined): {
  tituloExtra: string;
  corpoTexto: string;
  corpoHtml: string;
} {
  const f = String(forma ?? "").toLowerCase();
  if (f === "boleto") {
    return {
      tituloExtra: "boleto",
      corpoTexto:
        "Você escolheu boleto. A compensação costuma levar de 1 a 3 dias úteis — isso é normal. Assim que o pagamento for confirmado, você recebe outro e-mail. Não é preciso pagar de novo.",
      corpoHtml:
        "<p>Você escolheu <strong>boleto</strong>. A compensação costuma levar de <strong>1 a 3 dias úteis</strong> — isso é normal.</p><p>Assim que o pagamento for confirmado, você recebe outro e-mail. Não é preciso pagar de novo.</p>",
    };
  }
  if (f === "pix") {
    return {
      tituloExtra: "PIX",
      corpoTexto:
        "Você escolheu PIX. A confirmação costuma levar poucos minutos. Assim que o Mercado Pago confirmar, você recebe outro e-mail de pagamento aprovado.",
      corpoHtml:
        "<p>Você escolheu <strong>PIX</strong>. A confirmação costuma levar <strong>poucos minutos</strong>.</p><p>Assim que o Mercado Pago confirmar, você recebe outro e-mail de pagamento aprovado.</p>",
    };
  }
  if (f === "cartao") {
    return {
      tituloExtra: "cartão",
      corpoTexto:
        "Você escolheu cartão. A aprovação costuma ser na hora. Se ficar pendente ou for recusado, tente de novo em Meus pedidos ou use PIX.",
      corpoHtml:
        "<p>Você escolheu <strong>cartão</strong>. A aprovação costuma ser na hora.</p><p>Se ficar pendente ou for recusado, tente de novo em Meus pedidos ou use PIX.</p>",
    };
  }
  return {
    tituloExtra: "pagamento",
    corpoTexto:
      "Seu pedido foi registrado e está aguardando a confirmação do pagamento. PIX costuma levar minutos; boleto pode levar 1 a 3 dias úteis.",
    corpoHtml:
      "<p>Seu pedido foi registrado e está aguardando a confirmação do pagamento.</p><p><strong>PIX</strong> costuma levar minutos; <strong>boleto</strong> pode levar 1 a 3 dias úteis.</p>",
  };
}

/**
 * E-mails ao cliente: aguardando pagamento, aprovado, rastreio, enviado, entregue.
 */
export const notificarClientePedidoAtualizado = onDocumentUpdated(
  {
    document: "lojas/{lojaId}/pedidos/{pedidoId}",
    region: "us-central1",
  },
  async (event) => {
    const before = event.data?.before.data() as PedidoData | undefined;
    const after = event.data?.after.data() as PedidoData | undefined;
    if (!before || !after) return;

    const lojaId = event.params.lojaId;
    const pedidoId = event.params.pedidoId;
    const ref = event.data!.after.ref;

    const dest = await resolverEmailCliente(after);
    if (!dest) {
      console.warn("notificarClientePedido: sem e-mail", lojaId, pedidoId);
      return;
    }

    const n = numeroCurto(pedidoId);
    const link = linkMeusPedidos();
    const baseHtml = (corpo: string) =>
      `<p>Olá, ${dest.nome}!</p>${corpo}<p><a href="${link}">Acompanhar pedido</a></p><p>Zen Pro</p>`;

    const pagAntes =
      (before.pagamento as Record<string, unknown> | undefined) ?? {};
    const pagDepois =
      (after.pagamento as Record<string, unknown> | undefined) ?? {};
    const checkoutAntes = String(pagAntes.checkoutUrl ?? "").trim();
    const checkoutDepois = String(pagDepois.checkoutUrl ?? "").trim();
    const statusAntes = String(before.status ?? "");
    const statusDepois = String(after.status ?? "");
    const forma =
      String(pagDepois.formaOnline ?? pagAntes.formaOnline ?? "").trim() ||
      null;

    if (
      !checkoutAntes &&
      checkoutDepois &&
      statusDepois === "aguardando_pagamento" &&
      after.pagamentoLiberadoEnvio !== true
    ) {
      const ok = await marcarNotificacao(ref, "aguardandoPagamento");
      if (ok) {
        const aguardo = textoAguardoPagamento(forma);
        const subject = `Pedido #${n} registrado — aguardando ${aguardo.tituloExtra}`;
        const text = `Olá, ${dest.nome}!\n\nSeu pedido #${n} foi registrado e está aguardando pagamento.\n\n${aguardo.corpoTexto}\n\nAcompanhe ou continue o pagamento: ${link}\n\nZen Pro`;
        await enfileirarEmail({
          to: dest.email,
          subject,
          text,
          html: baseHtml(
            `<p>Seu pedido <strong>#${n}</strong> foi registrado e está <strong>aguardando pagamento</strong>.</p>${aguardo.corpoHtml}`,
          ),
          tipo: "pedido_aguardando_pagamento",
          lojaId,
          pedidoId,
        });
      }
    }

    const pagoAntes = before.pagamentoLiberadoEnvio === true;
    const pagoDepois = after.pagamentoLiberadoEnvio === true;
    if (!pagoAntes && pagoDepois) {
      const ok = await marcarNotificacao(ref, "pagamentoAprovado");
      if (ok) {
        const status = String(after.status ?? "");
        const produ = status === "producao";
        const subject = produ
          ? `Pagamento confirmado — pedido #${n} em produção`
          : `Pagamento confirmado — pedido #${n}`;
        const text = produ
          ? `Olá, ${dest.nome}!\n\nRecebemos o pagamento do pedido #${n}. Sua capinha personalizada entrou em produção.\nO prazo de frete em dias úteis só começa a contar depois de fabricado e postado.\n\nAcompanhe: ${link}\n\nZen Pro`
          : `Olá, ${dest.nome}!\n\nRecebemos o pagamento do pedido #${n}. Estamos preparando o envio.\nO prazo de frete em dias úteis só começa a contar depois da postagem.\n\nAcompanhe: ${link}\n\nZen Pro`;
        await enfileirarEmail({
          to: dest.email,
          subject,
          text,
          html: baseHtml(
            produ
              ? `<p>Recebemos o pagamento do pedido <strong>#${n}</strong>. Sua capinha personalizada entrou em <strong>produção</strong>.</p><p>O prazo de frete em dias úteis só começa a contar depois de fabricado e postado.</p>`
              : `<p>Recebemos o pagamento do pedido <strong>#${n}</strong>. Estamos preparando o envio.</p><p>O prazo de frete em dias úteis só começa a contar depois da postagem.</p>`,
          ),
          tipo: "pedido_pagamento_aprovado",
          lojaId,
          pedidoId,
        });
      }
    }

    const rastAntes = String(
      (before.envio as Record<string, unknown> | undefined)?.codigoRastreio ??
        "",
    ).trim();
    const rastDepois = String(
      (after.envio as Record<string, unknown> | undefined)?.codigoRastreio ?? "",
    ).trim();
    const urlRastreio = String(
      (after.envio as Record<string, unknown> | undefined)?.urlRastreio ?? "",
    ).trim();
    const transportadora = String(
      (after.envio as Record<string, unknown> | undefined)?.transportadora ??
        "",
    ).trim();

    if (!rastAntes && rastDepois) {
      const ok = await marcarNotificacao(ref, "rastreio");
      if (ok) {
        const subject = `Código de rastreio — pedido #${n}`;
        const text = `Olá, ${dest.nome}!\n\nSeu pedido #${n} tem código de rastreio: ${rastDepois}${transportadora ? ` (${transportadora})` : ""}.\n${urlRastreio ? `Acompanhe: ${urlRastreio}\n` : ""}Também em: ${link}\n\nLembrete: a etiqueta está gerada; o prazo em dias úteis conta a partir da postagem na agência.\n\nZen Pro`;
        await enfileirarEmail({
          to: dest.email,
          subject,
          text,
          html: baseHtml(
            `<p>Seu pedido <strong>#${n}</strong> tem código de rastreio:</p><p><strong>${rastDepois}</strong>${transportadora ? ` — ${transportadora}` : ""}</p>${urlRastreio ? `<p><a href="${urlRastreio}">Rastrear envio</a></p>` : ""}<p>O prazo em dias úteis da transportadora conta a partir da postagem na agência.</p>`,
          ),
          tipo: "pedido_rastreio",
          lojaId,
          pedidoId,
        });
      }
    }

    if (statusAntes !== statusDepois && statusDepois === "enviado") {
      const ok = await marcarNotificacao(ref, "enviado");
      if (ok) {
        await enfileirarEmail({
          to: dest.email,
          subject: `Pedido #${n} enviado`,
          text: `Olá, ${dest.nome}!\n\nSeu pedido #${n} foi marcado como enviado.${rastDepois ? `\nRastreio: ${rastDepois}` : ""}\n\n${link}\n\nZen Pro`,
          html: baseHtml(
            `<p>Seu pedido <strong>#${n}</strong> foi marcado como <strong>enviado</strong>.</p>${rastDepois ? `<p>Rastreio: <strong>${rastDepois}</strong></p>` : ""}`,
          ),
          tipo: "pedido_enviado",
          lojaId,
          pedidoId,
        });
      }
    }

    if (statusAntes !== statusDepois && statusDepois === "entregue") {
      const ok = await marcarNotificacao(ref, "entregue");
      if (ok) {
        await enfileirarEmail({
          to: dest.email,
          subject: `Pedido #${n} entregue`,
          text: `Olá, ${dest.nome}!\n\nSeu pedido #${n} foi marcado como entregue. Obrigado por comprar na Zen Pro!\n\n${link}\n\nZen Pro`,
          html: baseHtml(
            `<p>Seu pedido <strong>#${n}</strong> foi marcado como <strong>entregue</strong>. Obrigado por comprar na Zen Pro!</p>`,
          ),
          tipo: "pedido_entregue",
          lojaId,
          pedidoId,
        });
      }
    }
  },
);