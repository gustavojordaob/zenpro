"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PedidoStatusBadge } from "@/components/admin/PedidoStatusBadge";
import { formatarDataPedido, numeroPedidoCurto } from "@/features/admin/pedidos/pedidoAdminUtils";
import {
  carregarDashboardAdmin,
  formatarMoeda,
  type DashboardData,
  type PeriodoDashboard,
} from "@/features/admin/dashboard/dashboardAdminService";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";
import { NivelRevendedorAdminPanel } from "@/components/revendedor/NivelRevendedorAdminPanel";

const PERIODOS: { value: PeriodoDashboard; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "ano", label: "Ano" },
];

function MetricCard({
  titulo,
  valor,
  subtitulo,
}: {
  titulo: string;
  valor: string;
  subtitulo?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {titulo}
      </p>
      <p className="mt-2 text-2xl font-bold text-zinc-900">{valor}</p>
      {subtitulo && (
        <p className="mt-1 text-xs text-zinc-500">{subtitulo}</p>
      )}
    </div>
  );
}

function BarChartSimple({
  titulo,
  items,
  formatValor,
}: {
  titulo: string;
  items: { label: string; valor: number }[];
  formatValor?: (n: number) => string;
}) {
  const max = Math.max(...items.map((i) => i.valor), 1);
  const fmt = formatValor ?? ((n: number) => String(n));

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-zinc-900">{titulo}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Sem dados no período.</p>
      ) : (
        <div className="mt-4 flex items-end gap-1 sm:gap-2" style={{ minHeight: 120 }}>
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-1 flex-col items-center gap-1"
              title={`${item.label}: ${fmt(item.valor)}`}
            >
              <div
                className="w-full rounded-t bg-violet-500 transition-all"
                style={{
                  height: `${Math.max(8, (item.valor / max) * 100)}px`,
                  maxHeight: 100,
                }}
              />
              <span className="text-[10px] text-zinc-500">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminDashboardPageClient() {
  const { sessao, isMarca, lojaId } = useAuthAdmin();
  const [periodo, setPeriodo] = useState<PeriodoDashboard>("mes");
  const [data, setData] = useState<DashboardData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const lojaFiltro = isMarca ? null : lojaId;

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      if (!isMarca && !lojaId) {
        throw new Error("Revendedor sem loja vinculada.");
      }
      setData(await carregarDashboardAdmin(lojaFiltro, periodo));
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar dashboard.",
      );
    } finally {
      setCarregando(false);
    }
  }, [isMarca, lojaId, lojaFiltro, periodo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const subtitulo = isMarca
    ? "Métricas de todas as lojas da rede"
    : `Métricas da sua loja (${lojaId})`;

  return (
    <AdminShell titulo="Dashboard" subtitulo={subtitulo}>
      <NivelRevendedorAdminPanel />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          Olá{sessao?.nomeCompleto ? `, ${sessao.nomeCompleto}` : ""}.{" "}
          {data?.intervaloLabel ?? ""}
        </p>
        <div className="flex rounded-xl border border-zinc-200 bg-white p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriodo(p.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                periodo === p.value
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando || !data ? (
        <p className="text-sm text-zinc-500">Carregando métricas...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              titulo="Pedidos no período"
              valor={String(data.metricas.pedidosNoPeriodo)}
            />
            <MetricCard
              titulo="Faturamento"
              valor={formatarMoeda(data.metricas.faturamentoCentavos)}
              subtitulo="Pedidos pagos, em produção ou enviados"
            />
            <MetricCard
              titulo="Em andamento"
              valor={String(data.metricas.emAndamento)}
              subtitulo="Pagos + em produção"
            />
            <MetricCard
              titulo="Aguardando produção"
              valor={String(data.metricas.aguardandoProducao)}
              subtitulo="Status: pago"
            />
            <MetricCard
              titulo="Ticket médio"
              valor={formatarMoeda(data.metricas.ticketMedioCentavos)}
            />
            <MetricCard
              titulo="Aguardando pagamento"
              valor={String(data.metricas.aguardandoPagamento)}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <BarChartSimple
              titulo="Faturamento por dia"
              items={data.faturamentoPorDia.map((d) => ({
                label: d.label,
                valor: d.centavos,
              }))}
              formatValor={formatarMoeda}
            />
            <BarChartSimple
              titulo="Pedidos por status"
              items={data.pedidosPorStatus.map((s) => ({
                label: s.rotulo.split(" ")[0],
                valor: s.quantidade,
              }))}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-zinc-900">Top produtos</h2>
              {data.topProdutos.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">Nenhum item no período.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.topProdutos.map((p) => (
                    <li
                      key={p.chave}
                      className="flex justify-between text-sm text-zinc-700"
                    >
                      <span>{p.nome}</span>
                      <span className="font-medium">{p.quantidade} un.</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-zinc-900">Últimos pedidos</h2>
                <Link
                  href="/admin/pedidos"
                  className="text-xs font-medium text-violet-700 underline"
                >
                  Ver todos
                </Link>
              </div>
              {data.ultimosPedidos.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">Nenhum pedido ainda.</p>
              ) : (
                <ul className="mt-3 divide-y divide-zinc-100">
                  {data.ultimosPedidos.map((pedido) => (
                    <li key={`${pedido.lojaId}-${pedido.id}`} className="py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/admin/pedidos/detalhe?lojaId=${pedido.lojaId}&id=${pedido.id}`}
                          className="text-sm font-medium text-zinc-900 hover:underline"
                        >
                          {numeroPedidoCurto(pedido.id)}
                          {isMarca && (
                            <span className="ml-1 text-xs font-normal text-zinc-500">
                              · {pedido.lojaId}
                            </span>
                          )}
                        </Link>
                        <PedidoStatusBadge status={pedido.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {formatarDataPedido(pedido.criadoEm, pedido.atualizadoEm)} ·{" "}
                        {formatarMoeda(pedido.totalCentavos)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {isMarca && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="font-semibold text-zinc-900">Gestão</h2>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  href="/admin/revendedores"
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Revendedores
                </Link>
                <Link
                  href="/admin/produtos"
                  className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                >
                  Catálogo
                </Link>
              </div>
            </section>
          )}
        </div>
      )}
    </AdminShell>
  );
}
