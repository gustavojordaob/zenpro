"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { LojaPublica } from "@/features/multitenant/lojaPublicaService";

type LojaContextValue = LojaPublica & {
  basePath: string;
};

const LojaContext = createContext<LojaContextValue | null>(null);

export function LojaProvider({
  loja,
  children,
}: {
  loja: LojaPublica;
  children: ReactNode;
}) {
  const value = useMemo<LojaContextValue>(
    () => ({
      ...loja,
      basePath: `/${loja.slug}`,
    }),
    [loja],
  );

  return (
    <LojaContext.Provider value={value}>{children}</LojaContext.Provider>
  );
}

export function useLoja(): LojaContextValue {
  const ctx = useContext(LojaContext);
  if (!ctx) {
    throw new Error("useLoja deve ser usado dentro de LojaProvider (rota /[slug])");
  }
  return ctx;
}

export function useLojaOptional(): LojaContextValue | null {
  return useContext(LojaContext);
}
