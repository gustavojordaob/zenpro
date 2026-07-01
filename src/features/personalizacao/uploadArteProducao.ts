import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage, isFirebaseConfigured } from "@/lib/firebase";

export async function subirArteProducao(
  userId: string,
  personalizacaoId: string,
  blob: Blob,
): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }

  const storage = getFirebaseStorage();
  const path = `artes-producao/${userId}/${personalizacaoId}.png`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, blob, {
    contentType: "image/png",
    customMetadata: {
      tipo: "arte-capinha",
      personalizacaoId,
    },
  });

  return getDownloadURL(storageRef);
}
