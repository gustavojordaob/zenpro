import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { sanitizarParaFirestore } from "@/lib/firestoreSanitize";
import type { PerfilUsuario } from "@/features/usuario/perfilTypes";
import { formatarEnderecoCompleto } from "@/features/usuario/perfilUtils";
import type { ItemCarrinho } from "./carrinhoTypes";
import type { PedidoFirestore } from "./firestoreTypes";
import { PEDIDO_STATUS } from "./firestoreTypes";

type CriarPedidoInput = {
  itens: ItemCarrinho[];
  totalCentavos: number;
  user: User;
  perfil: PerfilUsuario;
};

export async function criarPedido({
  itens,
  totalCentavos,
  user,
  perfil,
}: CriarPedidoInput): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }

  if (!user.email) {
    throw new Error("Conta sem e-mail.");
  }

  const db = getFirebaseDb();

  const payload: Omit<PedidoFirestore, "criadoEm"> & {
    criadoEm: ReturnType<typeof serverTimestamp>;
  } = {
    itens: itens.map((item) => ({
      tipo: item.tipo,
      produtoId: item.produtoId,
      nomeProduto: item.nomeProduto,
      personalizacaoId: item.personalizacaoId,
      modeloId: item.modeloId,
      fotoUrl: item.personalizacao?.fotoUrl ?? null,
      transform: item.personalizacao?.transform ?? null,
      precoCentavos: item.precoCentavos,
      rotuloModelo: item.rotuloModelo,
      titulo: item.personalizacao?.titulo ?? null,
      descricao: item.personalizacao?.descricao ?? null,
      textos: item.personalizacao?.textos ?? null,
      arteProducaoUrl: item.personalizacao?.arteProducaoUrl ?? null,
      imagemUrl: item.imagemUrl ?? null,
      gradienteCapa: item.gradienteCapa ?? null,
    })),
    totalCentavos,
    status: PEDIDO_STATUS.AGUARDANDO_PAGAMENTO,
    clienteUid: user.uid,
    cliente: {
      nome: perfil.nomeCompleto,
      email: user.email,
      cpf: perfil.cpf,
      telefone: perfil.telefone,
      cep: perfil.cep,
      endereco: formatarEnderecoCompleto(perfil),
    },
    criadoEm: serverTimestamp(),
  };

  const ref = await addDoc(
    collection(db, "pedidos"),
    sanitizarParaFirestore(payload),
  );
  return ref.id;
}
