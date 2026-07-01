import { createLuminanceAlphaMask } from "./maskUtils";

function subtractInset(
  mask: HTMLCanvasElement,
  insetPx: number,
): HTMLCanvasElement {
  const w = mask.width;
  const h = mask.height;
  const result = document.createElement("canvas");
  result.width = w;
  result.height = h;
  const ctx = result.getContext("2d");
  if (!ctx) return result;

  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = "destination-out";
  ctx.save();
  ctx.translate(w / 2, h / 2);
  const sx = Math.max(0, (w - 2 * insetPx) / w);
  const sy = Math.max(0, (h - 2 * insetPx) / h);
  ctx.scale(sx, sy);
  ctx.translate(-w / 2, -h / 2);
  ctx.drawImage(mask, 0, 0);
  ctx.restore();
  return result;
}

function createEdgeRing(
  maskSource: HTMLImageElement,
  innerInsetPx: number,
): HTMLCanvasElement {
  const mask = createLuminanceAlphaMask(maskSource);
  const inner = subtractInset(mask, innerInsetPx);
  const ring = document.createElement("canvas");
  ring.width = mask.width;
  ring.height = mask.height;
  const ctx = ring.getContext("2d");
  if (!ctx) return ring;

  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = "destination-out";
  ctx.drawImage(inner, 0, 0);
  return ring;
}

function tintRing(
  ring: HTMLCanvasElement,
  color: { r: number; g: number; b: number; a: number },
  blurPx = 0,
): HTMLCanvasElement {
  const tinted = document.createElement("canvas");
  tinted.width = ring.width;
  tinted.height = ring.height;
  const ctx = tinted.getContext("2d");
  if (!ctx) return tinted;

  if (blurPx > 0) ctx.filter = `blur(${blurPx}px)`;
  ctx.drawImage(ring, 0, 0);
  ctx.filter = "none";

  const imgData = ctx.getImageData(0, 0, tinted.width, tinted.height);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const alpha = imgData.data[i + 3];
    imgData.data[i] = color.r;
    imgData.data[i + 1] = color.g;
    imgData.data[i + 2] = color.b;
    imgData.data[i + 3] = Math.round((alpha / 255) * color.a * 255);
  }
  ctx.putImageData(imgData, 0, 0);
  return tinted;
}

/** Silhueta preta com alpha da máscara — base do drop shadow. */
export function createShadowSilhouette(
  maskSource: HTMLImageElement,
): HTMLCanvasElement {
  const canvas = createLuminanceAlphaMask(maskSource);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < imgData.data.length; i += 4) {
    imgData.data[i] = 0;
    imgData.data[i + 1] = 0;
    imgData.data[i + 2] = 0;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/** Sombra interna só na borda (inset ~8px), opacidade máx ~15%. */
export function createInnerShadowOverlay(
  maskSource: HTMLImageElement,
): HTMLCanvasElement {
  const ring = createEdgeRing(maskSource, 8);
  return tintRing(ring, { r: 0, g: 0, b: 0, a: 0.15 }, 2);
}

/** Linha fina clara na borda (1–2 px). */
export function createEdgeBorderOverlay(
  maskSource: HTMLImageElement,
): HTMLCanvasElement {
  const ring = createEdgeRing(maskSource, 2);
  return tintRing(ring, { r: 255, g: 255, b: 255, a: 0.35 }, 0);
}
