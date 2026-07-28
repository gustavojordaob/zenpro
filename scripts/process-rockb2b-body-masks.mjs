/**
 * Silhueta da capa = contorno vermelho externo do molde H5 RockB2B.
 *
 * Gera:
 *   `{id}-body-mask.png` — branco + alpha AA (dentro da capa)
 *   `{id}-body-rim.png`  — filete da borda (mesmo contorno H5)
 * + `caseRadius` / `molduraAspect` em rockb2bPersonalizacao.json
 *
 * Uso:
 *   node scripts/process-rockb2b-body-masks.mjs
 *   node scripts/process-rockb2b-body-masks.mjs --only=iphone
 */
import fs from "fs";
import sharp from "sharp";

const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "")
  .slice("--only=".length)
  .toLowerCase();

const modelos = JSON.parse(
  fs.readFileSync("tmp-rockb2b/zenpro-modelos.json", "utf8"),
);
const outDir = "public/molduras/rock";
fs.mkdirSync(outDir, { recursive: true });

const CACHE = "v=16";

function isOutline(r, g, b, a) {
  if (a < 10) return false;
  if (r > 150 && g < 120 && b < 160 && r - g > 40 && r > b - 10) return true;
  if (r > 140 && b > 100 && g < 130 && r - g > 30) return true;
  return false;
}

function findRedComponents(data, w, h) {
  const visited = new Uint8Array(w * h);
  const comps = [];
  for (let i = 0; i < w * h; i++) {
    if (visited[i]) continue;
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3];
    if (!isOutline(r, g, b, a)) continue;
    const stack = [i];
    visited[i] = 1;
    let minX = i % w;
    let maxX = minX;
    let minY = (i / w) | 0;
    let maxY = minY;
    let sz = 0;
    const pixels = [];
    while (stack.length) {
      const cur = stack.pop();
      sz++;
      pixels.push(cur);
      const x = cur % w;
      const y = (cur / w) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
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
        if (visited[np]) continue;
        const rr = data[np * 4];
        const gg = data[np * 4 + 1];
        const bb = data[np * 4 + 2];
        const aa = data[np * 4 + 3];
        if (!isOutline(rr, gg, bb, aa)) continue;
        visited[np] = 1;
        stack.push(np);
      }
    }
    if (sz >= 200) {
      comps.push({ sz, minX, minY, maxX, maxY, pixels });
    }
  }
  comps.sort((a, b) => b.sz - a.sz);
  return comps;
}

/** Dilata máscara binária (4/8-vizinhos) `iters` vezes. */
function dilate(src, w, h, iters) {
  let cur = src;
  for (let t = 0; t < iters; t++) {
    const next = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (cur[p]) {
          next[p] = 1;
          continue;
        }
        let hit = 0;
        for (let dy = -1; dy <= 1 && !hit; dy++) {
          for (let dx = -1; dx <= 1 && !hit; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            if (cur[ny * w + nx]) hit = 1;
          }
        }
        next[p] = hit;
      }
    }
    cur = next;
  }
  return cur;
}

function erode(src, w, h, iters) {
  let cur = src;
  for (let t = 0; t < iters; t++) {
    const next = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (!cur[p]) continue;
        let ok = 1;
        for (let dy = -1; dy <= 1 && ok; dy++) {
          for (let dx = -1; dx <= 1 && ok; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
              ok = 0;
              break;
            }
            if (!cur[ny * w + nx]) ok = 0;
          }
        }
        next[p] = ok;
      }
    }
    cur = next;
  }
  return cur;
}

/** Fecha buracos e suaviza serrilhado do contorno vermelho. */
function morphClose(src, w, h, radius) {
  return erode(dilate(src, w, h, radius), w, h, radius);
}

/**
 * Interior do contorno externo.
 * Barreira = vermelho dilatado (fecha gaps do filete H5).
 */
