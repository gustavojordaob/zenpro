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
 * Layouts físicos de câmera (reutilizados por vários modelos que compartilham
 * o mesmo desenho de lentes). Cada modelo real aponta para um destes.
 */
const SPEC_IPHONE_TRIPLO: CameraModuleSpec = {
  // Pro/Pro Max (13→17) — platô quadrado; flash/LiDAR ficam DENTRO do bump
  formato: "quadrado",
  plateau: { x0: 0.05, y0: 0.03, x1: 0.48, y1: 0.245, radius: 0.11 },
  lentes: [
    { cx: 0.165, cy: 0.085, r: 0.082 }, // principal (canto sup. esq.)
    { cx: 0.165, cy: 0.195, r: 0.082 }, // ultra-wide (canto inf. esq.)
    { cx: 0.33, cy: 0.14, r: 0.082 }, // telefoto (centro-direita)
  ],
  acessorios: [
    { cx: 0.415, cy: 0.085, r: 0.026, tipo: "flash" },
    { cx: 0.415, cy: 0.14, r: 0.007, tipo: "mic" },
    { cx: 0.415, cy: 0.195, r: 0.022, tipo: "lidar" },
  ],
};

const SPEC_IPHONE_17_PRO: CameraModuleSpec = {
  // iPhone 17 Pro / Pro Max — plateau HORIZONTAL full-width; 3 lentes à esq.
  formato: "barra",
  plateau: { x0: 0.04, y0: 0.03, x1: 0.96, y1: 0.205, radius: 0.06 },
  lentes: [
    { cx: 0.15, cy: 0.078, r: 0.056 }, // principal
    { cx: 0.15, cy: 0.16, r: 0.056 }, // ultra-wide
    { cx: 0.265, cy: 0.119, r: 0.056 }, // telefoto
  ],
  acessorios: [
    { cx: 0.82, cy: 0.09, r: 0.022, tipo: "flash" },
    { cx: 0.82, cy: 0.15, r: 0.016, tipo: "lidar" },
    { cx: 0.74, cy: 0.119, r: 0.006, tipo: "mic" },
  ],
};

const SPEC_IPHONE_DIAGONAL: CameraModuleSpec = {
  // 13/14/15 padrão e Plus — 2 lentes na diagonal (platô quadrado)
  formato: "quadrado",
  plateau: { x0: 0.05, y0: 0.03, x1: 0.42, y1: 0.22, radius: 0.11 },
  lentes: [
    { cx: 0.16, cy: 0.075, r: 0.082 },
    { cx: 0.31, cy: 0.165, r: 0.082 },
  ],
  acessorios: [{ cx: 0.31, cy: 0.075, r: 0.026, tipo: "flash" }],
};

const SPEC_IPHONE_PILL: CameraModuleSpec = {
  // iPhone 16 / 16 Plus — 2 lentes verticais em pílula
  formato: "pilula",
  plateau: { x0: 0.06, y0: 0.03, x1: 0.26, y1: 0.27, radius: 0.1 },
  lentes: [
    { cx: 0.16, cy: 0.1, r: 0.078 },
    { cx: 0.16, cy: 0.2, r: 0.078 },
  ],
  acessorios: [{ cx: 0.33, cy: 0.07, r: 0.024, tipo: "flash" }],
};

const SPEC_IPHONE_VERTICAL_SQUIRCLE: CameraModuleSpec = {
  // iPhone X/11/12/13 mini — 2 lentes empilhadas (squircle)
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
};

const SPEC_IPHONE_AIR: CameraModuleSpec = {
  // iPhone Air — plateau horizontal full-width; 1 lente grande à esq. + flash
  formato: "barra",
  plateau: { x0: 0.04, y0: 0.03, x1: 0.96, y1: 0.165, radius: 0.06 },
  lentes: [{ cx: 0.16, cy: 0.0975, r: 0.072 }],
  acessorios: [
    { cx: 0.3, cy: 0.0975, r: 0.022, tipo: "flash" },
    { cx: 0.84, cy: 0.0975, r: 0.007, tipo: "mic" },
  ],
};

