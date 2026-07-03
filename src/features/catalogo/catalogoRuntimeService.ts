import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { IPHONE_ASSETS } from "@/features/personalizacao/moldura";
import { getModeloById as getModeloMockById, MODELOS } from "@/features/personalizacao/modelos";
import type { ModeloCelular } from "@/features/personalizacao/types";
import { COLECOES } from "@/features/multitenant/types";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  COLECOES_CATALOGO,
  type MarcaFirestore,
  type ModeloFirestore,
  type TipoPersonalizacao,
  type TipoProdutoCatalogoFirestore,
} from "./types";
import { parsePersonalizacaoVisualJson } from "./personalizacaoVisual";

export type TipoCatalogo = { id: string } & TipoProdutoCatalogoFirestore;
export type MarcaCatalogo = { id: string } & MarcaFirestore;
export type ModeloCatalogo = { id: string } & ModeloFirestore;

export type ModeloVisualAssets = {
  maskUrl: string;
  overlayUrl: string;
  larguraPx: number;
  alturaPx: number;
  previewWidth: number;
  stagePadding: number;
};

function mapTipo(id: string, data: DocumentData): TipoCatalogo {
  return {
    id,
    nome: String(data.nome ?? ""),
    tipoPersonalizacao:
      (data.tipoPersonalizacao as TipoPersonalizacao) ?? "mascara_modelo",
    ativo: Boolean(data.ativo),
    criadoEm: data.criadoEm,
    atualizadoEm: data.atualizadoEm,
  };
}

function mapMarca(id: string, data: DocumentData): MarcaCatalogo {
  return {
    id,
    nome: String(data.nome ?? ""),
    ativo: Boolean(data.ativo),
    criadoEm: data.criadoEm,
    atualizadoEm: data.atualizadoEm,
  };
}

function resolveAssetUrl(value: unknown, fallback: string): string {
  const trimmed = String(value ?? "").trim();
  return trimmed || fallback;
}

function mapModelo(id: string, data: DocumentData): ModeloCatalogo {
  const maskRaw = data.maskUrl ?? data.mask_url;
  const overlayRaw = data.overlayUrl ?? data.overlay_url;

  return {
    id,
    marcaId: String(data.marcaId ?? ""),
    nome: String(data.nome ?? data.modelo ?? id),
    maskUrl: resolveAssetUrl(maskRaw, IPHONE_ASSETS.maskUrl),
    overlayUrl: resolveAssetUrl(overlayRaw, IPHONE_ASSETS.overlayUrl),
    larguraPx: Number(data.larguraPx ?? data.largura_px ?? IPHONE_ASSETS.width),
    alturaPx: Number(data.alturaPx ?? data.altura_px ?? IPHONE_ASSETS.height),
    ativo: Boolean(data.ativo ?? true),
    personalizacao:
      parsePersonalizacaoVisualJson(data.personalizacao) ?? undefined,
    criadoEm: data.criadoEm,
    atualizadoEm: data.atualizadoEm,
  };
}

function modeloMockParaCatalogo(modelo: ModeloCelular): ModeloCatalogo {
  const isIphone = modelo.id === "iphone-15";
  return {
    id: modelo.id,
    marcaId: modelo.marca.toLowerCase().includes("apple")
      ? "apple"
      : "samsung",
    nome: modelo.modelo,
    maskUrl: isIphone
      ? IPHONE_ASSETS.maskUrl
      : "/molduras/moldura-capinha-generica.svg",
    overlayUrl: isIphone
      ? IPHONE_ASSETS.overlayUrl
      : "/molduras/moldura-capinha-generica.svg",
    larguraPx: modelo.larguraPx,
    alturaPx: modelo.alturaPx,
    ativo: true,
    criadoEm: null,
  };
}

