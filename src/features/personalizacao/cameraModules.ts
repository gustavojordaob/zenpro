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

/** Cor padrão do aparelho por modelo (plateau = cor do corpo). */
const COR_APARELHO_PADRAO: Record<string, string> = {
  "iphone-17-pro-max": "#d1732a", // Cosmic Orange
};

/** Cada modelo aponta para uma spec; fallback = pro max. */
const SPECS: Record<string, CameraModuleSpec> = {
  "iphone-17-pro-max": {
    formato: "quadrado",
    // Platô quadrado no canto superior esquerdo; só as 3 lentes
    plateau: { x0: 0.05, y0: 0.03, x1: 0.57, y1: 0.235, radius: 0.1 },
    lentes: [
      { cx: 0.19, cy: 0.08, r: 0.088 },
      { cx: 0.19, cy: 0.185, r: 0.088 },
      { cx: 0.4, cy: 0.132, r: 0.088 },
    ],
    // Flash / mic / LiDAR separados, à direita fora do platô
    acessorios: [
      { cx: 0.72, cy: 0.08, r: 0.03, tipo: "flash" },
      { cx: 0.72, cy: 0.135, r: 0.008, tipo: "mic" },
      { cx: 0.72, cy: 0.185, r: 0.024, tipo: "lidar" },
    ],
  },
};

export function getCorAparelho(modeloId: string): string {
  return COR_APARELHO_PADRAO[modeloId] ?? "#8a8d93";
}

export function getCameraSpec(modeloId: string): CameraModuleSpec {
  return SPECS[modeloId] ?? SPECS["iphone-17-pro-max"];
}

export function modeloTemCameraDedicada(modeloId: string): boolean {
  return modeloId in SPECS;
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

/** Gera o SVG do módulo de câmera dimensionado para a capinha (W×H em px). */
export function buildCameraModuleSvg(
  modeloId: string,
  W: number,
  H: number,
  corAparelho?: string,
): string {
  const spec = getCameraSpec(modeloId);
  const cor = corAparelho ?? getCorAparelho(modeloId);
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
