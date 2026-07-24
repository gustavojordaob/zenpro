/** Efeito de fundo desfocado — não deve ser reconhecível como segunda foto */
export const BG_BLUR_RADIUS = 140;
export const BG_SATURATION = -1;
export const BG_DARKEN_OPACITY = 0.22;
export const BG_IMAGE_OPACITY = 0.45;
/** Escala extra no fundo para cobrir bordas ao arrastar */
export const BG_SCALE_BOOST = 1.35;

/** Canvas de arte fixo — padrão Stories Instagram (9:16, Full HD). */
export const ART_CANVAS = {
  width: 1080,
  height: 1920,
  previewWidth: 360,
  stagePadding: 16,
  /** Margem segura no topo (interface Stories) */
  safeTopRatio: 0.08,
  /** Margem segura embaixo */
  safeBottomRatio: 0.12,
} as const;

/**
 * Moldura visual no editor/preview — mesma proporção para TODOS os modelos.
 * Só o módulo de câmera muda por aparelho; arte e posicionamento são 9:16 fixos.
 */
export const MOLDURA_VISUAL = {
  aspect: ART_CANVAS.width / 2340,
  maxHeightRatio: 0.86,
  maxWidthRatio: 0.9,
} as const;

/** Máximo de fotos por personalização */
export const MAX_FOTOS_PERSONALIZACAO = 4;

/** Largura de exportação = canvas de arte (1080 px) */
export const EXPORT_ART_WIDTH = ART_CANVAS.width;

/** Cor de fundo padrão quando há espaço vazio na capa */
export const DEFAULT_COR_FUNDO_CAPINHA = "#ffffff";

/**
 * Borda do mockup — duas camadas para ficar legível em foto clara ou escura.
 * Anel escuro mais marcado: o branco sozinho some em fotos claras / fundo branco.
 */
export const CASE_BORDER = {
  /** Reflexo externo do TPU transparente. */
  outer: "rgba(255, 255, 255, 0.95)",
  /** Contorno interno suave que sugere espessura sem parecer moldura preta. */
  inner: "rgba(63, 63, 70, 0.38)",
  /** Fração da largura da moldura (anel externo) */
  widthRatio: 0.028,
} as const;

export const ZOOM_MIN = 0.08;
export const ZOOM_MAX = 5;
export const ZOOM_STEP = 0.12;

export const DESCRICAO_MAX = 500;
export const TITULO_MAX = 60;

export const SUGESTOES_PERSONALIZACAO = [
  "Presente especial 🎁",
  "Foto da família",
  "Minimalista — sem texto extra",
  "Cores vivas, estilo pop",
  "Fundo limpo, foco no rosto",
  "Estilo vintage / retrô",
] as const;
