"use client";

import { useMemo } from "react";
import { useLojaEfetiva } from "@/features/loja/useLojaEfetiva";

export type LojaPaths = {
  home: string;
  produtosHash: string;
  personalizarHash: string;
  personalizar: (modeloId: string) => string;
  carrinho: string;
  checkout: string;
  contato: string;
  loginRedirect: (path: string) => string;
};

export function useLojaPaths(): LojaPaths {
  const loja = useLojaEfetiva();

  return useMemo(() => {
    if (!loja) {
      return {
        home: "/",
        produtosHash: "/#produtos",
        personalizarHash: "/#personalizar",
        personalizar: (modeloId: string) =>
          `/personalizar?modelo=${encodeURIComponent(modeloId)}`,
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
      personalizar: (modeloId: string) =>
        `${base}/personalizar?modelo=${encodeURIComponent(modeloId)}`,
      carrinho: `${base}/carrinho`,
      checkout: `${base}/checkout`,
      contato: "/contato",
      loginRedirect: (path: string) =>
        `/login?redirect=${encodeURIComponent(path)}`,
    };
  }, [loja]);
}