function fillOuterInterior(data, w, h, outer) {
  const barrierRaw = new Uint8Array(w * h);
  for (const p of outer.pixels) barrierRaw[p] = 1;
  // Fecha falhas do filete vermelho (causa vazamento / serrilhado)
  const barrier = dilate(barrierRaw, w, h, 2);

  const inside = new Uint8Array(w * h);
  const cx = ((outer.minX + outer.maxX) / 2) | 0;
  const cy = ((outer.minY + outer.maxY) / 2) | 0;
  const stack = [cy * w + cx];
  const seen = new Uint8Array(w * h);

  while (stack.length) {
    const cur = stack.pop();
    if (seen[cur]) continue;
    seen[cur] = 1;
    if (barrier[cur]) continue;
    const x = cur % w;
    const y = (cur / w) | 0;
    if (x < outer.minX || x > outer.maxX || y < outer.minY || y > outer.maxY) {
      continue;
    }
    inside[cur] = 1;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < outer.minX || nx > outer.maxX || ny < outer.minY || ny > outer.maxY) {
        continue;
      }
      const np = ny * w + nx;
      if (!seen[np]) stack.push(np);
    }
  }

  // Inclui o filete (barreira dilatada ∩ bbox) na silhueta
  for (let y = outer.minY; y <= outer.maxY; y++) {
    for (let x = outer.minX; x <= outer.maxX; x++) {
      const p = y * w + x;
      if (barrier[p]) inside[p] = 1;
    }
  }
  return morphClose(inside, w, h, 3);
}

function estimateCornerRadius(inside, w, outer) {
  const cx = ((outer.minX + outer.maxX) / 2) | 0;
  let topY = outer.minY;
  for (; topY <= outer.maxY; topY++) {
    if (inside[topY * w + cx]) break;
  }
  let rEst = 0;
  const limit = topY + Math.min(220, ((outer.maxY - outer.minY) / 3) | 0);
  for (let y = topY; y < limit; y++) {
    let x = outer.minX;
    while (x <= outer.maxX && !inside[y * w + x]) x++;
    const dx = x - outer.minX;
    const dy = y - topY;
    if (dx > 2 && dy > 2 && dx < (outer.maxX - outer.minX) * 0.22) {
      const r1 = (dx * dx + dy * dy) / (2 * dx);
      const r2 = (dx * dx + dy * dy) / (2 * dy);
      rEst = Math.max(rEst, Math.min(r1, r2));
    }
  }
  const bw = outer.maxX - outer.minX + 1;
  const frac = rEst > 0 ? rEst / bw : 0.11;
  return Math.max(0.06, Math.min(0.18, frac));
}

/** RGBA branco opaco a partir da máscara binária cropada. */
function binaryToRgba(mask, w, h, x0, y0, x1, y1) {
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const out = Buffer.alloc(cw * ch * 4);
  let kept = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = y * w + x;
      if (!mask[p]) continue;
      const di = ((y - y0) * cw + (x - x0)) * 4;
      out[di] = 255;
      out[di + 1] = 255;
      out[di + 2] = 255;
      out[di + 3] = 255;
      kept++;
    }
  }
  return { out, cw, ch, kept };
}

/**
 * Anti-alias: blur leve no alpha + threshold suave → borda limpa sem serrilhado.
 */
async function writeMaskAa(rawRgba, cw, ch, dest) {
  const blurred = await sharp(rawRgba, {
    raw: { width: cw, height: ch, channels: 4 },
  })
    .blur(1.1)
    .raw()
    .toBuffer();

  const out = Buffer.alloc(cw * ch * 4);
  for (let i = 0; i < cw * ch; i++) {
    const a = blurred[i * 4 + 3];
    if (a < 12) continue;
    // Soft edge: alpha proporcional, RGB branco
    const aa = a < 40 ? Math.round((a / 40) * 255) : 255;
    out[i * 4] = 255;
    out[i * 4 + 1] = 255;
    out[i * 4 + 2] = 255;
    out[i * 4 + 3] = aa;
  }
  await sharp(out, { raw: { width: cw, height: ch, channels: 4 } })
    .png()
    .toFile(dest);
}

