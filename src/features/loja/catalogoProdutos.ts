import { collection, getDocs, query, where } from "firebase/firestore";
import {
  calcularDisponivelVenda,
  listarEstoqueLojaMap,
  produtoControlaEstoque,
} from "@/features/admin/estoque/estoqueAdminService";
import { SEED_CATALOGO } from "@/features/catalogo/types";
import {
  COLECOES,
  type ProdutoCentralFirestore,
} from "@/features/multitenant/types";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import type { CategoriaProduto, ProdutoDestaque } from "./produtosMock";

export function produtoCentralParaDestaque(
  id: string,
  data: ProdutoCentralFirestore,
  opts?: {
    modeloIdOverride?: string;
    disponivelVenda?: number;
  },
): ProdutoDestaque {
  const modoVenda =
    data.modoVenda ?? (data.tipo === "personalizada" ? "personalizada" : "pronta");
  const modeloId =
    opts?.modeloIdOverride ??
    data.modelosCompativeis?.[0] ??
    data.modeloId ??
    "iphone-15";

  const controla = produtoControlaEstoque(data);
  const disponivel =
    opts?.disponivelVenda ??
    (controla ? calcularDisponivelVenda(data, null) : 9999);

  return {
    id: opts?.modeloIdOverride ? `${id}__${modeloId}` : id,
    produtoBaseId: id,
    nome: data.nome,
    descricao: data.descricao,
    modeloId,
    marca: data.marca ?? "",
    precoCentavos: data.precoBaseCentavos,
    tipo: modoVenda,
    categoria: (data.categoria ?? "capinhas") as CategoriaProduto,
    destaque: data.destaque ?? undefined,
    imagemUrl: data.imagens[0],
    controlaEstoque: controla,
    disponivelVenda: disponivel,
    esgotado: controla && disponivel <= 0,
  };
}

export async function listarProdutosLojaAtivos(
  lojaId?: string | null,
): Promise<ProdutoDestaque[]> {
  if (!isFirebaseConfigured()) return [];

  const db = getFirebaseDb();
  const snap = await getDocs(
    query(collection(db, COLECOES.PRODUTOS), where("ativo", "==", true)),
  );

  const estoqueMap = lojaId ? await listarEstoqueLojaMap(lojaId) : {};

  return snap.docs
    .filter((d) => !Boolean((d.data() as ProdutoCentralFirestore).personalizavel))
    .map((d) => {
      const data = d.data() as ProdutoCentralFirestore;
      const estoqueLoja = lojaId ? (estoqueMap[d.id] ?? 0) : null;
      return produtoCentralParaDestaque(d.id, data, {
        disponivelVenda: calcularDisponivelVenda(data, estoqueLoja),
      });
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Produtos marcados como personalizáveis — por enquanto só capinha de celular */
export async function listarProdutosPersonalizaveisAtivos(): Promise<
  ProdutoDestaque[]
> {
  if (!isFirebaseConfigured()) return [];

  const db = getFirebaseDb();
  const snap = await getDocs(
    query(
      collection(db, COLECOES.PRODUTOS),
      where("ativo", "==", true),
      where("personalizavel", "==", true),
    ),
  );

  const itens: ProdutoDestaque[] = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as ProdutoCentralFirestore;
    if (data.tipoId !== SEED_CATALOGO.TIPO_CAPINHA) continue;

    const modelos = data.modelosCompativeis?.length
      ? data.modelosCompativeis
      : data.modeloId
        ? [data.modeloId]
        : [];

    if (modelos.length === 0) continue;

    for (const modeloId of modelos) {
      itens.push(
        produtoCentralParaDestaque(docSnap.id, data, { modeloIdOverride: modeloId }),
      );
    }
  }

  return itens.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
