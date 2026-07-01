import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import type { PerfilUsuario, PerfilUsuarioFirestore } from "./perfilTypes";
import { PERFIL_VAZIO } from "./perfilTypes";
import { apenasDigitos } from "./perfilUtils";

function docRef(uid: string) {
  return doc(getFirebaseDb(), "usuarios", uid);
}

export async function carregarPerfilUsuario(
  user: User,
): Promise<PerfilUsuario> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }

  const snap = await getDoc(docRef(user.uid));
  const base: PerfilUsuario = {
    uid: user.uid,
    email: user.email ?? "",
    ...PERFIL_VAZIO,
  };

  if (!snap.exists()) return base;

  const data = snap.data() as Partial<PerfilUsuarioFirestore>;
  return {
    ...base,
    nomeCompleto: data.nomeCompleto ?? "",
    cpf: data.cpf ?? "",
    telefone: data.telefone ?? "",
    cep: data.cep ?? "",
    logradouro: data.logradouro ?? "",
    numero: data.numero ?? "",
    complemento: data.complemento ?? "",
    bairro: data.bairro ?? "",
    cidade: data.cidade ?? "",
    estado: data.estado ?? "",
  };
}

export type SalvarPerfilInput = Omit<PerfilUsuario, "uid" | "email">;

export async function salvarPerfilUsuario(
  user: User,
  dados: SalvarPerfilInput,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }

  const payload: PerfilUsuarioFirestore = {
    email: user.email ?? "",
    nomeCompleto: dados.nomeCompleto.trim(),
    cpf: apenasDigitos(dados.cpf),
    telefone: apenasDigitos(dados.telefone),
    cep: apenasDigitos(dados.cep),
    logradouro: dados.logradouro.trim(),
    numero: dados.numero.trim(),
    complemento: dados.complemento.trim(),
    bairro: dados.bairro.trim(),
    cidade: dados.cidade.trim(),
    estado: dados.estado.trim().toUpperCase(),
    atualizadoEm: serverTimestamp(),
  };

  await setDoc(docRef(user.uid), payload, { merge: true });
}