/** Filete = dilate(mask) − erode(mask) → borda no contorno H5. */
async function writeRim(maskFull, w, h, x0, y0, x1, y1, dest) {
  const bw = x1 - x0 + 1;
  // Espessura ~1.6% da largura do crop (lip TPU)
  const thick = Math.max(3, Math.round(bw * 0.016));
  const outer = dilate(maskFull, w, h, thick);
  const inner = erode(maskFull, w, h, Math.max(2, thick - 1));
  const rim = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (outer[i] && !inner[i]) rim[i] = 1;
  }
  const { out, cw, ch } = binaryToRgba(rim, w, h, x0, y0, x1, y1);
  await writeMaskAa(out, cw, ch, dest);
}

async function processBody(url, destMask, destRim) {
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
  const inside = fillOuterInterior(data, w, h, outer);

  const pad = Math.max(2, Math.round(Math.min(w, h) * 0.004));
  const x0 = Math.max(0, outer.minX - pad);
  const y0 = Math.max(0, outer.minY - pad);
  const x1 = Math.min(w - 1, outer.maxX + pad);
  const y1 = Math.min(h - 1, outer.maxY + pad);

  const { out, cw, ch, kept } = binaryToRgba(inside, w, h, x0, y0, x1, y1);
  await writeMaskAa(out, cw, ch, destMask);
  await writeRim(inside, w, h, x0, y0, x1, y1, destRim);

  const bw = outer.maxX - outer.minX + 1;
  const bh = outer.maxY - outer.minY + 1;
  return {
    kept,
    width: cw,
    height: ch,
    molduraAspect: bw / bh,
    caseRadius: estimateCornerRadius(inside, w, outer),
  };
}

const persoPath = "src/features/personalizacao/rockb2bPersonalizacao.json";
const perso = JSON.parse(fs.readFileSync(persoPath, "utf8"));

let i = 0;
let ok = 0;
let fail = 0;
let skip = 0;

for (const m of modelos) {
  i++;
  if (
    ONLY &&
    !m.id.toLowerCase().includes(ONLY) &&
    !(m.marca || "").toLowerCase().includes(ONLY)
  ) {
    skip++;
    continue;
  }
  const destMask = `${outDir}/${m.id}-body-mask.png`;
  const destRim = `${outDir}/${m.id}-body-rim.png`;
  process.stdout.write(`[${i}/${modelos.length}] ${m.id} body ... `);
  try {
    const meta = await processBody(m.frameImage, destMask, destRim);
    const bodyMaskUrl = `/molduras/rock/${m.id}-body-mask.png?${CACHE}`;
    const bodyRimUrl = `/molduras/rock/${m.id}-body-rim.png?${CACHE}`;
    m.bodyMaskUrl = bodyMaskUrl;
    m.bodyRimUrl = bodyRimUrl;
    m.molduraAspect = meta.molduraAspect;
    m.caseRadius = meta.caseRadius;
    perso[m.id] = {
      ...(perso[m.id] || {}),
      cameraPresetId: perso[m.id]?.cameraPresetId ?? "sem-camera",
      corAparelho: perso[m.id]?.corAparelho ?? m.corAparelho,
      cameraFrameUrl: perso[m.id]?.cameraFrameUrl ?? m.cameraFrameUrl,
      bodyMaskUrl,
      bodyRimUrl,
      molduraAspect: Math.round(meta.molduraAspect * 10000) / 10000,
      caseRadius: Math.round(meta.caseRadius * 10000) / 10000,
    };
    ok++;
    console.log(
      `ok ${meta.width}x${meta.height} aspect=${meta.molduraAspect.toFixed(4)} r=${meta.caseRadius.toFixed(4)}`,
    );
  } catch (e) {
    fail++;
    console.log("FAIL", e.message);
  }
}

fs.writeFileSync("tmp-rockb2b/zenpro-modelos.json", JSON.stringify(modelos, null, 2));
fs.writeFileSync(persoPath, JSON.stringify(perso, null, 2));
console.log("done ok=", ok, "fail=", fail, "skip=", skip);
