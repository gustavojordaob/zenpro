export type { FonteCapinhaId, TextoCapinha } from "./caseTextFonts";

export type Transform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type CaseLayout = {
  molduraX: number;
  molduraY: number;
  molduraW: number;
  molduraH: number;
  stageWidth: number;
  stageHeight: number;
  areaUtil: { x: number; y: number; w: number; h: number };
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
  fotoUrl: string;
  transform: Transform;
  textos?: import("./caseTextFonts").TextoCapinha[];
  titulo?: string;
  descricao?: string;
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
