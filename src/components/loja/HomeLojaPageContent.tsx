"use client";

import Link from "next/link";
import { HomePartnersSection, HomeVideoHero } from "@/components/loja/HomeVideoSections";
import { HowItWorks } from "@/components/loja/HowItWorks";
import { PersonalizarSection } from "@/components/loja/PersonalizarSection";
import { ProdutosSection } from "@/components/loja/ProdutosSection";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { ZenProLogo } from "@/components/loja/ZenProLogo";
import { useLojaEfetiva } from "@/features/loja/useLojaEfetiva";

type HomeLojaVariant = "marca" | "revendedor";

function SejaRevendedorSection() {
  return (
    <section className="border-t border-zinc-200 bg-white py-14">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-zinc-900">Quer vender cases Zen Pro?</h2>
        <p className="mx-auto mt-2 max-w-lg text-zinc-600">
          Abra sua loja online com catálogo oficial, painel de pedidos e URL
          exclusiva. Envie sua solicitação — aprovação em poucos passos.
        </p>
        <Link
          href="/seja-revendedor"
          className="btn-ink mt-6 inline-block rounded-xl px-6 py-3 text-sm"
        >
          Seja um revendedor
        </Link>
      </div>
    </section>
  );
}

function HomeLojaFooter({ variant }: { variant: HomeLojaVariant }) {
  const loja = useLojaEfetiva();

  return (
    <footer className="border-t border-zinc-200 bg-zinc-900 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
        <ZenProLogo variant="gold" className="h-12 w-auto sm:h-14" href={null} />
        {variant === "revendedor" && loja && (
          <p className="text-sm text-zinc-300">
            Loja parceira{" "}
            <Link href={loja.basePath} className="font-semibold text-white underline">
              {loja.nome}
            </Link>
          </p>
        )}
        <p className="text-sm text-zinc-400">
          © {new Date().getFullYear()} Zen Pro — cases personalizadas
        </p>
      </div>
    </footer>
  );
}

type Props = {
  variant: HomeLojaVariant;
};

/** Home unificada: marca (/) e lojas revendedor (/[slug]). */
export function HomeLojaPageContent({ variant }: Props) {
  return (
    <>
      <StoreHeader />

      <main className="bg-zinc-50">
        <HomeVideoHero />

        <ProdutosSection />

        <PersonalizarSection />

        <HowItWorks />

        <HomePartnersSection />

        {variant === "marca" ? <SejaRevendedorSection /> : null}
      </main>

      <HomeLojaFooter variant={variant} />
    </>
  );
}
