import { doc, getDoc } from "firebase/firestore";
import {
  COLECOES,
  type FaixaPrecoRevendedor,
  type ProdutoCentralFirestore,
} from "@/features/multitenant/types";
import { normalizarFaixasPrecoRevendedor } from "@/features/revendedor/precoRevendedorFaixas";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

export type ProdutoCatalogo = {
  id: string;
} & ProdutoCentralFirestore;

function mapProduto(id: string, data: Record<string, unknown>): ProdutoCatalogo {
  const modoVenda =
    data.modoVenda === "personalizada" || data.tipo === "personalizada"
      ? "personalizada"
      : "pronta";

  return {
    id,
    nome: String(data.nome ?? ""),
    descricao: String(data.descricao ?? ""),
    precoBaseCentavos: Number(data.precoBaseCentavos ?? 0),
    precoRevendedorCentavos:
      data.precoRevendedorCentavos == null || data.precoRevendedorCentavos === ""
        ? null
        : Math.max(0, Number(data.precoRevendedorCentavos)),
    pedidoMinimoRevendedorCentavos:
      data.pedidoMinimoRevendedorCentavos == null ||
      data.pedidoMinimoRevendedorCentavos === ""
        ? null
        : Math.max(0, Number(data.pedidoMinimoRevendedorCentavos)),
    faixasPrecoRevendedor: normalizarFaixasPrecoRevendedor(
      Array.isArray(data.faixasPrecoRevendedor)
        ? (data.faixasPrecoRevendedor as FaixaPrecoRevendedor[])
        : null,
      data.precoRevendedorCentavos == null || data.precoRevendedorCentavos === ""
        ? null
        : Number(data.precoRevendedorCentavos),
    ),
    imagens: Array.isArray(data.imagens)
      ? data.imagens.filter((u): u is string => typeof u === "string")
      : [],
    ativo: Boolean(data.ativo),
    tipoId: String(data.tipoId ?? "capinha"),
    modoVenda,
    personalizavel: Boolean(data.personalizavel),
    material: data.material ? String(data.material) : undefined,
    visualPersonalizacao: data.visualPersonalizacao ?? undefined,
    categoria: String(data.categoria ?? "capinhas"),
    destaque: (data.destaque as string | null | undefined) ?? null,
    marcaId: (data.marcaId as string | null | undefined) ?? null,
    modelosCompativeis: Array.isArray(data.modelosCompativeis)
      ? data.modelosCompativeis.filter((m): m is string => typeof m === "string")
      : data.modeloId
        ? [String(data.modeloId)]
        : [],
    controlaEstoque: data.personalizavel ? false : data.controlaEstoque !== false,
    estoqueCentral: Math.max(0, Number(data.estoqueCentral ?? 0)),
    criadoEm: data.criadoEm,
    atualizadoEm: data.atualizadoEm,
  };
}

/** Leitura pública de produto (catálogo / editor). */
export async function obterProdutoCatalogo(
  produtoId: string,
): Promise<ProdutoCatalogo | null> {
  if (!isFirebaseConfigured()) return null;

  const snap = await getDoc(doc(getFirebaseDb(), COLECOES.PRODUTOS, produtoId));
  if (!snap.exists()) return null;

  const produto = mapProduto(snap.id, snap.data() as Record<string, unknown>);
  if (!produto.ativo) return null;
  return produto;
}
