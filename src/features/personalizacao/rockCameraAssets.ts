import rockb2bPersonalizacao from "@/features/personalizacao/rockb2bPersonalizacao.json";
import { MODELOS } from "@/features/personalizacao/modelos";
import { getDispositivoPreset } from "@/features/admin/catalogo/dispositivosPresets";

type RockPerso = {
  cameraPresetId?: string;
  corAparelho?: string;
  cameraFrameUrl?: string;
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
  if (!perso.cameraFrameUrl) continue;
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
