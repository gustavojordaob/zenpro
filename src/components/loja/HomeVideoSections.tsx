"use client";

import {
  CATEGORIAS_VENDA,
  HOME_CARROSSEL_INTERVAL_MS,
  HOME_HERO_CARROSSEL,
  HOME_PARCEIROS_CARROSSEL,
} from "@/features/loja/homeContent";
import { HomeHeroCarousel } from "./HomeHeroCarousel";

/** Banner carrossel no topo — fotos e vídeos definidos pelo cliente. */
export function HomeVideoHero() {
  return (
    <section className="border-b border-zinc-200">
      <HomeHeroCarousel
        slides={HOME_HERO_CARROSSEL}
        intervalMs={HOME_CARROSSEL_INTERVAL_MS}
        variant="hero"
      />
    </section>
  );
}

/** Parceiros e conteúdo — carrossel compacto abaixo da vitrine. */
export function HomePartnersSection() {
  return (
    <section className="border-t border-zinc-200 bg-white py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-zinc-900">
          Parceiros e conteúdo
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-zinc-600">
          Espaço para fotos e vídeos de parceiros — em breve.
        </p>

        <div className="mx-auto mt-6 max-w-3xl overflow-hidden rounded-xl shadow-md ring-1 ring-zinc-200">
          <HomeHeroCarousel
            slides={HOME_PARCEIROS_CARROSSEL}
            intervalMs={HOME_CARROSSEL_INTERVAL_MS}
            variant="compact"
          />
        </div>

        <div className="mt-14">
          <h3 className="text-center text-lg font-semibold text-zinc-900">
            O que vendemos
          </h3>
          <ul className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
            {CATEGORIAS_VENDA.map((cat) => (
              <li
                key={cat}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700"
              >
                {cat}
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-zinc-500">
            Cases personalizadas para todos os celulares. Premium exclusivo Apple
            (iPhone). Temas: times, pets, momentos, personagens, viagem e muito
            mais.
          </p>
        </div>
      </div>
    </section>
  );
}
