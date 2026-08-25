import { collection, getDocs, query, where } from "firebase/firestore";
import {
  calcularDisponivelVenda,
  listarEstoqueLojaMap,
  produtoControlaEstoque,
} from "@/features/admin/estoque/estoqueAdminService";
import {
  listarMarcasAtivas,
  listarModelosAtivos,
} from "@/features/catalogo/catalogoRuntimeService";
import { SEED_CATALOGO } from "@/features/catalogo/types";
import {
  COLECOES,
  type ProdutoCentralFirestore,
} from "@/features/multitenant/types";
import { MARCA_LOJA_ID } from "@/features/multitenant/marcaLoja";
import { precoRevendedorAPartirDe } from "@/features/revendedor/precoRevendedorFaixas";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  cachedFetch,
  TTL_CATALOGO_MS,
  TTL_ESTOQUE_MS,
} from "@/lib/ttlCache";
import type { CategoriaProduto, ProdutoDestaque } from "./produtosMock";
import {
  inferirCategoriaId,
  type CategoriaVitrineId,
} from "./categoriasVitrine";

type ProdutoAtivoDoc = {
  id: string;
  data: ProdutoCentralFirestore;
};

/** Docs ativos sem Timestamps (sessionStorage-safe). */
function stripTimestamps(data: ProdutoCentralFirestore): ProdutoCentralFirestore {
  const { criadoEm: _c, atualizadoEm: _a, ...rest } = data;
  return rest as ProdutoCentralFirestore;
}

async function listarProdutosAtivosDocs(): Promise<ProdutoAtivoDoc[]> {
  return cachedFetch(
    "produtos:ativos:docs",
    async () => {
      const db = getFirebaseDb();
      const snap = await getDocs(
        query(collection(db, COLECOES.PRODUTOS), where("ativo", "==", true)),
      );
      return snap.docs.map((d) => ({
        id: d.id,
        data: stripTimestamps(d.data() as ProdutoCentralFirestore),
      }));
    },
    { ttlMs: TTL_CATALOGO_MS },
  );
}

async function listarEstoqueLojaMapCached(
  lojaId: string,
): Promise<Record<string, number>> {
  return cachedFetch(
    `estoque:${lojaId}`,
    () => listarEstoqueLojaMap(lojaId),
    { ttlMs: TTL_ESTOQUE_MS },
  );
}

