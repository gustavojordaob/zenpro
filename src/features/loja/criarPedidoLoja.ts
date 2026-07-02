import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { COLECOES } from "@/features/multitenant/types";
import type { PerfilUsuario } from "@/features/usuario/perfilTypes";
import { formatarEnderecoCompleto } from "@/features/usuario/perfilUtils";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { sanitizarParaFirestore } from "@/lib/firestoreSanitize";
import { personalizacaoParaConfig } from "@/features/catalogo/personalizacaoConfig";
import type { ItemCarrinho } from "./carrinhoTypes";

type CriarPedidoLojaInput = {
  lojaId: string;
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
    imagemUrl: item.imagemUrl ?? null,
  };
}

export async function criarPedidoLoja({
  lojaId,
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

  const ref = await addDoc(
    collection(db, COLECOES.LOJAS, lojaId, COLECOES.PEDIDOS),
    sanitizarParaFirestore({
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
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    }),
  );

  return ref.id;
}
