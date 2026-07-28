/**
 * Specs visuais da personalização — resolução dinâmica.
 *
 * Padrão molde H5 RockB2B (todos os modelos):
 * 1. `cameraFrameUrl` = PNG da câmera extraído do frame H5
 * 2. Foto é furada com esse PNG (`destination-out`) — não cobre o módulo
 * 3. O mesmo PNG é desenhado por cima como overlay
 * 4. `bodyMaskUrl` = silhueta externa (botões + cantos) do mesmo molde
 * Fallback sem H5: SVG (`cameraPresetId` / cameraModules).
 */
import type { CaseFrameSpec } from "@/features/personalizacao/caseFrame";
import { getCaseFrameSpec } from "@/features/personalizacao/caseFrame";
import type { CameraModuleSpec } from "@/features/personalizacao/cameraModules";
import {
  getCameraPresetSpec,
  getCameraSpec,
  getCorAparelho,
} from "@/features/personalizacao/cameraModules";
import {
  resolveRockBodyMaskUrl,
  resolveRockBodyRimUrl,
  resolveRockCameraFrameUrl,
  resolveRockCaseRadius,
  resolveRockMolduraAspect,
} from "@/features/personalizacao/rockCameraAssets";

/** Overrides opcionais gravados no Firestore (modelo ou produto). */
export type PersonalizacaoVisualFirestore = {
  caseFrame?: CaseFrameSpec;
  camera?: CameraModuleSpec;
  cameraPresetId?: string;
  corAparelho?: string;
  /** Câmera extraída do molde H5 RockB2B. */
  cameraFrameUrl?: string;
  bodyMaskUrl?: string;
  bodyRimUrl?: string;
  molduraAspect?: number;
};

/** Specs já resolvidas para render/export. */
export type ResolvedPersonalizacaoVisual = {
  caseFrame: CaseFrameSpec;
  camera: CameraModuleSpec;
  corAparelho: string;
  larguraPx: number;
  alturaPx: number;
  maskUrl?: string;
  /** Overlay da câmera H5 (prioridade sobre SVG). */
  cameraFrameUrl?: string;
  /** Silhueta externa H5 (botões + cantos). */
  bodyMaskUrl?: string;
  /** Filete da borda no contorno H5. */
  bodyRimUrl?: string;
  /** Proporção W/H do contorno externo Rock. */
  molduraAspect?: number;
};

export function resolverVisualPersonalizacao(
  modeloId: string,
  overrides?: {
    modelo?: PersonalizacaoVisualFirestore | null;
    produto?: PersonalizacaoVisualFirestore | null;
    assets?: {
      larguraPx?: number;
      alturaPx?: number;
      maskUrl?: string;
      nome?: string;
    } | null;
  },
): ResolvedPersonalizacaoVisual {
  const nome = overrides?.assets?.nome;
  const rockRadius = resolveRockCaseRadius(modeloId, nome);
  const baseFrame =
    overrides?.produto?.caseFrame ??
    overrides?.modelo?.caseFrame ??
    getCaseFrameSpec(modeloId);
  const caseFrame: CaseFrameSpec =
    rockRadius != null ? { ...baseFrame, radius: rockRadius } : baseFrame;

  const cameraFrameUrl =
    resolveRockCameraFrameUrl(modeloId, nome) ||
    overrides?.produto?.cameraFrameUrl?.trim() ||
    overrides?.modelo?.cameraFrameUrl?.trim() ||
    undefined;

  const bodyMaskUrl =
    resolveRockBodyMaskUrl(modeloId, nome) ||
    overrides?.produto?.bodyMaskUrl?.trim() ||
    overrides?.modelo?.bodyMaskUrl?.trim() ||
    undefined;

  const bodyRimUrl =
    resolveRockBodyRimUrl(modeloId, nome) ||
    (bodyMaskUrl
      ? bodyMaskUrl.replace("-body-mask.png", "-body-rim.png")
      : undefined);

  const molduraAspect =
    resolveRockMolduraAspect(modeloId, nome) ||
    overrides?.produto?.molduraAspect ||
    overrides?.modelo?.molduraAspect ||
    undefined;

  const presetId =
    overrides?.produto?.cameraPresetId ??
    overrides?.modelo?.cameraPresetId ??
    null;
  const presetSpec =
    presetId && presetId !== "sem-camera"
      ? getCameraPresetSpec(presetId)
      : null;

  // Com frame H5, SVG vazio (evita câmera fantasma).
  const camera = cameraFrameUrl
    ? (getCameraPresetSpec("sem-camera") ?? getCameraSpec(modeloId))
    : (overrides?.produto?.camera ??
      overrides?.modelo?.camera ??
      presetSpec ??
      getCameraSpec(modeloId));

  const corAparelho =
    overrides?.produto?.corAparelho ??
    overrides?.modelo?.corAparelho ??
    getCorAparelho(modeloId);

  const larguraPx =
    overrides?.assets?.larguraPx && overrides.assets.larguraPx > 0
      ? overrides.assets.larguraPx
      : 1568;
  const alturaPx =
    overrides?.assets?.alturaPx && overrides.assets.alturaPx > 0
      ? overrides.assets.alturaPx
      : 3207;

  return {
    caseFrame,
    camera,
    corAparelho,
    larguraPx,
    alturaPx,
    maskUrl: bodyMaskUrl || overrides?.assets?.maskUrl || undefined,
    cameraFrameUrl,
    bodyMaskUrl,
    bodyRimUrl,
    molduraAspect,
  };
}

export function parsePersonalizacaoVisualJson(
  raw: unknown,
): PersonalizacaoVisualFirestore | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as PersonalizacaoVisualFirestore;
}
