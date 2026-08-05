import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import {
  COLECOES,
  type CampanhaFirestore,
} from "@/features/multitenant/types";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

export type CampanhaAdmin = { id: string } & CampanhaFirestore;

export type CampanhaFormInput = {
  slug: string;
  titulo: string;
  descricao: string;
  ativo: boolean;
  ordem: number;
  inicio: string | null;
  fim: string | null;
  produtoIds: string[];
};

function requireDb() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }
  return getFirebaseDb();
}

function mapCampanha(id: string, data: DocumentData): CampanhaAdmin {
  return {
    id,
    slug: String(data.slug ?? id),
    titulo: String(data.titulo ?? ""),
    descricao: String(data.descricao ?? ""),
    ativo: Boolean(data.ativo),
    ordem: Number(data.ordem ?? 0),
    inicio: data.inicio ? String(data.inicio) : null,
    fim: data.fim ? String(data.fim) : null,
    produtoIds: Array.isArray(data.produtoIds)
      ? data.produtoIds.filter((x): x is string => typeof x === "string")
      : [],
    criadoEm: data.criadoEm,
    atualizadoEm: data.atualizadoEm,
  };
}

export function slugifyCampanha(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function payloadFromInput(input: CampanhaFormInput) {
  const slug = (input.slug.trim() || slugifyCampanha(input.titulo)).replace(
    /^-+|-+$/g,
    "",
  );
  if (!slug) throw new Error("Informe um slug ou título para a campanha.");
  return {
    slug,
    titulo: input.titulo.trim(),
    descricao: input.descricao.trim(),
    ativo: Boolean(input.ativo),
    ordem: Math.max(0, Math.round(Number(input.ordem) || 0)),
    inicio: input.inicio?.trim() || null,
    fim: input.fim?.trim() || null,
    produtoIds: [...new Set(input.produtoIds.filter(Boolean))],
  };
}

export async function listarCampanhasAdmin(): Promise<CampanhaAdmin[]> {
  const snap = await getDocs(collection(requireDb(), COLECOES.CAMPANHAS));
  return snap.docs
    .map((d) => mapCampanha(d.id, d.data()))
    .sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, "pt-BR"));
}

export async function obterCampanhaAdmin(
  id: string,
): Promise<CampanhaAdmin | null> {
  const snap = await getDoc(doc(requireDb(), COLECOES.CAMPANHAS, id));
  if (!snap.exists()) return null;
  return mapCampanha(snap.id, snap.data());
}

export async function criarCampanhaAdmin(
  input: CampanhaFormInput,
): Promise<string> {
  const db = requireDb();
  const payload = payloadFromInput(input);
  const existente = await getDocs(
    query(
      collection(db, COLECOES.CAMPANHAS),
      where("slug", "==", payload.slug),
    ),
  );
  if (!existente.empty) {
    throw new Error(`Já existe campanha com o slug "${payload.slug}".`);
  }
  const ref = doc(collection(db, COLECOES.CAMPANHAS));
  await setDoc(ref, {
    ...payload,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
  return ref.id;
}

export async function atualizarCampanhaAdmin(
  id: string,
  input: CampanhaFormInput,
): Promise<void> {
  const db = requireDb();
  const payload = payloadFromInput(input);
  const existente = await getDocs(
    query(
      collection(db, COLECOES.CAMPANHAS),
      where("slug", "==", payload.slug),
    ),
  );
  const conflito = existente.docs.find((d) => d.id !== id);
  if (conflito) {
    throw new Error(`Já existe campanha com o slug "${payload.slug}".`);
  }
  await updateDoc(doc(db, COLECOES.CAMPANHAS, id), {
    ...payload,
    atualizadoEm: serverTimestamp(),
  });
}

export async function excluirCampanhaAdmin(id: string): Promise<void> {
  await deleteDoc(doc(requireDb(), COLECOES.CAMPANHAS, id));
}

export async function alternarAtivoCampanhaAdmin(
  id: string,
  ativo: boolean,
): Promise<void> {
  await updateDoc(doc(requireDb(), COLECOES.CAMPANHAS, id), {
    ativo,
    atualizadoEm: serverTimestamp(),
  });
}
