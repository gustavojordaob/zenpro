import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { onCall, HttpsError } from "firebase-functions/v2/https";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

const MODELO_IMAGEM = "gemini-2.5-flash-image";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_IMAGEM}:generateContent`;

/** Clientes finais: no máximo N montagens IA por dia (revendedor/marca sem limite). */
const LIMITE_MONTAGENS_IA_CLIENTE_DIA = 3;

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
  "PROIBIDO: módulo de câmera, bump/ilha de câmera, lentes, flash, anéis de câmera ou " +
  "qualquer elemento de aparelho sobreposto ou embutido na foto — a câmera da case " +
  "será aplicada depois pelo app; a arte deve ser só a fotografia limpa. " +
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

/** YYYY-MM-DD no fuso de São Paulo. */
function diaBrasil(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function usuarioIsentoLimiteIA(uid: string): Promise<boolean> {
  const snap = await admin.firestore().doc(`usuarios/${uid}`).get();
  const papel = String(snap.data()?.papel ?? "");
  return papel === "revendedor" || papel === "marca";
}

/**
 * Incrementa o contador diário. Clientes finais: máx. LIMITE_MONTAGENS_IA_CLIENTE_DIA.
 * Revendedor/marca: só registra uso (sem teto).
 */
async function consumirCotaMontagemIA(uid: string): Promise<void> {
  const isento = await usuarioIsentoLimiteIA(uid);
  const dia = diaBrasil();
  const ref = admin.firestore().doc(`usuarios/${uid}/uso_ia/${dia}`);

  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const atual = Number(snap.data()?.montagens ?? 0) || 0;
    if (!isento && atual >= LIMITE_MONTAGENS_IA_CLIENTE_DIA) {
      throw new HttpsError(
        "resource-exhausted",
        `Limite de ${LIMITE_MONTAGENS_IA_CLIENTE_DIA} montagens com IA por dia. Volte amanhã ou torne-se revendedor para uso ilimitado.`,
      );
    }
    tx.set(
      ref,
      {
        montagens: atual + 1,
        dia,
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
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

    await consumirCotaMontagemIA(request.auth.uid);

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
