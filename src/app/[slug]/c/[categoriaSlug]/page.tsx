import { Suspense } from "react";
import { CategoriaPageClient } from "@/components/loja/CategoriaPageClient";
import { CATEGORIA_VITRINE_IDS } from "@/features/loja/categoriasVitrine";
import { LOJA_SLUGS_STATIC } from "@/features/multitenant/lojaSlugs";

export function generateStaticParams() {
  const out: { slug: string; categoriaSlug: string }[] = [];
  for (const slug of LOJA_SLUGS_STATIC) {
    for (const categoriaSlug of CATEGORIA_VITRINE_IDS) {
      out.push({ slug, categoriaSlug });
    }
  }
  return out;
}

type Props = {
  params: Promise<{ slug: string; categoriaSlug: string }>;
};

export default async function LojaCategoriaPage({ params }: Props) {
  const { categoriaSlug } = await params;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 pt-20 text-center text-zinc-600">
          Carregando…
        </div>
      }
    >
      <CategoriaPageClient slugOverride={categoriaSlug} />
    </Suspense>
  );
}
