import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { COLECOES_CATALOGO, type ModeloFirestore } from "@/features/catalogo/types";
import { parsePersonalizacaoVisualJson } from "@/features/catalogo/personalizacaoVisual";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

export type ModeloCatalogoAdmin = { id: string } & ModeloFirestore;

export type ModeloFormInput = {
  marcaId: string;
  nome: string;
  maskUrl: string;
  overlayUrl: string;
  larguraPx: number;
  alturaPx: number;
  ativo: boolean;
  /** Cor do chassi no mock 2D (hex) — ex.: #1a1a1a */
  corAparelho?: string | null;
  /** Preset de layout de câmera (ex.: "iphone-pro") */
  cameraPresetId?: string | null;
};

function requireDb() {
  if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
  return getFirebaseDb();
}

function mapModelo(id: string, data: DocumentData): ModeloCatalogoAdmin {
  const personalizacao = parsePersonalizacaoVisualJson(data.personalizacao);
  return {
    id,
    marcaId: String(data.marcaId ?? ""),
    nome: String(data.nome ?? data.modelo ?? id),
    maskUrl: String(data.maskUrl ?? ""),
    overlayUrl: String(data.overlayUrl ?? ""),
    larguraPx: Number(data.larguraPx ?? 1568),
    alturaPx: Number(data.alturaPx ?? 3207),
    ativo: Boolean(data.ativo ?? true),
    personalizacao: personalizacao ?? undefined,
    criadoEm: data.criadoEm,
    atualizadoEm: data.atualizadoEm,
  };
}

function personalizacaoPayload(input: ModeloFormInput) {
  const payload: { corAparelho?: string; cameraPresetId?: string } = {};
  const cor = input.corAparelho?.trim();
  if (cor) payload.corAparelho = cor;
  const preset = input.cameraPresetId?.trim();
  if (preset) payload.cameraPresetId = preset;
  return Object.keys(payload).length > 0 ? payload : undefined;
}

export function gerarIdModelo(nome: string): string {
  const base = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || `modelo-${Date.now().toString(36)}`;
}

export async function listarModelosAdmin(): Promise<ModeloCatalogoAdmin[]> {
  const snap = await getDocs(collection(requireDb(), COLECOES_CATALOGO.MODELOS));
  return snap.docs
    .map((d) => mapModelo(d.id, d.data()))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function obterModeloAdmin(
  id: string,
): Promise<ModeloCatalogoAdmin | null> {
  const snap = await getDoc(doc(requireDb(), COLECOES_CATALOGO.MODELOS, id));
  if (!snap.exists()) return null;
  return mapModelo(snap.id, snap.data());
}

export async function criarModeloAdmin(input: ModeloFormInput): Promise<string> {
  const id = gerarIdModelo(input.nome);
  const personalizacao = personalizacaoPayload(input);
  await setDoc(doc(requireDb(), COLECOES_CATALOGO.MODELOS, id), {
    marcaId: input.marcaId,
    nome: input.nome.trim(),
    maskUrl: input.maskUrl.trim(),
    overlayUrl: input.overlayUrl.trim(),
    larguraPx: input.larguraPx,
    alturaPx: input.alturaPx,
    ativo: input.ativo,
    ...(personalizacao ? { personalizacao } : {}),
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
  return id;
}

export async function atualizarModeloAdmin(
  id: string,
  input: ModeloFormInput,
): Promise<void> {
  const personalizacao = personalizacaoPayload(input);
  await updateDoc(doc(requireDb(), COLECOES_CATALOGO.MODELOS, id), {
    marcaId: input.marcaId,
    nome: input.nome.trim(),
    maskUrl: input.maskUrl.trim(),
    overlayUrl: input.overlayUrl.trim(),
    larguraPx: input.larguraPx,
    alturaPx: input.alturaPx,
    ativo: input.ativo,
    ...(personalizacao ? { personalizacao } : { personalizacao: null }),
    atualizadoEm: serverTimestamp(),
  });
}

export async function alternarAtivoModeloAdmin(
  id: string,
  ativo: boolean,
): Promise<void> {
  await updateDoc(doc(requireDb(), COLECOES_CATALOGO.MODELOS, id), {
    ativo,
    atualizadoEm: serverTimestamp(),
  });
}
