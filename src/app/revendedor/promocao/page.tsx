import { Suspense } from "react";
import { PromocaoPageClient } from "@/components/loja/PromocaoPageClient";

export default function RevendedorPromocaoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 pt-20 text-center text-zinc-600">
          Carregando…
        </div>
      }
    >
      <PromocaoPageClient />
    </Suspense>
  );
}
