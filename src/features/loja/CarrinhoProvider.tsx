"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Personalizacao } from "@/features/personalizacao/types";
import {
  calcularTotalCentavos,
  type ItemCarrinho,
} from "./carrinhoTypes";
import { criarItemPersonalizado, criarItemPronto } from "./carrinhoUtils";
import type { ProdutoDestaque } from "./produtosMock";
import {
  lerLojaVinculadaCarrinho,
  salvarLojaVinculadaCarrinho,
  type LojaVinculadaCarrinho,
} from "./carrinhoLojaStorage";

type CarrinhoContextValue = {
  itens: ItemCarrinho[];
  totalCentavos: number;
  quantidade: number;
  lojaVinculada: LojaVinculadaCarrinho | null;
  definirLojaVinculada: (loja: LojaVinculadaCarrinho | null) => void;
  adicionarPersonalizada: (
    personalizacao: Personalizacao,
    personalizacaoId: string,
    produtoId?: string,
  ) => void;
  adicionarPronta: (produto: ProdutoDestaque) => void;
  remover: (id: string) => void;
  limpar: () => void;
};

const CarrinhoContext = createContext<CarrinhoContextValue | null>(null);

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [lojaVinculada, setLojaVinculada] = useState<LojaVinculadaCarrinho | null>(
    null,
  );

  useEffect(() => {
    setLojaVinculada(lerLojaVinculadaCarrinho());
  }, []);

  const definirLojaVinculada = useCallback((loja: LojaVinculadaCarrinho | null) => {
    setLojaVinculada(loja);
    salvarLojaVinculadaCarrinho(loja);
  }, []);

  const adicionarPersonalizada = useCallback(
    (
      personalizacao: Personalizacao,
      personalizacaoId: string,
      produtoId?: string,
    ) => {
      setItens((prev) => [
        ...prev,
        criarItemPersonalizado(personalizacao, personalizacaoId, produtoId),
      ]);
    },
    [],
  );

  const adicionarPronta = useCallback((produto: ProdutoDestaque) => {
    setItens((prev) => [...prev, criarItemPronto(produto)]);
  }, []);

  const remover = useCallback((id: string) => {
    setItens((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const limpar = useCallback(() => {
    setItens([]);
  }, []);

  const value = useMemo(
    () => ({
      itens,
      totalCentavos: calcularTotalCentavos(itens),
      quantidade: itens.length,
      lojaVinculada,
      definirLojaVinculada,
      adicionarPersonalizada,
      adicionarPronta,
      remover,
      limpar,
    }),
    [
      itens,
      lojaVinculada,
      definirLojaVinculada,
      adicionarPersonalizada,
      adicionarPronta,
      remover,
      limpar,
    ],
  );

  return (
    <CarrinhoContext.Provider value={value}>{children}</CarrinhoContext.Provider>
  );
}

export function useCarrinho(): CarrinhoContextValue {
  const ctx = useContext(CarrinhoContext);
  if (!ctx) {
    throw new Error("useCarrinho deve ser usado dentro de CarrinhoProvider");
  }
  return ctx;
}
