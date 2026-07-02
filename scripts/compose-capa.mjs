import { mkdirSync } from "node:fs";
import sharp from "sharp";

const modeloId = process.argv[2] ?? "iphone-17-pro-max";
const fotoPath =
  process.argv[3] ??
  "C:/Users/gusta/.cursor/projects/c-Users-gusta-projetos-zenpro/assets/c__Users_gusta_AppData_Roaming_Cursor_User_workspaceStorage_70569ef5776a5787e0c28efb0518842e_images_Onboarding---3-24c22058-66b6-4040-853b-124a740c5dea.png";

const W = 400;
const H = 820;
const rx = Math.round(W * 0.13);
const scale = 2;

mkdirSync("preview", { recursive: true });

// 1) foto "cover" no tamanho da capa
const fotoBuf = await sharp(fotoPath)
  .resize(W * scale, H * scale, { fit: "cover", position: "centre" })
  .png()
  .toBuffer();

// 2) máscara de cantos arredondados
const maskSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W * scale}" height="${
    H * scale
  }"><rect x="0" y="0" width="${W * scale}" height="${H * scale}" rx="${
    rx * scale
  }" ry="${rx * scale}" fill="#fff"/></svg>`,
);

const fotoArredondada = await sharp(fotoBuf)
  .composite([{ input: maskSvg, blend: "dest-in" }])
  .png()
  .toBuffer();

// 3) overlay (borda + câmera) rasterizado
const overlayBuf = await sharp(`preview/overlay-${modeloId}.svg`, {
  density: 96 * scale,
})
  .resize(W * scale, H * scale)
  .png()
  .toBuffer();

// 4) composição final sobre fundo claro
const out = `preview/capa-${modeloId}.png`;
await sharp({
  create: {
    width: W * scale,
    height: H * scale,
    channels: 4,
    background: { r: 236, g: 236, b: 236, alpha: 1 },
  },
})
  .composite([{ input: fotoArredondada }, { input: overlayBuf }])
  .png()
  .toFile(out);

console.log(`OK -> ${out} (${W * scale}x${H * scale})`);
