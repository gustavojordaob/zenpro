import type { LojaConfig } from "@/features/multitenant/types";
import { PEDIDO_MINIMO_REVENDEDOR_CENTAVOS } from "./revendedorComercialConstants";

export function pedidoMinimoRevendedorCentavos(config?: LojaConfig | null): number {
  const custom = config?.pedidoMinimoCentavos;
  if (typeof custom === "number" && custom > 0) return custom;
  return PEDIDO_MINIMO_REVENDEDOR_CENTAVOS;
}

export function formatarReaisCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
