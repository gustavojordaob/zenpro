import { MOLDURA_PROD_H, MOLDURA_PROD_W } from "./moldura";
import type { ModeloCelular } from "./types";

/** Modelos mockados — mesma moldura genérica; diferem só no rótulo por enquanto. */
export const MODELOS: ModeloCelular[] = [
  {
    id: "iphone-15",
    marca: "Apple",
    modelo: "iPhone 15",
    larguraPx: MOLDURA_PROD_W,
    alturaPx: MOLDURA_PROD_H,
  },
  {
    id: "samsung-s24",
    marca: "Samsung",
    modelo: "Galaxy S24",
    larguraPx: MOLDURA_PROD_W,
    alturaPx: MOLDURA_PROD_H,
  },
  {
    id: "iphone-17-pro-max",
    marca: "Apple",
    modelo: "iPhone 17 Pro Max",
    larguraPx: MOLDURA_PROD_W,
    alturaPx: MOLDURA_PROD_H,
  },
];

export function getModeloById(id: string): ModeloCelular | undefined {
  return MODELOS.find((m) => m.id === id);
}
