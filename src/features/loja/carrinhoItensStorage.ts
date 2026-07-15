import type { ItemCarrinho } from "./carrinhoTypes";

const STORAGE_KEY = "zenpro-carrinho-itens-v1";

function isItemCarrinho(v: unknown): v is ItemCarrinho {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    (o.tipo === "personalizada" || o.tipo === "pronta") &&
    typeof o.produtoId === "string" &&
    typeof o.nomeProduto === "string" &&
    typeof o.precoCentavos === "number"
  );
}

export function lerItensCarrinho(): ItemCarrinho[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isItemCarrinho)
      .map((item) => ({
        ...item,
        quantidade: Math.max(1, Number(item.quantidade) || 1),
      }));
  } catch {
    return [];
  }
}

export function salvarItensCarrinho(itens: ItemCarrinho[]): void {
  if (typeof window === "undefined") return;
  try {
    if (itens.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
  } catch (e) {
    console.error("Falha ao salvar carrinho", e);
  }
}
