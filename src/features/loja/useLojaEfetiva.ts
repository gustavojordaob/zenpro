"use client";

import { useMemo } from "react";
import type { LojaConfig } from "@/features/multitenant/types";
import { useLojaOptional } from "@/features/multitenant/LojaContext";
import { useCarrinho } from "./CarrinhoProvider";

export type LojaEfetiva = {
  lojaId: string;
  slug: string;
  nome: string;
  ativo: boolean;
  config: LojaConfig;
  basePath: string;
};

/** Loja do contexto /[slug] ou a última loja visitada (sessionStorage). */
export function useLojaEfetiva(): LojaEfetiva | null {
  const lojaCtx = useLojaOptional();
  const { lojaVinculada } = useCarrinho();

  return useMemo(() => {
    if (lojaCtx) {
      return {
        lojaId: lojaCtx.lojaId,
        slug: lojaCtx.slug,
        nome: lojaCtx.nome,
        ativo: lojaCtx.ativo,
        config: lojaCtx.config ?? {},
        basePath: lojaCtx.basePath,
      };
    }

    if (!lojaVinculada) return null;

    return {
      lojaId: lojaVinculada.lojaId,
      slug: lojaVinculada.slug,
      nome: lojaVinculada.nome,
      ativo: true,
      config: lojaVinculada.config ?? {},
      basePath: `/${lojaVinculada.slug}`,
    };
  }, [lojaCtx, lojaVinculada]);
}
