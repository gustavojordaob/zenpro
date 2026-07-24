import fs from "fs";

const modelos = JSON.parse(
  fs.readFileSync("tmp-rockb2b/zenpro-modelos.json", "utf8"),
);

// ——— modelos.ts ———
const lines = [];
lines.push('import type { ModeloCelular } from "./types";');
lines.push("");
lines.push("/**");
lines.push(
  " * Catálogo de modelos (RockB2B print-h5 / deviceSn RMEACGBQYXL87Z).",
);
lines.push(
  " * Dimensões derivadas da proporção width×length do molde de impressão.",
);
lines.push(
  " * IDs estáveis: iphone-15, samsung-s24, iphone-17-pro-max (produtos existentes).",
);
lines.push(" */");
lines.push("export const MODELOS: ModeloCelular[] = [");
for (const m of modelos) {
  lines.push("  {");
  lines.push(`    id: ${JSON.stringify(m.id)},`);
  lines.push(`    marca: ${JSON.stringify(m.marca)},`);
  lines.push(`    modelo: ${JSON.stringify(m.modelo)},`);
  lines.push(`    larguraPx: ${m.larguraPx},`);
  lines.push(`    alturaPx: ${m.alturaPx},`);
  lines.push("  },");
}
lines.push("];");
lines.push("");
lines.push(
  "export function getModeloById(id: string): ModeloCelular | undefined {",
);
lines.push("  return MODELOS.find((m) => m.id === id);");
lines.push("}");
lines.push("");
fs.writeFileSync("src/features/personalizacao/modelos.ts", lines.join("\n"), "utf8");
console.log("wrote modelos.ts", modelos.length);

const perso = {};
for (const m of modelos) {
  perso[m.id] = {
    cameraPresetId: m.cameraPresetId,
    corAparelho: m.corAparelho,
  };
}
fs.writeFileSync(
  "tmp-rockb2b/personalizacao-por-modelo.json",
  JSON.stringify(perso, null, 2),
);
fs.writeFileSync(
  "src/features/personalizacao/rockb2bPersonalizacao.json",
  JSON.stringify(perso, null, 2),
);
console.log("wrote rockb2bPersonalizacao.json", Object.keys(perso).length);

// ——— dispositivosPresets.ts ———
const rockIds = new Set(modelos.map((m) => m.id));
rockIds.add("galaxy-s24");
const rockNames = new Set(modelos.map((m) => m.modelo.toLowerCase()));

function grupo(marca) {
  if (marca === "Apple") return "Apple";
  if (marca === "Samsung") return "Samsung";
  return "Xiaomi";
}

const presets = [];
for (const m of modelos) {
  presets.push({
    id: m.id,
    rotulo: m.modelo,
    grupo: grupo(m.marca),
    marcaSugerida:
      m.marca === "Apple"
        ? "apple"
        : m.marca === "Samsung"
          ? "samsung"
          : "xiaomi",
    larguraPx: m.larguraPx,
    alturaPx: m.alturaPx,
    cameraPresetId: m.cameraPresetId,
    corAparelho: m.corAparelho,
  });
}

