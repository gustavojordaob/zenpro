"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PedidoDetalhePageClient } from "./PedidoDetalhePageClient";

function DetalheInner() {
  const searchParams = useSearchParams();
  const lojaId = searchParams.get("lojaId");
  const pedidoId = searchParams.get("id");

  if (!lojaId || !pedidoId) {
    return (
      <p className="text-sm text-red-600">
        Parâmetros inválidos. Use lojaId e id na URL.
      </p>
    );
  }

  return <PedidoDetalhePageClient lojaId={lojaId} pedidoId={pedidoId} />;
}

export default function AdminPedidoDetalhePage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-zinc-500">Carregando pedido...</p>
      }
    >
      <DetalheInner />
    </Suspense>
  );
}
