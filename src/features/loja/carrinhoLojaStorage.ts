import type { LojaConfig } from "@/features/multitenant/types";

export type LojaVinculadaCarrinho = {
  lojaId: string;
  slug: string;
  nome: string;
  config?: LojaConfig;
};

const STORAGE_KEY = "zenpro-carrinho-loja";

export function lerLojaVinculadaCarrinho(): LojaVinculadaCarrinho | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
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
  if (!loja) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(loja));
}
