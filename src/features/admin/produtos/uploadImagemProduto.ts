import imageCompression from "browser-image-compression";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";

export async function subirImagemProduto(
  produtoId: string,
  file: File,
): Promise<string> {
  const comprimida = await imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 2000,
    useWebWorker: true,
  });

  const ext = comprimida.type === "image/png" ? "png" : "jpg";
  const storage = getFirebaseStorage();
  const path = `produtos/${produtoId}/${crypto.randomUUID()}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, comprimida, {
    contentType: comprimida.type || "image/jpeg",
  });
  return getDownloadURL(storageRef);
}
