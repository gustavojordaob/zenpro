import { Suspense } from "react";
import { ProdutoPageClient } from "./ProdutoPageClient";

export default function ProdutoPage() {
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
