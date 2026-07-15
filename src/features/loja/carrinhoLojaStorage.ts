import type { LojaConfig } from "@/features/multitenant/types";

export type LojaVinculadaCarrinho = {
  lojaId: string;
  slug: string;
  nome: string;
  config?: LojaConfig;
};

const STORAGE_KEY = "zenpro-carrinho-loja-v1";
const LEGACY_SESSION_KEY = "zenpro-carrinho-loja";

export function lerLojaVinculadaCarrinho(): LojaVinculadaCarrinho | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LojaVinculadaCarrinho;
    if (parsed.lojaId && parsed.slug && parsed.nome) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function salvarLojaVinculadaCarrinho(loja: LojaVinculadaCarrinho | null) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    if (!loja) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loja));
  } catch (e) {
    console.error("Falha ao salvar loja do carrinho", e);
  }
}
