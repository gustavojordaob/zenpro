import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import {
  COLECOES,
  type LojaConfig,
  type LojaFirestore,
} from "@/features/multitenant/types";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

export type LojaPublica = {
  lojaId: string;
  nome: string;
  slug: string;
  ativo: boolean;
  config: LojaConfig;
};

export async function buscarLojaPorSlug(
  slug: string,
): Promise<LojaPublica | null> {
  if (!isFirebaseConfigured()) return null;

  const db = getFirebaseDb();
  const snap = await getDocs(
    query(
      collection(db, COLECOES.LOJAS),
      where("slug", "==", slug),
      limit(1),
    ),
  );

  if (snap.empty) return null;

  const docSnap = snap.docs[0];
  const data = docSnap.data() as LojaFirestore;

  if (!data.ativo) return null;

  return {
    lojaId: docSnap.id,
    nome: data.nome,
    slug: data.slug,
    ativo: data.ativo,
    config: data.config ?? {},
  };
}
