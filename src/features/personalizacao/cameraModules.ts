/**
 * Câmera realista por modelo — desenhada como SVG (usada como overlay Konva).
 *
 * Coordenadas normalizadas: x/raio em fração da LARGURA da capinha (W),
 * y em fração da ALTURA da capinha (H). O corpo da capinha fica transparente;
 * só o módulo de câmera é desenhado por cima da foto do cliente.
 *
 * Consultar rag_buscar("capinhas editor foto") antes de mexer no editor.
 */

export type Lente = {
  /** centro X (fração de W) */
  cx: number;
  /** centro Y (fração de H) */
  cy: number;
  /** raio (fração de W) */
  r: number;
};

export type Acessorio = {
  cx: number;
  cy: number;
  r: number;
  tipo: "flash" | "lidar" | "mic";
};

export type CameraModuleSpec = {
  /** Formato do módulo: barra horizontal (Pro 17+), pílula vertical, quadrado */
  formato: "barra" | "pilula" | "quadrado";
  /** Retângulo do platô (frações: x0/x1 de W, y0/y1 de H) */
  plateau: { x0: number; y0: number; x1: number; y1: number; radius: number };
  lentes: Lente[];
  acessorios: Acessorio[];
};

/**
 * Presets de layout de câmera — reutilizáveis por qualquer modelo.
 * O admin escolhe um preset ao cadastrar o modelo/celular; assim o mockup
 * muda conforme o aparelho sem precisar mexer no código.
 */
