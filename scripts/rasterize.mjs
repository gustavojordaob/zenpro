import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const input = process.argv[2];
const output = process.argv[3] ?? input.replace(/\.svg$/, ".png");
const scale = Number(process.argv[4] ?? 2);

const svg = readFileSync(input);
await sharp(svg, { density: 96 * scale })
  .png()
  .toFile(output);

console.log(`OK -> ${output}`);
