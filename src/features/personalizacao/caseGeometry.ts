import { ART_CANVAS, MOLDURA_VISUAL } from "./caseVisualConstants";
import type { CaseLayout } from "./types";

export type CaseLayoutOptions = {
  /** Proporção W/H da moldura (ex.: contorno H5 Rock). Default: MOLDURA_VISUAL.aspect */
  molduraAspect?: number;
};

/**
 * Layout do editor/exportação.
 *
 * - Canvas de arte SEMPRE 9:16 (1080×1920 em produção).
 * - Moldura visual: proporção do modelo (H5) quando disponível; senão MOLDURA_VISUAL.
 * - O mock da câmera / silhueta variam conforme o aparelho.
 */
export function getCaseLayout(
  previewWidth: number = ART_CANVAS.previewWidth,
  artWidth: number = ART_CANVAS.width,
  artHeight: number = ART_CANVAS.height,
  stagePadding?: number,
  options?: CaseLayoutOptions,
): CaseLayout {
  const scale = previewWidth / artWidth;
  const canvasW = previewWidth;
  const canvasH = Math.round(artHeight * scale);

  const phoneAspect =
    options?.molduraAspect &&
    options.molduraAspect > 0.2 &&
    options.molduraAspect < 1
      ? options.molduraAspect
      : MOLDURA_VISUAL.aspect;

  const maxPhoneH = canvasH * MOLDURA_VISUAL.maxHeightRatio;
  const maxPhoneW = canvasW * MOLDURA_VISUAL.maxWidthRatio;
  let molduraH = maxPhoneH;
  let molduraW = molduraH * phoneAspect;
  if (molduraW > maxPhoneW) {
    molduraW = maxPhoneW;
    molduraH = molduraW / phoneAspect;
  }

  const pad = Math.max(
    8,
    Math.round(
      (stagePadding ?? ART_CANVAS.stagePadding) *
        (previewWidth / ART_CANVAS.previewWidth),
    ),
  );
  const stageWidth = canvasW + pad * 2;
  const stageHeight = canvasH + pad * 2;
  const canvasX = pad;
  const canvasY = pad;
  const molduraX = canvasX + (canvasW - molduraW) / 2;
  const molduraY = canvasY + (canvasH - molduraH) / 2;

  const areaUtil = { x: canvasX, y: canvasY, w: canvasW, h: canvasH };
  const clipInset = Math.max(2, Math.round(molduraW * 0.012));
  const areaMoldura = {
    x: molduraX + clipInset,
    y: molduraY + clipInset,
    w: molduraW - clipInset * 2,
    h: molduraH - clipInset * 2,
  };

  return {
    molduraX,
    molduraY,
    molduraW,
    molduraH,
    stageWidth,
    stageHeight,
    areaUtil,
    areaMoldura,
  };
}
