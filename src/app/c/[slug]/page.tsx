import { Suspense } from "react";
import { CategoriaPageClient } from "@/components/loja/CategoriaPageClient";
import { CATEGORIA_VITRINE_IDS } from "@/features/loja/categoriasVitrine";

export function generateStaticParams() {
  return CATEGORIA_VITRINE_IDS.map((slug) => ({ slug }));
}

export default function CategoriaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 pt-20 text-center text-zinc-600">
          Carregando…
        </div>
      }
    >
      <CategoriaPageClient />
    </Suspense>
  );
}
