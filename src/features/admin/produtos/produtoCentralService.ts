import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { SEED_CATALOGO, tipoIdPorCategoriaVitrine } from "@/features/catalogo/types";
import {
  inferirCategoriaId,
  type CategoriaVitrineId,
} from "@/features/loja/categoriasVitrine";
import {
  COLECOES,
  type FaixaPrecoRevendedor,
  type ProdutoCentralFirestore,
} from "@/features/multitenant/types";
import {
  normalizarFaixasPrecoRevendedor,
  precoRevendedorPorQuantidade,
} from "@/features/revendedor/precoRevendedorFaixas";
import {
  normalizarPagamentoProduto,
  type PagamentoProdutoConfig,
} from "@/features/pagamentos/pagamentoProduto";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { invalidateTtlCache } from "@/lib/ttlCache";

export type ProdutoCentral = {
  id: string;
} & ProdutoCentralFirestore;

export type ProdutoFormInput = {
  nome: string;
  descricao: string;
  precoBaseCentavos: number;
  /** Preço B2B obrigatório. */
  precoRevendedorCentavos: number;
  pedidoMinimoRevendedorCentavos: number;
  faixasPrecoRevendedor: FaixaPrecoRevendedor[];
  imagens: string[];
  ativo: boolean;
  tipoId: string;
  modoVenda: "personalizada" | "pronta";
  personalizavel: boolean;
  material: string | null;
  controlaEstoque: boolean;
  estoqueCentral: number;
  marcaId: string | null;
  modelosCompativeis: string[];
  pesoGramas: number;
  alturaCm: number;
  larguraCm: number;
  comprimentoCm: number;
  pagamento: PagamentoProdutoConfig;
  /** Categoria de vitrine. */
  categoriaId: CategoriaVitrineId;
};

/** Preço cobrado na reposição — 1 un. (faixa) ou fallback. */
export function precoReposicaoCentavos(produto: {
  precoBaseCentavos: number;
  precoRevendedorCentavos?: number | null;
  faixasPrecoRevendedor?: FaixaPrecoRevendedor[] | null;
}): number {
  return precoRevendedorPorQuantidade(produto, 1) || produto.precoBaseCentavos;
}

const DEFAULTS_NOVO_PRODUTO = {
  tipoId: SEED_CATALOGO.TIPO_CAPINHA,
  modoVenda: "pronta" as const,
  personalizavel: false,
  destaque: null as string | null,
  marcaId: null as string | null,
  modelosCompativeis: [] as string[],
};

function sincronizarFlagsCategoria(
  categoriaId: CategoriaVitrineId,
): {
  categoriaId: CategoriaVitrineId;
  personalizavel: boolean;
  modoVenda: "personalizada" | "pronta";
  tipoId: string;
} {
  if (categoriaId === "personalizaveis") {
    return {
      categoriaId,
      personalizavel: true,
      modoVenda: "personalizada",
      tipoId: tipoIdPorCategoriaVitrine(categoriaId),
    };
  }
  return {
    categoriaId,
    personalizavel: false,
    modoVenda: "pronta",
    tipoId: tipoIdPorCategoriaVitrine(categoriaId),
  };
}

function requireDb() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }
  return getFirebaseDb();
}

function mapProduto(id: string, data: DocumentData): ProdutoCentral {
  const modoVenda =
    data.modoVenda === "personalizada" || data.tipo === "personalizada"
      ? "personalizada"
      : "pronta";

  const tipoId = String(data.tipoId ?? SEED_CATALOGO.TIPO_CAPINHA);
  const categoriaId = inferirCategoriaId(data);

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
    tipoId,
    modoVenda,
    personalizavel: Boolean(data.personalizavel),
    material: (data.material as string | null | undefined) ?? null,
    controlaEstoque: data.personalizavel
      ? false
      : data.controlaEstoque !== false,
    estoqueCentral: Math.max(0, Number(data.estoqueCentral ?? 0)),
    categoriaId,
    categoria: String(data.categoria ?? categoriaId),
    destaque: (data.destaque as string | null | undefined) ?? null,
    marcaId: (data.marcaId as string | null | undefined) ?? null,
    modelosCompativeis: Array.isArray(data.modelosCompativeis)
      ? data.modelosCompativeis.filter((m): m is string => typeof m === "string")
      : data.modeloId
        ? [String(data.modeloId)]
        : [],
    pesoGramas:
      data.pesoGramas == null || data.pesoGramas === ""
        ? null
        : Math.max(1, Number(data.pesoGramas)),
    alturaCm:
      data.alturaCm == null || data.alturaCm === ""
        ? null
        : Math.max(1, Number(data.alturaCm)),
    larguraCm:
      data.larguraCm == null || data.larguraCm === ""
        ? null
        : Math.max(1, Number(data.larguraCm)),
    comprimentoCm:
      data.comprimentoCm == null || data.comprimentoCm === ""
        ? null
        : Math.max(1, Number(data.comprimentoCm)),
    pagamento: normalizarPagamentoProduto(data.pagamento),
    modeloId: data.modeloId ? String(data.modeloId) : undefined,
    marca: data.marca ? String(data.marca) : undefined,
    tipo: modoVenda,
    criadoEm: data.criadoEm,
    atualizadoEm: data.atualizadoEm,
  };
}

