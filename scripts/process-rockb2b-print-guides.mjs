/**
 * Guia de impressão H5 = frameImage Rock com fundo preto transparente.
 * Mantém contorno vermelho + ilha da câmera (branco/lentes) — igual print-h5.
 *
 * Gera: public/molduras/rock/{id}-print-guide.png
 * Atualiza rockb2bPersonalizacao.json → printGuideUrl
 *
 * Uso:
 *   node scripts/process-rockb2b-print-guides.mjs
 *   node scripts/process-rockb2b-print-guides.mjs --only=iphone-16-pro-max
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

const CACHE = "v=1";

function isOutline(r, g, b, a) {
  if (a < 10) return false;
  if (r > 150 && g < 120 && b < 160 && r - g > 40 && r > b - 10) return true;
  if (r > 140 && b > 100 && g < 130 && r - g > 30) return true;
  return false;
}

function isBlackBg(r, g, b, a) {
  if (a < 10) return true;
  return r < 42 && g < 42 && b < 42;
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
    while (stack.length) {
      const cur = stack.pop();
      sz++;
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
    if (sz >= 200) comps.push({ sz, minX, minY, maxX, maxY });
  }
  comps.sort((a, b) => b.sz - a.sz);
  return comps;
}

async function processGuide(url, dest) {
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
  if (comps.length < 1) throw new Error("sem contorno vermelho");
  const outer = comps[0];

  const pad = Math.max(2, Math.round(Math.min(w, h) * 0.004));
  const x0 = Math.max(0, outer.minX - pad);
  const y0 = Math.max(0, outer.minY - pad);
  const x1 = Math.min(w - 1, outer.maxX + pad);
  const y1 = Math.min(h - 1, outer.maxY + pad);
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;

  const out = Buffer.alloc(cw * ch * 4);
  let kept = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const si = (y * w + x) * 4;
      const di = ((y - y0) * cw + (x - x0)) * 4;
      const r = data[si];
      const g = data[si + 1];
      const b = data[si + 2];
      const a = data[si + 3];
      // Preto do molde some → arte do cliente aparece (fundo laranja no export).
      if (isBlackBg(r, g, b, a)) {
        out[di + 3] = 0;
        continue;
      }
      out[di] = r;
      out[di + 1] = g;
      out[di + 2] = b;
      out[di + 3] = a;
      kept++;
    }
  }

  await sharp(out, { raw: { width: cw, height: ch, channels: 4 } })
    .png()
    .toFile(dest);

  return { kept, width: cw, height: ch };
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
  if (!m.frameImage) {
    skip++;
    continue;
  }
  const dest = `${outDir}/${m.id}-print-guide.png`;
  process.stdout.write(`[${i}/${modelos.length}] ${m.id} guide ... `);
  try {
    const meta = await processGuide(m.frameImage, dest);
    const printGuideUrl = `/molduras/rock/${m.id}-print-guide.png?${CACHE}`;
    perso[m.id] = {
      ...(perso[m.id] || {}),
      printGuideUrl,
    };
    console.log(`ok ${meta.width}x${meta.height} kept=${meta.kept}`);
    ok++;
  } catch (e) {
    console.log(`FAIL ${e.message}`);
    fail++;
  }
}

fs.writeFileSync(persoPath, JSON.stringify(perso, null, 2) + "\n");
console.log(`\nOK ${ok} · fail ${fail} · skip ${skip} · cache ${CACHE}`);
