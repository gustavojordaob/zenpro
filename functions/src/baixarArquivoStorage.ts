import { onCall, HttpsError } from "firebase-functions/v2/https";

const BUCKET_MARKERS = [
  "zenpro-capinhas.firebasestorage.app",
  "zenpro-capinhas.appspot.com",
];

const MAX_BYTES = 8 * 1024 * 1024;

type Payload = {
  url?: string;
  nomeBase?: string;
};

/**
 * Proxy de download: o browser não consegue forçar "Save As" em URL do
 * Storage (CORS / Content-Disposition). A function busca o arquivo e
 * devolve base64 para o cliente montar o Blob e baixar de verdade.
 */
export const baixarArquivoStorage = onCall(
  {
    region: "us-central1",
    cors: true,
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Faça login para baixar.");
    }

    const { url, nomeBase } = (request.data ?? {}) as Payload;
    const arquivoUrl = String(url ?? "").trim();
    if (!arquivoUrl) {
      throw new HttpsError("invalid-argument", "URL do arquivo é obrigatória.");
    }

    let parsed: URL;
    try {
      parsed = new URL(arquivoUrl);
    } catch {
      throw new HttpsError("invalid-argument", "URL inválida.");
    }

    const hostOk =
      parsed.hostname === "firebasestorage.googleapis.com" ||
      parsed.hostname === "storage.googleapis.com";
    const bucketOk = BUCKET_MARKERS.some((m) => arquivoUrl.includes(m));
    if (!hostOk || !bucketOk) {
      throw new HttpsError(
        "invalid-argument",
        "Só é permitido baixar arquivos do Storage Zen Pro.",
      );
    }

    const upstream = await fetch(arquivoUrl);
    if (!upstream.ok) {
      throw new HttpsError(
        "not-found",
        `Arquivo não encontrado (${upstream.status}).`,
      );
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      throw new HttpsError(
        "resource-exhausted",
        "Arquivo grande demais para download por aqui.",
      );
    }

    return {
      base64: buf.toString("base64"),
      contentType:
        upstream.headers.get("content-type") || "application/octet-stream",
      nomeBase: String(nomeBase ?? "arquivo").slice(0, 80),
      bytes: buf.length,
    };
  },
);
