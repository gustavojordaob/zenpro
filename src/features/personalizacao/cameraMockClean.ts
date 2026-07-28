/**
 * Mock estilo H5 RockB2B: a arte passa por baixo da câmera.
 * O PNG do platô claro some; ficam lentes / flash / sensores.
 */

function luminance(r: number, g: number, b: number) {
  return (r + g + b) / 3;
}

function saturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 1) return 0;
  return (max - min) / max;
}

function isLightPlate(r: number, g: number, b: number, a: number) {
  if (a < 10) return false;
  const L = luminance(r, g, b);
  const sat = saturation(r, g, b);
  if (L < 165) return false;
  if (sat >= 0.18) return false;
  if (Math.abs(r - g) > 22 || Math.abs(g - b) > 22) return false;
  return true;
}

/**
 * Remove o platô claro/cinza da ilha (componentes grandes).
 * Flash e aros claros pequenos permanecem.
 */
export function stripCameraIslandPlate(
  src: HTMLImageElement | HTMLCanvasElement,
): HTMLCanvasElement {
  const w =
    "naturalWidth" in src
      ? src.naturalWidth || src.width
      : src.width;
  const h =
    "naturalHeight" in src
      ? src.naturalHeight || src.height
      : src.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const n = w * h;

  let opaque = 0;
  for (let i = 0; i < n; i++) {
    if (d[i * 4 + 3] >= 10) opaque++;
  }
  const minPlate = Math.max(80, Math.floor(opaque * 0.025));

  const seen = new Uint8Array(n);
  const remove = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    if (seen[i]) continue;
    const r = d[i * 4];
    const g = d[i * 4 + 1];
    const b = d[i * 4 + 2];
    const a = d[i * 4 + 3];
    if (!isLightPlate(r, g, b, a)) continue;

    const stack = [i];
    seen[i] = 1;
    const comp: number[] = [];
    while (stack.length) {
      const cur = stack.pop()!;
      comp.push(cur);
      const x = cur % w;
      const y = (cur / w) | 0;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const np = ny * w + nx;
        if (seen[np]) continue;
        const rr = d[np * 4];
        const gg = d[np * 4 + 1];
        const bb = d[np * 4 + 2];
        const aa = d[np * 4 + 3];
        if (!isLightPlate(rr, gg, bb, aa)) continue;
        seen[np] = 1;
        stack.push(np);
      }
    }
    if (comp.length >= minPlate) {
      for (const p of comp) remove[p] = 1;
    }
  }

  for (let i = 0; i < n; i++) {
    if (!remove[i]) continue;
    d[i * 4 + 3] = 0;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Máscara de silhueta com borda dura (evita aureola cinza do studio). */
export function hardenBodyMaskAlpha(
  src: HTMLImageElement | HTMLCanvasElement,
  threshold = 128,
): HTMLCanvasElement {
  const w =
    "naturalWidth" in src
      ? src.naturalWidth || src.width
      : src.width;
  const h =
    "naturalHeight" in src
      ? src.naturalHeight || src.height
      : src.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < threshold) {
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
      d[i + 3] = 0;
    } else {
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