export function modeloParaVisualAssets(modelo: ModeloCatalogo): ModeloVisualAssets {
  const previewWidth =
    modelo.larguraPx >= 1500 ? 280 : Math.min(280, Math.round(modelo.larguraPx * 0.18));
  return {
    maskUrl: resolveAssetUrl(modelo.maskUrl, IPHONE_ASSETS.maskUrl),
    overlayUrl: resolveAssetUrl(modelo.overlayUrl, IPHONE_ASSETS.overlayUrl),
    larguraPx: modelo.larguraPx,
    alturaPx: modelo.alturaPx,
    previewWidth,
    stagePadding: 40,
  };
}

export async function listarTiposAtivos(): Promise<TipoCatalogo[]> {
  if (!isFirebaseConfigured()) return [];
  const db = getFirebaseDb();
  const snap = await getDocs(
    query(collection(db, COLECOES_CATALOGO.TIPOS), where("ativo", "==", true)),
  );
  return snap.docs
    .map((d) => mapTipo(d.id, d.data()))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function listarMarcasAtivas(): Promise<MarcaCatalogo[]> {
  if (!isFirebaseConfigured()) return [];
  const db = getFirebaseDb();
  const snap = await getDocs(
    query(collection(db, COLECOES_CATALOGO.MARCAS), where("ativo", "==", true)),
  );
  return snap.docs
    .map((d) => mapMarca(d.id, d.data()))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function listarModelosAtivos(
  marcaId?: string | null,
): Promise<ModeloCatalogo[]> {
  if (!isFirebaseConfigured()) {
    return MODELOS.map(modeloMockParaCatalogo);
  }

  const db = getFirebaseDb();
  const snap = await getDocs(
    query(collection(db, COLECOES_CATALOGO.MODELOS), where("ativo", "==", true)),
  );
  let modelos = snap.docs.map((d) => mapModelo(d.id, d.data()));

  if (modelos.length === 0) {
    const legado = await getDocs(
      query(
        collection(db, COLECOES.MODELOS_CELULAR),
        where("ativo", "==", true),
      ),
    );
    modelos = legado.docs.map((d) => {
      const data = d.data();
      return mapModelo(d.id, {
        ...data,
        nome: data.modelo,
        marcaId: String(data.marca ?? "").toLowerCase().includes("apple")
          ? "apple"
          : "samsung",
      });
    });
  }

  if (modelos.length === 0) {
    return MODELOS.map(modeloMockParaCatalogo);
  }

  if (marcaId) {
    modelos = modelos.filter((m) => m.marcaId === marcaId);
  }

  return modelos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function obterModeloCatalogo(
  modeloId: string,
): Promise<ModeloCatalogo | null> {
  if (!isFirebaseConfigured()) {
    const mock = getModeloMockById(modeloId);
    return mock ? modeloMockParaCatalogo(mock) : null;
  }

  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, COLECOES_CATALOGO.MODELOS, modeloId));
  if (snap.exists()) return mapModelo(snap.id, snap.data());

  const legado = await getDoc(doc(db, COLECOES.MODELOS_CELULAR, modeloId));
  if (legado.exists()) {
    const data = legado.data();
    return mapModelo(legado.id, {
      ...data,
      nome: data.modelo,
      marcaId: String(data.marca ?? "").toLowerCase().includes("apple")
        ? "apple"
        : "samsung",
    });
  }

  const mock = getModeloMockById(modeloId);
  return mock ? modeloMockParaCatalogo(mock) : null;
}

export async function obterTipoCatalogo(
  tipoId: string,
): Promise<TipoCatalogo | null> {
  if (!isFirebaseConfigured()) return null;
  const snap = await getDoc(doc(getFirebaseDb(), COLECOES_CATALOGO.TIPOS, tipoId));
  if (!snap.exists()) return null;
  return mapTipo(snap.id, snap.data());
}

export function modeloCatalogoParaCelular(modelo: ModeloCatalogo): ModeloCelular {
  return {
    id: modelo.id,
    marca: modelo.marcaId,
    modelo: modelo.nome,
    larguraPx: modelo.larguraPx,
    alturaPx: modelo.alturaPx,
  };
}
