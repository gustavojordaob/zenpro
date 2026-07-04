"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PedidoStatusBadge } from "@/components/admin/PedidoStatusBadge";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";
import {
  formatarDataPedido,
  numeroPedidoCurto,
  rotuloOrigemPedido,
} from "@/features/admin/pedidos/pedidoAdminUtils";
import {
  listarLojasResumo,
  listarPedidosLoja,
  listarTodosPedidos,
  type LojaResumo,
  type PedidoAdmin,
} from "@/features/admin/pedidos/pedidoAdminService";
import { MARCA_LOJA_ID } from "@/features/multitenant/marcaLoja";
import { formatarPreco } from "@/features/loja/produtosMock";

export function PedidosAdminPageClient() {
  const { isMarca, lojaId } = useAuthAdmin();
  const [pedidos, setPedidos] = useState<PedidoAdmin[]>([]);
  const [lojas, setLojas] = useState<LojaResumo[]>([]);
  const [filtroLoja, setFiltroLoja] = useState<string>("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (isMarca && filtroLoja === "") {
      setFiltroLoja(MARCA_LOJA_ID);
    }
  }, [isMarca, filtroLoja]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      if (isMarca) {
        const [listaLojas, listaPedidos] = await Promise.all([
          listarLojasResumo(),
          listarTodosPedidos(filtroLoja || null),
        ]);
        setLojas(listaLojas);
        setPedidos(listaPedidos);
      } else if (lojaId) {
        setPedidos(await listarPedidosLoja(lojaId));
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Erro ao carregar pedidos.";
      if (msg.includes("permission") || msg.includes("Permission")) {
        setErro(
          "Sem permissão para ler pedidos. Confirme que está logado como marca ou revendedor da loja e que as Firestore Rules estão deployadas (npm run firebase:deploy-rules).",
        );
      } else {
        setErro(msg);
      }
    } finally {
      setCarregando(false);
    }
  }, [isMarca, lojaId, filtroLoja]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <AdminShell
      titulo="Pedidos"
      subtitulo={
        isMarca
          ? "Todos os pedidos das lojas revendedoras"
          : "Pedidos da sua loja"
      }
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {isMarca && lojas.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <span className="font-medium">Loja:</span>
            <select
              value={filtroLoja}
              onChange={(e) => setFiltroLoja(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="">Todas as lojas</option>
              {lojas.map((loja) => (
                <option key={loja.id} value={loja.id}>
                  {loja.nome} ({loja.slug})
                </option>
              ))}
            </select>
          </label>
        )}
        <Link
          href="/admin/pedidos/nova"
          className="ml-auto rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          + Venda presencial
        </Link>
      </div>

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando pedidos...</p>
      ) : pedidos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-600">
          Nenhum pedido encontrado.
        </div>
      ) : (
        <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm sm:block">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Nº</th>
                  {isMarca && <th className="px-4 py-3">Loja</th>}
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {pedidos.map((pedido) => (
                  <tr key={`${pedido.lojaId}-${pedido.id}`} className="hover:bg-zinc-50/80">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                      {numeroPedidoCurto(pedido.id)}
                    </td>
                    {isMarca && (
                      <td className="px-4 py-3 text-zinc-700">{pedido.lojaId}</td>
                    )}
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">
                        {pedido.cliente.nome || "—"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {pedido.cliente.contato}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {formatarPreco(pedido.totalCentavos)}
                    </td>
                    <td className="px-4 py-3">
                      {pedido.filaProducaoMarca ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                          {rotuloOrigemPedido(pedido.origem, {
                            filaProducaoMarca: true,
                            origemLojaNome: pedido.origemLojaNome,
                          })}
                        </span>
                      ) : pedido.origem === "presencial" ? (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-900">
                          {rotuloOrigemPedido(pedido.origem)}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-500">
                          {rotuloOrigemPedido(pedido.origem)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PedidoStatusBadge status={pedido.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatarDataPedido(pedido.criadoEm, pedido.atualizadoEm)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/pedidos/detalhe?lojaId=${encodeURIComponent(pedido.lojaId)}&id=${encodeURIComponent(pedido.id)}`}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Ver detalhe
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!carregando && pedidos.length > 0 && (
        <div className="flex flex-col gap-3 sm:hidden">
          {pedidos.map((pedido) => (
            <div
              key={`m-${pedido.lojaId}-${pedido.id}`}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900">
                    {pedido.cliente.nome || "—"}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {pedido.cliente.contato}
                  </p>
                </div>
                <PedidoStatusBadge status={pedido.status} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                <span className="font-mono text-zinc-700">
                  {numeroPedidoCurto(pedido.id)}
                </span>
                {isMarca && <span>{pedido.lojaId}</span>}
                <span>
                  {rotuloOrigemPedido(pedido.origem, {
                    filaProducaoMarca: pedido.filaProducaoMarca,
                    origemLojaNome: pedido.origemLojaNome,
                  })}
                </span>
                <span>{formatarDataPedido(pedido.criadoEm, pedido.atualizadoEm)}</span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-base font-semibold text-zinc-900">
                  {formatarPreco(pedido.totalCentavos)}
                </span>
                <Link
                  href={`/admin/pedidos/detalhe?lojaId=${encodeURIComponent(pedido.lojaId)}&id=${encodeURIComponent(pedido.id)}`}
                  className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 active:bg-zinc-100"
                >
                  Ver detalhe
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
