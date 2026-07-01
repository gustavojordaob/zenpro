"use client";

import { ProdutoImagem } from "@/components/loja/ProdutoImagem";
import type { ItemCarrinho } from "@/features/loja/carrinhoTypes";
import { CasePreview } from "@/features/personalizacao/CasePreviewLazy";

type Props = {
  item: ItemCarrinho;
  previewWidth?: number;
};

export function CartItemPreview({ item, previewWidth = 120 }: Props) {
  if (item.tipo === "personalizada" && item.personalizacao) {
    return (
      <CasePreview
        fotoUrl={item.personalizacao.fotoUrl}
        transform={item.personalizacao.transform}
        textos={item.personalizacao.textos}
        previewWidth={previewWidth}
      />
    );
  }

  if (item.imagemUrl) {
    return (
      <div
        className="relative inline-flex shrink-0 overflow-hidden rounded-xl bg-white"
        style={{ width: previewWidth, height: Math.round(previewWidth * 1.25) }}
      >
        <ProdutoImagem
          src={item.imagemUrl}
          alt={item.nomeProduto}
          className="object-contain p-2"
          sizes={`${previewWidth}px`}
        />
      </div>
    );
  }

  return (
    <div
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl p-2"
      style={{ backgroundColor: "#ececec", width: previewWidth, height: Math.round(previewWidth * 1.25) }}
    >
      <div
        className={`h-[85%] w-[48%] rounded-[1rem] bg-gradient-to-br shadow-sm ${item.gradienteCapa ?? "from-zinc-400 to-zinc-600"}`}
      />
    </div>
  );
}
