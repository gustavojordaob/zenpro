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
import { precoRevendedorPorQuantidade } from "@/features/revendedor/precoRevendedorFaixas";
import {
  calcularQuantidadeItens,
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
import {
  lerItensCarrinho,
  salvarItensCarrinho,
} from "./carrinhoItensStorage";

type CarrinhoContextValue = {
  itens: ItemCarrinho[];
  totalCentavos: number;
  quantidade: number;
  /** false até hidratar do localStorage (evita flash/wipe) */
  hidratado: boolean;
  lojaVinculada: LojaVinculadaCarrinho | null;
  definirLojaVinculada: (loja: LojaVinculadaCarrinho | null) => void;
  adicionarPersonalizada: (
    personalizacao: Personalizacao,
    personalizacaoId: string,
    produtoId?: string,
    quantidadeInicial?: number,
  ) => void;
  adicionarPronta: (produto: ProdutoDestaque) => void;
  alterarQuantidade: (id: string, quantidade: number) => void;
  remover: (id: string) => void;
  limpar: () => void;
};

const CarrinhoContext = createContext<CarrinhoContextValue | null>(null);

function recalcularPrecoItem(item: ItemCarrinho, qty: number): ItemCarrinho {
  const quantidade = Math.max(1, Math.floor(qty));
  if (!item.faixasPrecoRevendedor?.length && !item.precoRevendedorCentavos) {
    return { ...item, quantidade };
  }
  const unit = precoRevendedorPorQuantidade(
    {
      precoBaseCentavos: item.precoBaseCentavos ?? item.precoCentavos,
      precoRevendedorCentavos: item.precoRevendedorCentavos,
      faixasPrecoRevendedor: item.faixasPrecoRevendedor,
    },
    quantidade,
  );
  return {
    ...item,
    quantidade,
    precoCentavos: unit > 0 ? unit : item.precoCentavos,
  };
}

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [lojaVinculada, setLojaVinculada] = useState<LojaVinculadaCarrinho | null>(
    null,
  );
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    setItens(lerItensCarrinho());
    setLojaVinculada(lerLojaVinculadaCarrinho());
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    salvarItensCarrinho(itens);
  }, [itens, hidratado]);

  const definirLojaVinculada = useCallback((loja: LojaVinculadaCarrinho | null) => {
    setLojaVinculada(loja);
    salvarLojaVinculadaCarrinho(loja);
  }, []);

  const adicionarPersonalizada = useCallback(
    (
      personalizacao: Personalizacao,
      personalizacaoId: string,
      produtoId?: string,
      quantidadeInicial = 1,
    ) => {
      const addQty = Math.max(1, Math.floor(quantidadeInicial) || 1);
      setItens((prev) => {
        const existente = prev.find(
          (i) =>
            i.tipo === "personalizada" &&
            i.personalizacaoId === personalizacaoId,
        );
        if (existente) {
          return prev.map((i) =>
            i.id === existente.id
              ? recalcularPrecoItem(i, (i.quantidade || 1) + addQty)
              : i,
          );
        }
        return [
          ...prev,
          criarItemPersonalizado(
            personalizacao,
            personalizacaoId,
            produtoId,
            addQty,
          ),
        ];
      });
    },
    [],
  );

  const adicionarPronta = useCallback((produto: ProdutoDestaque) => {
    setItens((prev) => {
      const produtoId = produto.produtoBaseId ?? produto.id;
      const existente = prev.find(
        (i) => i.tipo === "pronta" && i.produtoId === produtoId,
      );
      if (existente) {
        return prev.map((i) =>
          i.id === existente.id
            ? recalcularPrecoItem(
                i,
                (i.quantidade || 1) + (produto.quantidadeInicial ?? 1),
              )
            : i,
        );
      }
      return [...prev, criarItemPronto(produto)];
    });
  }, []);

  const alterarQuantidade = useCallback((id: string, quantidade: number) => {
    setItens((prev) =>
      prev.map((i) => (i.id === id ? recalcularPrecoItem(i, quantidade) : i)),
    );
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
      quantidade: calcularQuantidadeItens(itens),
      hidratado,
      lojaVinculada,
      definirLojaVinculada,
      adicionarPersonalizada,
      adicionarPronta,
      alterarQuantidade,
      remover,
      limpar,
    }),
    [
      itens,
      hidratado,
      lojaVinculada,
      definirLojaVinculada,
      adicionarPersonalizada,
      adicionarPronta,
      alterarQuantidade,
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
