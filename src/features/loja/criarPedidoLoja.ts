import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { COLECOES } from "@/features/multitenant/types";
import type { PerfilUsuario } from "@/features/usuario/perfilTypes";
import { formatarEnderecoCompleto } from "@/features/usuario/perfilUtils";
import { pagamentoMockAtivo } from "@/features/pagamentos/pagamentoConfig";
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
  /** Pedido feito no portal /revendedor */
  canal?: "revendedor_b2b" | "loja";
  /** Benefício de nível aplicado no checkout B2B */
  beneficioNivel?: {
    nivel: string;
    descontoPercentual: number;
    descontoCentavos: number;
    subtotalCentavos: number;
    freteGratis: boolean;
  };
  frete?: {
    servicoId: number;
    nome: string;
    empresa: string;
    companyId?: number | null;
    precoCentavos: number;
    prazoDias?: number | null;
    cepOrigem: string;
    cepDestino: string;
    origemLojaId?: string | null;
  } | null;
  /** Forma escolhida no checkout (pix | boleto | cartao) — usada no e-mail de aguardo. */
  formaOnline?: "pix" | "boleto" | "cartao" | null;
  totalProdutosCentavos?: number;
};

function itemCarrinhoParaPedidoLoja(item: ItemCarrinho) {
  const config = item.personalizacao
    ? personalizacaoParaConfig(item.personalizacao)
    : null;

  return {
    produtoId: item.produtoId,
    modeloId: item.modeloId ?? null,
    personalizacaoId: item.personalizacaoId ?? null,
    precoCentavos: item.precoCentavos,
    quantidade: item.quantidade ?? 1,
    nomeProduto: item.nomeProduto,
    tipoPersonalizacao: item.personalizacao
      ? ("mascara_modelo" as const)
      : null,
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

export async function criarPedidoLoja({
  lojaId,
  lojaNome,
  itens,
  totalCentavos,
  user,
  perfil,
  simularPagamentoMock = pagamentoMockAtivo(),
  canal = "loja",
  beneficioNivel,
  frete,
  formaOnline,
  totalProdutosCentavos,
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
    totalProdutosCentavos: totalProdutosCentavos ?? totalCentavos,
    status,
    cliente: {
      nome: perfil.nomeCompleto,
      contato,
      endereco: formatarEnderecoCompleto(perfil),
    },
    pagamento: {
      provider: simularPagamentoMock ? "mock" : null,
      id: null,
      status: simularPagamentoMock ? "approved" : null,
      ...(formaOnline && !simularPagamentoMock
        ? { formaOnline }
        : {}),
    },
    pagamentoLiberadoEnvio: simularPagamentoMock,
    clienteUid: user.uid,
    origem: "online" as const,
    canal,
    ...(beneficioNivel ? { beneficioNivel } : {}),
    ...(frete ? { frete } : {}),
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });

  const ref = await addDoc(
    collection(db, COLECOES.LOJAS, lojaId, COLECOES.PEDIDOS),
    payload,
  );

  // Espelhamento na fila Zen Pro e baixa de estoque ocorrem após pagamento aprovado (webhook MP).
  // Mock: status já nasce "pago" e a function decrementarEstoquePedidoLoja trata no onCreate.

  // Índice pessoal do cliente — permite listar "Meus pedidos" sem varrer lojas.
  try {
    await setDoc(
      doc(db, COLECOES.USUARIOS, user.uid, COLECOES.PEDIDOS, ref.id),
      sanitizarParaFirestore({
        lojaId,
        lojaNome: lojaNome ?? null,
        pedidoId: ref.id,
        totalCentavos,
        qtdItens: itens.reduce(
          (acc, i) => acc + Math.max(1, i.quantidade || 1),
          0,
        ),
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
