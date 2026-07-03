import type { TextoCapinha } from "@/features/personalizacao/caseTextFonts";
import type { Transform } from "@/features/personalizacao/types";
import type { PersonalizacaoVisualFirestore } from "./personalizacaoVisual";

/** Como o produto se personaliza — extensível no futuro */
export const TIPOS_PERSONALIZACAO = [
  "mascara_modelo",
  "wrap_cilindrico",
  "recorte_tela",
] as const;

export type TipoPersonalizacao = (typeof TIPOS_PERSONALIZACAO)[number];

export const ROTULOS_TIPO_PERSONALIZACAO: Record<TipoPersonalizacao, string> = {
  mascara_modelo: "Máscara por modelo (capinha)",
  wrap_cilindrico: "Wrap cilíndrico (em breve)",
  recorte_tela: "Recorte de tela (em breve)",
};

export function tipoPersonalizacaoImplementado(
  tipo: TipoPersonalizacao,
): boolean {
  return tipo === "mascara_modelo";
}

/** `tipos/{tipoId}` */
export type TipoProdutoCatalogoFirestore = {
  nome: string;
  tipoPersonalizacao: TipoPersonalizacao;
  ativo: boolean;
  criadoEm: unknown;
  atualizadoEm?: unknown;
};

/** `marcas/{marcaId}` */
export type MarcaFirestore = {
  nome: string;
  ativo: boolean;
  criadoEm: unknown;
  atualizadoEm?: unknown;
};

/** `modelos/{modeloId}` — aparelho (geometria + câmera) */
export type ModeloFirestore = {
  marcaId: string;
  nome: string;
  maskUrl: string;
  overlayUrl: string;
  larguraPx: number;
  alturaPx: number;
  ativo: boolean;
  /** Overrides visuais (câmera, moldura, cor) — sobrescreve SPECS em código */
  personalizacao?: PersonalizacaoVisualFirestore;
  criadoEm: unknown;
  atualizadoEm?: unknown;
};

/** Config flexível — capinha (`mascara_modelo`) */
export type ConfigPersonalizacaoMascaraModelo = {
  modeloId: string;
  /** SKU da variante (couro, silicone…) */
  produtoId?: string | null;
  material?: string | null;
  /** Dimensões do modelo — proporção da capa. */
  larguraPx?: number | null;
  alturaPx?: number | null;
  /** Molde do modelo (PNG/SVG). */
  maskUrl?: string | null;
  transform: Transform;
  textos?: TextoCapinha[] | null;
  titulo?: string | null;
  descricao?: string | null;
};

export const COLECOES_CATALOGO = {
  TIPOS: "tipos",
  MARCAS: "marcas",
  MODELOS: "modelos",
} as const;

export const SEED_CATALOGO = {
  TIPO_CAPINHA: "capinha",
  MARCA_APPLE: "apple",
  MARCA_SAMSUNG: "samsung",
} as const;