const SPEC_IPHONE_UNICA: CameraModuleSpec = {
  // iPhone 16e / SE — 1 lente em platô pequeno
  formato: "quadrado",
  plateau: { x0: 0.05, y0: 0.03, x1: 0.27, y1: 0.19, radius: 0.11 },
  lentes: [{ cx: 0.16, cy: 0.11, r: 0.085 }],
  acessorios: [{ cx: 0.32, cy: 0.06, r: 0.022, tipo: "flash" }],
};

const SPEC_GALAXY_FLOAT3: CameraModuleSpec = {
  // Galaxy S22/S23/S24/S25 (não-Ultra) — 3 lentes soltas verticais
  formato: "pilula",
  plateau: { x0: 0.07, y0: 0.03, x1: 0.2, y1: 0.32, radius: 0.07 },
  lentes: [
    { cx: 0.135, cy: 0.085, r: 0.055 },
    { cx: 0.135, cy: 0.175, r: 0.055 },
    { cx: 0.135, cy: 0.265, r: 0.055 },
  ],
  acessorios: [{ cx: 0.29, cy: 0.085, r: 0.022, tipo: "flash" }],
};

const SPEC_GALAXY_ULTRA: CameraModuleSpec = {
  // Galaxy S22→S25 Ultra — lentes soltas: 3 grandes na coluna esq. + 4ª +
  // flash/laser numa coluna adjacente (sem platô).
  formato: "pilula",
  plateau: { x0: 0.06, y0: 0.03, x1: 0.14, y1: 0.34, radius: 0.04 },
  lentes: [
    { cx: 0.125, cy: 0.085, r: 0.056 }, // principal (coluna esq.)
    { cx: 0.125, cy: 0.185, r: 0.056 }, // ultra-wide
    { cx: 0.125, cy: 0.285, r: 0.056 }, // telefoto 3x
    { cx: 0.26, cy: 0.085, r: 0.045 }, // periscópio (coluna dir.)
  ],
  acessorios: [
    { cx: 0.26, cy: 0.185, r: 0.014, tipo: "lidar" }, // laser AF
    { cx: 0.26, cy: 0.255, r: 0.016, tipo: "flash" },
    { cx: 0.26, cy: 0.31, r: 0.006, tipo: "mic" },
  ],
};

const SPEC_GALAXY_S21_ULTRA: CameraModuleSpec = {
  // Galaxy S21 Ultra — módulo retangular grande (contour cut), 2 colunas
  formato: "quadrado",
  plateau: { x0: 0.05, y0: 0.02, x1: 0.44, y1: 0.36, radius: 0.08 },
  lentes: [
    { cx: 0.15, cy: 0.095, r: 0.058 },
    { cx: 0.15, cy: 0.2, r: 0.058 },
    { cx: 0.15, cy: 0.305, r: 0.058 },
    { cx: 0.31, cy: 0.095, r: 0.05 },
  ],
  acessorios: [
    { cx: 0.32, cy: 0.2, r: 0.014, tipo: "lidar" },
    { cx: 0.32, cy: 0.29, r: 0.016, tipo: "flash" },
  ],
};

const SPEC_GALAXY_S21: CameraModuleSpec = {
  // Galaxy S21/S21+ — módulo retangular no canto (contour cut), 3 lentes
  formato: "quadrado",
  plateau: { x0: 0.05, y0: 0.02, x1: 0.33, y1: 0.33, radius: 0.09 },
  lentes: [
    { cx: 0.135, cy: 0.085, r: 0.058 },
    { cx: 0.135, cy: 0.18, r: 0.058 },
    { cx: 0.135, cy: 0.275, r: 0.058 },
  ],
  acessorios: [
    { cx: 0.26, cy: 0.085, r: 0.02, tipo: "flash" },
    { cx: 0.26, cy: 0.16, r: 0.008, tipo: "mic" },
  ],
};

