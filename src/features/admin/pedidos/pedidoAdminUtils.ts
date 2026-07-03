import type { PedidoLojaOrigem, PedidoLojaStatus } from "@/features/multitenant/types";

export const PEDIDO_STATUS_OPCOES: {
  value: PedidoLojaStatus;
  rotulo: string;
}[] = [
  { value: "aguardando_pagamento", rotulo: "Aguardando pagamento" },
  { value: "pago", rotulo: "Pagamento aprovado" },
  { value: "producao", rotulo: "Em produção" },
  { value: "enviado", rotulo: "Enviado" },
  { value: "entregue", rotulo: "Entregue" },
  { value: "cancelado", rotulo: "Cancelado" },
];

export function rotuloStatusPedido(status: PedidoLojaStatus): string {
  return (
    PEDIDO_STATUS_OPCOES.find((opcao) => opcao.value === status)?.rotulo ??
    status
  );
}

export function rotuloOrigemPedido(origem?: PedidoLojaOrigem | null): string {
  return origem === "presencial" ? "Presencial" : "Online";
}

export function rotuloFormaPagamentoPresencial(
  forma: string | null | undefined,
): string {
  const map: Record<string, string> = {
    dinheiro: "Dinheiro",
    pix: "PIX",
    cartao: "Cartão",
    outro: "Outro",
  };
  return forma ? (map[forma] ?? forma) : "—";
}

export function extrairLojaIdDoPathPedido(path: string): string | null {
  const match = path.match(/lojas\/([^/]+)\/pedidos\//);
  return match?.[1] ?? null;
}

import {
  firestoreTimestampToDate,
  firestoreTimestampToMillis,
} from "@/lib/firestoreTimestamp";

export function formatarDataPedido(criadoEm: unknown, atualizadoEm?: unknown): string {
  const date =
    firestoreTimestampToDate(criadoEm) ?? firestoreTimestampToDate(atualizadoEm);
  if (!date) return "—";

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function numeroPedidoCurto(pedidoId: string): string {
  if (pedidoId.length <= 10) return pedidoId;
  return `#${pedidoId.slice(-8).toUpperCase()}`;
}
