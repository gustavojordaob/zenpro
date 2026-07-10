"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageBackLink } from "@/components/loja/PageBackLink";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { useAuth } from "@/features/auth/AuthProvider";
import { useLojaPaths } from "@/features/loja/useLojaPaths";
import { MARCA_LOJA_ID } from "@/features/multitenant/marcaLoja";
import { sincronizarPagamentoMercadoPago } from "@/features/pagamentos/mercadoPagoClient";

const MENSAGENS: Record<string, { titulo: string; texto: string; tom: string }> = {
  success: {
    titulo: "Pagamento aprovado",
    texto: "Seu pedido foi confirmado. Acompanhe em Meus pedidos.",
    tom: "text-emerald-800 bg-emerald-50 border-emerald-200",
  },
  pending: {
    titulo: "Pagamento em análise",
    texto:
      "PIX e boleto podem levar alguns minutos. O envio só é liberado após a confirmação do pagamento.",
    tom: "text-amber-900 bg-amber-50 border-amber-200",
  },
  failure: {
    titulo: "Pagamento não concluído",
    texto: "Você pode tentar novamente pelo checkout ou em Meus pedidos.",
    tom: "text-rose-800 bg-rose-50 border-rose-200",
  },
};

export function CheckoutRetornoPageClient() {
  const search = useSearchParams();
  const paths = useLojaPaths();
  const { user } = useAuth();
  const [sincronizando, setSincronizando] = useState(false);
  const [sincronizado, setSincronizado] = useState(false);

  const status = search.get("status") ?? "pending";
  const pedidoId = search.get("pedido");
  const lojaId = search.get("loja") ?? MARCA_LOJA_ID;
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
      tipo: "loja",
      lojaId,
      pedidoId,
      paymentId,
    })
      .then(() => {
        if (!cancelado) setSincronizado(true);
      })
      .catch((error) => {
        console.warn("Falha ao sincronizar pagamento MP", error);
      })
      .finally(() => {
        if (!cancelado) setSincronizando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [user, pedidoId, lojaId, paymentId, sincronizado]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <StoreHeader />
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <PageBackLink href={paths.home} label="← Voltar à loja" />
        <div
          className={`mt-8 rounded-2xl border px-5 py-6 text-left ${info.tom}`}
        >
          <h1 className="text-xl font-bold">{info.titulo}</h1>
          <p className="mt-2 text-sm">{info.texto}</p>
          {sincronizando ? (
            <p className="mt-3 text-xs opacity-80">
              Atualizando status do pedido…
            </p>
          ) : null}
          {pedidoId && (
            <p className="mt-3 text-sm">
              Pedido{" "}
              <code className="rounded bg-white/70 px-2 py-0.5">
                {pedidoId.slice(-8).toUpperCase()}
              </code>
            </p>
          )}
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/meus-pedidos"
            className="btn-gold rounded-xl px-5 py-2.5 text-sm font-semibold"
          >
            Meus pedidos
          </Link>
          <Link
            href={paths.home}
            className="rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Continuar comprando
          </Link>
        </div>
      </main>
    </div>
  );
}
