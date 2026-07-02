import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import {
  COLECOES,
  type ItemPedidoLojaFirestore,
  type LojaFirestore,
  type PedidoLojaFirestore,
  type PedidoLojaStatus,
} from "@/features/multitenant/types";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { firestoreTimestampToMillis } from "@/lib/firestoreTimestamp";

export type PedidoAdmin = {
  id: string;
  lojaId: string;
} & PedidoLojaFirestore;

export type LojaResumo = {
  id: string;
  nome: string;
  slug: string;
};

function requireDb() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }
  return getFirebaseDb();
}

function mapItem(data: DocumentData): ItemPedidoLojaFirestore {
  const config = (data.config as Record<string, unknown> | undefined) ?? null;
  const modeloId = String(
    data.modeloId ?? (config?.modeloId as string | undefined) ?? "",
  );

  return {
    produtoId: String(data.produtoId ?? ""),
    modeloId,
    personalizacaoId: (data.personalizacaoId as string | null) ?? null,
    precoCentavos: Number(data.precoCentavos ?? 0),
    quantidade: Number(data.quantidade ?? 1),
    nomeProduto: data.nomeProduto ? String(data.nomeProduto) : undefined,
    tipoPersonalizacao:
      (data.tipoPersonalizacao as ItemPedidoLojaFirestore["tipoPersonalizacao"]) ??
      undefined,
    config,
    fotoUrl: (data.fotoUrl as string | null | undefined) ?? null,
    transform: data.transform ?? (config?.transform as ItemPedidoLojaFirestore["transform"]) ?? null,
    textos: data.textos ?? (config?.textos as ItemPedidoLojaFirestore["textos"]) ?? null,
    titulo: (data.titulo as string | null | undefined) ?? null,
    descricao: (data.descricao as string | null | undefined) ?? null,
    imagemUrl: data.imagemUrl ? String(data.imagemUrl) : undefined,
  };
}

function mapPedido(
  lojaId: string,
  pedidoId: string,
  data: DocumentData,
): PedidoAdmin {
  const itensRaw = Array.isArray(data.itens) ? data.itens : [];
  const clienteRaw = (data.cliente as DocumentData | undefined) ?? {};

  return {
    id: pedidoId,
    lojaId,
    itens: itensRaw.map((item) => mapItem(item as DocumentData)),
    totalCentavos: Number(data.totalCentavos ?? 0),
    status: (data.status as PedidoLojaStatus) ?? "aguardando_pagamento",
    cliente: {
      nome: String(clienteRaw.nome ?? ""),
      contato: String(clienteRaw.contato ?? clienteRaw.email ?? ""),
      endereco: String(clienteRaw.endereco ?? ""),
    },
    pagamento: {
      provider: (data.pagamento as DocumentData | undefined)?.provider ?? null,
      id: (data.pagamento as DocumentData | undefined)?.id ?? null,
      status: (data.pagamento as DocumentData | undefined)?.status ?? null,
      forma: (data.pagamento as DocumentData | undefined)?.forma ?? null,
    },
    origem: (data.origem as PedidoAdmin["origem"]) ?? "online",
    registradoPorUid: (data.registradoPorUid as string | null | undefined) ?? null,
    observacao: (data.observacao as string | null | undefined) ?? null,
    clienteUid: (data.clienteUid as string | null | undefined) ?? null,
    criadoEm: data.criadoEm,
    atualizadoEm: data.atualizadoEm,
  };
}

export async function listarLojasResumo(): Promise<LojaResumo[]> {
  const db = requireDb();
  const snap = await getDocs(collection(db, COLECOES.LOJAS));
  return snap.docs
    .map((d) => {
      const data = d.data() as LojaFirestore;
      return { id: d.id, nome: data.nome, slug: data.slug };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function listarPedidosLoja(lojaId: string): Promise<PedidoAdmin[]> {
  const db = requireDb();
  const snap = await getDocs(
    collection(db, COLECOES.LOJAS, lojaId, COLECOES.PEDIDOS),
  );
  return snap.docs
    .map((d) => mapPedido(lojaId, d.id, d.data()))
    .sort((a, b) => {
      const ta = formatTimestampSort(a.criadoEm);
      const tb = formatTimestampSort(b.criadoEm);
      return tb - ta;
    });
}

export async function listarTodosPedidos(
  lojaIdFiltro?: string | null,
): Promise<PedidoAdmin[]> {
  if (lojaIdFiltro) {
    return listarPedidosLoja(lojaIdFiltro);
  }

  // Não usar collectionGroup('pedidos'): existe também pedidos/{id} na raiz
  // (checkout legado) com rules diferentes — a query falha por permission-denied.
  const lojas = await listarLojasResumo();
  const listas = await Promise.all(
    lojas.map((loja) => listarPedidosLoja(loja.id)),
  );

  return listas.flat().sort((a, b) => {
    const ta = formatTimestampSort(a.criadoEm);
    const tb = formatTimestampSort(b.criadoEm);
    return tb - ta;
  });
}

export async function obterPedidoAdmin(
  lojaId: string,
  pedidoId: string,
): Promise<PedidoAdmin | null> {
  const db = requireDb();
  const snap = await getDoc(
    doc(db, COLECOES.LOJAS, lojaId, COLECOES.PEDIDOS, pedidoId),
  );
  if (!snap.exists()) return null;
  return mapPedido(lojaId, snap.id, snap.data());
}

export async function atualizarStatusPedidoAdmin(
  lojaId: string,
  pedidoId: string,
  status: PedidoLojaStatus,
): Promise<void> {
  const db = requireDb();
  await updateDoc(
    doc(db, COLECOES.LOJAS, lojaId, COLECOES.PEDIDOS, pedidoId),
    {
      status,
      atualizadoEm: serverTimestamp(),
    },
  );
}

function formatTimestampSort(criadoEm: unknown): number {
  return firestoreTimestampToMillis(criadoEm);
}
