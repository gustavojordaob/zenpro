import { SEED_IDS } from "@/features/multitenant/catalogoSeedData";

/**
 * Slug "casca" (shell) genérico. Como usamos `output: export`, cada loja de
 * revendedor precisaria estar listada em build-time. Em vez disso emitimos um
 * HTML placeholder em `/loja` (e sub-rotas) e o Firebase Hosting reescreve
 * qualquer `/{slug}` desconhecido para essa casca. O cliente descobre o slug
 * real pela URL (usePathname) — ver LojaLayoutClient. Assim revendedores novos
 * (ex.: /leozao) funcionam sem redeploy.
 */
export const LOJA_SLUG_SHELL = "loja";

/** Slug reservados que um revendedor NÃO pode escolher (colidem com rotas). */
export const LOJA_SLUGS_RESERVADOS = [
  "loja",
  "admin",
  "carrinho",
  "checkout",
  "personalizar",
  "conta",
  "contato",
  "login",
  "c",
  "promocao",
  "produto",
] as const;

/** Slugs pré-renderizados no static export (seeds + casca genérica) */
export const LOJA_SLUGS_STATIC = [
  SEED_IDS.SLUG_LOJA_A,
  SEED_IDS.SLUG_LOJA_B,
  LOJA_SLUG_SHELL,
] as const;