export const CAMERA_PRESETS = {
  // iPhone Pro/Pro Max — platô quadrado com 3 lentes + flash/LiDAR/mic
  "iphone-pro": {
    formato: "quadrado",
    plateau: { x0: 0.05, y0: 0.03, x1: 0.57, y1: 0.235, radius: 0.1 },
    lentes: [
      { cx: 0.19, cy: 0.08, r: 0.088 },
      { cx: 0.19, cy: 0.185, r: 0.088 },
      { cx: 0.4, cy: 0.132, r: 0.088 },
    ],
    acessorios: [
      { cx: 0.72, cy: 0.08, r: 0.03, tipo: "flash" },
      { cx: 0.72, cy: 0.135, r: 0.008, tipo: "mic" },
      { cx: 0.72, cy: 0.185, r: 0.024, tipo: "lidar" },
    ],
  },
  // iPhone padrão (13/14/15/16) — platô quadrado com 2 lentes na diagonal
  "iphone-padrao": {
    formato: "quadrado",
    plateau: { x0: 0.05, y0: 0.03, x1: 0.42, y1: 0.22, radius: 0.11 },
    lentes: [
      { cx: 0.16, cy: 0.075, r: 0.082 },
      { cx: 0.31, cy: 0.165, r: 0.082 },
    ],
    acessorios: [{ cx: 0.31, cy: 0.075, r: 0.026, tipo: "flash" }],
  },
  // Android tipo Galaxy S — 3 lentes verticais separadas, sem platô grande
  "android-triplo": {
    formato: "pilula",
    plateau: { x0: 0.07, y0: 0.03, x1: 0.2, y1: 0.32, radius: 0.07 },
    lentes: [
      { cx: 0.135, cy: 0.085, r: 0.055 },
      { cx: 0.135, cy: 0.175, r: 0.055 },
      { cx: 0.135, cy: 0.265, r: 0.055 },
    ],
    acessorios: [{ cx: 0.29, cy: 0.085, r: 0.022, tipo: "flash" }],
  },
  // Aparelho básico — 1 lente
  "lente-unica": {
    formato: "pilula",
    plateau: { x0: 0.07, y0: 0.03, x1: 0.22, y1: 0.16, radius: 0.08 },
    lentes: [{ cx: 0.145, cy: 0.095, r: 0.07 }],
    acessorios: [{ cx: 0.28, cy: 0.075, r: 0.022, tipo: "flash" }],
  },
  // iPhone antigo (X/11/12/13) — 2 lentes empilhadas na vertical (squircle)
  "iphone-dupla-vertical": {
    formato: "quadrado",
    plateau: { x0: 0.05, y0: 0.03, x1: 0.34, y1: 0.24, radius: 0.12 },
    lentes: [
      { cx: 0.135, cy: 0.085, r: 0.08 },
      { cx: 0.135, cy: 0.185, r: 0.08 },
    ],
    acessorios: [
      { cx: 0.255, cy: 0.09, r: 0.026, tipo: "flash" },
      { cx: 0.255, cy: 0.18, r: 0.008, tipo: "mic" },
    ],
  },
  // Google Pixel — barra horizontal atravessando quase toda a largura
  "pixel-barra": {
    formato: "barra",
    plateau: { x0: 0.05, y0: 0.05, x1: 0.95, y1: 0.16, radius: 0.055 },
    lentes: [
      { cx: 0.2, cy: 0.105, r: 0.05 },
      { cx: 0.34, cy: 0.105, r: 0.05 },
    ],
    acessorios: [
      { cx: 0.7, cy: 0.105, r: 0.02, tipo: "flash" },
      { cx: 0.8, cy: 0.105, r: 0.014, tipo: "lidar" },
      { cx: 0.86, cy: 0.105, r: 0.006, tipo: "mic" },
    ],
  },
  // Android premium — 4 lentes verticais (Galaxy Ultra)
  "android-quadruplo": {
    formato: "pilula",
    plateau: { x0: 0.06, y0: 0.03, x1: 0.19, y1: 0.4, radius: 0.06 },
    lentes: [
      { cx: 0.125, cy: 0.08, r: 0.052 },
      { cx: 0.125, cy: 0.165, r: 0.052 },
      { cx: 0.125, cy: 0.25, r: 0.052 },
      { cx: 0.125, cy: 0.335, r: 0.045 },
    ],
    acessorios: [{ cx: 0.27, cy: 0.08, r: 0.02, tipo: "flash" }],
  },
  // Android — módulo quadrado 2x2 (Galaxy A / Xiaomi)
  "android-quadrado": {
    formato: "quadrado",
    plateau: { x0: 0.05, y0: 0.03, x1: 0.4, y1: 0.25, radius: 0.09 },
    lentes: [
      { cx: 0.15, cy: 0.09, r: 0.062 },
      { cx: 0.3, cy: 0.09, r: 0.062 },
      { cx: 0.15, cy: 0.19, r: 0.062 },
      { cx: 0.3, cy: 0.19, r: 0.04 },
    ],
    acessorios: [{ cx: 0.3, cy: 0.19, r: 0.014, tipo: "flash" }],
  },
  // Android — 2 lentes verticais (intermediário)
  "android-duplo": {
    formato: "pilula",
    plateau: { x0: 0.07, y0: 0.03, x1: 0.2, y1: 0.23, radius: 0.07 },
    lentes: [
      { cx: 0.135, cy: 0.085, r: 0.055 },
      { cx: 0.135, cy: 0.175, r: 0.055 },
    ],
    acessorios: [{ cx: 0.28, cy: 0.085, r: 0.02, tipo: "flash" }],
  },
  // Módulo circular grande (Huawei / Nothing) — lentes ao redor do centro
  "android-circular": {
    formato: "quadrado",
    plateau: { x0: 0.28, y0: 0.03, x1: 0.72, y1: 0.29, radius: 0.22 },
    lentes: [
      { cx: 0.5, cy: 0.1, r: 0.06 },
      { cx: 0.4, cy: 0.2, r: 0.06 },
      { cx: 0.6, cy: 0.2, r: 0.06 },
    ],
    acessorios: [{ cx: 0.5, cy: 0.205, r: 0.018, tipo: "flash" }],
  },
  // Sem câmera traseira visível (capa lisa) — nenhum módulo
  "sem-camera": {
    formato: "quadrado",
    plateau: { x0: 0, y0: 0, x1: 0, y1: 0, radius: 0 },
    lentes: [],
    acessorios: [],
  },
} satisfies Record<string, CameraModuleSpec>;

export type CameraPresetId = keyof typeof CAMERA_PRESETS;

