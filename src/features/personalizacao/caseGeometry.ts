import { ART_CANVAS, MOLDURA_VISUAL } from "./caseVisualConstants";
import type { CaseLayout } from "./types";

/**
 * Layout do editor/exportação.
 *
 * - Canvas de arte SEMPRE 9:16 (1080×1920 em produção).
 * - Moldura visual com proporção fixa (MOLDURA_VISUAL) — igual em todos os modelos.
 * - O mock da câmera varia conforme o modelo do celular.
 * - A foto do cliente usa o canvas inteiro; pode ultrapassar a moldura no editor.
 */
export function getCaseLayout(
  previewWidth: number = ART_CANVAS.previewWidth,
  artWidth: number = ART_CANVAS.width,
  artHeight: number = ART_CANVAS.height,
  stagePadding?: number,
): CaseLayout {
  const scale = previewWidth / artWidth;
  const canvasW = previewWidth;
  const canvasH = Math.round(artHeight * scale);

  const phoneAspect = MOLDURA_VISUAL.aspect;

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
