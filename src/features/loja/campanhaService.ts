import {
  collection,
  getDocs,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import {
  COLECOES,
  type CampanhaFirestore,
} from "@/features/multitenant/types";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

export type Campanha = { id: string } & CampanhaFirestore;

function mapCampanha(id: string, data: DocumentData): Campanha {
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

function hojeIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Campanha ativa e dentro da janela de datas (se houver). */
export function campanhaEstaVigente(
  c: Pick<Campanha, "ativo" | "inicio" | "fim">,
  hoje = hojeIsoLocal(),
): boolean {
  if (!c.ativo) return false;
  if (c.inicio && hoje < c.inicio) return false;
  if (c.fim && hoje > c.fim) return false;
  return true;
}

export async function listarCampanhasAtivas(): Promise<Campanha[]> {
  if (!isFirebaseConfigured()) return [];
  const snap = await getDocs(
    query(
      collection(getFirebaseDb(), COLECOES.CAMPANHAS),
      where("ativo", "==", true),
    ),
  );
  return snap.docs
    .map((d) => mapCampanha(d.id, d.data()))
    .filter((c) => campanhaEstaVigente(c))
    .sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, "pt-BR"));
}

export async function obterCampanhaPorSlug(
  slug: string,
): Promise<Campanha | null> {
  if (!isFirebaseConfigured() || !slug.trim()) return null;
  const snap = await getDocs(
    query(
      collection(getFirebaseDb(), COLECOES.CAMPANHAS),
      where("slug", "==", slug.trim()),
    ),
  );
  if (snap.empty) return null;
  const c = mapCampanha(snap.docs[0].id, snap.docs[0].data());
  if (!campanhaEstaVigente(c)) return null;
  return c;
}
