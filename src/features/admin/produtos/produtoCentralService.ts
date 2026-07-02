import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { SEED_CATALOGO } from "@/features/catalogo/types";
import { COLECOES, type ProdutoCentralFirestore } from "@/features/multitenant/types";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

export type ProdutoCentral = {
  id: string;
} & ProdutoCentralFirestore;

export type ProdutoFormInput = {
  nome: string;
  descricao: string;
  precoBaseCentavos: number;
  imagens: string[];
  ativo: boolean;
  tipoId: string;
  modoVenda: "personalizada" | "pronta";
  personalizavel: boolean;
  controlaEstoque: boolean;
  estoqueCentral: number;
  marcaId: string | null;
  modelosCompativeis: string[];
};

const DEFAULTS_NOVO_PRODUTO = {
  tipoId: SEED_CATALOGO.TIPO_CAPINHA,
  modoVenda: "pronta" as const,
  personalizavel: false,
  destaque: null as string | null,
  marcaId: null as string | null,
  modelosCompativeis: [] as string[],
};

function categoriaFromTipoId(tipoId: string): string {
  if (tipoId === SEED_CATALOGO.TIPO_CAPINHA) return "capinhas";
  return "acessorios";
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

  return {
    id,
    nome: String(data.nome ?? ""),
    descricao: String(data.descricao ?? ""),
    precoBaseCentavos: Number(data.precoBaseCentavos ?? 0),
    imagens: Array.isArray(data.imagens)
      ? data.imagens.filter((u): u is string => typeof u === "string")
      : [],
    ativo: Boolean(data.ativo),
    tipoId,
    modoVenda,
    personalizavel: Boolean(data.personalizavel),
    controlaEstoque: data.personalizavel
      ? false
      : data.controlaEstoque !== false,
    estoqueCentral: Math.max(0, Number(data.estoqueCentral ?? 0)),
    categoria: String(data.categoria ?? categoriaFromTipoId(tipoId)),
    destaque: (data.destaque as string | null | undefined) ?? null,
    marcaId: (data.marcaId as string | null | undefined) ?? null,
    modelosCompativeis: Array.isArray(data.modelosCompativeis)
      ? data.modelosCompativeis.filter((m): m is string => typeof m === "string")
      : data.modeloId
        ? [String(data.modeloId)]
        : [],
    modeloId: data.modeloId ? String(data.modeloId) : undefined,
    marca: data.marca ? String(data.marca) : undefined,
    tipo: modoVenda,
    criadoEm: data.criadoEm,
    atualizadoEm: data.atualizadoEm,
  };
}

function payloadFromInput(input: ProdutoFormInput) {
  const modeloLegacy = input.modelosCompativeis[0] ?? null;

  return {
    nome: input.nome.trim(),
    descricao: input.descricao.trim(),
    precoBaseCentavos: input.precoBaseCentavos,
    imagens: input.imagens,
    ativo: input.ativo,
    tipoId: input.tipoId,
    modoVenda: input.modoVenda,
    tipo: input.modoVenda,
    personalizavel: input.personalizavel,
    controlaEstoque: input.personalizavel ? false : input.controlaEstoque,
    estoqueCentral: input.personalizavel ? 0 : Math.max(0, input.estoqueCentral),
    categoria: categoriaFromTipoId(input.tipoId),
    marcaId: input.marcaId,
    modelosCompativeis: input.modelosCompativeis,
    modeloId: modeloLegacy,
    marca: input.marcaId ?? "",
    destaque: DEFAULTS_NOVO_PRODUTO.destaque,
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
}
