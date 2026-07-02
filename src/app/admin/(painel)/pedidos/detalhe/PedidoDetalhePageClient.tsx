"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PedidoItemPreview } from "@/components/admin/PedidoItemPreview";
import { PedidoStatusBadge } from "@/components/admin/PedidoStatusBadge";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";
import {
  formatarDataPedido,
  numeroPedidoCurto,
  PEDIDO_STATUS_OPCOES,
  rotuloFormaPagamentoPresencial,
  rotuloOrigemPedido,
} from "@/features/admin/pedidos/pedidoAdminUtils";
import {
  atualizarStatusPedidoAdmin,
  obterPedidoAdmin,
  type PedidoAdmin,
} from "@/features/admin/pedidos/pedidoAdminService";
import { formatarPreco } from "@/features/loja/produtosMock";
import type { PedidoLojaStatus } from "@/features/multitenant/types";

type Props = {
  lojaId: string;
  pedidoId: string;
};

export function PedidoDetalhePageClient({ lojaId, pedidoId }: Props) {
  const router = useRouter();
  const { isMarca, lojaId: lojaRevendedor } = useAuthAdmin();
  const [pedido, setPedido] = useState<PedidoAdmin | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!isMarca && lojaRevendedor && lojaId !== lojaRevendedor) {
      router.replace("/admin/pedidos");
    }
  }, [isMarca, lojaRevendedor, lojaId, router]);

  useEffect(() => {
    void (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const data = await obterPedidoAdmin(lojaId, pedidoId);
        if (!data) {
          setErro("Pedido não encontrado.");
          return;
        }
        setPedido(data);
      } catch (error) {
        setErro(
          error instanceof Error ? error.message : "Erro ao carregar pedido.",
        );
      } finally {
        setCarregando(false);
      }
    })();
  }, [lojaId, pedidoId]);

  async function handleStatusChange(novoStatus: PedidoLojaStatus) {
    if (!pedido) return;
    setSalvandoStatus(true);
    setErro(null);
    try {
      await atualizarStatusPedidoAdmin(lojaId, pedidoId, novoStatus);
      setPedido({ ...pedido, status: novoStatus });
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao atualizar status.",
      );
    } finally {
      setSalvandoStatus(false);
    }
  }

  if (carregando) {
    return (
      <AdminShell titulo="Pedido">
        <p className="text-sm text-zinc-500">Carregando...</p>
      </AdminShell>
    );
  }

  if (!pedido) {
    return (
      <AdminShell titulo="Pedido">
        <p className="text-sm text-red-600">{erro ?? "Pedido não encontrado."}</p>
        <Link href="/admin/pedidos" className="mt-4 inline-block text-sm underline">
          Voltar aos pedidos
        </Link>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      titulo={`Pedido ${numeroPedidoCurto(pedido.id)}`}
      subtitulo={`Loja ${pedido.lojaId} · ${formatarDataPedido(pedido.criadoEm, pedido.atualizadoEm)}`}
    >
      <div className="mb-6">
        <Link
          href="/admin/pedidos"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          ← Voltar aos pedidos
        </Link>
      </div>

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">Itens</h2>
          {pedido.itens.map((item, index) => (
            <PedidoItemPreview key={`${item.produtoId}-${index}`} item={item} />
          ))}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-zinc-900">Resumo</h2>
            <p className="mt-3 text-2xl font-bold text-zinc-900">
              {formatarPreco(pedido.totalCentavos)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PedidoStatusBadge status={pedido.status} />
              {pedido.origem === "presencial" && (
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-900">
                  {rotuloOrigemPedido(pedido.origem)}
                </span>
              )}
            </div>
            {pedido.origem === "presencial" && (
              <p className="mt-2 text-sm text-zinc-600">
                Pagamento:{" "}
                <strong>
                  {rotuloFormaPagamentoPresencial(pedido.pagamento.forma)}
                </strong>
              </p>
            )}
            {pedido.observacao && (
              <p className="mt-2 text-sm text-zinc-600">
                Obs.: {pedido.observacao}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-zinc-900">Cliente</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-zinc-500">Nome</dt>
                <dd className="font-medium text-zinc-900">
                  {pedido.cliente.nome || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Contato</dt>
                <dd className="text-zinc-800">{pedido.cliente.contato || "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Endereço</dt>
                <dd className="text-zinc-800">{pedido.cliente.endereco || "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-zinc-900">Status</h2>
            <label className="mt-3 block space-y-1.5">
              <span className="text-sm text-zinc-600">Alterar status</span>
              <select
                value={pedido.status}
                disabled={salvandoStatus}
                onChange={(e) =>
                  void handleStatusChange(e.target.value as PedidoLojaStatus)
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50"
              >
                {PEDIDO_STATUS_OPCOES.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
