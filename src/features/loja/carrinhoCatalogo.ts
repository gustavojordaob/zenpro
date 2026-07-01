import { getModeloById } from "@/features/personalizacao/modelos";
import { PRODUTOS_DESTAQUE } from "./produtosMock";

const PRECO_PADRAO_CENTAVOS = 4990;

export function getPrecoPorModelo(modeloId: string): number {
  const produto = PRODUTOS_DESTAQUE.find((p) => p.modeloId === modeloId);
  return produto?.precoCentavos ?? PRECO_PADRAO_CENTAVOS;
}

export function getRotuloModelo(modeloId: string): string {
  const modelo = getModeloById(modeloId);
  if (!modelo) return modeloId;
  return `${modelo.marca} ${modelo.modelo}`;
}