export function produtoCentralParaDestaque(
  id: string,
  data: ProdutoCentralFirestore,
  opts?: {
    modeloIdOverride?: string;
    disponivelVenda?: number;
    marcaNome?: string;
    modeloNome?: string;
    /** Usa preços/faixas de revendedor */
    modoB2b?: boolean;
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

  const marca =
    opts?.marcaNome?.trim() ||
    data.marca?.trim() ||
    "";

  const precoCentavos = opts?.modoB2b
    ? precoRevendedorAPartirDe(data)
    : data.precoBaseCentavos;

  const modelosCompativeis = data.modelosCompativeis?.length
    ? data.modelosCompativeis
    : data.modeloId
      ? [data.modeloId]
      : [];

  return {
    id: opts?.modeloIdOverride ? `${id}__${modeloId}` : id,
    produtoBaseId: id,
    nome: opts?.modeloNome
      ? `${data.nome} — ${opts.modeloNome}`
      : data.nome,
    descricao: data.descricao,
    modeloId,
    modelosCompativeis,
    marca,
    precoCentavos,
    tipo: modoVenda,
    categoria: (data.categoria ?? "capinhas") as CategoriaProduto,
    categoriaId: inferirCategoriaId(data),
    material: data.material ?? undefined,
    destaque: data.destaque ?? undefined,
    imagemUrl: data.imagens[0],
    imagens: data.imagens?.length ? data.imagens : undefined,
    controlaEstoque: controla,
    disponivelVenda: disponivel,
    esgotado: controla && disponivel <= 0,
    personalizavel: Boolean(data.personalizavel),
    ...(opts?.modoB2b
      ? {
          faixasPrecoRevendedor: data.faixasPrecoRevendedor,
          pedidoMinimoRevendedorCentavos:
            data.pedidoMinimoRevendedorCentavos ?? undefined,
          precoBaseCentavos: data.precoBaseCentavos,
          precoRevendedorCentavos: data.precoRevendedorCentavos ?? undefined,
        }
      : {}),
  };
}

export async function listarProdutosLojaAtivos(
  lojaId?: string | null,
  opts?: { modoB2b?: boolean },
): Promise<ProdutoDestaque[]> {
  if (!isFirebaseConfigured()) return [];

  const lojaEstoqueId = lojaId?.trim() || MARCA_LOJA_ID;
  const [docs, estoqueMap] = await Promise.all([
    listarProdutosAtivosDocs(),
    listarEstoqueLojaMapCached(lojaEstoqueId),
  ]);

  return docs
    .filter((d) => !Boolean(d.data.personalizavel))
    .map((d) => {
      const estoqueLoja = estoqueMap[d.id] ?? 0;
      return produtoCentralParaDestaque(d.id, d.data, {
        disponivelVenda: calcularDisponivelVenda(d.data, estoqueLoja),
        modoB2b: opts?.modoB2b,
      });
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Produtos marcados como personalizáveis — por enquanto só capinha de celular */
export async function listarProdutosPersonalizaveisAtivos(opts?: {
  modoB2b?: boolean;
}): Promise<ProdutoDestaque[]> {
  if (!isFirebaseConfigured()) return [];

  const [docs, marcas, modelos] = await Promise.all([
    listarProdutosAtivosDocs(),
    listarMarcasAtivas(),
    listarModelosAtivos(),
  ]);

  const marcasMap = Object.fromEntries(marcas.map((m) => [m.id, m.nome]));
  const modelosMap = Object.fromEntries(
    modelos.map((m) => [m.id, { nome: m.nome, marcaId: m.marcaId }]),
  );

  const itens: ProdutoDestaque[] = [];

  for (const docSnap of docs) {
    const data = docSnap.data;
    if (!Boolean(data.personalizavel)) continue;
    if (data.tipoId !== SEED_CATALOGO.TIPO_CAPINHA) continue;

    const listaModelos = data.modelosCompativeis?.length
      ? data.modelosCompativeis
      : data.modeloId
        ? [data.modeloId]
        : [];

    if (listaModelos.length === 0) continue;

    const primeiroModelo = listaModelos[0];
    const modeloInfo = modelosMap[primeiroModelo];
    const marcaId = data.marcaId ?? modeloInfo?.marcaId ?? null;
    const marcaNome =
      (marcaId ? marcasMap[marcaId] : undefined) || data.marca || "";

    itens.push(
      produtoCentralParaDestaque(docSnap.id, data, {
        marcaNome,
        modoB2b: opts?.modoB2b,
      }),
    );
  }

  return itens.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Produtos ativos de uma categoria de vitrine. */
export async function listarProdutosPorCategoriaVitrine(
  categoriaId: CategoriaVitrineId,
  lojaId?: string | null,
  opts?: { modoB2b?: boolean },
): Promise<ProdutoDestaque[]> {
  if (!isFirebaseConfigured()) return [];

  if (categoriaId === "personalizaveis") {
    return listarProdutosPersonalizaveisAtivos(opts);
  }

  const lojaEstoqueId = lojaId?.trim() || MARCA_LOJA_ID;
  const [docs, estoqueMap] = await Promise.all([
    listarProdutosAtivosDocs(),
    listarEstoqueLojaMapCached(lojaEstoqueId),
  ]);

  return docs
    .map((d) => {
      const data = d.data;
      const cat = inferirCategoriaId(data);
      if (cat !== categoriaId) return null;
      if (Boolean(data.personalizavel)) return null;
      const estoqueLoja = estoqueMap[d.id] ?? 0;
      return produtoCentralParaDestaque(d.id, data, {
        disponivelVenda: calcularDisponivelVenda(data, estoqueLoja),
        modoB2b: opts?.modoB2b,
      });
    })
    .filter((p): p is ProdutoDestaque => p != null)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Produtos por IDs (ordem preservada — campanhas). */
export async function listarProdutosPorIds(
  produtoIds: string[],
  lojaId?: string | null,
  opts?: { modoB2b?: boolean },
): Promise<ProdutoDestaque[]> {
  if (!isFirebaseConfigured() || produtoIds.length === 0) return [];

  const lojaEstoqueId = lojaId?.trim() || MARCA_LOJA_ID;
  const [docs, estoqueMap, marcas, modelos] = await Promise.all([
    listarProdutosAtivosDocs(),
    listarEstoqueLojaMapCached(lojaEstoqueId),
    listarMarcasAtivas(),
    listarModelosAtivos(),
  ]);

  const marcasMap = Object.fromEntries(marcas.map((m) => [m.id, m.nome]));
  const modelosMap = Object.fromEntries(
    modelos.map((m) => [m.id, { nome: m.nome, marcaId: m.marcaId }]),
  );
  const byId = new Map(docs.map((d) => [d.id, d.data]));

  const out: ProdutoDestaque[] = [];
  for (const id of produtoIds) {
    const data = byId.get(id);
    if (!data) continue;
    const estoqueLoja = estoqueMap[id] ?? 0;
    const modeloId =
      data.modelosCompativeis?.[0] ?? data.modeloId ?? undefined;
    const modeloInfo = modeloId ? modelosMap[modeloId] : undefined;
    const marcaId = data.marcaId ?? modeloInfo?.marcaId ?? null;
    const marcaNome =
      (marcaId ? marcasMap[marcaId] : undefined) || data.marca || "";
    out.push(
      produtoCentralParaDestaque(id, data, {
        disponivelVenda: calcularDisponivelVenda(data, estoqueLoja),
        marcaNome,
        modoB2b: opts?.modoB2b,
      }),
    );
  }
  return out;
}

/** Aquece cache na home (1× getDocs produtos + estoque + marcas/modelos). */
export async function prefetchCatalogoVitrine(
  lojaId?: string | null,
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const lojaEstoqueId = lojaId?.trim() || MARCA_LOJA_ID;
  await Promise.all([
    listarProdutosAtivosDocs(),
    listarEstoqueLojaMapCached(lojaEstoqueId),
    listarMarcasAtivas(),
    listarModelosAtivos(),
  ]);
}
