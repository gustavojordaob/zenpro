import imageCompression from "browser-image-compression";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";

export async function subirFoto(file: File): Promise<string> {
  const comprimida = await imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 2000,
    useWebWorker: true,
  });

  const storage = getFirebaseStorage();
  const path = `personalizacoes/${crypto.randomUUID()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, comprimida);
  return getDownloadURL(storageRef);
}
