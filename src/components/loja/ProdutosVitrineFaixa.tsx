"use client";

import { useRef } from "react";
import { CatalogProductCard } from "@/components/loja/CatalogProductCard";
import { ProductCard } from "@/components/loja/ProductCard";
import type { ProdutoDestaque } from "@/features/loja/produtosMock";

type Props = {
  produtos: ProdutoDestaque[];
  personalizavel: boolean;
};

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden
    >
      {dir === "left" ? (
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/**
 * Mobile: 2 cards lado a lado + setas / scroll horizontal.
 * Desktop (md+): grade (2 / 4 colunas) — inalterada.
 */
export function ProdutosVitrineFaixa({ produtos, personalizavel }: Props) {
  const faixaRef = useRef<HTMLUListElement>(null);

  function rolar(dir: -1 | 1) {
    const el = faixaRef.current;
    if (!el) return;
    const passo = Math.max(el.clientWidth * 0.9, 200);
    el.scrollBy({ left: dir * passo, behavior: "smooth" });
  }

  function renderCard(p: ProdutoDestaque) {
    return personalizavel ? (
      <ProductCard produto={p} />
    ) : (
      <CatalogProductCard produto={p} />
    );
  }

  return (
    <>
      {/* Celular: carrossel 2 por vista */}
      <div className="relative md:hidden">
        {produtos.length > 2 && (
          <>
            <button
              type="button"
              aria-label="Produtos anteriores"
              onClick={() => rolar(-1)}
              className="absolute -left-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-800 shadow-md active:bg-zinc-100"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              aria-label="Próximos produtos"
              onClick={() => rolar(1)}
              className="absolute -right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-800 shadow-md active:bg-zinc-100"
            >
              <Chevron dir="right" />
            </button>
          </>
        )}
        <ul
          ref={faixaRef}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
        >
          {produtos.map((p) => (
            <li
              key={p.id}
              className="w-[calc(50%-0.375rem)] shrink-0 snap-start"
            >
              {renderCard(p)}
            </li>
          ))}
        </ul>
      </div>

      {/* Tablet/desktop: grade */}
      <ul className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
        {produtos.map((p) => (
          <li key={p.id}>{renderCard(p)}</li>
        ))}
      </ul>
    </>
  );
}
