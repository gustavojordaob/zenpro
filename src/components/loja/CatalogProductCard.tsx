"use client";

import Link from "next/link";
import { ProdutoImagem } from "@/components/loja/ProdutoImagem";
import {
  formatarPreco,
  type ProdutoDestaque,
} from "@/features/loja/produtosMock";
import { useLojaPaths } from "@/features/loja/useLojaPaths";

type Props = {
  produto: ProdutoDestaque;
};

export function CatalogProductCard({ produto }: Props) {
  const paths = useLojaPaths();
  const produtoId = produto.produtoBaseId ?? produto.id;
  const qtdModelos = produto.modelosCompativeis?.length ?? 1;

  return (
    <Link
      href={paths.produto(produtoId)}
      className="group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md sm:min-h-[340px]"
    >
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

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 p-3 sm:min-h-[132px] sm:gap-1 sm:p-4">
        <p className="truncate text-[11px] font-medium text-zinc-500 sm:text-xs">
          {produto.marca || "Capinha"}
        </p>
        <h3 className="line-clamp-2 min-h-[2.25rem] text-sm font-semibold leading-tight text-zinc-900 group-hover:text-zinc-700 sm:min-h-[2.5rem] sm:text-base">
          {produto.nome}
        </h3>
        {qtdModelos > 1 && (
          <p className="text-[11px] text-zinc-500">
            {qtdModelos} modelos compatíveis
          </p>
        )}
        <p className="mt-auto pt-2 text-base font-semibold text-zinc-900">
          {formatarPreco(produto.precoCentavos)}
        </p>
        <span className="mt-2 text-sm font-semibold text-gold-dark group-hover:text-gold">
          {qtdModelos > 1 ? "Escolher modelo →" : "Ver produto →"}
        </span>
      </div>
    </Link>
  );
}