const SPEC_GALAXY_QUAD: CameraModuleSpec = {
  // Galaxy A / intermediário — módulo quadrado 2x2
  formato: "quadrado",
  plateau: { x0: 0.05, y0: 0.03, x1: 0.4, y1: 0.25, radius: 0.09 },
  lentes: [
    { cx: 0.15, cy: 0.09, r: 0.062 },
    { cx: 0.3, cy: 0.09, r: 0.062 },
    { cx: 0.15, cy: 0.19, r: 0.062 },
    { cx: 0.3, cy: 0.19, r: 0.04 },
  ],
  acessorios: [{ cx: 0.3, cy: 0.19, r: 0.014, tipo: "flash" }],
};

const SPEC_XIAOMI_LEICA: CameraModuleSpec = {
  // Xiaomi 13/14/15 e Pro (Leica) — módulo quadrado grande, 3 lentes
  formato: "quadrado",
  plateau: { x0: 0.05, y0: 0.03, x1: 0.5, y1: 0.3, radius: 0.13 },
  lentes: [
    { cx: 0.19, cy: 0.1, r: 0.095 },
    { cx: 0.38, cy: 0.1, r: 0.072 },
    { cx: 0.19, cy: 0.22, r: 0.072 },
  ],
  acessorios: [
    { cx: 0.38, cy: 0.22, r: 0.028, tipo: "flash" },
    { cx: 0.38, cy: 0.165, r: 0.018, tipo: "lidar" },
  ],
};

const SPEC_XIAOMI_ULTRA: CameraModuleSpec = {
  // Xiaomi 13/14/15 Ultra (Leica) — módulo CIRCULAR gigante, 4 lentes
  formato: "quadrado",
  plateau: { x0: 0.24, y0: 0.03, x1: 0.76, y1: 0.35, radius: 0.26 },
  lentes: [
    { cx: 0.44, cy: 0.11, r: 0.066 },
    { cx: 0.58, cy: 0.145, r: 0.06 },
    { cx: 0.42, cy: 0.24, r: 0.06 },
    { cx: 0.56, cy: 0.27, r: 0.055 },
  ],
  acessorios: [
    { cx: 0.66, cy: 0.1, r: 0.016, tipo: "flash" },
    { cx: 0.34, cy: 0.31, r: 0.008, tipo: "mic" },
  ],
};

const SPEC_REDMI: CameraModuleSpec = {
  // Redmi Note / Poco — lente principal grande + secundária
  formato: "quadrado",
  plateau: { x0: 0.05, y0: 0.03, x1: 0.3, y1: 0.33, radius: 0.1 },
  lentes: [
    { cx: 0.155, cy: 0.115, r: 0.088 },
    { cx: 0.155, cy: 0.245, r: 0.052 },
  ],
  acessorios: [{ cx: 0.27, cy: 0.09, r: 0.016, tipo: "flash" }],
};

const SPEC_PIXEL_8: CameraModuleSpec = {
  // Pixel 8 — barra horizontal que encosta nas laterais (visor), 2 lentes
  formato: "barra",
  plateau: { x0: 0.03, y0: 0.05, x1: 0.97, y1: 0.16, radius: 0.055 },
  lentes: [
    { cx: 0.2, cy: 0.105, r: 0.05 },
    { cx: 0.34, cy: 0.105, r: 0.05 },
  ],
  acessorios: [
    { cx: 0.72, cy: 0.105, r: 0.02, tipo: "flash" },
    { cx: 0.82, cy: 0.105, r: 0.012, tipo: "lidar" },
  ],
};

const SPEC_PIXEL_9: CameraModuleSpec = {
  // Pixel 9 — cápsula/ilha central que NÃO encosta nas laterais, 2 lentes
  formato: "pilula",
  plateau: { x0: 0.14, y0: 0.04, x1: 0.86, y1: 0.175, radius: 0.068 },
  lentes: [
    { cx: 0.31, cy: 0.108, r: 0.05 },
    { cx: 0.45, cy: 0.108, r: 0.05 },
  ],
  acessorios: [
    { cx: 0.65, cy: 0.108, r: 0.02, tipo: "flash" },
    { cx: 0.74, cy: 0.108, r: 0.01, tipo: "lidar" },
  ],
};

