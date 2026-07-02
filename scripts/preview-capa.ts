import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { buildCaseFrameSvg } from "../src/features/personalizacao/caseFrame";

const modeloId = process.argv[2] ?? "iphone-17-pro-max";
const fotoPath =
  process.argv[3] ??
  "C:/Users/gusta/.cursor/projects/c-Users-gusta-projetos-zenpro/assets/c__Users_gusta_AppData_Roaming_Cursor_User_workspaceStorage_70569ef5776a5787e0c28efb0518842e_images_Onboarding---3-24c22058-66b6-4040-853b-124a740c5dea.png";

// Proporção da capinha (retrato)
const W = 400;
const H = 820;
const rx = W * 0.13;

void readFileSync;
void fotoPath;
void rx;

const svg = buildCaseFrameSvg(modeloId, W, H);

mkdirSync("preview", { recursive: true });
const out = `preview/overlay-${modeloId}.svg`;
writeFileSync(out, svg, "utf8");
console.log(`OK -> ${out} (${W}x${H})`);
