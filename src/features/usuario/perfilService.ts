import { doc, getDoc, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import type { PerfilUsuario, PerfilUsuarioFirestore } from "./perfilTypes";
import { PERFIL_VAZIO } from "./perfilTypes";
import {
  extrairCpfAnterior,
  reservarIndicesPerfil,
} from "./perfilIndices";
import { apenasDigitos, buscarEnderecoPorCep } from "./perfilUtils";
import {
  municipiosConferem,
  normalizarNomeMunicipio,
} from "./enderecoUtils";

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
    cidade: normalizarNomeMunicipio(data.cidade ?? "", data.estado ?? ""),
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

  const db = getFirebaseDb();
  const cpfNovo = apenasDigitos(dados.cpf);
  const usuarioRef = docRef(user.uid);
  const existente = await getDoc(usuarioRef);
  const cpfAnterior = existente.exists()
    ? extrairCpfAnterior(existente.data())
    : "";

  const cepDigitos = apenasDigitos(dados.cep);
  const viaCep = await buscarEnderecoPorCep(cepDigitos);
  if (!viaCep) {
    throw new Error("CEP não encontrado. Verifique e tente novamente.");
  }

  const cidadeInformada = normalizarNomeMunicipio(dados.cidade.trim(), dados.estado);
  if (
    !municipiosConferem(
      cidadeInformada,
      dados.estado,
      viaCep.cidade,
      viaCep.estado,
    )
  ) {
    throw new Error(
      `Cidade/UF não conferem com o CEP. Use: ${viaCep.cidade} — ${viaCep.estado}.`,
    );
  }

  const payload: PerfilUsuarioFirestore = {
    email: user.email ?? "",
    nomeCompleto: dados.nomeCompleto.trim(),
    cpf: cpfNovo,
    telefone: apenasDigitos(dados.telefone),
    cep: cepDigitos,
    logradouro: dados.logradouro.trim(),
    numero: dados.numero.trim(),
    complemento: dados.complemento.trim(),
    bairro: dados.bairro.trim(),
    cidade: viaCep.cidade,
    estado: viaCep.estado.toUpperCase(),
    atualizadoEm: serverTimestamp(),
  };

  await reservarIndicesPerfil({
    db,
    user,
    cpfNovo,
    cpfAnterior,
    payload,
  });
}
