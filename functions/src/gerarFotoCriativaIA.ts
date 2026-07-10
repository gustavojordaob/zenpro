import { defineSecret } from "firebase-functions/params";
import { onCall, HttpsError } from "firebase-functions/v2/https";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

const MODELO_IMAGEM = "gemini-2.5-flash-image";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_IMAGEM}:generateContent`;

type ImagemEntrada = {
  base64: string;
  mimeType: string;
};

type Payload = {
  imagens?: ImagemEntrada[];
  prompt?: string;
};

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
  error?: { message?: string; status?: string };
};

const PROMPT_PADRAO =
  "Combine as pessoas e elementos destas fotos de referência em UMA única foto fotorrealista, " +
  "como se estivessem juntos no mesmo lugar tirando uma foto. Mantenha rostos reconhecíveis, " +
  "iluminação natural e coerente. Sem colagem visível, sem bordas brancas, sem grade.";

/** Regras de enquadramento — só no servidor; o usuário não vê isto. */
const INSTRUCOES_ENQUADRAMENTO =
  "Instruções técnicas obrigatórias (não mencione ao usuário): " +
  "Gere APENAS uma fotografia fotorrealista — NÃO desenhe celular, case, moldura, " +
  "tela de aparelho, visor de câmera, UI de Stories/Reels, bordas de tela nem mockup. " +
  "Proporção EXATA 9:16 vertical (1080×1920, formato Instagram Stories). " +
  "Todas as pessoas com rosto, cabeça, ombros e corpo visíveis — ninguém cortado nas bordas. " +
  "Margem de segurança de ~8% em todos os lados; sujeitos centralizados e bem proporcionados. " +
  "Conteúdo = foto pura para impressão na traseira de uma case — sem objetos eletrônicos na cena.";

function extrairImagemResposta(
  response: GeminiResponse,
): { base64: string; mimeType: string } | null {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    if (inline?.data) {
      return {
        base64: inline.data,
        mimeType:
          ("mimeType" in inline && inline.mimeType) ||
          ("mime_type" in inline && inline.mime_type) ||
          "image/png",
      };
    }
  }
  return null;
}

export const gerarFotoCriativaIA = onCall(
  {
    secrets: [geminiApiKey],
    timeoutSeconds: 120,
    memory: "512MiB",
    cors: true,
    region: "us-central1",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Faça login para usar a criação com IA.");
    }

    const { imagens, prompt } = (request.data ?? {}) as Payload;

    if (!Array.isArray(imagens) || imagens.length < 2 || imagens.length > 4) {
      throw new HttpsError(
        "invalid-argument",
        "Envie entre 2 e 4 fotos de referência.",
      );
    }

    for (const img of imagens) {
      if (!img?.base64 || !img?.mimeType) {
        throw new HttpsError("invalid-argument", "Imagem inválida.");
      }
    }

    const apiKey = geminiApiKey.value()?.trim();
    if (!apiKey) {
      throw new HttpsError(
        "failed-precondition",
        "IA não configurada. Defina GEMINI_API_KEY nas Cloud Functions.",
      );
    }

    const textoUsuario = prompt?.trim() || PROMPT_PADRAO;

    const parts = [
      { text: textoUsuario },
      ...imagens.map((img) => ({
        inline_data: {
          mime_type: img.mimeType,
          data: img.base64,
        },
      })),
      { text: INSTRUCOES_ENQUADRAMENTO },
    ];

    try {
      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      });

      const response = (await res.json()) as GeminiResponse;

      if (!res.ok) {
        const raw = response.error?.message ?? "";
        const msg = raw.includes("OAuth") || raw.includes("authentication")
          ? "Chave Gemini inválida ou do projeto errado. No AI Studio, use a chave do projeto Zenpro (não Lash/MEU PROJETO), copie a chave completa e atualize GEMINI_API_KEY."
          : raw || `Gemini API ${res.status}: falha ao gerar imagem.`;
        throw new HttpsError("internal", msg);
      }

      const imagem = extrairImagemResposta(response);
      if (!imagem) {
        const texto = response.candidates?.[0]?.content?.parts
          ?.map((p) => p.text)
          .filter(Boolean)
          .join(" ");
        throw new HttpsError(
          "internal",
          texto?.trim() ||
            "A IA não retornou imagem. Tente outro prompt ou fotos mais nítidas.",
        );
      }

      return {
        base64: imagem.base64,
        mimeType: imagem.mimeType,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      const msg =
        error instanceof Error ? error.message : "Erro ao gerar imagem com IA.";
      console.error("gerarFotoCriativaIA:", error);
      throw new HttpsError("internal", msg);
    }
  },
);
