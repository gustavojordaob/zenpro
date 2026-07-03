import { Suspense } from "react";
import { MeusPedidosPageClient } from "@/components/loja/MeusPedidosPageClient";

export default function MeusPedidosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 pt-20 text-center text-zinc-600">
          Carregando...
        </div>
      }
    >
      <MeusPedidosPageClient />
    </Suspense>
  );
}
