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
  /** Portal B2B /revendedor */
  isB2b?: boolean;
};

/**
 * Loja efetiva = contexto da rota /[slug] OU portal /revendedor (B2B).
 *
 * Na raiz do site ("/") não há contexto: retorna `null` e os consumidores
 * usam MARCA_LOJA_EFETIVA.
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
      isB2b: Boolean(lojaCtx.isB2b),
    };
  }, [lojaCtx]);
}
