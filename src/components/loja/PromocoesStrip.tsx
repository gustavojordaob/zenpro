"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  listarCampanhasAtivas,
  type Campanha,
} from "@/features/loja/campanhaService";
import { useLojaPaths } from "@/features/loja/useLojaPaths";
import { isFirebaseConfigured } from "@/lib/firebase";

export function PromocoesStrip() {
  const paths = useLojaPaths();
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    void listarCampanhasAtivas()
      .then(setCampanhas)
      .catch((e) => console.error(e));
  }, []);

  if (campanhas.length === 0) return null;

  const unica = campanhas.length === 1 ? campanhas[0] : null;

  return (
    <section className="border-b border-zinc-800 bg-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
        {unica ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold/80">
                Campanha
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">
                {unica.titulo}
              </p>
              {unica.descricao ? (
                <p className="mt-1 max-w-xl text-sm text-zinc-400">
                  {unica.descricao}
                </p>
              ) : null}
            </div>
            <Link
              href={paths.promocao(unica.slug)}
              className="btn-gold inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold"
            >
              Ver ofertas
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {campanhas.map((c) => (
              <li key={c.id}>
                <Link
                  href={paths.promocao(c.slug)}
                  className="group flex h-full flex-col justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-gold/40 hover:bg-white/10"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gold group-hover:text-gold">
                      {c.titulo}
                    </p>
                    {c.descricao ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">
                        {c.descricao}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-xs font-semibold text-white group-hover:text-gold">
                    Ver ofertas →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
