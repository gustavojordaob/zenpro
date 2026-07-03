"use client";

import { useMemo } from "react";
import type { LojaConfig } from "@/features/multitenant/types";
import { useLojaOptional } from "@/features/multitenant/LojaContext";

export type LojaEfetiva = {
  lojaId: string;
  slug: string;
  nome: string;
  ativo: boolean;
  config: LojaConfig;
  basePath: string;
  /** true quando é a loja oficial do dono (raiz do site), não um revendedor. */
  isMarca?: boolean;
};

/**
 * Loja efetiva = SOMENTE o contexto da rota /[slug] (revendedor).
 *
 * Na raiz do site ("/") não há revendedor: retorna `null` e os consumidores
 * usam a loja oficial do dono (MARCA_LOJA_EFETIVA / branding Zen Pro).
 * Não usamos a "última loja visitada" para não fazer a raiz herdar a loja de
 * um revendedor visitado antes.
 */
export function useLojaEfetiva(): LojaEfetiva | null {
  const lojaCtx = useLojaOptional();

  return useMemo(() => {
    if (!lojaCtx) return null;

    return {
      lojaId: lojaCtx.lojaId,
      slug: lojaCtx.slug,
      nome: lojaCtx.nome,
      ativo: lojaCtx.ativo,
      config: lojaCtx.config ?? {},
      basePath: lojaCtx.basePath,
    };
  }, [lojaCtx]);
}
