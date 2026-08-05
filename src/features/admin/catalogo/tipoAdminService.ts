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
import {
  COLECOES_CATALOGO,
  type TipoPersonalizacao,
  type TipoProdutoCatalogoFirestore,
} from "@/features/catalogo/types";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

export type TipoCatalogoAdmin = { id: string } & TipoProdutoCatalogoFirestore;

export type TipoFormInput = {
  nome: string;
  tipoPersonalizacao: TipoPersonalizacao;
  ativo: boolean;
};

function requireDb() {
  if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
  return getFirebaseDb();
}

function mapTipo(id: string, data: DocumentData): TipoCatalogoAdmin {
  return {
    id,
    nome: String(data.nome ?? ""),
    tipoPersonalizacao:
      (data.tipoPersonalizacao as TipoPersonalizacao) ?? "mascara_modelo",
    ativo: Boolean(data.ativo),
    criadoEm: data.criadoEm,
    atualizadoEm: data.atualizadoEm,
  };
}

export function gerarIdTipo(nome: string): string {
  const base = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || `tipo-${Date.now().toString(36)}`;
}

export async function listarTiposAdmin(): Promise<TipoCatalogoAdmin[]> {
  const snap = await getDocs(collection(requireDb(), COLECOES_CATALOGO.TIPOS));
  return snap.docs
    .map((d) => mapTipo(d.id, d.data()))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function obterTipoAdmin(id: string): Promise<TipoCatalogoAdmin | null> {
  const snap = await getDoc(doc(requireDb(), COLECOES_CATALOGO.TIPOS, id));
  if (!snap.exists()) return null;
  return mapTipo(snap.id, snap.data());
}

export async function criarTipoAdmin(input: TipoFormInput): Promise<string> {
  const id = gerarIdTipo(input.nome);
  await setDoc(doc(requireDb(), COLECOES_CATALOGO.TIPOS, id), {
    nome: input.nome.trim(),
    tipoPersonalizacao: input.tipoPersonalizacao,
    ativo: input.ativo,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
  return id;
}

export async function atualizarTipoAdmin(
  id: string,
  input: TipoFormInput,
): Promise<void> {
  await updateDoc(doc(requireDb(), COLECOES_CATALOGO.TIPOS, id), {
    nome: input.nome.trim(),
    tipoPersonalizacao: input.tipoPersonalizacao,
    ativo: input.ativo,
    atualizadoEm: serverTimestamp(),
  });
}

export async function alternarAtivoTipoAdmin(
  id: string,
  ativo: boolean,
): Promise<void> {
  await updateDoc(doc(requireDb(), COLECOES_CATALOGO.TIPOS, id), {
    ativo,
    atualizadoEm: serverTimestamp(),
  });
}

export async function excluirTipoAdmin(id: string): Promise<void> {
  await deleteDoc(doc(requireDb(), COLECOES_CATALOGO.TIPOS, id));
}
