/**
 * Câmera = molde H5 RockB2B (exato).
 *
 * - Crop pelo contorno vermelho externo
 * - Ilha = 2º contorno vermelho OU bbox do hardware (moldes com 1 path)
 * - Dentro: pixels do H5; fora: transparente
 * - Remove só fill branco/cinza NEUTRO de impressão (iPhone), mantém bege Samsung
 *
 * Uso: node scripts/process-rockb2b-camera-frames.mjs
 */
import fs from "fs";
import sharp from "sharp";

const modelos = JSON.parse(
  fs.readFileSync("tmp-rockb2b/zenpro-modelos.json", "utf8"),
);
const outDir = "public/molduras/rock";
fs.mkdirSync(outDir, { recursive: true });

const CACHE = "v=12";
/** Tom do módulo depois de escurecer o platô claro do molde. */
const PLATE_TARGET_L = 46;
const PLATE_CONTRAST = 1.45;

function isOutline(r, g, b, a) {
  if (a < 10) return false;
  if (r > 150 && g < 120 && b < 160 && r - g > 40 && r > b - 10) return true;
  if (r > 140 && b > 100 && g < 130 && r - g > 30) return true;
  return false;
}

function isBlack(r, g, b, a) {
  if (a < 10) return false;
  return r < 38 && g < 38 && b < 38;
}

function luminance(r, g, b) {
  return (r + g + b) / 3;
}

function saturation(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 1) return 0;
  return (max - min) / max;
}

/** Branco/cinza neutro do recorte Rock (iPhone) — NÃO o bege Samsung. */
function isPrintCutoutFill(r, g, b) {
  const L = luminance(r, g, b);
  const sat = saturation(r, g, b);
  if (L < 185) return false;
  if (sat >= 0.12) return false;
  if (Math.abs(r - g) > 18 || Math.abs(g - b) > 18) return false;
  return true;
}

/** Expande fill branco por vizinhança (anti-alias nas lentes). */
function isNearCutoutFill(r, g, b) {
  const L = luminance(r, g, b);
  const sat = saturation(r, g, b);
  if (L < 165) return false;
  if (sat >= 0.18) return false;
  if (Math.abs(r - g) > 22 || Math.abs(g - b) > 22) return false;
  return true;
}

/**
 * Marca o fill branco de recorte (buraco da câmera no molde).
 * Limiar proporcional à ilha: flash e sensores (frações de %) ficam.
 */
function markConnectedPrintFill(data, inside, w, h, islandArea) {
  const n = w * h;
  const remove = new Uint8Array(n);
  const seen = new Uint8Array(n);
  const stack = [];
  const minFill = Math.max(1200, Math.round(islandArea * 0.025));

  for (let seed = 0; seed < n; seed++) {
    if (!inside[seed] || seen[seed]) continue;
    const r0 = data[seed * 4];
    const g0 = data[seed * 4 + 1];
    const b0 = data[seed * 4 + 2];
    const a0 = data[seed * 4 + 3];
    if (a0 < 10 || isOutline(r0, g0, b0, a0)) continue;
    if (!isPrintCutoutFill(r0, g0, b0)) continue;

    const comp = [];
    stack.push(seed);
    seen[seed] = 1;
    while (stack.length) {
      const cur = stack.pop();
      comp.push(cur);
      const x = cur % w;
      const y = (cur / w) | 0;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const np = ny * w + nx;
        if (!inside[np] || seen[np]) continue;
        const r = data[np * 4];
        const g = data[np * 4 + 1];
        const b = data[np * 4 + 2];
        const a = data[np * 4 + 3];
        if (a < 10 || isOutline(r, g, b, a)) continue;
        if (!isNearCutoutFill(r, g, b)) continue;
        seen[np] = 1;
        stack.push(np);
      }
    }
    // Só o recorte de impressão; flash/sensores são pequenos
    if (comp.length >= minFill) {
      for (const p of comp) remove[p] = 1;
    }
  }
  return remove;
}

function findRedComponents(data, w, h) {
  const n = w * h;
  const mask = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    if (isOutline(data[p * 4], data[p * 4 + 1], data[p * 4 + 2], data[p * 4 + 3])) {
      mask[p] = 1;
    }
  }

  const label = new Int32Array(n);
  let lab = 0;
  const bounds = [];
  const stack = [];

  for (let p = 0; p < n; p++) {
    if (!mask[p] || label[p]) continue;
    lab++;
    let sz = 0;
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    stack.push(p);
    label[p] = lab;
    while (stack.length) {
      const cur = stack.pop();
      sz++;
      const x = cur % w;
      const y = (cur / w) | 0;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const np = ny * w + nx;
        if (!mask[np] || label[np]) continue;
        label[np] = lab;
        stack.push(np);
      }
    }
    bounds[lab] = { id: lab, minX, minY, maxX, maxY, sz };
  }

  return Object.keys(bounds)
    .map(Number)
    .map((id) => bounds[id])
    .sort((a, b) => b.sz - a.sz);
}

