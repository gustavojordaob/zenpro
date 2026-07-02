import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  montarConteudoEmailAprovacaoRevendedor,
  type EmailAprovacaoRevendedorParams,
} from "@/features/admin/revendedores/emailRevendedorUtils";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

export const COLECAO_EMAILS_OUTBOX = "emails_outbox";

export type EmailOutboxTipo = "aprovacao_revendedor";

export async function enfileirarEmailAprovacaoRevendedor(
  params: EmailAprovacaoRevendedorParams,
): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }

  const conteudo = montarConteudoEmailAprovacaoRevendedor(params);
  const db = getFirebaseDb();

  const ref = await addDoc(collection(db, COLECAO_EMAILS_OUTBOX), {
    to: params.emailDestino.trim().toLowerCase(),
    subject: conteudo.subject,
    text: conteudo.text,
    html: conteudo.html,
    tipo: "aprovacao_revendedor" satisfies EmailOutboxTipo,
    status: "pendente",
    meta: {
      lojaId: params.slug,
      nomeLoja: params.nomeLoja,
    },
    criadoEm: serverTimestamp(),
  });

  return ref.id;
}
