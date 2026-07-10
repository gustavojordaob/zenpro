"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";
import { sincronizarPagamentoMercadoPago } from "@/features/pagamentos/mercadoPagoClient";

const MENSAGENS: Record<string, { titulo: string; texto: string; tom: string }> = {
  success: {
    titulo: "Pagamento aprovado",
    texto: "Sua reposição foi confirmada. Acompanhe o status na lista abaixo.",
    tom: "text-emerald-800 bg-emerald-50 border-emerald-200",
  },
  pending: {
    titulo: "Pagamento em análise",
    texto:
      "PIX e boleto podem levar alguns minutos. Atualizamos o pedido assim que o Mercado Pago confirmar.",
    tom: "text-amber-900 bg-amber-50 border-amber-200",
  },
  failure: {
    titulo: "Pagamento não concluído",
    texto: "Você pode tentar pagar novamente na página de reposição.",
    tom: "text-rose-800 bg-rose-50 border-rose-200",
  },
};

export function ReposicaoCheckoutRetornoPageClient() {
  const search = useSearchParams();
  const { user } = useAuthAdmin();
  const [sincronizando, setSincronizando] = useState(false);
  const [sincronizado, setSincronizado] = useState(false);

  const status = search.get("status") ?? "pending";
  const pedidoId = search.get("pedido");
  const paymentId =
    search.get("payment_id") ?? search.get("collection_id") ?? undefined;

  const info = useMemo(
    () => MENSAGENS[status] ?? MENSAGENS.pending,
    [status],
  );

  useEffect(() => {
    if (!user || !pedidoId || sincronizado) return;

    let cancelado = false;
    setSincronizando(true);

    void sincronizarPagamentoMercadoPago({
      tipo: "reposicao",
      pedidoId,
      paymentId,
    })
      .then(() => {
        if (!cancelado) setSincronizado(true);
      })
      .catch((error) => {
        console.warn("Falha ao sincronizar pagamento reposição MP", error);
      })
      .finally(() => {
        if (!cancelado) setSincronizando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [user, pedidoId, paymentId, sincronizado]);

  return (
    <AdminShell titulo="Retorno do pagamento">
      <div className="mx-auto max-w-lg">
        <div className={`rounded-2xl border px-5 py-6 ${info.tom}`}>
          <h1 className="text-xl font-bold">{info.titulo}</h1>
          <p className="mt-2 text-sm">{info.texto}</p>
          {sincronizando ? (
            <p className="mt-3 text-xs opacity-80">Atualizando status do pedido…</p>
          ) : null}
          {pedidoId ? (
            <p className="mt-3 text-sm">
              Reposição{" "}
              <code className="rounded bg-white/70 px-2 py-0.5">
                {pedidoId.slice(-8).toUpperCase()}
              </code>
            </p>
          ) : null}
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/admin/reposicao"
            className="btn-gold rounded-xl px-5 py-2.5 text-center text-sm font-semibold"
          >
            Voltar à reposição
          </Link>
        </div>
      </div>
    </AdminShell>
  );
}
