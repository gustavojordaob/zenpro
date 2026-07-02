import {
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { apenasDigitos } from "./perfilUtils";

export const COLECAO_INDICE_CPF = "indices_cpf";
export const COLECAO_INDICE_EMAIL = "indices_email";

export class PerfilIndiceOcupadoError extends Error {
  readonly campo: "cpf" | "email";

  constructor(campo: "cpf" | "email", message: string) {
    super(message);
    this.name = "PerfilIndiceOcupadoError";
    this.campo = campo;
  }
}

/** Chave segura para doc id a partir do e-mail. */
export function chaveIndiceEmail(email: string): string {
  return email.trim().toLowerCase();
}

type ReservarIndicesInput = {
  db: Firestore;
  user: User;
  cpfNovo: string;
  cpfAnterior: string;
  payload: Record<string, unknown>;
};

/** Garante CPF e e-mail únicos antes de gravar o perfil (transação atômica). */
export async function reservarIndicesPerfil({
  db,
  user,
  cpfNovo,
  cpfAnterior,
  payload,
}: ReservarIndicesInput): Promise<void> {
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) {
    throw new Error("Conta sem e-mail.");
  }

  const emailKey = chaveIndiceEmail(email);
  const usuarioRef = doc(db, "usuarios", user.uid);
  const cpfRef = doc(db, COLECAO_INDICE_CPF, cpfNovo);
  const emailRef = doc(db, COLECAO_INDICE_EMAIL, emailKey);

  await runTransaction(db, async (tx) => {
    const [cpfSnap, emailSnap] = await Promise.all([
      tx.get(cpfRef),
      tx.get(emailRef),
    ]);

    if (cpfSnap.exists() && cpfSnap.data().uid !== user.uid) {
      throw new PerfilIndiceOcupadoError(
        "cpf",
        "Este CPF já está cadastrado em outra conta.",
      );
    }

    if (emailSnap.exists() && emailSnap.data().uid !== user.uid) {
      throw new PerfilIndiceOcupadoError(
        "email",
        "Este e-mail já está cadastrado em outra conta.",
      );
    }

    if (cpfAnterior && cpfAnterior !== cpfNovo) {
      const cpfAntigoRef = doc(db, COLECAO_INDICE_CPF, cpfAnterior);
      const cpfAntigoSnap = await tx.get(cpfAntigoRef);
      if (cpfAntigoSnap.exists() && cpfAntigoSnap.data().uid === user.uid) {
        tx.delete(cpfAntigoRef);
      }
    }

    tx.set(cpfRef, { uid: user.uid, atualizadoEm: serverTimestamp() });
    tx.set(emailRef, {
      uid: user.uid,
      email,
      atualizadoEm: serverTimestamp(),
    });
    tx.set(usuarioRef, payload, { merge: true });
  });
}

export function extrairCpfAnterior(data: Record<string, unknown> | undefined): string {
  if (!data?.cpf) return "";
  return apenasDigitos(String(data.cpf));
}