function findHardwareBBox(data, w, h, outer) {
  const topMax = Math.min(outer.maxY, outer.minY + Math.floor((outer.maxY - outer.minY) * 0.42));
  const leftMax = Math.min(outer.maxX, outer.minX + Math.floor((outer.maxX - outer.minX) * 0.68));
  const edge = Math.max(6, Math.floor(Math.min(w, h) * 0.02));
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let sz = 0;

  for (let y = outer.minY; y <= topMax; y++) {
    for (let x = outer.minX; x <= leftMax; x++) {
      const p = y * w + x;
      const r = data[p * 4];
      const g = data[p * 4 + 1];
      const b = data[p * 4 + 2];
      const a = data[p * 4 + 3];
      if (a < 10 || isBlack(r, g, b, a) || isOutline(r, g, b, a)) continue;
      if (isPrintCutoutFill(r, g, b)) continue;
      // ignora “chão” claro nas bordas do molde
      if (
        (x - outer.minX < edge || outer.maxX - x < edge) &&
        (y - outer.minY < edge || outer.maxY - y < edge) &&
        luminance(r, g, b) > 140
      ) {
        continue;
      }
      sz++;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (sz < 40) return null;
  const px = Math.max(8, Math.round((maxX - minX) * 0.12));
  const py = Math.max(8, Math.round((maxY - minY) * 0.12));
  return {
    id: -1,
    minX: Math.max(outer.minX, minX - px),
    minY: Math.max(outer.minY, minY - py),
    maxX: Math.min(outer.maxX, maxX + px),
    maxY: Math.min(outer.maxY, maxY + py),
    sz,
  };
}

function fillIslandInterior(data, w, h, island, useRect) {
  const inside = new Uint8Array(w * h);
  if (useRect) {
    // Molde com contorno único: módulo é o bbox do hardware, com cantos
    // arredondados para não virar um bloco retangular no mock.
    const iw = island.maxX - island.minX;
    const ih = island.maxY - island.minY;
    const rad = Math.min(iw, ih) * 0.16;
    for (let y = island.minY; y <= island.maxY; y++) {
      for (let x = island.minX; x <= island.maxX; x++) {
        const dx = Math.min(x - island.minX, island.maxX - x);
        const dy = Math.min(y - island.minY, island.maxY - y);
        if (dx < rad && dy < rad) {
          const cx = dx - rad;
          const cy = dy - rad;
          if (cx * cx + cy * cy > rad * rad) continue;
        }
        inside[y * w + x] = 1;
      }
    }
    return inside;
  }

  const cx = ((island.minX + island.maxX) / 2) | 0;
  const cy = ((island.minY + island.maxY) / 2) | 0;
  const stack = [cy * w + cx];
  const seen = new Uint8Array(w * h);

  while (stack.length) {
    const cur = stack.pop();
    if (seen[cur]) continue;
    seen[cur] = 1;
    const x = cur % w;
    const y = (cur / w) | 0;
    if (x < island.minX || x > island.maxX || y < island.minY || y > island.maxY) {
      continue;
    }
    const r = data[cur * 4];
    const g = data[cur * 4 + 1];
    const b = data[cur * 4 + 2];
    const a = data[cur * 4 + 3];
    if (isOutline(r, g, b, a)) continue;
    inside[cur] = 1;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < island.minX || nx > island.maxX || ny < island.minY || ny > island.maxY) {
        continue;
      }
      const np = ny * w + nx;
      if (!seen[np]) stack.push(np);
    }
  }
  return inside;
}

