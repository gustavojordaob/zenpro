"use client";

import { useEffect } from "react";
import { useCarrinho } from "@/features/loja/CarrinhoProvider";
import type { LojaPublica } from "./lojaPublicaService";

/** Grava lojaId/slug no carrinho para checkout e login manterem a loja correta. */
export function LojaCarrinhoBinder({ loja }: { loja: LojaPublica }) {
  const { definirLojaVinculada } = useCarrinho();

  useEffect(() => {
    definirLojaVinculada({
      lojaId: loja.lojaId,
      slug: loja.slug,
      nome: loja.nome,
      config: loja.config ?? {},
    });
  }, [loja.lojaId, loja.slug, loja.nome, loja.config, definirLojaVinculada]);

  return null;
}
