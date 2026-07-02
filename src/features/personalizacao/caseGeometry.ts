import { IPHONE_ASSETS } from "./moldura";
import type { CaseLayout } from "./types";

export function getCaseLayout(
  previewWidth: number = IPHONE_ASSETS.previewWidth,
  prodWidth: number = IPHONE_ASSETS.width,
  prodHeight: number = IPHONE_ASSETS.height,
  stagePadding?: number,
): CaseLayout {
  const scale = previewWidth / prodWidth;
  const molduraW = previewWidth;
  const molduraH = Math.round(prodHeight * scale);
  const pad = Math.max(
    8,
    Math.round(
      (stagePadding ?? IPHONE_ASSETS.stagePadding) *
        (previewWidth / IPHONE_ASSETS.previewWidth),
    ),
  );
  const stageWidth = molduraW + pad * 2;
  const stageHeight = molduraH + pad * 2;
  const molduraX = (stageWidth - molduraW) / 2;
  const molduraY = (stageHeight - molduraH) / 2;

  return {
    molduraX,
    molduraY,
    molduraW,
    molduraH,
    stageWidth,
    stageHeight,
    areaUtil: { x: molduraX, y: molduraY, w: molduraW, h: molduraH },
  };
}
