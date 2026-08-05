import { Suspense } from "react";
import { PromocaoPageClient } from "@/components/loja/PromocaoPageClient";
import { LOJA_SLUGS_STATIC } from "@/features/multitenant/lojaSlugs";

export function generateStaticParams() {
  return LOJA_SLUGS_STATIC.map((slug) => ({ slug }));
}

export default function LojaPromocaoPage() {
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
