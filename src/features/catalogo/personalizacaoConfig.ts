import type { TextoCapinha } from "@/features/personalizacao/caseTextFonts";
import type { Personalizacao, Transform } from "@/features/personalizacao/types";
import type {
  ConfigPersonalizacaoMascaraModelo,
  TipoPersonalizacao,
} from "./types";

/** Monta config flexível a partir da personalização em memória (capinha). */
export function personalizacaoParaConfig(
  dados: Personalizacao,
): ConfigPersonalizacaoMascaraModelo {
  return {
    modeloId: dados.modeloId,
    transform: dados.transform,
    textos: dados.textos?.length ? dados.textos : null,
    titulo: dados.titulo?.trim() || null,
    descricao: dados.descricao?.trim() || null,
  };
}

/** Lê personalização de documento Firestore (config + campos legados). */
export function personalizacaoDeFirestore(data: Record<string, unknown>): {
  tipoPersonalizacao: TipoPersonalizacao;
  fotoUrl: string;
  personalizacao: Personalizacao;
} {
  const tipoPersonalizacao =
    (data.tipoPersonalizacao as TipoPersonalizacao | undefined) ??
    "mascara_modelo";
  const fotoUrl = String(data.fotoUrl ?? "");
  const config = (data.config as ConfigPersonalizacaoMascaraModelo | undefined) ?? {
    modeloId: String(data.modeloId ?? ""),
    transform: data.transform as Transform,
    textos: (data.textos as TextoCapinha[] | null) ?? null,
    titulo: (data.titulo as string | null) ?? null,
    descricao: (data.descricao as string | null) ?? null,
  };

  return {
    tipoPersonalizacao,
    fotoUrl,
    personalizacao: {
      modeloId: config.modeloId,
      fotoUrl,
      transform: config.transform,
      textos: config.textos ?? undefined,
      titulo: config.titulo ?? undefined,
      descricao: config.descricao ?? undefined,
      arteProducaoUrl: data.arteProducaoUrl
        ? String(data.arteProducaoUrl)
        : undefined,
    },
  };
}
