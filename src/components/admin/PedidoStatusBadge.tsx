import type { PedidoLojaStatus } from "@/features/multitenant/types";
import { rotuloStatusPedido } from "@/features/admin/pedidos/pedidoAdminUtils";

const ESTILOS: Record<PedidoLojaStatus, string> = {
  aguardando_pagamento: "bg-amber-100 text-amber-900",
  pago: "bg-sky-100 text-sky-900",
  producao: "bg-violet-100 text-violet-900",
  enviado: "bg-emerald-100 text-emerald-900",
};

type Props = {
  status: PedidoLojaStatus;
};

export function PedidoStatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTILOS[status] ?? "bg-zinc-100 text-zinc-700"}`}
    >
      {rotuloStatusPedido(status)}
    </span>
  );
}
