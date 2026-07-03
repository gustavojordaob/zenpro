import {
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import {
  COLECOES,
  type PedidoLojaStatus,
} from "@/features/multitenant/types";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { firestoreTimestampToMillis } from "@/lib/firestoreTimestamp";

export type MeuPedido = {
  pedidoId: string;
  lojaId: string;
  lojaNome: string | null;
  resumo: string;
  qtdItens: number;
  totalCentavos: number;
  status: PedidoLojaStatus;
  criadoEm: unknown;
  atualizadoEm?: unknown;
  /** true quando o pedido original não foi encontrado (usa snapshot do índice). */
  somenteIndice?: boolean;
};

/**
 * Lista os pedidos do cliente logado a partir do índice pessoal
 * `usuarios/{uid}/pedidos` e busca o status atual em `lojas/{lojaId}/pedidos`.
 */
export async function listarMeusPedidos(uid: string): Promise<MeuPedido[]> {
  if (!isFirebaseConfigured()) return [];
  const db = getFirebaseDb();

  const indiceSnap = await getDocs(
    collection(db, COLECOES.USUARIOS, uid, COLECOES.PEDIDOS),
  );

  const pedidos = await Promise.all(
    indiceSnap.docs.map(async (indiceDoc) => {
      const idx = indiceDoc.data();
      const lojaId = String(idx.lojaId ?? "");
      const pedidoId = String(idx.pedidoId ?? indiceDoc.id);
      const base: MeuPedido = {
        pedidoId,
        lojaId,
        lojaNome: (idx.lojaNome as string | null) ?? null,
        resumo: String(idx.resumo ?? "Pedido"),
        qtdItens: Number(idx.qtdItens ?? 1),
        totalCentavos: Number(idx.totalCentavos ?? 0),
        status: (idx.statusInicial as PedidoLojaStatus) ?? "aguardando_pagamento",
        criadoEm: idx.criadoEm,
        somenteIndice: true,
      };

      if (!lojaId) return base;

      try {
        const pedidoSnap = await getDoc(
          doc(db, COLECOES.LOJAS, lojaId, COLECOES.PEDIDOS, pedidoId),
        );
        if (pedidoSnap.exists()) {
          const data = pedidoSnap.data();
          return {
            ...base,
            status: (data.status as PedidoLojaStatus) ?? base.status,
            totalCentavos: Number(data.totalCentavos ?? base.totalCentavos),
            criadoEm: data.criadoEm ?? base.criadoEm,
            atualizadoEm: data.atualizadoEm,
            somenteIndice: false,
          };
        }
      } catch {
        // Sem permissão / offline — mantém o snapshot do índice.
      }
      return base;
    }),
  );

  return pedidos.sort(
    (a, b) =>
      firestoreTimestampToMillis(b.criadoEm) -
      firestoreTimestampToMillis(a.criadoEm),
  );
}
