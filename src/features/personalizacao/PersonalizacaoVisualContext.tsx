"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ResolvedPersonalizacaoVisual } from "@/features/catalogo/personalizacaoVisual";

const PersonalizacaoVisualContext =
  createContext<ResolvedPersonalizacaoVisual | null>(null);

export function PersonalizacaoVisualProvider({
  visual,
  children,
}: {
  visual: ResolvedPersonalizacaoVisual;
  children: ReactNode;
}) {
  return (
    <PersonalizacaoVisualContext.Provider value={visual}>
      {children}
    </PersonalizacaoVisualContext.Provider>
  );
}

export function usePersonalizacaoVisual(): ResolvedPersonalizacaoVisual | null {
  return useContext(PersonalizacaoVisualContext);
}
