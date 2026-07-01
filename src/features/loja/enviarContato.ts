import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import type { ContatoFirestore } from "./firestoreTypes";

export type EnviarContatoInput = {
  nome: string;
  email: string;
  telefone: string;
  comentario: string;
};

function getEmailDestinoDono(): string {
  return (
    process.env.NEXT_PUBLIC_CONTATO_EMAIL_DONO?.trim() ||
    "contato@zenpro.com.br"
  );
}

export async function enviarContato(dados: EnviarContatoInput): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }

  const db = getFirebaseDb();

  const payload: Omit<ContatoFirestore, "criadoEm"> & {
    criadoEm: ReturnType<typeof serverTimestamp>;
  } = {
    nome: dados.nome.trim(),
    email: dados.email.trim(),
    telefone: dados.telefone.trim(),
    comentario: dados.comentario.trim(),
    emailDestino: getEmailDestinoDono(),
    status: "novo",
    criadoEm: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "contatos"), payload);
  return ref.id;
}
