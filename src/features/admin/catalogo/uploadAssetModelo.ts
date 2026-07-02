import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";

export async function subirAssetModelo(
  modeloId: string,
  file: File,
  tipo: "mask" | "overlay",
): Promise<string> {
  const ext = file.type === "image/png" ? "png" : file.name.endsWith(".svg") ? "svg" : "jpg";
  const storage = getFirebaseStorage();
  const path = `modelos/${modeloId}/${tipo}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, {
    contentType: file.type || "image/png",
  });
  return getDownloadURL(storageRef);
}
