import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { sanitizarParaFirestore } from "@/lib/firestoreSanitize";
import { firestoreTimestampToMillis } from "@/lib/firestoreTimestamp";

export const COLECAO_REPOSICAO = "pedidos_reposicao";

export type ReposicaoStatus =
  | "solicitado"
  | "aprovado"
  | "enviado"
  | "recebido"
  | "cancelado";

export type ItemReposicao = {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoCentavos: number;
};

export type PedidoReposicao = {
  id: string;
  lojaId: string;
  lojaNome: string | null;
  revendedorUid: string;
  revendedorEmail: string | null;
  itens: ItemReposicao[];
  totalCentavos: number;
  status: ReposicaoStatus;
  observacao: string | null;
  criadoEm: unknown;
  atualizadoEm?: unknown;
};

export const REPOSICAO_STATUS_OPCOES: {
  value: ReposicaoStatus;
  rotulo: string;
}[] = [
  { value: "solicitado", rotulo: "Solicitado" },
  { value: "aprovado", rotulo: "Aprovado" },
  { value: "enviado", rotulo: "Enviado" },
  { value: "recebido", rotulo: "Recebido" },
  { value: "cancelado", rotulo: "Cancelado" },
];

export function rotuloStatusReposicao(status: ReposicaoStatus): string {
  return (
    REPOSICAO_STATUS_OPCOES.find((o) => o.value === status)?.rotulo ?? status
  );
}

function requireDb() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }
  return getFirebaseDb();
}

function mapReposicao(id: string, data: DocumentData): PedidoReposicao {
  const itensRaw = Array.isArray(data.itens) ? data.itens : [];
  return {
    id,
    lojaId: String(data.lojaId ?? ""),
    lojaNome: (data.lojaNome as string | null) ?? null,
    revendedorUid: String(data.revendedorUid ?? ""),
    revendedorEmail: (data.revendedorEmail as string | null) ?? null,
    itens: itensRaw.map((i: DocumentData) => ({
      produtoId: String(i.produtoId ?? ""),
      nome: String(i.nome ?? ""),
      quantidade: Number(i.quantidade ?? 0),
      precoCentavos: Number(i.precoCentavos ?? 0),
    })),
    totalCentavos: Number(data.totalCentavos ?? 0),
    status: (data.status as ReposicaoStatus) ?? "solicitado",
    observacao: (data.observacao as string | null) ?? null,
    criadoEm: data.criadoEm,
    atualizadoEm: data.atualizadoEm,
  };
}

type CriarReposicaoInput = {
  lojaId: string;
  lojaNome?: string | null;
  revendedorUid: string;
  revendedorEmail?: string | null;
  itens: ItemReposicao[];
  observacao?: string;
};

export async function criarPedidoReposicao(
  input: CriarReposicaoInput,
): Promise<string> {
  const db = requireDb();
  const itens = input.itens.filter((i) => i.quantidade > 0);
  if (itens.length === 0) {
    throw new Error("Selecione ao menos um produto com quantidade.");
  }
  const totalCentavos = itens.reduce(
    (soma, i) => soma + i.precoCentavos * i.quantidade,
    0,
  );

  const ref = await addDoc(
    collection(db, COLECAO_REPOSICAO),
    sanitizarParaFirestore({
      lojaId: input.lojaId,
      lojaNome: input.lojaNome ?? null,
      revendedorUid: input.revendedorUid,
      revendedorEmail: input.revendedorEmail ?? null,
      itens,
      totalCentavos,
      status: "solicitado",
      observacao: input.observacao?.trim() || null,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    }),
  );
  return ref.id;
}

/** Marca vê todos; revendedor só os próprios (rules exigem where p/ revendedor). */
export async function listarReposicoes(opts: {
  marca: boolean;
  revendedorUid?: string;
}): Promise<PedidoReposicao[]> {
  const db = requireDb();
  const col = collection(db, COLECAO_REPOSICAO);
  const snap = opts.marca
    ? await getDocs(col)
    : await getDocs(
        query(col, where("revendedorUid", "==", opts.revendedorUid ?? "")),
      );

  return snap.docs
    .map((d) => mapReposicao(d.id, d.data()))
    .sort(
      (a, b) =>
        firestoreTimestampToMillis(b.criadoEm) -
        firestoreTimestampToMillis(a.criadoEm),
    );
}

export async function atualizarStatusReposicao(
  id: string,
  status: ReposicaoStatus,
): Promise<void> {
  const db = requireDb();
  await updateDoc(doc(db, COLECAO_REPOSICAO, id), {
    status,
    atualizadoEm: serverTimestamp(),
  });
}
