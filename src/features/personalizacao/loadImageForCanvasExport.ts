import { getBlob, ref } from "firebase/storage";
import { getFirebaseStorage, isFirebaseConfigured } from "@/lib/firebase";

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}

async function imageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await loadHtmlImage(objectUrl);
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
    return decodeURIComponent(match[1].split("?")[0] ?? match[1]);
  } catch {
    return null;
  }
}

function isFirebaseStorageUrl(src: string): boolean {
  return (
    src.includes("firebasestorage.googleapis.com") ||
    src.includes(".firebasestorage.app")
  );
}

/** Carrega imagem sem contaminar o canvas (toDataURL / export Konva). */
export async function loadImageForCanvasExport(src: string): Promise<HTMLImageElement> {
  const trimmed = src.trim();
  if (!trimmed) {
    throw new Error("URL de imagem vazia.");
  }

  // data: / blob: — sem rede, sem CORS
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return loadHtmlImage(trimmed);
  }

  const storagePath = firebaseStoragePathFromUrl(trimmed);
  if (storagePath && isFirebaseConfigured()) {
    try {
      const blob = await getBlob(ref(getFirebaseStorage(), storagePath));
      return imageFromBlob(blob);
    } catch (error) {
      console.warn("getBlob Firebase falhou:", error);
    }
  }

  // fetch em URL pública do Storage falha por CORS no browser — não tentar
  if (isFirebaseStorageUrl(trimmed)) {
    throw new Error(
      "Não foi possível carregar a foto do Storage (CORS). Recarregue a página ou reenvie a foto.",
    );
  }

  try {
    const res = await fetch(trimmed);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return imageFromBlob(await res.blob());
  } catch {
    throw new Error("Falha ao carregar imagem para exportação.");
  }
}
