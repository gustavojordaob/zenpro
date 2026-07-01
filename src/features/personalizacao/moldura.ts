/** Assets reais iPhone — public/molduras/ (1568×3207 px) */
export const IPHONE_ASSETS = {
  maskUrl: "/molduras/iphone-mask.png",
  overlayUrl: "/molduras/iphone-overlay.png",
  width: 1568,
  height: 3207,
  /** Largura do preview no editor (proporção mantida) */
  previewWidth: 280,
  stagePadding: 40,
} as const;

export const MOLDURA_PROD_W = IPHONE_ASSETS.width;
export const MOLDURA_PROD_H = IPHONE_ASSETS.height;

export function getMolduraPreviewSize() {
  const scale = IPHONE_ASSETS.previewWidth / IPHONE_ASSETS.width;
  return {
    width: IPHONE_ASSETS.previewWidth,
    height: Math.round(IPHONE_ASSETS.height * scale),
    scale,
  };
}

export function getMolduraStageSize() {
  const { width, height } = getMolduraPreviewSize();
  const pad = IPHONE_ASSETS.stagePadding;
  return { width: width + pad * 2, height: height + pad * 2 };
}
