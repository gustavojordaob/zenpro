/**
 * Gera specs de câmera: ilha/posição do molde RockB2B (H5) + lentes do
 * mock SVG polido (preset), remapeadas para dentro da ilha.
 *
 * Uso: node scripts/extract-rockb2b-camera-specs.mjs
 */
import fs from "fs";
import sharp from "sharp";

const modelos = JSON.parse(
  fs.readFileSync("tmp-rockb2b/zenpro-modelos.json", "utf8"),
);

/** Presets SVG de referência (espelho enxuto de cameraModules). */
const PRESETS = {
  "redmi-note": {
    plateau: { x0: 0.055, y0: 0.028, x1: 0.34, y1: 0.255, radius: 0.09 },
    lentes: [
      { cx: 0.155, cy: 0.09, r: 0.058 },
      { cx: 0.155, cy: 0.165, r: 0.036 },
      { cx: 0.155, cy: 0.215, r: 0.036 },
    ],
    acessorios: [{ cx: 0.275, cy: 0.09, r: 0.015, tipo: "flash" }],
  },
  "xiaomi-13": {
    plateau: { x0: 0.05, y0: 0.03, x1: 0.5, y1: 0.3, radius: 0.13 },
    lentes: [
      { cx: 0.2, cy: 0.12, r: 0.055 },
      { cx: 0.35, cy: 0.12, r: 0.045 },
      { cx: 0.275, cy: 0.22, r: 0.045 },
    ],
    acessorios: [{ cx: 0.42, cy: 0.22, r: 0.016, tipo: "flash" }],
  },
  "xiaomi-13-pro": {
    plateau: { x0: 0.05, y0: 0.03, x1: 0.5, y1: 0.3, radius: 0.13 },
    lentes: [
      { cx: 0.2, cy: 0.12, r: 0.055 },
      { cx: 0.35, cy: 0.12, r: 0.045 },
      { cx: 0.275, cy: 0.22, r: 0.045 },
    ],
    acessorios: [{ cx: 0.42, cy: 0.22, r: 0.016, tipo: "flash" }],
  },
  "iphone-15": {
    plateau: { x0: 0.05, y0: 0.03, x1: 0.42, y1: 0.22, radius: 0.11 },
    lentes: [
      { cx: 0.16, cy: 0.075, r: 0.082 },
      { cx: 0.31, cy: 0.165, r: 0.082 },
    ],
    acessorios: [{ cx: 0.31, cy: 0.075, r: 0.026, tipo: "flash" }],
  },
  "iphone-15-pro": {
    plateau: { x0: 0.05, y0: 0.03, x1: 0.42, y1: 0.28, radius: 0.1 },
    lentes: [
      { cx: 0.16, cy: 0.09, r: 0.07 },
      { cx: 0.31, cy: 0.09, r: 0.07 },
      { cx: 0.16, cy: 0.2, r: 0.07 },
    ],
    acessorios: [{ cx: 0.31, cy: 0.2, r: 0.022, tipo: "flash" }],
  },
  "iphone-17-pro": {
    plateau: { x0: 0.04, y0: 0.04, x1: 0.96, y1: 0.16, radius: 0.05 },
    lentes: [
      { cx: 0.22, cy: 0.1, r: 0.055 },
      { cx: 0.4, cy: 0.1, r: 0.055 },
      { cx: 0.58, cy: 0.1, r: 0.055 },
    ],
    acessorios: [{ cx: 0.78, cy: 0.1, r: 0.02, tipo: "flash" }],
  },
  "iphone-16-pro": {
    plateau: { x0: 0.05, y0: 0.03, x1: 0.42, y1: 0.28, radius: 0.1 },
    lentes: [
      { cx: 0.16, cy: 0.09, r: 0.07 },
      { cx: 0.31, cy: 0.09, r: 0.07 },
      { cx: 0.16, cy: 0.2, r: 0.07 },
    ],
    acessorios: [{ cx: 0.31, cy: 0.2, r: 0.022, tipo: "flash" }],
  },
  "iphone-16": {
    plateau: { x0: 0.06, y0: 0.03, x1: 0.26, y1: 0.27, radius: 0.1 },
    lentes: [
      { cx: 0.16, cy: 0.1, r: 0.078 },
      { cx: 0.16, cy: 0.2, r: 0.078 },
    ],
    acessorios: [{ cx: 0.33, cy: 0.07, r: 0.024, tipo: "flash" }],
  },
  "iphone-14-pro": {
    plateau: { x0: 0.05, y0: 0.03, x1: 0.42, y1: 0.28, radius: 0.1 },
    lentes: [
      { cx: 0.16, cy: 0.09, r: 0.07 },
      { cx: 0.31, cy: 0.09, r: 0.07 },
      { cx: 0.16, cy: 0.2, r: 0.07 },
    ],
    acessorios: [{ cx: 0.31, cy: 0.2, r: 0.022, tipo: "flash" }],
  },
  "iphone-14": {
    plateau: { x0: 0.05, y0: 0.03, x1: 0.42, y1: 0.22, radius: 0.11 },
    lentes: [
      { cx: 0.16, cy: 0.075, r: 0.082 },
      { cx: 0.31, cy: 0.165, r: 0.082 },
    ],
    acessorios: [{ cx: 0.31, cy: 0.075, r: 0.026, tipo: "flash" }],
  },
  "iphone-13-pro": {
    plateau: { x0: 0.05, y0: 0.03, x1: 0.42, y1: 0.28, radius: 0.1 },
    lentes: [
      { cx: 0.16, cy: 0.09, r: 0.07 },
      { cx: 0.31, cy: 0.09, r: 0.07 },
      { cx: 0.16, cy: 0.2, r: 0.07 },
    ],
    acessorios: [{ cx: 0.31, cy: 0.2, r: 0.022, tipo: "flash" }],
  },
  "iphone-13": {
    plateau: { x0: 0.05, y0: 0.03, x1: 0.42, y1: 0.22, radius: 0.11 },
    lentes: [
      { cx: 0.16, cy: 0.075, r: 0.082 },
      { cx: 0.31, cy: 0.165, r: 0.082 },
    ],
    acessorios: [{ cx: 0.31, cy: 0.075, r: 0.026, tipo: "flash" }],
  },
  "iphone-padrao": {
    plateau: { x0: 0.05, y0: 0.03, x1: 0.42, y1: 0.22, radius: 0.11 },
    lentes: [
      { cx: 0.16, cy: 0.075, r: 0.082 },
      { cx: 0.31, cy: 0.165, r: 0.082 },
    ],
    acessorios: [{ cx: 0.31, cy: 0.075, r: 0.026, tipo: "flash" }],
  },
  "galaxy-s24": {
    plateau: { x0: 0.06, y0: 0.04, x1: 0.28, y1: 0.32, radius: 0.08 },
    lentes: [
      { cx: 0.17, cy: 0.1, r: 0.05 },
      { cx: 0.17, cy: 0.18, r: 0.05 },
      { cx: 0.17, cy: 0.26, r: 0.05 },
    ],
    acessorios: [{ cx: 0.17, cy: 0.055, r: 0.012, tipo: "flash" }],
  },
  "galaxy-s21": {
    plateau: { x0: 0.05, y0: 0.02, x1: 0.33, y1: 0.33, radius: 0.09 },
    lentes: [
      { cx: 0.135, cy: 0.085, r: 0.058 },
      { cx: 0.135, cy: 0.18, r: 0.058 },
      { cx: 0.135, cy: 0.275, r: 0.058 },
    ],
    acessorios: [{ cx: 0.26, cy: 0.085, r: 0.02, tipo: "flash" }],
  },
  "galaxy-a": {
    plateau: { x0: 0.05, y0: 0.03, x1: 0.4, y1: 0.25, radius: 0.09 },
    lentes: [
      { cx: 0.15, cy: 0.09, r: 0.062 },
      { cx: 0.3, cy: 0.09, r: 0.062 },
      { cx: 0.15, cy: 0.19, r: 0.062 },
      { cx: 0.3, cy: 0.19, r: 0.04 },
    ],
    acessorios: [{ cx: 0.3, cy: 0.19, r: 0.014, tipo: "flash" }],
  },
};

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function isOutline(r, g, b, a) {
  if (a < 10) return false;
  // vermelho OU magenta do molde Rock
  if (r > 155 && g < 115 && b < 150 && r - g > 45 && r > b) return true;
  return false;
}

