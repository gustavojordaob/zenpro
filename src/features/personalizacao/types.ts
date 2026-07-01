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
  fotoUrl: string;
  transform: Transform;
  textos?: import("./caseTextFonts").TextoCapinha[];
  titulo?: string;
  descricao?: string;
  arteProducaoUrl?: string;
};

export const DEFAULT_TRANSFORM: Transform = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
};