const SPEC_ANDROID_DUPLO: CameraModuleSpec = {
  formato: "pilula",
  plateau: { x0: 0.07, y0: 0.03, x1: 0.2, y1: 0.23, radius: 0.07 },
  lentes: [
    { cx: 0.135, cy: 0.085, r: 0.055 },
    { cx: 0.135, cy: 0.175, r: 0.055 },
  ],
  acessorios: [{ cx: 0.28, cy: 0.085, r: 0.02, tipo: "flash" }],
};

const SPEC_ANDROID_CIRCULAR: CameraModuleSpec = {
  formato: "quadrado",
  plateau: { x0: 0.28, y0: 0.03, x1: 0.72, y1: 0.29, radius: 0.22 },
  lentes: [
    { cx: 0.5, cy: 0.1, r: 0.06 },
    { cx: 0.4, cy: 0.2, r: 0.06 },
    { cx: 0.6, cy: 0.2, r: 0.06 },
  ],
  acessorios: [{ cx: 0.5, cy: 0.205, r: 0.018, tipo: "flash" }],
};

const SPEC_LENTE_UNICA: CameraModuleSpec = {
  formato: "pilula",
  plateau: { x0: 0.07, y0: 0.03, x1: 0.22, y1: 0.16, radius: 0.08 },
  lentes: [{ cx: 0.145, cy: 0.095, r: 0.07 }],
  acessorios: [{ cx: 0.28, cy: 0.075, r: 0.022, tipo: "flash" }],
};

const SPEC_SEM_CAMERA: CameraModuleSpec = {
  formato: "quadrado",
  plateau: { x0: 0, y0: 0, x1: 0, y1: 0, radius: 0 },
  lentes: [],
  acessorios: [],
};

/**
 * Presets de câmera por MODELO real (o mockup fica igual ao aparelho).
 * Modelos que compartilham o mesmo desenho apontam para o mesmo SPEC.
 * As chaves genéricas (android-triplo etc.) são mantidas p/ compatibilidade.
 */
export const CAMERA_PRESETS = {
  // ——— iPhone (13 → 17 + Air) ———
  "iphone-air": SPEC_IPHONE_AIR,
  "iphone-17-pro": SPEC_IPHONE_17_PRO,
  "iphone-17": SPEC_IPHONE_PILL,
  "iphone-16-pro": SPEC_IPHONE_TRIPLO,
  "iphone-16": SPEC_IPHONE_PILL,
  "iphone-16e": SPEC_IPHONE_UNICA,
  "iphone-15-pro": SPEC_IPHONE_TRIPLO,
  "iphone-15": SPEC_IPHONE_DIAGONAL,
  "iphone-14-pro": SPEC_IPHONE_TRIPLO,
  "iphone-14": SPEC_IPHONE_DIAGONAL,
  "iphone-13-pro": SPEC_IPHONE_TRIPLO,
  "iphone-13": SPEC_IPHONE_DIAGONAL,
  "iphone-13-mini": SPEC_IPHONE_VERTICAL_SQUIRCLE,

  // ——— Samsung Galaxy (modernos) ———
  "galaxy-s25-ultra": SPEC_GALAXY_ULTRA,
  "galaxy-s25": SPEC_GALAXY_FLOAT3,
  "galaxy-s24-ultra": SPEC_GALAXY_ULTRA,
  "galaxy-s24": SPEC_GALAXY_FLOAT3,
  "galaxy-s23-ultra": SPEC_GALAXY_ULTRA,
  "galaxy-s23": SPEC_GALAXY_FLOAT3,
  "galaxy-s22-ultra": SPEC_GALAXY_ULTRA,
  "galaxy-s22": SPEC_GALAXY_FLOAT3,
  "galaxy-s21-ultra": SPEC_GALAXY_S21_ULTRA,
  "galaxy-s21": SPEC_GALAXY_S21,
  "galaxy-fe": SPEC_GALAXY_FLOAT3,
  "galaxy-a": SPEC_GALAXY_QUAD,
  "galaxy-z-flip": SPEC_ANDROID_DUPLO,
  "galaxy-z-fold": SPEC_GALAXY_FLOAT3,

  // ——— Xiaomi (modernos) ———
  "xiaomi-15-ultra": SPEC_XIAOMI_ULTRA,
  "xiaomi-15-pro": SPEC_XIAOMI_LEICA,
  "xiaomi-15": SPEC_XIAOMI_LEICA,
  "xiaomi-14-ultra": SPEC_XIAOMI_ULTRA,
  "xiaomi-14-pro": SPEC_XIAOMI_LEICA,
  "xiaomi-14": SPEC_XIAOMI_LEICA,
  "xiaomi-13-ultra": SPEC_XIAOMI_ULTRA,
  "xiaomi-13-pro": SPEC_XIAOMI_LEICA,
  "xiaomi-13": SPEC_XIAOMI_LEICA,
  "redmi-note": SPEC_REDMI,
  poco: SPEC_GALAXY_QUAD,

  // ——— Google ———
  "pixel-9": SPEC_PIXEL_9,
  "pixel-8": SPEC_PIXEL_8,

  // ——— Genéricos (compatibilidade / fallback) ———
  "iphone-pro": SPEC_IPHONE_TRIPLO,
  "iphone-padrao": SPEC_IPHONE_DIAGONAL,
  "iphone-dupla-vertical": SPEC_IPHONE_VERTICAL_SQUIRCLE,
  "pixel-barra": SPEC_PIXEL_8,
  "android-triplo": SPEC_GALAXY_FLOAT3,
  "android-quadruplo": SPEC_GALAXY_ULTRA,
  "android-quadrado": SPEC_GALAXY_QUAD,
  "android-duplo": SPEC_ANDROID_DUPLO,
  "android-circular": SPEC_ANDROID_CIRCULAR,
  "lente-unica": SPEC_LENTE_UNICA,
  "sem-camera": SPEC_SEM_CAMERA,
} satisfies Record<string, CameraModuleSpec>;

