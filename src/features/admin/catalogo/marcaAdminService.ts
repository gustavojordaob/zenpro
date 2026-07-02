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
import { COLECOES_CATALOGO, type MarcaFirestore } from "@/features/catalogo/types";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

export type MarcaCatalogoAdmin = { id: string } & MarcaFirestore;

export type MarcaFormInput = {
  nome: string;
  ativo: boolean;
};

function requireDb() {
  if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
  return getFirebaseDb();
}

function mapMarca(id: string, data: DocumentData): MarcaCatalogoAdmin {
  return {
    id,
    nome: String(data.nome ?? ""),
    ativo: Boolean(data.ativo),
    criadoEm: data.criadoEm,
    atualizadoEm: data.atualizadoEm,
  };
}

export function gerarIdMarca(nome: string): string {
  const base = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || `marca-${Date.now().toString(36)}`;
}

export async function listarMarcasAdmin(): Promise<MarcaCatalogoAdmin[]> {
  const snap = await getDocs(collection(requireDb(), COLECOES_CATALOGO.MARCAS));
  return snap.docs
    .map((d) => mapMarca(d.id, d.data()))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function obterMarcaAdmin(
  id: string,
): Promise<MarcaCatalogoAdmin | null> {
  const snap = await getDoc(doc(requireDb(), COLECOES_CATALOGO.MARCAS, id));
  if (!snap.exists()) return null;
  return mapMarca(snap.id, snap.data());
}

export async function criarMarcaAdmin(input: MarcaFormInput): Promise<string> {
  const id = gerarIdMarca(input.nome);
  await setDoc(doc(requireDb(), COLECOES_CATALOGO.MARCAS, id), {
    nome: input.nome.trim(),
    ativo: input.ativo,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
  return id;
}

export async function atualizarMarcaAdmin(
  id: string,
  input: MarcaFormInput,
): Promise<void> {
  await updateDoc(doc(requireDb(), COLECOES_CATALOGO.MARCAS, id), {
    nome: input.nome.trim(),
    ativo: input.ativo,
    atualizadoEm: serverTimestamp(),
  });
}

export async function alternarAtivoMarcaAdmin(
  id: string,
  ativo: boolean,
): Promise<void> {
  await updateDoc(doc(requireDb(), COLECOES_CATALOGO.MARCAS, id), {
    ativo,
    atualizadoEm: serverTimestamp(),
  });
}
