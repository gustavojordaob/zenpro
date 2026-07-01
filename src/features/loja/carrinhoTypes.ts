import type { Personalizacao } from "@/features/personalizacao/types";
import type { ProdutoDestaque } from "./produtosMock";

export type ItemCarrinho = {
  id: string;
  tipo: "personalizada" | "pronta";
  produtoId: string;
  nomeProduto: string;
  modeloId: string;
  personalizacaoId: string | null;
  personalizacao: Personalizacao | null;
  precoCentavos: number;
  rotuloModelo: string;
  imagemUrl?: string;
  gradienteCapa?: string;
};

export const CLIENTE_MOCK = {
  nome: "Cliente Demo",
  email: "demo@capinhas.com.br",
  endereco: "Rua das Flores, 123 — São Paulo, SP — CEP 01310-100",
} as const;

export function calcularTotalCentavos(itens: ItemCarrinho[]): number {
  return itens.reduce((acc, item) => acc + item.precoCentavos, 0);
}

export type PedidoMock = {
  itens: ItemCarrinho[];
  totalCentavos: number;
  cliente: typeof CLIENTE_MOCK;
};
