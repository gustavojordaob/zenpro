import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import {
  COLECOES,
  type EstoqueLojaFirestore,
  type ProdutoCentralFirestore,
} from "@/features/multitenant/types";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { invalidateTtlCache } from "@/lib/ttlCache";

export type EstoqueLojaItem = {
  produtoId: string;
  quantidade: number;
};

export type ProdutoEstoqueAdmin = {
  produtoId: string;
  nome: string;
  controlaEstoque: boolean;
  estoqueCentral: number;
  estoqueLoja: number;
  disponivelVenda: number;
};

function requireDb() {
  if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
  return getFirebaseDb();
}

export function produtoControlaEstoque(data: ProdutoCentralFirestore): boolean {
  if (data.personalizavel) return false;
  return data.controlaEstoque !== false;
}

export function calcularDisponivelVenda(
  produto: ProdutoCentralFirestore,
  estoqueLoja: number | null,
): number {
  if (!produtoControlaEstoque(produto)) return 9999;

  const central = Math.max(0, Number(produto.estoqueCentral ?? 0));
  const loja = Math.max(0, estoqueLoja ?? 0);
  return Math.min(central, loja);
}

export async function obterEstoqueLojaProduto(
  lojaId: string,
  produtoId: string,
): Promise<number> {
  const snap = await getDoc(
    doc(requireDb(), COLECOES.LOJAS, lojaId, COLECOES.ESTOQUE, produtoId),
  );
  if (!snap.exists()) return 0;
  return Math.max(0, Number((snap.data() as EstoqueLojaFirestore).quantidade ?? 0));
}

export async function listarEstoqueLojaMap(
  lojaId: string,
): Promise<Record<string, number>> {
  const snap = await getDocs(
    collection(requireDb(), COLECOES.LOJAS, lojaId, COLECOES.ESTOQUE),
  );
  const map: Record<string, number> = {};
  for (const d of snap.docs) {
    map[d.id] = Math.max(0, Number((d.data() as EstoqueLojaFirestore).quantidade ?? 0));
  }
  return map;
}

export async function definirEstoqueLojaProduto(
  lojaId: string,
  produtoId: string,
  quantidade: number,
): Promise<void> {
  const qtd = Math.max(0, Math.floor(quantidade));
  await setDoc(
    doc(requireDb(), COLECOES.LOJAS, lojaId, COLECOES.ESTOQUE, produtoId),
    {
      quantidade: qtd,
      atualizadoEm: serverTimestamp(),
    },
    { merge: true },
  );
  invalidateTtlCache(`estoque:${lojaId}`);
}

/**
 * Loja oficial da marca (zenpro): um único número — atualiza galpão central
 * e estoque da loja ao mesmo tempo (evita min(central, loja) zerado por engano).
 */
export async function definirEstoqueLojaOficialMarca(
  produtoId: string,
  quantidade: number,
  marcaLojaId: string,
): Promise<void> {
  const qtd = Math.max(0, Math.floor(quantidade));
  const db = requireDb();

  await runTransaction(db, async (tx) => {
    const produtoRef = doc(db, COLECOES.PRODUTOS, produtoId);
    const estoqueRef = doc(db, COLECOES.LOJAS, marcaLojaId, COLECOES.ESTOQUE, produtoId);
    const produtoSnap = await tx.get(produtoRef);
    if (!produtoSnap.exists()) {
      throw new Error("Produto não encontrado.");
    }
    const produto = produtoSnap.data() as ProdutoCentralFirestore;
    if (!produtoControlaEstoque(produto)) {
      throw new Error("Este produto não controla estoque.");
    }

    tx.update(produtoRef, {
      estoqueCentral: qtd,
      atualizadoEm: serverTimestamp(),
    });
    tx.set(
      estoqueRef,
      {
        quantidade: qtd,
        atualizadoEm: serverTimestamp(),
      },
      { merge: true },
    );
  });
  invalidateTtlCache(`estoque:${marcaLojaId}`);
  invalidateTtlCache("produtos:");
}

export async function listarProdutosEstoqueAdmin(
  lojaId: string,
  produtos: { id: string; data: DocumentData }[],
): Promise<ProdutoEstoqueAdmin[]> {
  const estoqueMap = await listarEstoqueLojaMap(lojaId);

  return produtos
    .map(({ id, data }) => {
      const produto = data as ProdutoCentralFirestore;
      const estoqueLoja = estoqueMap[id] ?? 0;
      return {
        produtoId: id,
        nome: String(produto.nome ?? id),
        controlaEstoque: produtoControlaEstoque(produto),
        estoqueCentral: Math.max(0, Number(produto.estoqueCentral ?? 0)),
        estoqueLoja,
        disponivelVenda: calcularDisponivelVenda(produto, estoqueLoja),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function validarEstoqueVenda(
  lojaId: string,
  produtoId: string,
  quantidade = 1,
): Promise<void> {
  const db = requireDb();
  const produtoSnap = await getDoc(doc(db, COLECOES.PRODUTOS, produtoId));
  if (!produtoSnap.exists()) return;

  const produto = produtoSnap.data() as ProdutoCentralFirestore;
  if (!produtoControlaEstoque(produto)) return;

  const estoqueLoja = await obterEstoqueLojaProduto(lojaId, produtoId);
  const disponivel = calcularDisponivelVenda(produto, estoqueLoja);
  if (disponivel < quantidade) {
    throw new Error(`Estoque insuficiente para "${produto.nome}".`);
  }
}

export async function decrementarEstoqueVenda(
  lojaId: string,
  produtoId: string,
  quantidade = 1,
): Promise<void> {
  const db = requireDb();
  const produtoRef = doc(db, COLECOES.PRODUTOS, produtoId);
  const estoqueRef = doc(db, COLECOES.LOJAS, lojaId, COLECOES.ESTOQUE, produtoId);

  await runTransaction(db, async (tx) => {
    const produtoSnap = await tx.get(produtoRef);
    if (!produtoSnap.exists()) {
      throw new Error("Produto não encontrado.");
    }

    const produto = produtoSnap.data() as ProdutoCentralFirestore;
    if (!produtoControlaEstoque(produto)) return;

    const estoqueSnap = await tx.get(estoqueRef);
    const estoqueLoja = estoqueSnap.exists()
      ? Math.max(0, Number((estoqueSnap.data() as EstoqueLojaFirestore).quantidade ?? 0))
      : 0;
    const central = Math.max(0, Number(produto.estoqueCentral ?? 0));
    const disponivel = Math.min(central, estoqueLoja);

    if (disponivel < quantidade) {
      throw new Error(`Estoque insuficiente para "${produto.nome}".`);
    }

    tx.set(
      estoqueRef,
      {
        quantidade: estoqueLoja - quantidade,
        atualizadoEm: serverTimestamp(),
      },
      { merge: true },
    );
  });
}
