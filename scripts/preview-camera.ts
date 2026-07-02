import { writeFileSync, mkdirSync } from "node:fs";

const modeloId = process.argv[2] ?? "iphone-17-pro-max";

// Proporção real da capinha (1568×3207)
const W = 380;
const H = Math.round((3207 / 1568) * W);
const rx = W * 0.14;

// Recorte da câmera (furo vazio no topo esquerdo)
const camX = W * 0.05;
const camY = H * 0.028;
const camW = W * 0.52;
const camH = H * 0.205;
const camR = W * 0.1;

const preview = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="caseClip">
      <rect x="0" y="0" width="${W}" height="${H}" rx="${rx}" ry="${rx}"/>
    </clipPath>
    <linearGradient id="fotoDemo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f6b26b"/>
      <stop offset="0.4" stop-color="#e06c9f"/>
      <stop offset="0.75" stop-color="#7a5cc9"/>
      <stop offset="1" stop-color="#2c4a8a"/>
    </linearGradient>
    <filter id="caseDrop" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" rx="${rx}" ry="${rx}" fill="#0c0c0e" filter="url(#caseDrop)"/>

  <g clip-path="url(#caseClip)">
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#fotoDemo)"/>
    <!-- textura da foto demo -->
    <circle cx="${W * 0.7}" cy="${H * 0.55}" r="${W * 0.5}" fill="#ffffff" opacity="0.06"/>
    <circle cx="${W * 0.25}" cy="${H * 0.8}" r="${W * 0.4}" fill="#000000" opacity="0.08"/>

    <!-- recorte da câmera: espaço vazio (a foto não é impressa aqui) -->
    <rect x="${camX}" y="${camY}" width="${camW}" height="${camH}" rx="${camR}" ry="${camR}" fill="#f4f4f5"/>
    <rect x="${camX}" y="${camY}" width="${camW}" height="${camH}" rx="${camR}" ry="${camR}" fill="none" stroke="#000" stroke-opacity="0.18" stroke-width="1.5"/>
  </g>

  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${rx}" ry="${rx}" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="1.5"/>
</svg>`;

mkdirSync("preview", { recursive: true });
const out = `preview/camera-${modeloId}.svg`;
writeFileSync(out, preview, "utf8");
console.log(`OK -> ${out} (${W}x${H})`);
