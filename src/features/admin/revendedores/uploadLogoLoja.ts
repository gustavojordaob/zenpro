import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { getFirebaseStorage } from "@/lib/firebase";

export async function uploadLogoLoja(
  lojaId: string,
  file: File,
): Promise<string> {
  const comprimida = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 512,
    useWebWorker: true,
  });

  const ext = comprimida.type === "image/png" ? "png" : "jpg";
  const storage = getFirebaseStorage();
  const path = `lojas/${lojaId}/logo.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, comprimida, {
    contentType: comprimida.type,
  });
  return getDownloadURL(storageRef);
}
