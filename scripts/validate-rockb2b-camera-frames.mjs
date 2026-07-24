/**
 * Valida os PNGs de câmera: conta lentes/flash preservados do molde H5.
 *
 * Uso: node scripts/validate-rockb2b-camera-frames.mjs
 */
import fs from "fs";
import sharp from "sharp";

const modelos = JSON.parse(
  fs.readFileSync("tmp-rockb2b/zenpro-modelos.json", "utf8"),
);

/** Blobs opacos que não são o platô liso — lentes, flash, sensores. */
async function contarPecas(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const n = w * h;

  const hist = new Map();
  for (let p = 0; p < n; p++) {
    if (data[p * 4 + 3] < 200) continue;
    const key = `${data[p * 4]},${data[p * 4 + 1]},${data[p * 4 + 2]}`;
    hist.set(key, (hist.get(key) ?? 0) + 1);
  }
  const platoKey = [...hist.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const [pr, pg, pb] = (platoKey ?? "0,0,0").split(",").map(Number);

  const alvo = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    if (data[p * 4 + 3] < 120) continue;
    const dr = Math.abs(data[p * 4] - pr);
    const dg = Math.abs(data[p * 4 + 1] - pg);
    const db = Math.abs(data[p * 4 + 2] - pb);
    if (dr + dg + db > 45) alvo[p] = 1;
  }

  const visto = new Uint8Array(n);
  const pilha = [];
  const pecas = [];
  for (let seed = 0; seed < n; seed++) {
    if (!alvo[seed] || visto[seed]) continue;
    let sz = 0;
    pilha.push(seed);
    visto[seed] = 1;
    while (pilha.length) {
      const cur = pilha.pop();
      sz++;
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
        if (!alvo[np] || visto[np]) continue;
        visto[np] = 1;
        pilha.push(np);
      }
    }
    if (sz >= 150) pecas.push(sz);
  }
  return { pecas: pecas.sort((a, b) => b - a), w, h };
}

const suspeitos = [];
for (const m of modelos) {
  const file = `public/molduras/rock/${m.id}-camera.png`;
  if (!fs.existsSync(file)) {
    suspeitos.push(`${m.id}: PNG ausente`);
    continue;
  }
  const { pecas } = await contarPecas(file);
  const total = pecas.length;
  console.log(`${m.id.padEnd(26)} pecas=${total} maiores=${pecas.slice(0, 5)}`);
  if (total < 2) suspeitos.push(`${m.id}: só ${total} peça(s)`);
}

console.log("\n--- suspeitos ---");
console.log(suspeitos.length ? suspeitos.join("\n") : "nenhum");