function payloadFromInput(input: ProdutoFormInput) {
  const modeloLegacy = input.modelosCompativeis[0] ?? null;
  const sync = sincronizarFlagsCategoria(input.categoriaId);

  return {
    nome: input.nome.trim(),
    descricao: input.descricao.trim(),
    precoBaseCentavos: input.precoBaseCentavos,
    precoRevendedorCentavos: Math.max(0, input.precoRevendedorCentavos),
    pedidoMinimoRevendedorCentavos: Math.max(
      0,
      input.pedidoMinimoRevendedorCentavos || 0,
    ),
    faixasPrecoRevendedor: normalizarFaixasPrecoRevendedor(
      input.faixasPrecoRevendedor,
      input.precoRevendedorCentavos,
    ),
    imagens: input.imagens,
    ativo: input.ativo,
    tipoId: sync.tipoId,
    modoVenda: sync.modoVenda,
    tipo: sync.modoVenda,
    personalizavel: sync.personalizavel,
    material: input.material?.trim() || null,
    controlaEstoque: sync.personalizavel ? false : input.controlaEstoque,
    estoqueCentral: sync.personalizavel ? 0 : Math.max(0, input.estoqueCentral),
    categoriaId: sync.categoriaId,
    categoria: sync.categoriaId,
    marcaId: input.marcaId,
    modelosCompativeis: input.modelosCompativeis,
    modeloId: modeloLegacy,
    marca: input.marcaId ?? "",
    destaque: DEFAULTS_NOVO_PRODUTO.destaque,
    pesoGramas: Math.max(1, Math.round(input.pesoGramas)),
    alturaCm: Math.max(1, Math.round(input.alturaCm)),
    larguraCm: Math.max(1, Math.round(input.larguraCm)),
    comprimentoCm: Math.max(1, Math.round(input.comprimentoCm)),
    pagamento: (() => {
      const n = normalizarPagamentoProduto(input.pagamento);
      const raw =
        input.pagamento && typeof input.pagamento === "object"
          ? (input.pagamento as Record<string, unknown>)
          : {};
      const maxRaw = raw.maxParcelasCartao;
      const pixRaw = raw.descontoPixPercentual;
      return {
        aceitaPix: n.aceitaPix,
        aceitaBoleto: n.aceitaBoleto,
        aceitaCartao: n.aceitaCartao,
        // null = usa padrão da loja no checkout
        maxParcelasCartao:
          maxRaw != null && Number(maxRaw) > 0 ? n.maxParcelasCartao : null,
        descontoPixPercentual:
          pixRaw != null && Number(pixRaw) > 0 ? n.descontoPixPercentual : null,
      };
    })(),
  };
}

export function gerarIdProduto(nome: string): string {
  const base = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "produto"}-${Date.now().toString(36)}`;
}

export async function listarProdutosCentral(): Promise<ProdutoCentral[]> {
  const db = requireDb();
  const snap = await getDocs(collection(db, COLECOES.PRODUTOS));
  return snap.docs
    .map((d) => mapProduto(d.id, d.data()))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function obterProdutoCentral(
  produtoId: string,
): Promise<ProdutoCentral | null> {
  const db = requireDb();
  const snap = await getDoc(doc(db, COLECOES.PRODUTOS, produtoId));
  if (!snap.exists()) return null;
  return mapProduto(snap.id, snap.data());
}

export async function criarProdutoCentral(
  input: ProdutoFormInput,
): Promise<string> {
  const db = requireDb();
  const id = gerarIdProduto(input.nome);
  const ref = doc(db, COLECOES.PRODUTOS, id);

  await setDoc(ref, {
    ...payloadFromInput(input),
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });

  invalidateTtlCache("produtos:");
  return id;
}

export async function atualizarProdutoCentral(
  produtoId: string,
  input: ProdutoFormInput,
): Promise<void> {
  const db = requireDb();
  await updateDoc(doc(db, COLECOES.PRODUTOS, produtoId), {
    ...payloadFromInput(input),
    atualizadoEm: serverTimestamp(),
  });
  invalidateTtlCache("produtos:");
}

export async function alternarAtivoProdutoCentral(
  produtoId: string,
  ativo: boolean,
): Promise<void> {
  const db = requireDb();
  await updateDoc(doc(db, COLECOES.PRODUTOS, produtoId), {
    ativo,
    atualizadoEm: serverTimestamp(),
  });
  invalidateTtlCache("produtos:");
}

export async function excluirProdutoCentral(produtoId: string): Promise<void> {
  const db = requireDb();
  const ref = doc(db, COLECOES.PRODUTOS, produtoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Produto não encontrado.");
  }
  await deleteDoc(ref);
  invalidateTtlCache("produtos:");
}
