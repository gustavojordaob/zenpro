import Link from "next/link";
import { HowItWorks } from "@/components/loja/HowItWorks";
import { LojaVitrine, MarcaHomeHero } from "@/components/loja/LojaVitrine";
import { PersonalizarSection } from "@/components/loja/PersonalizarSection";
import { ProdutosSection } from "@/components/loja/ProdutosSection";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { ZenProLogo } from "@/components/loja/ZenProLogo";

export default function HomePage() {
  return (
    <>
      <StoreHeader />

      <main className="bg-zinc-50">
        <MarcaHomeHero />

        <ProdutosSection />

        <PersonalizarSection />

        <HowItWorks />

        <section className="border-t border-zinc-200 bg-white py-14">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-bold text-zinc-900">Quer vender capinhas Zen Pro?</h2>
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
      </main>

      <footer className="border-t border-zinc-200 bg-zinc-900 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
          <ZenProLogo variant="gold" className="h-12 w-auto sm:h-14" href={null} />
          <p className="text-sm text-zinc-400">
            © {new Date().getFullYear()} Zen Pro — capinhas personalizadas
          </p>
        </div>
      </footer>
    </>
  );
}
