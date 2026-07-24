"use client";

import { useEffect, useState } from "react";

export type CameraMockDepth = {
  /** Silhueta preta borrada — sombra de contato sob a ilha. */
  contactShadow: HTMLCanvasElement;
  /** Corpo do aparelho (alpha da câmera) — veda o buraco do punch. */
  bodyFill: HTMLCanvasElement;
};

function parseHex(cor: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(cor.trim());
  if (!m) return { r: 43, g: 43, b: 46 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function tintAlpha(
  src: HTMLImageElement,
  color: { r: number; g: number; b: number; a: number },
): HTMLCanvasElement {
  const w = src.naturalWidth || src.width;
  const h = src.naturalHeight || src.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < data.data.length; i += 4) {
    const a = data.data[i + 3];
    if (a < 8) {
      data.data[i + 3] = 0;
      continue;
    }
    data.data[i] = color.r;
    data.data[i + 1] = color.g;
    data.data[i + 2] = color.b;
    data.data[i + 3] = Math.round((a / 255) * color.a * 255);
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

function blurCanvas(src: HTMLCanvasElement, blurPx: number): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  ctx.filter = `blur(${blurPx}px)`;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  return out;
}

export function buildCameraMockDepth(
  camera: HTMLImageElement,
  corAparelho: string,
): CameraMockDepth {
  const body = parseHex(corAparelho);
  const silhouette = tintAlpha(camera, { r: 0, g: 0, b: 0, a: 0.55 });
  const blurPx = Math.max(
    4,
    Math.round((camera.naturalWidth || camera.width) * 0.012),
  );
  const contactShadow = blurCanvas(silhouette, blurPx);
  const bodyFill = tintAlpha(camera, { ...body, a: 1 });

  return { contactShadow, bodyFill };
}

/** Overlays de profundidade a partir do alpha do PNG H5. */
export function useCameraMockDepth(
  camera: HTMLImageElement | null,
  corAparelho: string,
): CameraMockDepth | null {
  const [depth, setDepth] = useState<CameraMockDepth | null>(null);

  useEffect(() => {
    if (!camera) {
      setDepth(null);
      return;
    }
    try {
      setDepth(buildCameraMockDepth(camera, corAparelho));
    } catch {
      setDepth(null);
    }
  }, [camera, corAparelho]);

  return depth;
}
