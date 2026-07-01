import { IPHONE_ASSETS } from "./moldura";
import type { CaseLayout } from "./types";

export function getCaseLayout(previewWidth: number = IPHONE_ASSETS.previewWidth): CaseLayout {
  const scale = previewWidth / IPHONE_ASSETS.width;
  const molduraW = previewWidth;
  const molduraH = Math.round(IPHONE_ASSETS.height * scale);
  const pad = Math.max(
    8,
    Math.round(IPHONE_ASSETS.stagePadding * (previewWidth / IPHONE_ASSETS.previewWidth)),
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