function remapPreset(preset, plateau) {
  const ps = preset.plateau;
  const pw = Math.max(0.001, ps.x1 - ps.x0);
  const ph = Math.max(0.001, ps.y1 - ps.y0);
  const tw = plateau.x1 - plateau.x0;
  const th = plateau.y1 - plateau.y0;
  const mapX = (x) => plateau.x0 + ((x - ps.x0) / pw) * tw;
  const mapY = (y) => plateau.y0 + ((y - ps.y0) / ph) * th;
  const scale = Math.min(tw / pw, th / ph);

  return {
    formato: "quadrado",
    plateau: {
      x0: round4(plateau.x0),
      y0: round4(plateau.y0),
      x1: round4(plateau.x1),
      y1: round4(plateau.y1),
      radius: round4(Math.min(tw, th) * 0.18),
    },
    lentes: preset.lentes.map((l) => ({
      cx: round4(mapX(l.cx)),
      cy: round4(mapY(l.cy)),
      r: round4(Math.max(0.016, Math.min(0.085, l.r * scale))),
    })),
    acessorios: (preset.acessorios || []).map((a) => ({
      cx: round4(mapX(a.cx)),
      cy: round4(mapY(a.cy)),
      r: round4(Math.max(0.008, Math.min(0.03, a.r * scale))),
      tipo: a.tipo || "flash",
    })),
  };
}

