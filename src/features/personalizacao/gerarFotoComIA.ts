import { httpsCallable } from "firebase/functions";
import type { FirebaseError } from "firebase/app";
import { getFirebaseFunctions } from "@/lib/firebase";
import { normalizarArteCase916 } from "@/features/personalizacao/expandirFotoPara916";

const MAX_EDGE = 1024;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao ler imagem"));
    };
    img.src = url;
  });
}

/** Reduz foto antes de enviar à Cloud Function (limite de payload). */
async function fileToBase64Reduzido(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  const img = await loadImageFromFile(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao processar imagem"))),
      "image/jpeg",
      0.88,
    );
  });

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result ?? "");
      const idx = data.indexOf(",");
      resolve(idx >= 0 ? data.slice(idx + 1) : data);
    };
    reader.onerror = () => reject(new Error("Falha ao codificar imagem"));
    reader.readAsDataURL(blob);
  });

  return { base64, mimeType: "image/jpeg" };
}

function mensagemErroCallable(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const fe = error as FirebaseError;
    if (fe.code === "functions/unauthenticated") {
      return "Faça login para usar a criação com IA.";
    }
    if (fe.message?.trim()) return fe.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Não foi possível gerar a imagem. Tente novamente.";
}

export async function gerarFotoCriativaComIA(
  arquivos: File[],
  prompt: string,
): Promise<File> {
  if (arquivos.length < 2 || arquivos.length > 4) {
    throw new Error("Selecione entre 2 e 4 fotos.");
  }

  const functions = getFirebaseFunctions();
  const callable = httpsCallable<
    { imagens: { base64: string; mimeType: string }[]; prompt?: string },
    { base64: string; mimeType: string }
  >(functions, "gerarFotoCriativaIA");

  const imagens = await Promise.all(arquivos.map((f) => fileToBase64Reduzido(f)));

  try {
    const { data } = await callable({
      imagens,
      prompt: prompt.trim() || undefined,
    });

    const bin = atob(data.base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const mime = data.mimeType || "image/png";
    const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
    const bruto = new File([bytes], `criativa-ia-${Date.now()}.${ext}`, {
      type: mime,
    });
    return normalizarArteCase916(bruto);
  } catch (error) {
    throw new Error(mensagemErroCallable(error));
  }
}
