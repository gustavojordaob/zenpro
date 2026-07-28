import { httpsCallable } from "firebase/functions";
import { getBlob, ref } from "firebase/storage";
import {
  getFirebaseFunctions,
  getFirebaseStorage,
  isFirebaseConfigured,
} from "@/lib/firebase";

function loadHtmlImage(
  src: string,
  crossOrigin?: "anonymous",
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
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

function base64ParaBlob(base64: string, contentType: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: contentType || "application/octet-stream" });
}

/** Extrai path do Storage a partir da download URL (googleapis ou *.firebasestorage.app). */
export function firebaseStoragePathFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (
      u.hostname === "firebasestorage.googleapis.com" ||
      u.hostname.endsWith(".firebasestorage.app")
    ) {
      const match = u.pathname.match(/\/o\/([^?]+)/);
      if (match?.[1]) return decodeURIComponent(match[1]);
    }
    if (u.hostname === "storage.googleapis.com") {
      const parts = u.pathname.replace(/^\//, "").split("/");
      if (parts.length >= 2) {
        return decodeURIComponent(parts.slice(1).join("/"));
      }
    }
  } catch {
    return null;
  }
  return null;
}

function isFirebaseStorageUrl(src: string): boolean {
  return (
    src.includes("firebasestorage.googleapis.com") ||
    src.includes(".firebasestorage.app") ||
    src.includes("storage.googleapis.com")
  );
}

/** Proxy Cloud Function — último recurso (frio + base64 = bem lento). */
async function loadViaBaixarArquivoStorage(
  url: string,
): Promise<HTMLImageElement> {
  const callable = httpsCallable<
    { url: string; nomeBase: string },
    { base64: string; contentType: string }
  >(getFirebaseFunctions(), "baixarArquivoStorage");
  const { data } = await callable({ url, nomeBase: "export-canvas" });
  if (!data?.base64) {
    throw new Error("Proxy Storage não retornou a imagem.");
  }
  return imageFromBlob(base64ParaBlob(data.base64, data.contentType));
}

/**
 * Carrega imagem para Konva/canvas sem taint.
 * Ordem rápida → lenta: CORS img → getBlob → proxy CF.
 */
export async function loadImageForCanvasExport(
  src: string,
): Promise<HTMLImageElement> {
  const trimmed = src.trim();
  if (!trimmed) {
    throw new Error("URL de imagem vazia.");
  }

  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return loadHtmlImage(trimmed);
  }

  // Molduras H5 / brand no mesmo domínio — instantâneo (cache do browser).
  if (trimmed.startsWith("/") && typeof window !== "undefined") {
    return loadHtmlImage(`${window.location.origin}${trimmed}`, "anonymous");
  }

  // Storage público: CORS já configurado (storage.cors.json) → <img> direto.
  // Evita Cloud Function (cold start + base64) que deixava o download lento.
  if (isFirebaseStorageUrl(trimmed)) {
    try {
      return await loadHtmlImage(trimmed, "anonymous");
    } catch {
      // tenta SDK / proxy abaixo
    }

    const storagePath = firebaseStoragePathFromUrl(trimmed);
    if (storagePath && isFirebaseConfigured()) {
      try {
        const blob = await getBlob(ref(getFirebaseStorage(), storagePath));
        return imageFromBlob(blob);
      } catch (error) {
        console.warn("getBlob Firebase falhou, tentando proxy:", error);
      }
    }

    if (isFirebaseConfigured()) {
      try {
        return await loadViaBaixarArquivoStorage(trimmed);
      } catch (error) {
        console.warn("Proxy baixarArquivoStorage falhou:", error);
        throw new Error(
          "Não foi possível carregar a foto do Storage (CORS). Recarregue a página ou reenvie a foto.",
        );
      }
    }
  }

  try {
    const res = await fetch(trimmed);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return imageFromBlob(await res.blob());
  } catch {
    throw new Error("Falha ao carregar imagem para exportação.");
  }
}
