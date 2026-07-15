import {
  MARCA_LOJA_ID,
  MARCA_LOJA_NOME,
} from "@/features/multitenant/catalogoSeedData";
import type { LojaEfetiva } from "@/features/loja/useLojaEfetiva";
import type { LojaPublica } from "@/features/multitenant/lojaPublicaService";

export const REVENDEDOR_B2B_BASE_PATH = "/revendedor";

/** Contexto de loja para o portal B2B (pedidos vão para Zen Pro). */
export const REVENDEDOR_B2B_LOJA_PUBLICA: LojaPublica = {
  lojaId: MARCA_LOJA_ID,
  slug: "revendedor",
  nome: "Zen Pro — Revendedores",
  ativo: true,
  config: { cor: "#0f766e" },
};

export const REVENDEDOR_B2B_LOJA_EFETIVA: LojaEfetiva = {
  lojaId: MARCA_LOJA_ID,
  slug: "revendedor",
  nome: "Zen Pro — Revendedores",
  ativo: true,
  config: { cor: "#0f766e" },
  basePath: REVENDEDOR_B2B_BASE_PATH,
  isMarca: true,
  isB2b: true,
};

export { MARCA_LOJA_NOME };