export type CameraPresetId = keyof typeof CAMERA_PRESETS;

/** Opções (agrupadas) para o admin escolher o layout de câmera de um modelo. */
export const CAMERA_PRESET_OPCOES: {
  id: CameraPresetId;
  rotulo: string;
  grupo: string;
}[] = [
  // iPhone
  { id: "iphone-air", rotulo: "iPhone Air", grupo: "iPhone" },
  { id: "iphone-17-pro", rotulo: "iPhone 17 Pro / Pro Max (barra)", grupo: "iPhone" },
  { id: "iphone-17", rotulo: "iPhone 17", grupo: "iPhone" },
  { id: "iphone-16-pro", rotulo: "iPhone 16 Pro / Pro Max", grupo: "iPhone" },
  { id: "iphone-16", rotulo: "iPhone 16 / 16 Plus", grupo: "iPhone" },
  { id: "iphone-16e", rotulo: "iPhone 16e", grupo: "iPhone" },
  { id: "iphone-15-pro", rotulo: "iPhone 15 Pro / Pro Max", grupo: "iPhone" },
  { id: "iphone-15", rotulo: "iPhone 15 / 15 Plus", grupo: "iPhone" },
  { id: "iphone-14-pro", rotulo: "iPhone 14 Pro / Pro Max", grupo: "iPhone" },
  { id: "iphone-14", rotulo: "iPhone 14 / 14 Plus", grupo: "iPhone" },
  { id: "iphone-13-pro", rotulo: "iPhone 13 Pro / Pro Max", grupo: "iPhone" },
  { id: "iphone-13", rotulo: "iPhone 13", grupo: "iPhone" },
  { id: "iphone-13-mini", rotulo: "iPhone 13 mini", grupo: "iPhone" },
  // Samsung
  { id: "galaxy-s25-ultra", rotulo: "Galaxy S25 Ultra", grupo: "Samsung Galaxy" },
  { id: "galaxy-s25", rotulo: "Galaxy S25 / S25+", grupo: "Samsung Galaxy" },
  { id: "galaxy-s24-ultra", rotulo: "Galaxy S24 Ultra", grupo: "Samsung Galaxy" },
  { id: "galaxy-s24", rotulo: "Galaxy S24 / S24+", grupo: "Samsung Galaxy" },
  { id: "galaxy-s23-ultra", rotulo: "Galaxy S23 Ultra", grupo: "Samsung Galaxy" },
  { id: "galaxy-s23", rotulo: "Galaxy S23 / S23+", grupo: "Samsung Galaxy" },
  { id: "galaxy-s22-ultra", rotulo: "Galaxy S22 Ultra", grupo: "Samsung Galaxy" },
  { id: "galaxy-s22", rotulo: "Galaxy S22 / S22+", grupo: "Samsung Galaxy" },
  { id: "galaxy-s21-ultra", rotulo: "Galaxy S21 Ultra", grupo: "Samsung Galaxy" },
  { id: "galaxy-s21", rotulo: "Galaxy S21 / S21+", grupo: "Samsung Galaxy" },
  { id: "galaxy-fe", rotulo: "Galaxy S FE", grupo: "Samsung Galaxy" },
  { id: "galaxy-a", rotulo: "Galaxy A (série A)", grupo: "Samsung Galaxy" },
  { id: "galaxy-z-flip", rotulo: "Galaxy Z Flip", grupo: "Samsung Galaxy" },
  { id: "galaxy-z-fold", rotulo: "Galaxy Z Fold", grupo: "Samsung Galaxy" },
  // Xiaomi
  { id: "xiaomi-15-ultra", rotulo: "Xiaomi 15 Ultra (Leica circular)", grupo: "Xiaomi" },
  { id: "xiaomi-15-pro", rotulo: "Xiaomi 15 Pro (Leica)", grupo: "Xiaomi" },
  { id: "xiaomi-15", rotulo: "Xiaomi 15 (Leica)", grupo: "Xiaomi" },
  { id: "xiaomi-14-ultra", rotulo: "Xiaomi 14 Ultra (Leica circular)", grupo: "Xiaomi" },
  { id: "xiaomi-14-pro", rotulo: "Xiaomi 14 Pro (Leica)", grupo: "Xiaomi" },
  { id: "xiaomi-14", rotulo: "Xiaomi 14 (Leica)", grupo: "Xiaomi" },
  { id: "xiaomi-13-ultra", rotulo: "Xiaomi 13 Ultra (Leica circular)", grupo: "Xiaomi" },
  { id: "xiaomi-13-pro", rotulo: "Xiaomi 13 Pro (Leica)", grupo: "Xiaomi" },
  { id: "xiaomi-13", rotulo: "Xiaomi 13 (Leica)", grupo: "Xiaomi" },
  { id: "redmi-note", rotulo: "Redmi Note", grupo: "Xiaomi" },
  { id: "poco", rotulo: "POCO", grupo: "Xiaomi" },
  // Google
  { id: "pixel-9", rotulo: "Google Pixel 9", grupo: "Google" },
  { id: "pixel-8", rotulo: "Google Pixel 8", grupo: "Google" },
  // Genéricos
  { id: "iphone-pro", rotulo: "iPhone Pro (genérico — 3 lentes)", grupo: "Genéricos" },
  { id: "iphone-padrao", rotulo: "iPhone padrão (genérico — 2 lentes)", grupo: "Genéricos" },
  { id: "android-triplo", rotulo: "Android — 3 lentes verticais", grupo: "Genéricos" },
  { id: "android-quadruplo", rotulo: "Android — 4 lentes (Ultra)", grupo: "Genéricos" },
  { id: "android-quadrado", rotulo: "Android — módulo quadrado 2x2", grupo: "Genéricos" },
  { id: "android-duplo", rotulo: "Android — 2 lentes verticais", grupo: "Genéricos" },
  { id: "android-circular", rotulo: "Circular grande (Huawei/Nothing)", grupo: "Genéricos" },
  { id: "lente-unica", rotulo: "Básico — 1 lente", grupo: "Genéricos" },
  { id: "sem-camera", rotulo: "Sem câmera (capa lisa)", grupo: "Genéricos" },
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