/** Opções para o admin escolher o layout de câmera de um modelo. */
export const CAMERA_PRESET_OPCOES: { id: CameraPresetId; rotulo: string }[] = [
  { id: "iphone-pro", rotulo: "iPhone Pro — 3 lentes (platô quadrado)" },
  { id: "iphone-padrao", rotulo: "iPhone padrão — 2 lentes (diagonal)" },
  { id: "iphone-dupla-vertical", rotulo: "iPhone X/11/12/13 — 2 lentes (vertical)" },
  { id: "pixel-barra", rotulo: "Google Pixel — barra horizontal" },
  { id: "android-triplo", rotulo: "Android — 3 lentes verticais" },
  { id: "android-quadruplo", rotulo: "Android — 4 lentes (Ultra)" },
  { id: "android-quadrado", rotulo: "Android — módulo quadrado 2x2" },
  { id: "android-duplo", rotulo: "Android — 2 lentes verticais" },
  { id: "android-circular", rotulo: "Circular grande (Huawei/Nothing)" },
  { id: "lente-unica", rotulo: "Básico — 1 lente" },
  { id: "sem-camera", rotulo: "Sem câmera (capa lisa)" },
];

const PRESET_PADRAO: CameraPresetId = "iphone-pro";

/** Cor padrão do corpo do aparelho por modelo (plateau = cor do corpo). */
const COR_APARELHO_PADRAO: Record<string, string> = {
  "iphone-17-pro-max": "#d1732a", // Cosmic Orange
  "iphone-15": "#e7e0d3", // Starlight
  "samsung-s24": "#3a3f44", // Onyx
};

/** Preset padrão por modelo conhecido (mock/seed). Admin pode sobrescrever. */
const PRESET_POR_MODELO: Record<string, CameraPresetId> = {
  "iphone-17-pro-max": "iphone-pro",
  "iphone-15": "iphone-padrao",
  "samsung-s24": "android-triplo",
};

export function getCameraPresetSpec(
  presetId?: string | null,
): CameraModuleSpec | null {
  if (!presetId) return null;
  return CAMERA_PRESETS[presetId as CameraPresetId] ?? null;
}

export function getCorAparelho(modeloId: string): string {
  return COR_APARELHO_PADRAO[modeloId] ?? "#8a8d93";
}

export function getCameraSpec(modeloId: string): CameraModuleSpec {
  const preset = PRESET_POR_MODELO[modeloId];
  return CAMERA_PRESETS[preset ?? PRESET_PADRAO];
}

export function modeloTemCameraDedicada(modeloId: string): boolean {
  return modeloId in PRESET_POR_MODELO;
}

