/**
 * Dados do catálogo central para seed (espelha produtosMock + modelos).
 */
import { MODELOS } from "@/features/personalizacao/modelos";
import { IPHONE_ASSETS } from "@/features/personalizacao/moldura";
import {
  PRODUTOS_DESTAQUE,
  type ProdutoDestaque,
} from "@/features/loja/produtosMock";
import type { ProdutoCentralFirestore } from "./types";
import {
  COLECOES_CATALOGO,
  SEED_CATALOGO,
  type MarcaFirestore,
  type ModeloFirestore,
  type TipoProdutoCatalogoFirestore,
} from "@/features/catalogo/types";

export function getTiposSeed(): ({
  id: string;
} & Omit<TipoProdutoCatalogoFirestore, "criadoEm">)[] {
  return [
    {
      id: SEED_CATALOGO.TIPO_CAPINHA,
      nome: "Capinha",
      tipoPersonalizacao: "mascara_modelo",
      ativo: true,
    },
  ];
}

export function getMarcasSeed(): ({
  id: string;
} & Omit<MarcaFirestore, "criadoEm">)[] {
  return [
    { id: SEED_CATALOGO.MARCA_APPLE, nome: "Apple", ativo: true },
    { id: SEED_CATALOGO.MARCA_SAMSUNG, nome: "Samsung", ativo: true },
  ];
}

export function getModelosSeed(): ({
  id: string;
} & Omit<ModeloFirestore, "criadoEm">)[] {
  return MODELOS.map((modelo) => ({
    id: modelo.id,
    marcaId: modelo.id.includes("iphone")
      ? SEED_CATALOGO.MARCA_APPLE
      : SEED_CATALOGO.MARCA_SAMSUNG,
    nome: modelo.modelo,
    maskUrl:
      modelo.id === "iphone-15"
        ? IPHONE_ASSETS.maskUrl
        : "/molduras/moldura-capinha-generica.svg",
    overlayUrl:
      modelo.id === "iphone-15"
        ? IPHONE_ASSETS.overlayUrl
        : "/molduras/moldura-capinha-generica.svg",
    larguraPx: modelo.larguraPx,
    alturaPx: modelo.alturaPx,
    ativo: true,
    personalizacao: PERSONALIZACAO_POR_MODELO[modelo.id],
  }));
}

/** Preset de câmera + cor por modelo conhecido (espelha cameraModules). */
const PERSONALIZACAO_POR_MODELO: Record<
  string,
  ModeloFirestore["personalizacao"]
> = {
  "iphone-17-pro-max": { cameraPresetId: "iphone-pro", corAparelho: "#d1732a" },
  "iphone-15": { cameraPresetId: "iphone-padrao", corAparelho: "#e7e0d3" },
  "samsung-s24": { cameraPresetId: "android-triplo", corAparelho: "#3a3f44" },
};

export function produtoDestaqueParaCentral(
  produto: ProdutoDestaque,
): { id: string } & Omit<ProdutoCentralFirestore, "criadoEm"> {
  const marcaId = produto.modeloId.includes("iphone")
    ? SEED_CATALOGO.MARCA_APPLE
    : produto.modeloId.includes("samsung")
      ? SEED_CATALOGO.MARCA_SAMSUNG
      : null;

  return {
    id: produto.id,
    nome: produto.nome,
    descricao: produto.descricao,
    precoBaseCentavos: produto.precoCentavos,
    imagens: produto.imagemUrl ? [produto.imagemUrl] : [],
    ativo: true,
    tipoId: SEED_CATALOGO.TIPO_CAPINHA,
    modoVenda: produto.tipo,
    personalizavel: produto.tipo === "personalizada",
    material: produto.material ?? null,
    tipo: produto.tipo,
    categoria: produto.categoria,
    destaque: produto.destaque ?? null,
    marcaId,
    modelosCompativeis: [produto.modeloId],
    modeloId: produto.modeloId,
    marca: produto.marca,
  };
}

export function getCatalogoCentralSeed(): ({
  id: string;
} & Omit<ProdutoCentralFirestore, "criadoEm">)[] {
  return PRODUTOS_DESTAQUE.map(produtoDestaqueParaCentral);
}

/** @deprecated use getModelosSeed — mantido para compat */
export function getModelosCelularSeed() {
  return getModelosSeed().map((m) => ({
    id: m.id,
    marca: m.marcaId === SEED_CATALOGO.MARCA_APPLE ? "Apple" : "Samsung",
    modelo: m.nome,
    maskUrl: m.maskUrl,
    overlayUrl: m.overlayUrl,
    larguraPx: m.larguraPx,
    alturaPx: m.alturaPx,
    ativo: m.ativo,
  }));
}

export { COLECOES_CATALOGO, SEED_CATALOGO };

/** Loja oficial do dono (raiz do site "/") — papel `marca`. */
export const MARCA_LOJA_ID = "zenpro";
export const MARCA_LOJA_SLUG = "zenpro";
export const MARCA_LOJA_NOME = "Zen Pro";

/** IDs fixos usados no seed e nos testes de rules */
export const SEED_IDS = {
  LOJA_A: "loja-a",
  LOJA_B: "loja-b",
  PEDIDO_A: "pedido-loja-a-001",
  PEDIDO_B: "pedido-loja-b-001",
  SLUG_LOJA_A: "loja-a",
  SLUG_LOJA_B: "loja-b",
  LOJA_DEMO: "loja-a",
  LOJA_OUTRA: "loja-b",
  PEDIDO_DEMO: "pedido-loja-a-001",
  PEDIDO_OUTRA: "pedido-loja-b-001",
} as const;

export const SEED_AUTH = {
  MARCA_EMAIL: "marca@zenpro.test",
  MARCA_SENHA: "MarcaZenpro123!",
  REVENDEDOR_A_EMAIL: "revendedor-a@zenpro.test",
  REVENDEDOR_A_SENHA: "RevendedorA123!",
  REVENDEDOR_B_EMAIL: "revendedor-b@zenpro.test",
  REVENDEDOR_B_SENHA: "RevendedorB123!",
  REVENDEDOR_EMAIL: "revendedor-a@zenpro.test",
  REVENDEDOR_SENHA: "RevendedorA123!",
} as const;
