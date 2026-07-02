import { getBlob, ref } from "firebase/storage";
import { getFirebaseStorage, isFirebaseConfigured } from "@/lib/firebase";

function loadHtmlImage(src: string, crossOrigin = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}

async function imageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await loadHtmlImage(objectUrl, false);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function firebaseStoragePathFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("firebasestorage.googleapis.com")) return null;
    const match = u.pathname.match(/\/o\/(.+)$/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/** Carrega imagem sem contaminar o canvas (toDataURL / export Konva). */
export async function loadImageForCanvasExport(src: string): Promise<HTMLImageElement> {
  const storagePath = firebaseStoragePathFromUrl(src);
  if (storagePath && isFirebaseConfigured()) {
    try {
      const blob = await getBlob(ref(getFirebaseStorage(), storagePath));
      return imageFromBlob(blob);
    } catch (error) {
      console.warn("getBlob Firebase falhou, tentando fetch:", error);
    }
  }

  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return imageFromBlob(await res.blob());
  } catch {
    return loadHtmlImage(src, true);
  }
}