function n(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function lenteSvg(cx: number, cy: number, r: number, idx: number): string {
  const rim = `lensRim${idx}`;
  const glass = `lensGlass${idx}`;
  // reflexo suave no topo-esquerdo (discreto — não lavar a foto)
  const reflexoX = cx - r * 0.3;
  const reflexoY = cy - r * 0.34;
  return `
    <g>
      <!-- sombra de contato no platô -->
      <circle cx="${n(cx)}" cy="${n(cy + r * 0.08)}" r="${n(
        r * 1.06,
      )}" fill="#000000" opacity="0.22"/>
      <!-- aro metálico escuro -->
      <circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="url(#${rim})"/>
      <circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.82)}" fill="#0a0b0e"/>
      <!-- vidro -->
      <circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.78)}" fill="url(#${glass})"/>
      <circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.32)}" fill="#04050a"/>
      <!-- reflexo diagonal discreto -->
      <ellipse cx="${n(reflexoX)}" cy="${n(reflexoY)}" rx="${n(r * 0.36)}" ry="${n(
        r * 0.2,
      )}" fill="#ffffff" opacity="0.14" transform="rotate(-35 ${n(reflexoX)} ${n(
        reflexoY,
      )})"/>
      <!-- catchlight azulado da lente -->
      <circle cx="${n(cx + r * 0.26)}" cy="${n(cy + r * 0.3)}" r="${n(
        r * 0.07,
      )}" fill="#4a7fb5" opacity="0.5"/>
    </g>`;
}

function lenteDefs(idx: number): string {
  const rim = `lensRim${idx}`;
  const glass = `lensGlass${idx}`;
  return `
    <radialGradient id="${rim}" cx="0.36" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#45464b"/>
      <stop offset="0.5" stop-color="#232428"/>
      <stop offset="1" stop-color="#08090b"/>
    </radialGradient>
    <radialGradient id="${glass}" cx="0.4" cy="0.34" r="0.82">
      <stop offset="0" stop-color="#232733"/>
      <stop offset="0.55" stop-color="#0f111a"/>
      <stop offset="1" stop-color="#030408"/>
    </radialGradient>`;
}

function acessorioSvg(a: Acessorio, W: number, H: number): string {
  const cx = a.cx * W;
  const cy = a.cy * H;
  const r = a.r * W;
  if (a.tipo === "flash") {
    return `
      <g>
        <circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="#1a1b1e"/>
        <circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.66)}" fill="#f4ead0"/>
        <circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.66)}" fill="url(#flashGrad)" opacity="0.6"/>
      </g>`;
  }
  if (a.tipo === "lidar") {
    return `
      <g>
        <circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="#141519"/>
        <circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.5)}" fill="#0a0b0e"/>
        <circle cx="${n(cx - r * 0.25)}" cy="${n(cy - r * 0.25)}" r="${n(
          r * 0.16,
        )}" fill="#2b3550" opacity="0.7"/>
      </g>`;
  }
  // mic
  return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="#0a0b0d"/>`;
}

/** Gera SVG do módulo de câmera dimensionado para a capinha (W×H em px). */
export function buildCameraModuleSvg(
  modeloId: string,
  W: number,
  H: number,
  corAparelho?: string,
): string {
  return buildCameraModuleSvgFromSpec(
    getCameraSpec(modeloId),
    W,
    H,
    corAparelho ?? getCorAparelho(modeloId),
  );
}

/** Igual ao acima, mas com spec/cor já resolvidos (Firestore ou context). */
export function buildCameraModuleSvgFromSpec(
  spec: CameraModuleSpec,
  W: number,
  H: number,
  corAparelho: string,
): string {
  const cor = corAparelho;
  const px0 = spec.plateau.x0 * W;
  const py0 = spec.plateau.y0 * H;
  const pw = (spec.plateau.x1 - spec.plateau.x0) * W;
  const ph = (spec.plateau.y1 - spec.plateau.y0) * H;
  const prad = spec.plateau.radius * W;

  const lentesDefs = spec.lentes.map((_, i) => lenteDefs(i)).join("");
  const lentesSvg = spec.lentes
    .map((l, i) => lenteSvg(l.cx * W, l.cy * H, l.r * W, i))
    .join("");
  const acessoriosSvg = spec.acessorios
    .map((a) => acessorioSvg(a, W, H))
    .join("");

  const rimW = W * 0.006;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(W)}" height="${n(
    H,
  )}" viewBox="0 0 ${n(W)} ${n(H)}">
  <defs>
    <linearGradient id="plateauSheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="0.32" stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="0.72" stop-color="#000000" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.28"/>
    </linearGradient>
    <radialGradient id="flashGrad" cx="0.5" cy="0.4" r="0.6">
      <stop offset="0" stop-color="#fffdf5"/>
      <stop offset="1" stop-color="#e8c98a"/>
    </radialGradient>
    <filter id="plateauShadow" x="-30%" y="-30%" width="160%" height="180%">
      <feDropShadow dx="0" dy="${n(H * 0.004)}" stdDeviation="${n(
        W * 0.022,
      )}" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
    ${lentesDefs}
  </defs>
  <!-- Platô na cor do aparelho -->
  <g filter="url(#plateauShadow)">
    <rect x="${n(px0)}" y="${n(py0)}" width="${n(pw)}" height="${n(
      ph,
    )}" rx="${n(prad)}" ry="${n(prad)}" fill="${cor}"/>
    <rect x="${n(px0)}" y="${n(py0)}" width="${n(pw)}" height="${n(
      ph,
    )}" rx="${n(prad)}" ry="${n(prad)}" fill="url(#plateauSheen)"/>
    <rect x="${n(px0 + rimW / 2)}" y="${n(py0 + rimW / 2)}" width="${n(
      pw - rimW,
    )}" height="${n(ph - rimW)}" rx="${n(prad)}" ry="${n(
      prad,
    )}" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="${n(
      rimW,
    )}"/>
  </g>
  ${lentesSvg}
  ${acessoriosSvg}
</svg>`;
}
