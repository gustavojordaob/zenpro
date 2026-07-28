"use client";

import { useMemo } from "react";
import {
  resolverVisualPersonalizacao,
  type ResolvedPersonalizacaoVisual,
} from "@/features/catalogo/personalizacaoVisual";
import { usePersonalizacaoVisual } from "./PersonalizacaoVisualContext";

/**
 * Visual do mock — sempre o molde H5 RockB2B do modelo.
 * Dentro do editor usa o Provider; em carrinho/checkout/hero resolve pelo modeloId.
 */
export function useCaseVisual(
  modeloId: string,
): ResolvedPersonalizacaoVisual {
  const fromCtx = usePersonalizacaoVisual();
  return useMemo(() => {
    const id = modeloId.trim() || "iphone-17-pro-max";
    if (fromCtx) return fromCtx;
    return resolverVisualPersonalizacao(id);
  }, [fromCtx, modeloId]);
}
