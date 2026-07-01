import type { Transform } from "./types";

type Area = { x: number; y: number; w: number; h: number };

const FALLBACK = "#d4d4d4";

/**
 * Amostra a região superior/central visível da foto na máscara
 * e retorna a cor predominante para preencher o fundo da capinha.
 */
export function extrairCorPredominante(
  image: HTMLImageElement,
  transform: Transform,
  moldura: Area,
): string {
  if (typeof document === "undefined") return FALLBACK;

  const canvas = document.createElement("canvas");
  const stageW = Math.ceil(moldura.x + moldura.w + 20);
  const stageH = Math.ceil(moldura.y + moldura.h + 20);
  canvas.width = stageW;
  canvas.height = stageH;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return FALLBACK;

  ctx.save();
  ctx.translate(transform.x, transform.y);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.scale(transform.scale, transform.scale);
  ctx.drawImage(image, 0, 0);
  ctx.restore();

  const sampleX = Math.floor(moldura.x + moldura.w * 0.2);
  const sampleY = Math.floor(moldura.y + moldura.h * 0.05);
  const sampleW = Math.max(1, Math.floor(moldura.w * 0.6));
  const sampleH = Math.max(1, Math.floor(moldura.h * 0.4));

  let data: ImageData;
  try {
    data = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
  } catch {
    return FALLBACK;
  }

  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();

  for (let i = 0; i < data.data.length; i += 4 * 3) {
    const a = data.data[i + 3];
    if (a < 100) continue;

    const r = data.data[i];
    const g = data.data[i + 1];
    const b = data.data[i + 2];

    const qr = Math.round(r / 24) * 24;
    const qg = Math.round(g / 24) * 24;
    const qb = Math.round(b / 24) * 24;
    const key = `${qr},${qg},${qb}`;

    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.n += 1;
    buckets.set(key, bucket);
  }

  let best: { r: number; g: number; b: number; n: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.n > best.n) best = bucket;
  }

  if (!best || best.n === 0) return FALLBACK;

  const r = Math.round(best.r / best.n);
  const g = Math.round(best.g / best.n);
  const b = Math.round(best.b / best.n);

  return `rgb(${r}, ${g}, ${b})`;
}
