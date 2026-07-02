import { decrementarEstoqueVenda } from "@/features/admin/estoque/estoqueAdminService";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  COLECOES,
  type ItemPedidoLojaFirestore,
  type PedidoLojaFormaPagamentoPresencial,
  type PedidoLojaStatus,
} from "@/features/multitenant/types";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { sanitizarParaFirestore } from "@/lib/firestoreSanitize";

export type ItemVendaPresencialInput = {
  produtoId: string;
  nomeProduto: string;
  precoCentavos: number;
  quantidade: number;
  observacao?: string;
};

export type CriarVendaPresencialInput = {
  lojaId: string;
  registradoPorUid: string;
  clienteNome: string;
  clienteContato: string;
  clienteEndereco?: string;
  itens: ItemVendaPresencialInput[];
  formaPagamento: PedidoLojaFormaPagamentoPresencial;
  /** Padrão: pago (já recebeu na loja) */
  status?: PedidoLojaStatus;
  observacaoPedido?: string;
};

function itemParaFirestore(
  item: ItemVendaPresencialInput,
): ItemPedidoLojaFirestore {
  return {
    produtoId: item.produtoId,
    personalizacaoId: null,
    precoCentavos: item.precoCentavos,
    quantidade: item.quantidade,
    nomeProduto: item.nomeProduto,
    descricao: item.observacao?.trim() || null,
    config: null,
    fotoUrl: null,
  };
}

export async function criarVendaPresencialAdmin(
  input: CriarVendaPresencialInput,
): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }

  if (!input.lojaId?.trim()) {
    throw new Error("Selecione a loja.");
  }

  if (!input.registradoPorUid) {
    throw new Error("Sessão inválida.");
  }

  if (!input.clienteNome.trim()) {
    throw new Error("Informe o nome do cliente.");
  }

  if (!input.clienteContato.trim()) {
    throw new Error("Informe um contato (telefone ou e-mail).");
  }

  if (input.itens.length === 0) {
    throw new Error("Adicione pelo menos um produto.");
  }

  for (const item of input.itens) {
    if (item.quantidade < 1) {
      throw new Error("Quantidade inválida.");
    }
    if (item.precoCentavos < 0) {
      throw new Error("Preço inválido.");
    }
  }

  const totalCentavos = input.itens.reduce(
    (acc, item) => acc + item.precoCentavos * item.quantidade,
    0,
  );

  if (totalCentavos <= 0) {
    throw new Error("Total deve ser maior que zero.");
  }

  const status: PedidoLojaStatus = input.status ?? "pago";

  for (const item of input.itens) {
    for (let i = 0; i < item.quantidade; i++) {
      await decrementarEstoqueVenda(input.lojaId, item.produtoId, 1);
    }
  }

  const db = getFirebaseDb();
  const ref = await addDoc(
    collection(db, COLECOES.LOJAS, input.lojaId, COLECOES.PEDIDOS),
    sanitizarParaFirestore({
      itens: input.itens.map(itemParaFirestore),
      totalCentavos,
      status,
      origem: "presencial",
      registradoPorUid: input.registradoPorUid,
      cliente: {
        nome: input.clienteNome.trim(),
        contato: input.clienteContato.trim(),
        endereco: input.clienteEndereco?.trim() || "Venda presencial",
      },
      pagamento: {
        provider: "presencial",
        id: null,
        status: "aprovado",
        forma: input.formaPagamento,
      },
      observacao: input.observacaoPedido?.trim() || null,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    }),
  );

  return ref.id;
}

export const FORMAS_PAGAMENTO_PRESENCIAL: {
  value: PedidoLojaFormaPagamentoPresencial;
  label: string;
}[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao", label: "Cartão" },
  { value: "outro", label: "Outro" },
];
