import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import type { Personalizacao } from "@/features/personalizacao/types";
import { exportCaseArtBlob } from "@/features/personalizacao/exportCaseArt";
import { subirArteProducao } from "@/features/personalizacao/uploadArteProducao";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import type { PersonalizacaoFirestore } from "./firestoreTypes";

export async function salvarPersonalizacao(
  dados: Personalizacao,
  userId: string,
): Promise<{ id: string; arteProducaoUrl: string | null }> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }

  const db = getFirebaseDb();

  const payload: Omit<PersonalizacaoFirestore, "criadoEm" | "arteProducaoUrl"> & {
    criadoEm: ReturnType<typeof serverTimestamp>;
    arteProducaoUrl: string | null;
  } = {
    userId,
    fotoUrl: dados.fotoUrl,
    modeloId: dados.modeloId,
    transform: dados.transform,
    textos: dados.textos?.length ? dados.textos : null,
    titulo: dados.titulo?.trim() || null,
    descricao: dados.descricao?.trim() || null,
    arteProducaoUrl: null,
    criadoEm: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "personalizacoes"), payload);

  try {
    const blob = await exportCaseArtBlob(
      dados.fotoUrl,
      dados.transform,
      dados.textos ?? [],
    );
    const arteProducaoUrl = await subirArteProducao(userId, ref.id, blob);
    await updateDoc(ref, { arteProducaoUrl });
    return { id: ref.id, arteProducaoUrl };
  } catch (error) {
    console.error("Falha ao gerar arte de produção:", error);
    return { id: ref.id, arteProducaoUrl: null };
  }
}
