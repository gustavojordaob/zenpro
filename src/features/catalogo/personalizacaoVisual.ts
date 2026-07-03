/**
 * Specs visuais da personalização — resolução dinâmica.
 *
 * Hierarquia (maior prioridade primeiro):
 * 1. Produto (`produtos/{id}.visualPersonalizacao`) — variante (couro, plástico…)
 * 2. Modelo de celular (`modelos/{id}.personalizacao`) — geometria do aparelho
 * 3. Código (`caseFrame.ts` / `cameraModules.ts` SPECS) — fallback
 *
 * Adicionar celular: admin → Modelos (dimensões + opcional cor/spec).
 * Adicionar variante: admin → Produto personalizável + modelos compatíveis + preço + material.
 */
import type { CaseFrameSpec } from "@/features/personalizacao/caseFrame";
import { getCaseFrameSpec } from "@/features/personalizacao/caseFrame";
import type { CameraModuleSpec } from "@/features/personalizacao/cameraModules";
import {
  getCameraPresetSpec,
  getCameraSpec,
  getCorAparelho,
} from "@/features/personalizacao/cameraModules";

/** Overrides opcionais gravados no Firestore (modelo ou produto). */
export type PersonalizacaoVisualFirestore = {
  caseFrame?: CaseFrameSpec;
  /** Spec completa da câmera (avançado). */
  camera?: CameraModuleSpec;
  /** Preset de câmera escolhido no admin (ex.: "iphone-pro"). */
  cameraPresetId?: string;
  corAparelho?: string;
};

/** Specs já resolvidas para render/export. */
export type ResolvedPersonalizacaoVisual = {
  caseFrame: CaseFrameSpec;
  camera: CameraModuleSpec;
  corAparelho: string;
  /** Dimensões físicas do aparelho — definem a proporção (aspecto) da capa. */
  larguraPx: number;
  alturaPx: number;
  /** Molde (PNG/SVG) do modelo — usado no recorte da arte de produção. */
  maskUrl?: string;
};

export function resolverVisualPersonalizacao(
  modeloId: string,
  overrides?: {
    modelo?: PersonalizacaoVisualFirestore | null;
    produto?: PersonalizacaoVisualFirestore | null;
    /** Geometria/molde do aparelho (modelos/{id}). */
    assets?: {
      larguraPx?: number;
      alturaPx?: number;
      maskUrl?: string;
    } | null;
  },
): ResolvedPersonalizacaoVisual {
  const caseFrame =
    overrides?.produto?.caseFrame ??
    overrides?.modelo?.caseFrame ??
    getCaseFrameSpec(modeloId);

  const camera =
    overrides?.produto?.camera ??
    overrides?.modelo?.camera ??
    getCameraPresetSpec(overrides?.produto?.cameraPresetId) ??
    getCameraPresetSpec(overrides?.modelo?.cameraPresetId) ??
    getCameraSpec(modeloId);

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
    maskUrl: overrides?.assets?.maskUrl || undefined,
  };
}

/** Parse seguro de JSON vindo do admin (campo opcional). */
export function parsePersonalizacaoVisualJson(
  raw: unknown,
): PersonalizacaoVisualFirestore | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as PersonalizacaoVisualFirestore;
}
