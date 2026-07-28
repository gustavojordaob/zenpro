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
import type { CategoriaProduto, ProdutoDestaque } from "./produtosMock";

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
    material: data.material ?? undefined,
    destaque: data.destaque ?? undefined,
    imagemUrl: data.imagens[0],
    imagens: data.imagens?.length ? data.imagens : undefined,
    controlaEstoque: controla,
    disponivelVenda: disponivel,
    esgotado: controla && disponivel <= 0,
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

  // Site B2C (/) não tem LojaContext — usa estoque da loja oficial Zen Pro.
  const lojaEstoqueId = lojaId?.trim() || MARCA_LOJA_ID;

  const db = getFirebaseDb();
  const snap = await getDocs(
    query(collection(db, COLECOES.PRODUTOS), where("ativo", "==", true)),
  );

  const estoqueMap = await listarEstoqueLojaMap(lojaEstoqueId);

  return snap.docs
    .filter((d) => !Boolean((d.data() as ProdutoCentralFirestore).personalizavel))
    .map((d) => {
      const data = d.data() as ProdutoCentralFirestore;
      const estoqueLoja = estoqueMap[d.id] ?? 0;
      return produtoCentralParaDestaque(d.id, data, {
        disponivelVenda: calcularDisponivelVenda(data, estoqueLoja),
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

  const db = getFirebaseDb();
  const [snap, marcas, modelos] = await Promise.all([
    getDocs(
      query(
        collection(db, COLECOES.PRODUTOS),
        where("ativo", "==", true),
        where("personalizavel", "==", true),
      ),
    ),
    listarMarcasAtivas(),
    listarModelosAtivos(),
  ]);

  const marcasMap = Object.fromEntries(marcas.map((m) => [m.id, m.nome]));
  const modelosMap = Object.fromEntries(
    modelos.map((m) => [m.id, { nome: m.nome, marcaId: m.marcaId }]),
  );

  const itens: ProdutoDestaque[] = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as ProdutoCentralFirestore;
    if (data.tipoId !== SEED_CATALOGO.TIPO_CAPINHA) continue;

    const listaModelos = data.modelosCompativeis?.length
      ? data.modelosCompativeis
      : data.modeloId
        ? [data.modeloId]
        : [];

    if (listaModelos.length === 0) continue;

    // Um card por produto — o seletor de iPhone fica na página do produto.
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
