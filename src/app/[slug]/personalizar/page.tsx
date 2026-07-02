import { Suspense } from "react";
import { LOJA_SLUGS_STATIC } from "@/features/multitenant/lojaSlugs";
import { PersonalizarPageClient } from "@/app/personalizar/PersonalizarPageClient";

export function generateStaticParams() {
  return LOJA_SLUGS_STATIC.map((slug) => ({ slug }));
}

export default function LojaPersonalizarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 pt-20 text-center text-zinc-600">
          Carregando...
        </div>
      }
    >
      <PersonalizarPageClient />
    </Suspense>
  );
}
