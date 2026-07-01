"use client";

import {
  createContext,
  useCallback,
  useContext,
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

type CarrinhoContextValue = {
  itens: ItemCarrinho[];
  totalCentavos: number;
  quantidade: number;
  adicionarPersonalizada: (
    personalizacao: Personalizacao,
    personalizacaoId: string,
  ) => void;
  adicionarPronta: (produto: ProdutoDestaque) => void;
  remover: (id: string) => void;
  limpar: () => void;
};

const CarrinhoContext = createContext<CarrinhoContextValue | null>(null);

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);

  const adicionarPersonalizada = useCallback(
    (personalizacao: Personalizacao, personalizacaoId: string) => {
      setItens((prev) => [
        ...prev,
        criarItemPersonalizado(personalizacao, personalizacaoId),
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
      adicionarPersonalizada,
      adicionarPronta,
      remover,
      limpar,
    }),
    [itens, adicionarPersonalizada, adicionarPronta, remover, limpar],
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
