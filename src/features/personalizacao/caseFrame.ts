/**
 * Moldura da capa (estilo template Canva): borda arredondada + janela branca
 * da câmera no topo. Miolo transparente — a foto entra por baixo.
 */

export type CaseFrameSpec = {
  /** raio do canto da capa (fração de W) */
  radius: number;
  /** janela da câmera (frações: x/W, y/H) */
  camera: { x0: number; y0: number; x1: number; y1: number; radius: number };
};

const SPECS: Record<string, CaseFrameSpec> = {
  "iphone-17-pro-max": {
    radius: 0.15,
    camera: { x0: 0.04, y0: 0.028, x1: 0.95, y1: 0.28, radius: 0.06 },
  },
};

export function getCaseFrameSpec(modeloId: string): CaseFrameSpec {
  return SPECS[modeloId] ?? SPECS["iphone-17-pro-max"];
}

function n(v: number): string {
  return Math.round(v * 100) / 100 + "";
}

/** SVG só da borda da capa (câmera é desenhada à parte). */
export function buildCaseFrameSvg(
  modeloId: string,
  W: number,
  H: number,
): string {
  const spec = getCaseFrameSpec(modeloId);
  const r = spec.radius * W;
  const border = W * 0.012;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(W)}" height="${n(
    H,
  )}" viewBox="0 0 ${n(W)} ${n(H)}">
  <rect x="${n(border / 2)}" y="${n(border / 2)}" width="${n(
    W - border,
  )}" height="${n(H - border)}" rx="${n(r)}" ry="${n(
    r,
  )}" fill="none" stroke="#cbe6fb" stroke-width="${n(border)}"/>
</svg>`;
}
