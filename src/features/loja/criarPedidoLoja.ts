import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { COLECOES } from "@/features/multitenant/types";
import { MARCA_LOJA_ID } from "@/features/multitenant/marcaLoja";
import type { PerfilUsuario } from "@/features/usuario/perfilTypes";
import { formatarEnderecoCompleto } from "@/features/usuario/perfilUtils";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { sanitizarParaFirestore } from "@/lib/firestoreSanitize";
import { personalizacaoParaConfig } from "@/features/catalogo/personalizacaoConfig";
import type { ItemCarrinho } from "./carrinhoTypes";

type CriarPedidoLojaInput = {
  lojaId: string;
  /** Nome da loja (para exibir em "Meus pedidos" do cliente). */
  lojaNome?: string;
  itens: ItemCarrinho[];
  totalCentavos: number;
  user: User;
  perfil: PerfilUsuario;
  /** Mock: simula pagamento aprovado (status pago) sem Mercado Pago */
  simularPagamentoMock?: boolean;
};

function itemCarrinhoParaPedidoLoja(item: ItemCarrinho) {
  const config = item.personalizacao
    ? personalizacaoParaConfig(item.personalizacao)
    : null;

  return {
    produtoId: item.produtoId,
    modeloId: item.modeloId,
    personalizacaoId: item.personalizacaoId,
    precoCentavos: item.precoCentavos,
    quantidade: 1,
    nomeProduto: item.nomeProduto,
    tipoPersonalizacao: item.personalizacao ? ("mascara_modelo" as const) : undefined,
    config,
    fotoUrl: item.personalizacao?.fotoUrl ?? null,
    transform: item.personalizacao?.transform ?? null,
    textos: item.personalizacao?.textos ?? null,
    titulo: item.personalizacao?.titulo ?? null,
    descricao: item.personalizacao?.descricao ?? null,
    arteProducaoUrl: item.personalizacao?.arteProducaoUrl ?? null,
    arteFotoUrl: item.personalizacao?.arteFotoUrl ?? null,
    arteTextoUrl: item.personalizacao?.arteTextoUrl ?? null,
    imagemUrl: item.imagemUrl ?? null,
  };
}

function pedidoTemPersonalizacao(itens: ItemCarrinho[]): boolean {
  return itens.some((i) => i.tipo === "personalizada" || i.personalizacaoId);
}

/** Espelha pedido de revendedor na fila de produção Zen Pro (lojas/zenpro/pedidos). */
async function espelharPedidoFilaProducaoMarca(
  pedidoOrigemId: string,
  origemLojaId: string,
  origemLojaNome: string | undefined,
  payload: Record<string, unknown>,
): Promise<void> {
  const db = getFirebaseDb();
  await addDoc(
    collection(db, COLECOES.LOJAS, MARCA_LOJA_ID, COLECOES.PEDIDOS),
    sanitizarParaFirestore({
      ...payload,
      filaProducaoMarca: true,
      origemLojaId,
      origemLojaNome: origemLojaNome ?? origemLojaId,
      origemPedidoId: pedidoOrigemId,
      observacao: `Produção — pedido da loja ${origemLojaNome ?? origemLojaId}`,
    }),
  );
}

export async function criarPedidoLoja({
  lojaId,
  lojaNome,
  itens,
  totalCentavos,
  user,
  perfil,
  simularPagamentoMock = true,
}: CriarPedidoLojaInput): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }

  if (!user.email) {
    throw new Error("Conta sem e-mail.");
  }

  if (!lojaId) {
    throw new Error("Loja não identificada.");
  }

  const db = getFirebaseDb();
  const contato =
    perfil.telefone?.trim() || user.email || perfil.email || "—";

  const status = simularPagamentoMock ? "pago" : "aguardando_pagamento";

  const payload = sanitizarParaFirestore({
    itens: itens.map(itemCarrinhoParaPedidoLoja),
    totalCentavos,
    status,
    cliente: {
      nome: perfil.nomeCompleto,
      contato,
      endereco: formatarEnderecoCompleto(perfil),
    },
    pagamento: {
      provider: simularPagamentoMock ? "mock" : null,
      id: null,
      status: simularPagamentoMock ? "aprovado" : null,
    },
    clienteUid: user.uid,
    origem: "online" as const,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });

  const ref = await addDoc(
    collection(db, COLECOES.LOJAS, lojaId, COLECOES.PEDIDOS),
    payload,
  );

  // Revendedor: espelha na fila de produção da marca (Zen Pro fabrica).
  if (
    lojaId !== MARCA_LOJA_ID &&
    pedidoTemPersonalizacao(itens)
  ) {
    try {
      let nomeLoja = lojaNome;
      if (!nomeLoja) {
        const lojaSnap = await getDoc(doc(db, COLECOES.LOJAS, lojaId));
        nomeLoja = lojaSnap.exists()
          ? String(lojaSnap.data().nome ?? lojaId)
          : lojaId;
      }
      await espelharPedidoFilaProducaoMarca(
        ref.id,
        lojaId,
        nomeLoja,
        payload,
      );
    } catch (e) {
      console.error("Falha ao espelhar pedido na fila Zen Pro", e);
    }
  }

  // Índice pessoal do cliente — permite listar "Meus pedidos" sem varrer lojas.
  try {
    await setDoc(
      doc(db, COLECOES.USUARIOS, user.uid, COLECOES.PEDIDOS, ref.id),
      sanitizarParaFirestore({
        lojaId,
        lojaNome: lojaNome ?? null,
        pedidoId: ref.id,
        totalCentavos,
        qtdItens: itens.length,
        resumo: itens[0]?.nomeProduto ?? "Pedido",
        statusInicial: status,
        criadoEm: serverTimestamp(),
      }),
    );
  } catch (e) {
    console.error("Falha ao gravar índice de pedido do cliente", e);
  }

  return ref.id;
}
