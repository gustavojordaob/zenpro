"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProdutoImagem } from "@/components/loja/ProdutoImagem";
import { useCarrinho } from "@/features/loja/CarrinhoProvider";
import {
  formatarPreco,
  type ProdutoDestaque,
} from "@/features/loja/produtosMock";

type Props = {
  produto: ProdutoDestaque;
};

export function CatalogProductCard({ produto }: Props) {
  const { adicionarPronta } = useCarrinho();
  const router = useRouter();
  const [adicionado, setAdicionado] = useState(false);

  function handleComprar() {
    adicionarPronta(produto);
    setAdicionado(true);
    setTimeout(() => router.push("/carrinho"), 400);
  }

  return (
    <article className="flex h-full min-h-[340px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md">
      <div className="relative aspect-square w-full shrink-0 bg-white">
        {produto.imagemUrl ? (
          <ProdutoImagem src={produto.imagemUrl} alt={produto.nome} />
        ) : (
          <div
            className="flex h-full items-center justify-center p-6"
            style={{ backgroundColor: "#ececec" }}
          >
            <div
              className={`h-full max-h-[85%] w-full max-w-[55%] rounded-2xl bg-gradient-to-br shadow-inner ${produto.gradienteCapa ?? "from-zinc-400 to-zinc-600"}`}
            />
          </div>
        )}
        {produto.destaque && (
          <span className="absolute left-3 top-3 rounded-full bg-zinc-900 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
            {produto.destaque}
          </span>
        )}
      </div>

      <div className="flex min-h-[132px] flex-1 flex-col gap-1 p-4">
        <p className="truncate text-xs font-medium text-zinc-500">
          {produto.marca}
        </p>
        <h3 className="line-clamp-2 min-h-[2.5rem] font-semibold leading-tight text-zinc-900">
          {produto.nome}
        </h3>
        <p className="mt-auto pt-2 text-base font-semibold text-zinc-900">
          {formatarPreco(produto.precoCentavos)}
        </p>
        <button
          type="button"
          onClick={handleComprar}
          disabled={adicionado}
          className="mt-2 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {adicionado ? "Indo ao carrinho…" : "Comprar"}
        </button>
      </div>
    </article>
  );
}
