import type { Personalizacao } from "@/features/personalizacao/types";
import type { FaixaPrecoRevendedor } from "@/features/multitenant/types";

export type ItemCarrinho = {
  id: string;
  tipo: "personalizada" | "pronta";
  produtoId: string;
  nomeProduto: string;
  modeloId: string;
  personalizacaoId: string | null;
  personalizacao: Personalizacao | null;
  /** Preço unitário em centavos */
  precoCentavos: number;
  /** Unidades (padrão 1). No B2B altera faixa de preço. */
  quantidade: number;
  rotuloModelo: string;
  imagemUrl?: string;
  gradienteCapa?: string;
  faixasPrecoRevendedor?: FaixaPrecoRevendedor[];
  pedidoMinimoRevendedorCentavos?: number;
  precoBaseCentavos?: number;
  precoRevendedorCentavos?: number;
};

export const CLIENTE_MOCK = {
  nome: "Cliente Demo",
  email: "demo@capinhas.com.br",
  endereco: "Rua das Flores, 123 — São Paulo, SP — CEP 01310-100",
} as const;

export function calcularTotalCentavos(itens: ItemCarrinho[]): number {
  return itens.reduce(
    (acc, item) => acc + item.precoCentavos * Math.max(1, item.quantidade || 1),
    0,
  );
}

export function calcularQuantidadeItens(itens: ItemCarrinho[]): number {
  return itens.reduce((acc, item) => acc + Math.max(1, item.quantidade || 1), 0);
}

export type PedidoMock = {
  itens: ItemCarrinho[];
  totalCentavos: number;
  cliente: typeof CLIENTE_MOCK;
};
