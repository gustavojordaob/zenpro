"use client";

import Link from "next/link";
import { rotuloMaterial } from "@/features/catalogo/materiaisCapinha";
import { ProdutoImagem } from "@/components/loja/ProdutoImagem";
import {
  formatarPreco,
  type ProdutoDestaque,
} from "@/features/loja/produtosMock";
import { useLojaPaths } from "@/features/loja/useLojaPaths";

type Props = {
  produto: ProdutoDestaque;
};

export function ProductCard({ produto }: Props) {
  const paths = useLojaPaths();
  const produtoId = produto.produtoBaseId ?? produto.id;
  const qtdModelos = produto.modelosCompativeis?.length ?? 1;

  return (
    <Link
      href={paths.produto(produtoId)}
      className="group flex h-full min-h-[340px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md"
    >
      <div className="relative aspect-square w-full shrink-0 bg-white">
        {produto.imagemUrl ? (
          <ProdutoImagem src={produto.imagemUrl} alt={produto.nome} />
        ) : (
          <div
            className="flex h-full items-center justify-center"
            style={{ backgroundColor: "#ececec" }}
          >
            <PhonePlaceholder />
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
          {produto.marca || "Case personalizável"}
        </p>
        <h3 className="line-clamp-2 min-h-[2.5rem] font-semibold leading-tight text-zinc-900 group-hover:text-zinc-700">
          {produto.nome}
        </h3>
        {produto.material && (
          <p className="text-xs text-zinc-500">
            {rotuloMaterial(produto.material)}
          </p>
        )}
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

function PhonePlaceholder() {
  return (
    <div
      className="relative h-[72%] w-[42%] rounded-[1.25rem] border border-zinc-300/80 bg-gradient-to-br from-zinc-100 to-zinc-200 shadow-inner"
      aria-hidden
    >
      <div className="absolute left-1/2 top-3 h-1.5 w-8 -translate-x-1/2 rounded-full bg-zinc-300/90" />
    </div>
  );
}
