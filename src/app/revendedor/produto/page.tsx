import { Suspense } from "react";
import { ProdutoPageClient } from "@/app/produto/ProdutoPageClient";

export default function RevendedorProdutoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 pt-20 text-center text-zinc-600">
          Carregando...
        </div>
      }
    >
      <ProdutoPageClient />
    </Suspense>
  );
}
