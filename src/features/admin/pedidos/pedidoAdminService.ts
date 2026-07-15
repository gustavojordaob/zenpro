import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  COLECOES,
  type ItemPedidoLojaFirestore,
  type LojaFirestore,
  type NotaFiscalFirestore,
  type PedidoEnvioFirestore,
  type PedidoLojaFirestore,
  type PedidoLojaStatus,
} from "@/features/multitenant/types";
import { getFirebaseDb, getFirebaseFunctions, isFirebaseConfigured } from "@/lib/firebase";
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
    totalProdutosCentavos:
      data.totalProdutosCentavos != null
        ? Number(data.totalProdutosCentavos)
        : undefined,
    frete: (data.frete as PedidoAdmin["frete"]) ?? null,
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
      formaOnline: (data.pagamento as DocumentData | undefined)?.formaOnline ?? null,
      checkoutUrl: (data.pagamento as DocumentData | undefined)?.checkoutUrl ?? null,
      parcelas: (data.pagamento as DocumentData | undefined)?.parcelas ?? null,
      metodoMp: (data.pagamento as DocumentData | undefined)?.metodoMp ?? null,
    },
    pagamentoLiberadoEnvio: Boolean(data.pagamentoLiberadoEnvio),
    envio: (data.envio as PedidoEnvioFirestore | undefined) ?? null,
    notaFiscal: (data.notaFiscal as NotaFiscalFirestore | undefined) ?? null,
    origem: (data.origem as PedidoAdmin["origem"]) ?? "online",
    registradoPorUid: (data.registradoPorUid as string | null | undefined) ?? null,
    observacao: (data.observacao as string | null | undefined) ?? null,
    clienteUid: (data.clienteUid as string | null | undefined) ?? null,
    filaProducaoMarca: Boolean(data.filaProducaoMarca),
    origemLojaId: (data.origemLojaId as string | null | undefined) ?? null,
    origemLojaNome: (data.origemLojaNome as string | null | undefined) ?? null,
    origemPedidoId: (data.origemPedidoId as string | null | undefined) ?? null,
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

export function observarPedidoAdmin(
  lojaId: string,
  pedidoId: string,
  onChange: (pedido: PedidoAdmin | null) => void,
): () => void {
  const db = requireDb();
  return onSnapshot(
    doc(db, COLECOES.LOJAS, lojaId, COLECOES.PEDIDOS, pedidoId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(mapPedido(lojaId, snap.id, snap.data()));
    },
  );
}

export async function atualizarStatusPedidoAdmin(
  lojaId: string,
  pedidoId: string,
  status: PedidoLojaStatus,
  atual?: Pick<PedidoAdmin, "pagamentoLiberadoEnvio" | "status" | "origem">,
): Promise<void> {
  if (status === "enviado" || status === "producao") {
    const presencial = atual?.origem === "presencial";
    const liberado =
      presencial ||
      atual?.pagamentoLiberadoEnvio === true ||
      atual?.status === "pago" ||
      atual?.status === "producao";
    if (!liberado) {
      throw new Error(
        "Produção/envio só liberados após pagamento confirmado (PIX, boleto compensado ou cartão aprovado).",
      );
    }
  }

  const db = requireDb();
  await updateDoc(
    doc(db, COLECOES.LOJAS, lojaId, COLECOES.PEDIDOS, pedidoId),
    {
      status,
      atualizadoEm: serverTimestamp(),
    },
  );
}

export async function atualizarEnvioPedidoAdmin(
  lojaId: string,
  pedidoId: string,
  envio: PedidoEnvioFirestore,
): Promise<void> {
  const db = requireDb();
  await updateDoc(
    doc(db, COLECOES.LOJAS, lojaId, COLECOES.PEDIDOS, pedidoId),
    {
      envio: {
        ...envio,
        enviadoEm: envio.enviadoEm ?? serverTimestamp(),
      },
      atualizadoEm: serverTimestamp(),
    },
  );
}

export async function atualizarNotaFiscalPedidoAdmin(
  lojaId: string,
  pedidoId: string,
  notaFiscal: NotaFiscalFirestore,
): Promise<void> {
  const db = requireDb();
  await updateDoc(
    doc(db, COLECOES.LOJAS, lojaId, COLECOES.PEDIDOS, pedidoId),
    {
      notaFiscal,
      atualizadoEm: serverTimestamp(),
    },
  );
}

export async function reemitirNotaFiscalPedidoAdmin(
  lojaId: string,
  pedidoId: string,
): Promise<{ enfileirado: boolean; outboxId?: string }> {
  const callable = httpsCallable<
    { lojaId: string; pedidoId: string },
    { enfileirado: boolean; outboxId?: string }
  >(getFirebaseFunctions(), "reemitirNotaFiscalPedido");

  const { data } = await callable({ lojaId, pedidoId });
  return data ?? { enfileirado: false };
}

export async function sincronizarNotaFiscalPedidoAdmin(
  lojaId: string,
  pedidoId: string,
): Promise<{ status: string; erro?: string }> {
  const callable = httpsCallable<
    { lojaId: string; pedidoId: string },
    { status: string; erro?: string }
  >(getFirebaseFunctions(), "sincronizarNotaFiscalPedido");

  const { data } = await callable({ lojaId, pedidoId });
  return data ?? { status: "erro" };
}

export async function reprocessarEnvioMelhorEnvioAdmin(
  lojaId: string,
  pedidoId: string,
): Promise<{ outboxId: string }> {
  const callable = httpsCallable<
    { tipo: "loja"; lojaId: string; pedidoId: string },
    { outboxId: string }
  >(getFirebaseFunctions(), "reprocessarEnvioMelhorEnvio");

  const { data } = await callable({ tipo: "loja", lojaId, pedidoId });
  if (!data?.outboxId) {
    throw new Error("Não foi possível enfileirar a etiqueta.");
  }
  return data;
}

function formatTimestampSort(criadoEm: unknown): number {
  return firestoreTimestampToMillis(criadoEm);
}
