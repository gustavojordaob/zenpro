import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage, isFirebaseConfigured } from "@/lib/firebase";

/** Variante da arte — sufixo do arquivo em Storage. */
export type VarianteArte = "combinada" | "foto" | "texto";

export async function subirArteProducao(
  userId: string,
  personalizacaoId: string,
  blob: Blob,
  variante: VarianteArte = "combinada",
): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }

  const storage = getFirebaseStorage();
  const sufixo = variante === "combinada" ? "" : `-${variante}`;
  const path = `artes-producao/${userId}/${personalizacaoId}${sufixo}.png`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, blob, {
    contentType: "image/png",
    customMetadata: {
      tipo: "arte-capinha",
      personalizacaoId,
      variante,
    },
  });

  return getDownloadURL(storageRef);
}
