import { listarTodosPedidos, type PedidoAdmin } from "@/features/admin/pedidos/pedidoAdminService";
import type { PedidoLojaStatus } from "@/features/multitenant/types";
import { firestoreTimestampToDate } from "@/lib/firestoreTimestamp";

export type PeriodoDashboard = "hoje" | "semana" | "mes" | "ano";

export type DashboardMetricas = {
  pedidosNoPeriodo: number;
  faturamentoCentavos: number;
  emAndamento: number;
  aguardandoProducao: number;
  ticketMedioCentavos: number;
  aguardandoPagamento: number;
};

export type FaturamentoDia = {
  dia: number;
  label: string;
  centavos: number;
};

export type PedidosPorStatus = {
  status: PedidoLojaStatus;
  rotulo: string;
  quantidade: number;
};

export type TopProduto = {
  chave: string;
  nome: string;
  quantidade: number;
};

export type DashboardData = {
  metricas: DashboardMetricas;
  faturamentoPorDia: FaturamentoDia[];
  pedidosPorStatus: PedidosPorStatus[];
  topProdutos: TopProduto[];
  ultimosPedidos: PedidoAdmin[];
  periodo: PeriodoDashboard;
  intervaloLabel: string;
};

const STATUS_FATURADOS: PedidoLojaStatus[] = [
  "pago",
  "producao",
  "enviado",
  "entregue",
];
const STATUS_EM_ANDAMENTO: PedidoLojaStatus[] = ["pago", "producao"];

const ROTULOS_STATUS: Record<PedidoLojaStatus, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  producao: "Em produção",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

function inicioDoDia(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fimDoDia(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function intervaloPeriodo(periodo: PeriodoDashboard, ref = new Date()): {
  inicio: Date;
  fim: Date;
  label: string;
} {
  const hoje = inicioDoDia(ref);
  const fim = fimDoDia(ref);

  if (periodo === "hoje") {
    return { inicio: hoje, fim, label: "Hoje" };
  }

  if (periodo === "semana") {
    const inicio = new Date(hoje);
    const diaSemana = inicio.getDay();
    const diff = diaSemana === 0 ? 6 : diaSemana - 1;
    inicio.setDate(inicio.getDate() - diff);
    return { inicio, fim, label: "Esta semana" };
  }

  if (periodo === "ano") {
    const inicio = new Date(hoje.getFullYear(), 0, 1);
    return { inicio, fim, label: String(hoje.getFullYear()) };
  }

  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return { inicio, fim, label: "Este mês" };
}

function resolverDataPedido(pedido: PedidoAdmin): Date | null {
  return (
    firestoreTimestampToDate(pedido.criadoEm) ??
    firestoreTimestampToDate(pedido.atualizadoEm) ??
    null
  );
}

function pedidoNoIntervalo(pedido: PedidoAdmin, inicio: Date, fim: Date): boolean {
  const date = resolverDataPedido(pedido);
  // Pedidos legados/seed sem criadoEm — incluir para não zerar métricas
  if (!date) return true;
  return date.getTime() >= inicio.getTime() && date.getTime() <= fim.getTime();
}

function centavosFaturados(pedido: PedidoAdmin): number {
  if (!STATUS_FATURADOS.includes(pedido.status)) return 0;
  return pedido.totalCentavos;
}

export function calcularDashboard(
  pedidos: PedidoAdmin[],
  periodo: PeriodoDashboard,
): DashboardData {
  const { inicio, fim, label } = intervaloPeriodo(periodo);
  const noPeriodo = pedidos.filter((p) => pedidoNoIntervalo(p, inicio, fim));

  const faturamentoCentavos = noPeriodo.reduce(
    (acc, p) => acc + centavosFaturados(p),
    0,
  );
  const pedidosFaturados = noPeriodo.filter((p) =>
    STATUS_FATURADOS.includes(p.status),
  ).length;

  const metricas: DashboardMetricas = {
    pedidosNoPeriodo: noPeriodo.length,
    faturamentoCentavos,
    emAndamento: noPeriodo.filter((p) => STATUS_EM_ANDAMENTO.includes(p.status))
      .length,
    aguardandoProducao: noPeriodo.filter((p) => p.status === "pago").length,
    ticketMedioCentavos:
      pedidosFaturados > 0
        ? Math.round(faturamentoCentavos / pedidosFaturados)
        : 0,
    aguardandoPagamento: noPeriodo.filter(
      (p) => p.status === "aguardando_pagamento",
    ).length,
  };

  const diasMap = new Map<number, number>();
  for (const pedido of noPeriodo) {
    const date = resolverDataPedido(pedido);
    if (!date) continue;
    const dia = date.getDate();
    diasMap.set(dia, (diasMap.get(dia) ?? 0) + centavosFaturados(pedido));
  }

  const faturamentoPorDia: FaturamentoDia[] = Array.from(diasMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([dia, centavos]) => ({
      dia,
      label: String(dia),
      centavos,
    }));

  const statusCount = new Map<PedidoLojaStatus, number>();
  for (const pedido of noPeriodo) {
    statusCount.set(
      pedido.status,
      (statusCount.get(pedido.status) ?? 0) + 1,
    );
  }

  const pedidosPorStatus: PedidosPorStatus[] = (
    Object.keys(ROTULOS_STATUS) as PedidoLojaStatus[]
  ).map((status) => ({
    status,
    rotulo: ROTULOS_STATUS[status],
    quantidade: statusCount.get(status) ?? 0,
  }));

  const produtoMap = new Map<string, { nome: string; quantidade: number }>();
  for (const pedido of noPeriodo) {
    for (const item of pedido.itens) {
      const chave = item.produtoId || item.nomeProduto || "desconhecido";
      const nome = item.nomeProduto ?? chave;
      const atual = produtoMap.get(chave) ?? { nome, quantidade: 0 };
      atual.quantidade += item.quantidade ?? 1;
      produtoMap.set(chave, atual);
    }
  }

  const topProdutos: TopProduto[] = Array.from(produtoMap.entries())
    .map(([chave, v]) => ({ chave, nome: v.nome, quantidade: v.quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  const ultimosPedidos = [...pedidos]
    .sort((a, b) => {
      const da = resolverDataPedido(a)?.getTime() ?? 0;
      const db = resolverDataPedido(b)?.getTime() ?? 0;
      return db - da;
    })
    .slice(0, 8);

  return {
    metricas,
    faturamentoPorDia,
    pedidosPorStatus,
    topProdutos,
    ultimosPedidos,
    periodo,
    intervaloLabel: label,
  };
}

/** lojaIdFiltro: null = todas (marca); string = só essa loja (revendedor ou marca) */
export async function carregarDashboardAdmin(
  lojaIdFiltro: string | null,
  periodo: PeriodoDashboard,
): Promise<DashboardData> {
  const pedidos = await listarTodosPedidos(lojaIdFiltro);
  return calcularDashboard(pedidos, periodo);
}

export function formatarMoeda(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
