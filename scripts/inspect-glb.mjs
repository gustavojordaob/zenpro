import { readFileSync } from "node:fs";

const path = process.argv[2] ?? "public/models/iphone_17_pro.glb";
const buf = readFileSync(path);

// GLB header: magic(4) version(4) length(4)
const magic = buf.readUInt32LE(0);
if (magic !== 0x46546c67) {
  console.error("Não é GLB válido (magic != glTF)");
  process.exit(1);
}
const version = buf.readUInt32LE(4);
const total = buf.readUInt32LE(8);
console.log(`GLB v${version}  tamanho=${(total / 1024 / 1024).toFixed(2)} MB`);

// primeira chunk = JSON
let offset = 12;
const chunkLen = buf.readUInt32LE(offset);
const chunkType = buf.readUInt32LE(offset + 4);
if (chunkType !== 0x4e4f534a) {
  console.error("Primeira chunk não é JSON");
  process.exit(1);
}
const jsonText = buf.slice(offset + 8, offset + 8 + chunkLen).toString("utf8");
const gltf = JSON.parse(jsonText);

const bin = offset + 8 + chunkLen;
const binChunkLen = bin + 8 <= total ? buf.readUInt32LE(bin) : 0;
console.log(`Chunk BIN: ${(binChunkLen / 1024 / 1024).toFixed(2)} MB`);

console.log("\n== NODES ==", gltf.nodes?.length ?? 0);
(gltf.nodes ?? []).forEach((nd, i) => {
  const info = [];
  if (nd.name) info.push(`name="${nd.name}"`);
  if (nd.mesh !== undefined) info.push(`mesh=${nd.mesh}`);
  if (nd.children) info.push(`children=[${nd.children.join(",")}]`);
  console.log(`  node[${i}] ${info.join(" ")}`);
});

const acc = gltf.accessors ?? [];
const matName = (idx) =>
  idx === undefined ? "-" : gltf.materials?.[idx]?.name ?? String(idx);
const fmt = (arr) =>
  arr ? "[" + arr.map((v) => v.toFixed(3)).join(", ") + "]" : "-";

console.log("\n== MESHES (bbox POSITION / UV range) ==", gltf.meshes?.length ?? 0);
(gltf.meshes ?? []).forEach((m, i) => {
  m.primitives.forEach((p) => {
    const posA = acc[p.attributes.POSITION];
    const uvA =
      p.attributes.TEXCOORD_0 !== undefined ? acc[p.attributes.TEXCOORD_0] : null;
    const size = posA?.min
      ? posA.max.map((v, k) => (v - posA.min[k]).toFixed(3)).join(" x ")
      : "?";
    console.log(
      `  mesh[${i}] mat=${matName(p.material)}\n      posMin=${fmt(
        posA?.min,
      )} posMax=${fmt(posA?.max)} size(${size})\n      uvMin=${fmt(
        uvA?.min,
      )} uvMax=${fmt(uvA?.max)} verts=${posA?.count ?? "?"}`,
    );
  });
});

console.log("\n== MATERIALS ==", gltf.materials?.length ?? 0);
(gltf.materials ?? []).forEach((mt, i) => {
  const pbr = mt.pbrMetallicRoughness ?? {};
  const base = pbr.baseColorFactor
    ? `rgba(${pbr.baseColorFactor.map((v) => v.toFixed(2)).join(",")})`
    : "-";
  console.log(
    `  material[${i}] name="${mt.name ?? ""}" baseColor=${base} baseTex=${
      pbr.baseColorTexture?.index ?? "-"
    } metallic=${pbr.metallicFactor ?? "-"} rough=${
      pbr.roughnessFactor ?? "-"
    }`,
  );
});

console.log("\n== TEXTURES ==", gltf.textures?.length ?? 0);
console.log("== IMAGES ==", gltf.images?.length ?? 0);
(gltf.images ?? []).forEach((im, i) => {
  console.log(`  image[${i}] name="${im.name ?? ""}" mime=${im.mimeType ?? "-"}`);
});
