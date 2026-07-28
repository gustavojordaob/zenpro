export type { FonteCapinhaId, TextoCapinha } from "./caseTextFonts";

export type Transform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

/** Uma foto na personalização (até 4). */
export type FotoPersonalizacao = {
  id: string;
  fotoUrl: string;
  transform: Transform;
};

export type CaseLayout = {
  molduraX: number;
  molduraY: number;
  molduraW: number;
  molduraH: number;
  stageWidth: number;
  stageHeight: number;
  /** Canvas 9:16 — posicionamento da foto e exportação. */
  areaUtil: { x: number; y: number; w: number; h: number };
  /** Recorte visual da capa no editor (formato celular). */
  areaMoldura: { x: number; y: number; w: number; h: number };
};

export type ModeloCelular = {
  id: string;
  marca: string;
  modelo: string;
  larguraPx: number;
  alturaPx: number;
};

export type Personalizacao = {
  modeloId: string;
  /** SKU da variante escolhida na vitrine */
  produtoId?: string;
  produtoNome?: string;
  precoCentavos?: number;
  material?: string;
  /** Dimensões do modelo — proporção da capa no preview/arte. */
  larguraPx?: number;
  alturaPx?: number;
  /** Molde do modelo (PNG/SVG) para o recorte da arte de produção. */
  maskUrl?: string;
  /** Câmera H5 RockB2B — punch + overlay (foto não cobre o módulo). */
  cameraFrameUrl?: string;
  /** Proporção W/H da silhueta H5 (preview/export). */
  molduraAspect?: number;
  /** Até 4 fotos — quando presente, substitui fotoUrl/transform únicos. */
  fotos?: FotoPersonalizacao[];
  fotoUrl: string;
  transform: Transform;
  textos?: import("./caseTextFonts").TextoCapinha[];
  titulo?: string;
  descricao?: string;
  /** Cor de preenchimento nos vãos (espaço sem foto). */
  corFundo?: string;
  arteProducaoUrl?: string;
  /** Só a foto do cliente (sem texto). */
  arteFotoUrl?: string;
  /** Só o texto do cliente (fundo transparente). */
  arteTextoUrl?: string;
};

export const DEFAULT_TRANSFORM: Transform = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
};
