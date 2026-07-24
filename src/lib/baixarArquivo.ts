import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/lib/firebase";

/** Dispara download no browser a partir de um Blob. */
export function baixarBlob(blob: Blob, nomeArquivo: string) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = nomeArquivo;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoga depois — alguns browsers precisam do click sincronizar
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);
}

function slugArquivo(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extensaoDeUrlOuTipo(url: string, contentType?: string | null): string {
  const tipo = (contentType ?? "").toLowerCase();
  if (tipo.includes("png")) return "png";
  if (tipo.includes("jpeg") || tipo.includes("jpg")) return "jpg";
  if (tipo.includes("webp")) return "webp";
  if (tipo.includes("pdf")) return "pdf";
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    const m = path.match(/\.([a-z0-9]{2,5})$/i);
    if (m) return m[1].toLowerCase();
  } catch {
    /* ignore */
  }
  return "png";
}

function base64ParaBlob(base64: string, contentType: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: contentType || "application/octet-stream" });
}

type BaixarArquivoResult = {
  base64: string;
  contentType: string;
  nomeBase: string;
};

/**
 * Baixa arquivo do Storage no computador (sem abrir nova aba).
 * Usa Cloud Function proxy — URL direta do Storage não força download no browser.
 */
export async function baixarUrlComoArquivo(
  url: string,
  nomeBase: string,
): Promise<void> {
  const slug = slugArquivo(nomeBase) || "arquivo";
  const callable = httpsCallable<
    { url: string; nomeBase: string },
    BaixarArquivoResult
  >(getFirebaseFunctions(), "baixarArquivoStorage");

  const { data } = await callable({ url, nomeBase: slug });
  const blob = base64ParaBlob(data.base64, data.contentType);
  const ext = extensaoDeUrlOuTipo(url, data.contentType);
  baixarBlob(blob, `${slug}.${ext}`);
}
