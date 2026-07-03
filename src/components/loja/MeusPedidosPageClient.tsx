"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageBackLink } from "@/components/loja/PageBackLink";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { PedidoStatusBadge } from "@/components/admin/PedidoStatusBadge";
import { useAuth } from "@/features/auth/AuthProvider";
import { useLojaPaths } from "@/features/loja/useLojaPaths";
import { listarMeusPedidos, type MeuPedido } from "@/features/loja/meusPedidosService";
import { formatarPreco } from "@/features/loja/produtosMock";
import {
  formatarDataPedido,
  numeroPedidoCurto,
} from "@/features/admin/pedidos/pedidoAdminUtils";
import type { PedidoLojaStatus } from "@/features/multitenant/types";

const ETAPAS: { status: PedidoLojaStatus; rotulo: string }[] = [
  { status: "aguardando_pagamento", rotulo: "Aguardando" },
  { status: "pago", rotulo: "Pago" },
  { status: "producao", rotulo: "Produção" },
  { status: "enviado", rotulo: "Enviado" },
  { status: "entregue", rotulo: "Entregue" },
];

function Stepper({ status }: { status: PedidoLojaStatus }) {
  if (status === "cancelado") {
    return (
      <p className="mt-3 text-xs font-medium text-rose-700">
        Este pedido foi cancelado.
      </p>
    );
  }
  const atual = ETAPAS.findIndex((e) => e.status === status);
  return (
    <ol className="mt-3 flex items-center gap-1">
      {ETAPAS.map((etapa, i) => {
        const feito = i <= atual;
        return (
          <li key={etapa.status} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={`h-2 w-full rounded-full ${
                feito ? "bg-gold" : "bg-zinc-200"
              }`}
            />
            <span
              className={`text-[10px] ${
                feito ? "font-semibold text-zinc-800" : "text-zinc-400"
              }`}
            >
              {etapa.rotulo}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function MeusPedidosPageClient() {
  const router = useRouter();
  const paths = useLojaPaths();
  const { user, carregando: authCarregando } = useAuth();
  const [pedidos, setPedidos] = useState<MeuPedido[] | null>(null);

  useEffect(() => {
    if (authCarregando) return;
    if (!user) {
      router.replace(paths.loginRedirect("/meus-pedidos"));
      return;
    }
    void listarMeusPedidos(user.uid).then(setPedidos);
  }, [authCarregando, user, router, paths]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <StoreHeader />
      <main className="pb-safe mx-auto max-w-2xl px-4 pb-16 pt-6 sm:pt-8">
        <PageBackLink href={paths.home} label="← Voltar à loja" />
        <h1 className="mt-4 text-2xl font-bold text-zinc-900 sm:text-3xl">
          Meus pedidos
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Acompanhe o status dos seus pedidos.
        </p>

        {pedidos === null ? (
          <p className="mt-10 text-center text-sm text-zinc-500">
            Carregando pedidos...
          </p>
        ) : pedidos.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-8 text-center">
            <p className="text-zinc-600">Você ainda não fez nenhum pedido.</p>
            <Link
              href={paths.home}
              className="btn-gold mt-6 inline-block rounded-xl px-5 py-2.5 text-sm"
            >
              Ver produtos
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {pedidos.map((p) => (
              <li
                key={`${p.lojaId}-${p.pedidoId}`}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900">
                      {numeroPedidoCurto(p.pedidoId)}
                    </p>
                    <p className="truncate text-sm text-zinc-500">
                      {p.lojaNome ? `${p.lojaNome} · ` : ""}
                      {formatarDataPedido(p.criadoEm)}
                    </p>
                  </div>
                  <PedidoStatusBadge status={p.status} />
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-zinc-600">
                    {p.resumo}
                    {p.qtdItens > 1 ? ` +${p.qtdItens - 1}` : ""}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-zinc-900">
                    {formatarPreco(p.totalCentavos)}
                  </span>
                </div>

                <Stepper status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