async function extractPhoneAndIsland(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
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
    bounds[lab] = { minX, minY, maxX, maxY, sz };
  }

  const comps = Object.keys(bounds)
    .map(Number)
    .map((id) => ({ id, ...bounds[id] }))
    .sort((a, b) => b.sz - a.sz);

  if (!comps.length) throw new Error("sem contorno");

  const phone = comps[0];
  const phoneW = Math.max(1, phone.maxX - phone.minX);
  const phoneH = Math.max(1, phone.maxY - phone.minY);

  let island = null;
  for (const c of comps.slice(1)) {
    const cw = c.maxX - c.minX;
    const ch = c.maxY - c.minY;
    const cy = (c.minY + c.maxY) / 2;
    if (cy > phone.minY + phoneH * 0.42) continue;
    if (cw > phoneW * 0.58) continue;
    if (ch > phoneH * 0.42) continue;
    if (cw * ch < 80) continue;
    island = c;
    break;
  }
  if (!island && comps[1]) island = comps[1];
  if (!island) throw new Error("sem ilha");

  // bleed do molde de impressão — ilha um pouco menor
  const sx = (island.maxX - island.minX) * 0.08;
  const sy = (island.maxY - island.minY) * 0.08;
  const ix0 = island.minX + sx;
  const iy0 = island.minY + sy;
  const ix1 = island.maxX - sx;
  const iy1 = island.maxY - sy;

  const nx = (x) => (x - phone.minX) / phoneW;
  const ny = (y) => (y - phone.minY) / phoneH;

  return {
    plateau: {
      x0: Math.max(0.02, nx(ix0)),
      y0: Math.max(0.015, ny(iy0)),
      x1: Math.min(0.98, nx(ix1)),
      y1: Math.min(0.45, ny(iy1)),
    },
  };
}

function resolvePresetId(m) {
  const id = m.cameraPresetId;
  if (PRESETS[id]) return id;
  if (id?.includes("iphone") && id.includes("pro")) return "iphone-15-pro";
  if (id?.includes("iphone")) return "iphone-15";
  if (id?.includes("galaxy") && id.includes("ultra")) return "galaxy-s24";
  if (id?.includes("galaxy-s")) return "galaxy-s24";
  if (id?.includes("galaxy")) return "galaxy-a";
  if (id?.includes("xiaomi") || id?.includes("redmi") || id?.includes("poco"))
    return "redmi-note";
  return "galaxy-s24";
}

const out = {};
let i = 0;
for (const m of modelos) {
  i++;
  process.stdout.write(`[${i}/${modelos.length}] ${m.id} ... `);
  const presetId = resolvePresetId(m);
  const preset = PRESETS[presetId] || PRESETS["galaxy-s24"];
  try {
    const { plateau } = await extractPhoneAndIsland(m.frameImage);
    out[m.id] = remapPreset(preset, plateau);
    console.log(
      `ok H5→SVG preset=${presetId} ilha ${out[m.id].plateau.x0.toFixed(2)}-${out[m.id].plateau.x1.toFixed(2)}`,
    );
  } catch (e) {
    // sem contorno: usa preset SVG puro (ainda polido)
    out[m.id] = {
      formato: "quadrado",
      plateau: preset.plateau,
      lentes: preset.lentes,
      acessorios: preset.acessorios,
    };
    console.log(`fallback SVG ${presetId} (${e.message})`);
  }
}

fs.writeFileSync(
  "src/features/personalizacao/rockb2bCameraSpecs.json",
  JSON.stringify(out, null, 2),
);
fs.writeFileSync("tmp-rockb2b/camera-specs.json", JSON.stringify(out, null, 2));
console.log("wrote", Object.keys(out).length, "specs");