const extras = [
  {
    id: "galaxy-z-flip",
    rotulo: "Galaxy Z Flip",
    grupo: "Samsung",
    marcaSugerida: "samsung",
    larguraPx: 1080,
    alturaPx: 2640,
    cameraPresetId: "galaxy-z-flip",
    corAparelho: "#1a1a1a",
  },
  {
    id: "galaxy-z-fold",
    rotulo: "Galaxy Z Fold",
    grupo: "Samsung",
    marcaSugerida: "samsung",
    larguraPx: 1812,
    alturaPx: 2176,
    cameraPresetId: "galaxy-z-fold",
    corAparelho: "#1a1a1a",
  },
  {
    id: "xiaomi-15-ultra",
    rotulo: "Xiaomi 15 Ultra",
    grupo: "Xiaomi",
    marcaSugerida: "xiaomi",
    larguraPx: 1440,
    alturaPx: 3200,
    cameraPresetId: "xiaomi-15-ultra",
    corAparelho: "#1a1a1a",
  },
  {
    id: "xiaomi-15-pro",
    rotulo: "Xiaomi 15 Pro",
    grupo: "Xiaomi",
    marcaSugerida: "xiaomi",
    larguraPx: 1440,
    alturaPx: 3200,
    cameraPresetId: "xiaomi-15-pro",
    corAparelho: "#1a1a1a",
  },
  {
    id: "xiaomi-15",
    rotulo: "Xiaomi 15",
    grupo: "Xiaomi",
    marcaSugerida: "xiaomi",
    larguraPx: 1200,
    alturaPx: 2670,
    cameraPresetId: "xiaomi-15",
    corAparelho: "#1a1a1a",
  },
  {
    id: "xiaomi-14-ultra",
    rotulo: "Xiaomi 14 Ultra",
    grupo: "Xiaomi",
    marcaSugerida: "xiaomi",
    larguraPx: 1440,
    alturaPx: 3200,
    cameraPresetId: "xiaomi-14-ultra",
    corAparelho: "#1a1a1a",
  },
  {
    id: "xiaomi-14-pro",
    rotulo: "Xiaomi 14 Pro",
    grupo: "Xiaomi",
    marcaSugerida: "xiaomi",
    larguraPx: 1440,
    alturaPx: 3200,
    cameraPresetId: "xiaomi-14-pro",
    corAparelho: "#1a1a1a",
  },
  {
    id: "xiaomi-14",
    rotulo: "Xiaomi 14",
    grupo: "Xiaomi",
    marcaSugerida: "xiaomi",
    larguraPx: 1200,
    alturaPx: 2670,
    cameraPresetId: "xiaomi-14",
    corAparelho: "#1a1a1a",
  },
  {
    id: "xiaomi-13-ultra",
    rotulo: "Xiaomi 13 Ultra",
    grupo: "Xiaomi",
    marcaSugerida: "xiaomi",
    larguraPx: 1440,
    alturaPx: 3200,
    cameraPresetId: "xiaomi-13-ultra",
    corAparelho: "#1a1a1a",
  },
  {
    id: "xiaomi-13-pro",
    rotulo: "Xiaomi 13 Pro",
    grupo: "Xiaomi",
    marcaSugerida: "xiaomi",
    larguraPx: 1440,
    alturaPx: 3200,
    cameraPresetId: "xiaomi-13-pro",
    corAparelho: "#1a1a1a",
  },
  {
    id: "xiaomi-13",
    rotulo: "Xiaomi 13",
    grupo: "Xiaomi",
    marcaSugerida: "xiaomi",
    larguraPx: 1080,
    alturaPx: 2400,
    cameraPresetId: "xiaomi-13",
    corAparelho: "#1a1a1a",
  },
  {
    id: "poco",
    rotulo: "POCO",
    grupo: "Xiaomi",
    marcaSugerida: "xiaomi",
    larguraPx: 1080,
    alturaPx: 2400,
    cameraPresetId: "poco",
    corAparelho: "#1a1a1a",
  },
  {
    id: "pixel-9",
    rotulo: "Google Pixel 9",
    grupo: "Google",
    marcaSugerida: "google",
    larguraPx: 1080,
    alturaPx: 2424,
    cameraPresetId: "pixel-9",
    corAparelho: "#1a1a1a",
  },
  {
    id: "pixel-8",
    rotulo: "Google Pixel 8",
    grupo: "Google",
    marcaSugerida: "google",
    larguraPx: 1080,
    alturaPx: 2400,
    cameraPresetId: "pixel-8",
    corAparelho: "#1a1a1a",
  },
  {
    id: "motorola",
    rotulo: "Motorola (Moto G / Edge)",
    grupo: "Outros",
    marcaSugerida: "motorola",
    larguraPx: 1080,
    alturaPx: 2400,
    cameraPresetId: "android-duplo",
    corAparelho: "#1a1a1a",
  },
  {
    id: "android-generico",
    rotulo: "Outro Android",
    grupo: "Outros",
    marcaSugerida: null,
    larguraPx: 1080,
    alturaPx: 2340,
    cameraPresetId: "android-triplo",
    corAparelho: "#1a1a1a",
  },
];

for (const e of extras) {
  if (rockIds.has(e.id)) continue;
  if (rockNames.has(e.rotulo.toLowerCase())) continue;
  presets.push(e);
}

const pLines = [];
pLines.push(
  'import type { CameraPresetId } from "@/features/personalizacao/cameraModules";',
);
pLines.push("");
pLines.push("/**");
pLines.push(
  " * Presets de aparelhos — catálogo RockB2B + extras Zen Pro",
);
pLines.push(
  " * (Google / foldable / Xiaomi que não estão no Rock).",
);
pLines.push(" */");
pLines.push("export type DispositivoPreset = {");
pLines.push("  id: string;");
pLines.push("  rotulo: string;");
pLines.push(
  '  marcaSugerida?: "apple" | "samsung" | "google" | "motorola" | "xiaomi" | null;',
);
pLines.push("  larguraPx: number;");
pLines.push("  alturaPx: number;");
pLines.push("  cameraPresetId: CameraPresetId;");
pLines.push("  corAparelho: string;");
pLines.push("};");
pLines.push("");
pLines.push(
  'export type DispositivoGrupo = "Apple" | "Samsung" | "Xiaomi" | "Google" | "Outros";',
);
pLines.push("");
pLines.push("export const DISPOSITIVOS_PRESETS: (DispositivoPreset & {");
pLines.push("  grupo: DispositivoGrupo;");
pLines.push("})[] = [");
for (const p of presets) {
  const marca =
    p.marcaSugerida === null ? "null" : JSON.stringify(p.marcaSugerida);
  pLines.push("  {");
  pLines.push(`    id: ${JSON.stringify(p.id)},`);
  pLines.push(`    rotulo: ${JSON.stringify(p.rotulo)},`);
  pLines.push(`    grupo: ${JSON.stringify(p.grupo)},`);
  pLines.push(`    marcaSugerida: ${marca},`);
  pLines.push(`    larguraPx: ${p.larguraPx},`);
  pLines.push(`    alturaPx: ${p.alturaPx},`);
  pLines.push(`    cameraPresetId: ${JSON.stringify(p.cameraPresetId)},`);
  pLines.push(`    corAparelho: ${JSON.stringify(p.corAparelho)},`);
  pLines.push("  },");
}
pLines.push("];");
pLines.push("");
pLines.push(
  "export function getDispositivoPreset(id: string): DispositivoPreset | undefined {",
);
pLines.push("  return DISPOSITIVOS_PRESETS.find((d) => d.id === id);");
pLines.push("}");
pLines.push("");

fs.writeFileSync(
  "src/features/admin/catalogo/dispositivosPresets.ts",
  pLines.join("\n"),
  "utf8",
);
console.log("wrote dispositivosPresets.ts", presets.length);

fs.writeFileSync(
  "tmp-rockb2b/dispositivos-presets.json",
  JSON.stringify(presets, null, 2),
);
