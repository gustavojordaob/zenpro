"use client";

import Link from "next/link";
import { HeroCaseShowcase } from "@/components/loja/HeroCaseShowcase";
import { useLoja } from "@/features/multitenant/LojaContext";
import { useLojaPaths } from "@/features/loja/useLojaPaths";

export function LojaVitrineHero() {
  const loja = useLoja();
  const paths = useLojaPaths();
  const corAccent = loja.config.cor ?? "#18181b";

  return (
    <section
      className="border-b border-zinc-200 bg-[#ececec]"
      style={{ borderBottomColor: `${corAccent}22` }}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-14 text-center sm:px-6 sm:py-20 md:flex-row md:text-left">
        <div className="flex-1 space-y-4">
          <p
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: corAccent }}
          >
            {loja.nome}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl md:text-5xl">
            Cases personalizadas
          </h1>
          <p className="max-w-lg text-base text-zinc-600 sm:text-lg">
            Catálogo oficial Zen Pro — personalize com sua foto ou compre
            produtos prontos nesta loja.
          </p>
          <div className="flex flex-wrap justify-center gap-3 md:justify-start">
            <Link
              href={paths.produtosHash}
              className="rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: corAccent }}
            >
              Ver produtos
            </Link>
            <Link
              href={paths.personalizarHash}
              className="rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
            >
              Personalizar com foto
            </Link>
          </div>
        </div>

        <HeroCaseShowcase />
      </div>
    </section>
  );
}
