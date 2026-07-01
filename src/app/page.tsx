import Link from "next/link";
import { HowItWorks } from "@/components/loja/HowItWorks";
import { HeroCaseShowcase } from "@/components/loja/HeroCaseShowcase";
import { ProductCard } from "@/components/loja/ProductCard";
import { ProdutosSection } from "@/components/loja/ProdutosSection";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { ZenProLogo } from "@/components/loja/ZenProLogo";
import { PRODUTOS_PERSONALIZAR } from "@/features/loja/produtosMock";

export default function HomePage() {
  return (
    <>
      <StoreHeader />

      <main className="bg-zinc-50">
        <section className="border-b border-zinc-200 bg-[#ececec]">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-14 text-center sm:px-6 sm:py-20 md:flex-row md:text-left">
            <div className="flex-1 space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Personalização no browser
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl md:text-5xl">
                Sua foto na capinha perfeita
              </h1>
              <p className="max-w-lg text-base text-zinc-600 sm:text-lg">
                Compre produtos prontos ou personalize com sua foto em tempo
                real.
              </p>
              <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                <Link
                  href="#produtos"
                  className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Ver produtos
                </Link>
                <Link
                  href="#personalizar"
                  className="rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                >
                  Personalizar com foto
                </Link>
              </div>
            </div>

            <HeroCaseShowcase />
          </div>
        </section>

        <ProdutosSection />

        <section
          id="personalizar"
          className="border-t border-zinc-200 bg-white"
        >
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                Personalize com sua foto
              </h2>
              <p className="mt-1 text-zinc-600">
                Toque em um modelo para abrir o editor e enviar a imagem.
              </p>
            </div>

            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
              {PRODUTOS_PERSONALIZAR.map((produto) => (
                <li key={produto.id} className="h-full">
                  <ProductCard produto={produto} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        <HowItWorks />
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
