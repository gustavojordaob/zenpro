"use client";

import { useMemo } from "react";
import { useLojaEfetiva } from "@/features/loja/useLojaEfetiva";

export type LojaPaths = {
  home: string;
  produtosHash: string;
  personalizarHash: string;
  /** Página do produto com seletor de modelos. */
  produto: (produtoId: string) => string;
  personalizar: (modeloId: string, produtoId?: string) => string;
  carrinho: string;
  checkout: string;
  contato: string;
  loginRedirect: (path: string) => string;
};

function buildPersonalizarUrl(
  base: string,
  modeloId: string,
  produtoId?: string,
): string {
  const params = new URLSearchParams({ modelo: modeloId });
  if (produtoId) params.set("produto", produtoId);
  return `${base}/personalizar?${params.toString()}`;
}

export function useLojaPaths(): LojaPaths {
  const loja = useLojaEfetiva();

  return useMemo(() => {
    if (!loja) {
      return {
        home: "/",
        produtosHash: "/#produtos",
        personalizarHash: "/#personalizar",
        produto: (produtoId: string) =>
          `/produto?id=${encodeURIComponent(produtoId)}`,
        personalizar: (modeloId: string, produtoId?: string) => {
          const params = new URLSearchParams({ modelo: modeloId });
          if (produtoId) params.set("produto", produtoId);
          return `/personalizar?${params.toString()}`;
        },
        carrinho: "/carrinho",
        checkout: "/checkout",
        contato: "/contato",
        loginRedirect: (path: string) =>
          `/login?redirect=${encodeURIComponent(path)}`,
      };
    }

    const base = loja.basePath;
    return {
      home: base,
      produtosHash: `${base}#produtos`,
      personalizarHash: `${base}#personalizar`,
      produto: (produtoId: string) =>
        `${base}/produto?id=${encodeURIComponent(produtoId)}`,
      personalizar: (modeloId: string, produtoId?: string) =>
        buildPersonalizarUrl(base, modeloId, produtoId),
      carrinho: `${base}/carrinho`,
      checkout: `${base}/checkout`,
      contato: "/contato",
      loginRedirect: (path: string) =>
        `/login?redirect=${encodeURIComponent(path)}`,
    };
  }, [loja]);
}
