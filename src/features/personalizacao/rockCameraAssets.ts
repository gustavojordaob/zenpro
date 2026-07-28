import rockb2bPersonalizacao from "@/features/personalizacao/rockb2bPersonalizacao.json";
import { MODELOS } from "@/features/personalizacao/modelos";
import { getDispositivoPreset } from "@/features/admin/catalogo/dispositivosPresets";

type RockPerso = {
  cameraPresetId?: string;
  corAparelho?: string;
  cameraFrameUrl?: string;
  /** Silhueta externa do molde H5 (botões + cantos). */
  bodyMaskUrl?: string;
  /** Filete da borda no mesmo contorno H5. */
  bodyRimUrl?: string;
  /** Largura/altura do contorno externo. */
  molduraAspect?: number;
  /** Raio do canto (fração da largura). */
  caseRadius?: number;
};

const ROCK = rockb2bPersonalizacao as Record<string, RockPerso>;

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const NOME_PARA_ID: Record<string, string> = {};
for (const m of MODELOS) {
  NOME_PARA_ID[normalizar(m.modelo)] = m.id;
  NOME_PARA_ID[normalizar(m.id.replace(/-/g, " "))] = m.id;
}
for (const [id, perso] of Object.entries(ROCK)) {
  if (!perso.cameraFrameUrl && !perso.bodyMaskUrl) continue;
  NOME_PARA_ID[normalizar(id.replace(/-/g, " "))] = id;
  const preset = getDispositivoPreset(id);
  if (preset?.rotulo) NOME_PARA_ID[normalizar(preset.rotulo)] = id;
}

/** URL do PNG de câmera extraído do molde H5 RockB2B. */
export function resolveRockCameraFrameUrl(
  modeloId: string,
  modeloNome?: string | null,
): string | undefined {
  const byId = ROCK[modeloId]?.cameraFrameUrl?.trim();
  if (byId) return byId;

  const preset = getDispositivoPreset(modeloId);
  if (preset) {
    const fromPreset = ROCK[preset.id]?.cameraFrameUrl?.trim();
    if (fromPreset) return fromPreset;
  }

  if (modeloNome) {
    const hit = NOME_PARA_ID[normalizar(modeloNome)];
    if (hit && ROCK[hit]?.cameraFrameUrl) {
      return ROCK[hit].cameraFrameUrl!.trim();
    }
  }

  const fromIdAsName = NOME_PARA_ID[normalizar(modeloId.replace(/-/g, " "))];
  if (fromIdAsName && ROCK[fromIdAsName]?.cameraFrameUrl) {
    return ROCK[fromIdAsName].cameraFrameUrl!.trim();
  }

  return undefined;
}

export function getRockPersonalizacao(modeloId: string): RockPerso | undefined {
  return ROCK[modeloId];
}

function resolveRockId(
  modeloId: string,
  modeloNome?: string | null,
): string | undefined {
  if (ROCK[modeloId]) return modeloId;
  const preset = getDispositivoPreset(modeloId);
  if (preset && ROCK[preset.id]) return preset.id;
  if (modeloNome) {
    const hit = NOME_PARA_ID[normalizar(modeloNome)];
    if (hit && ROCK[hit]) return hit;
  }
  const fromIdAsName = NOME_PARA_ID[normalizar(modeloId.replace(/-/g, " "))];
  if (fromIdAsName && ROCK[fromIdAsName]) return fromIdAsName;
  return undefined;
}

/** Máscara da silhueta da capa (contorno H5 RockB2B). */
export function resolveRockBodyMaskUrl(
  modeloId: string,
  modeloNome?: string | null,
): string | undefined {
  const id = resolveRockId(modeloId, modeloNome);
  return id ? ROCK[id]?.bodyMaskUrl?.trim() || undefined : undefined;
}

/** Filete/borda da capa no contorno H5 (pares com bodyMaskUrl). */
export function resolveRockBodyRimUrl(
  modeloId: string,
  modeloNome?: string | null,
): string | undefined {
  const id = resolveRockId(modeloId, modeloNome);
  if (!id) return undefined;
  const rim = ROCK[id]?.bodyRimUrl?.trim();
  if (rim) return rim;
  const mask = ROCK[id]?.bodyMaskUrl?.trim();
  if (!mask) return undefined;
  return mask.replace("-body-mask.png", "-body-rim.png");
}

export function resolveRockMolduraAspect(
  modeloId: string,
  modeloNome?: string | null,
): number | undefined {
  const id = resolveRockId(modeloId, modeloNome);
  const a = id ? ROCK[id]?.molduraAspect : undefined;
  return typeof a === "number" && a > 0.2 && a < 1 ? a : undefined;
}

export function resolveRockCaseRadius(
  modeloId: string,
  modeloNome?: string | null,
): number | undefined {
  const id = resolveRockId(modeloId, modeloNome);
  const r = id ? ROCK[id]?.caseRadius : undefined;
  return typeof r === "number" && r > 0.04 && r < 0.25 ? r : undefined;
}