async function processFrame(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  const comps = findRedComponents(data, w, h);
  if (comps.length < 1) throw new Error("sem contorno");

  const outer = comps[0];
  let island = comps[1] && comps[1].sz >= 200 ? comps[1] : null;
  let useRect = false;

  if (!island) {
    island = findHardwareBBox(data, w, h, outer);
    useRect = true;
  }
  if (!island) throw new Error("sem ilha de camera");

  const pad = Math.max(2, Math.round(Math.min(w, h) * 0.004));
  const x0 = Math.max(0, outer.minX - pad);
  const y0 = Math.max(0, outer.minY - pad);
  const x1 = Math.min(w - 1, outer.maxX + pad);
  const y1 = Math.min(h - 1, outer.maxY + pad);
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;

  const inside = fillIslandInterior(data, w, h, island, useRect);
  const islandArea =
    (island.maxX - island.minX + 1) * (island.maxY - island.minY + 1);
  const fillMask = markConnectedPrintFill(data, inside, w, h, islandArea);

  let fillCount = 0;
  let fillL = 0;
  for (let p = 0; p < w * h; p++) {
    if (!fillMask[p]) continue;
    fillL += luminance(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]);
    fillCount++;
  }

  // Sem recorte claro: molde já é escuro, copia como está
  const escurecer = fillCount > 400;
  const baseL = escurecer ? fillL / fillCount : 0;
  const t2 = baseL - 40;
  const t1 = baseL - 110;

  const out = Buffer.alloc(cw * ch * 4);
  let kept = 0;

  // Base do módulo na forma da ilha do molde — evita lentes flutuando
  // em moldes cujo platô é transparente (Redmi/Xiaomi).
  for (let p = 0; p < w * h; p++) {
    if (!inside[p]) continue;
    const x = p % w;
    const y = (p / w) | 0;
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    const di = ((y - y0) * cw + (x - x0)) * 4;
    out[di] = PLATE_TARGET_L;
    out[di + 1] = PLATE_TARGET_L;
    out[di + 2] = PLATE_TARGET_L + 2;
    out[di + 3] = 255;
  }

  for (let p = 0; p < w * h; p++) {
    if (!inside[p]) continue;
    const r = data[p * 4];
    const g = data[p * 4 + 1];
    const b = data[p * 4 + 2];
    const a = data[p * 4 + 3];
    if (a < 10 || isOutline(r, g, b, a)) continue;
    const x = p % w;
    const y = (p / w) | 0;
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;

    let nr = r;
    let ng = g;
    let nb = b;

    if (escurecer) {
      // Platô claro do molde vira módulo escuro, mas o relevo do H5
      // (aros das lentes, flash, sensores) continua legível.
      const L = luminance(r, g, b);
      const peso = Math.max(0, Math.min(1, (L - t1) / (t2 - t1)));
      if (peso > 0) {
        const alvoL = PLATE_TARGET_L + (L - baseL) * PLATE_CONTRAST;
        const novoL = L * (1 - peso) + alvoL * peso;
        const escala = novoL / Math.max(L, 1);
        nr = Math.max(0, Math.min(255, Math.round(r * escala)));
        ng = Math.max(0, Math.min(255, Math.round(g * escala)));
        nb = Math.max(0, Math.min(255, Math.round(b * escala)));
      }
    }

    const di = ((y - y0) * cw + (x - x0)) * 4;
    out[di] = nr;
    out[di + 1] = ng;
    out[di + 2] = nb;
    out[di + 3] = a;
    kept++;
  }

  await sharp(out, { raw: { width: cw, height: ch, channels: 4 } })
    .png()
    .toFile(dest);

  return {
    kept,
    fillCount,
    plate: escurecer ? `L${Math.round(baseL)}->${PLATE_TARGET_L}` : "h5-direct",
    mode: useRect ? "hw-bbox" : "red-island",
  };
}

let i = 0;
let ok = 0;
let fail = 0;
for (const m of modelos) {
  i++;
  const dest = `${outDir}/${m.id}-camera.png`;
  process.stdout.write(`[${i}/${modelos.length}] ${m.id} ... `);
  try {
    const meta = await processFrame(m.frameImage, dest);
    m.cameraFrameUrl = `/molduras/rock/${m.id}-camera.png?${CACHE}`;
    ok++;
    console.log(
      `ok kept=${meta.kept} fill=${meta.fillCount} plate=${meta.plate} ${meta.mode}`,
    );
  } catch (e) {
    fail++;
    console.log("FAIL", e.message);
  }
}

fs.writeFileSync(
  "tmp-rockb2b/zenpro-modelos.json",
  JSON.stringify(modelos, null, 2),
);

const perso = {};
for (const m of modelos) {
  perso[m.id] = {
    cameraPresetId: "sem-camera",
    corAparelho: m.corAparelho,
    cameraFrameUrl: m.cameraFrameUrl,
  };
}
fs.writeFileSync(
  "src/features/personalizacao/rockb2bPersonalizacao.json",
  JSON.stringify(perso, null, 2),
);
console.log("done ok=", ok, "fail=", fail);
