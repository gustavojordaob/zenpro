import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { normalizarSlugLoja, slugLojaValido } from "@/features/admin/revendedores/revendedorAdminUtils";
import {
  COLECAO_SOLICITACOES_REVENDEDOR,
  type SolicitacaoRevendedorInput,
} from "./solicitacaoRevendedorTypes";
import { cnpjValido, normalizarCnpj, normalizarCep } from "./solicitacaoRevendedorUtils";

function requireDb() {
  if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
  return getFirebaseDb();
}

export async function enviarSolicitacaoRevendedor(
  input: SolicitacaoRevendedorInput,
): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const cnpj = normalizarCnpj(input.cnpj);
  const slug = normalizarSlugLoja(input.slugDesejado);

  if (!input.nomeCompleto.trim()) throw new Error("Informe seu nome.");
  if (!email.includes("@")) throw new Error("E-mail inválido.");
  if (!input.telefone.trim()) throw new Error("Informe um telefone.");
  if (!cnpjValido(cnpj)) throw new Error("CNPJ inválido (14 dígitos).");
  if (!input.razaoSocial.trim()) throw new Error("Informe a razão social.");
  if (!input.nomeLoja.trim()) throw new Error("Informe o nome da loja.");
  if (!slugLojaValido(slug)) {
    throw new Error("Endereço da loja inválido. Use letras, números e hífens.");
  }
  if (normalizarCep(input.cep).length !== 8) throw new Error("CEP inválido.");
  if (!input.logradouro.trim() || !input.numero.trim()) {
    throw new Error("Informe endereço completo.");
  }
  if (!input.bairro.trim() || !input.cidade.trim() || !input.uf.trim()) {
    throw new Error("Informe bairro, cidade e UF.");
  }

  const db = requireDb();

  const ref = await addDoc(collection(db, COLECAO_SOLICITACOES_REVENDEDOR), {
    nomeCompleto: input.nomeCompleto.trim(),
    email,
    telefone: input.telefone.trim(),
    cnpj,
    razaoSocial: input.razaoSocial.trim(),
    nomeLoja: input.nomeLoja.trim(),
    slugDesejado: slug,
    cep: normalizarCep(input.cep),
    logradouro: input.logradouro.trim(),
    numero: input.numero.trim(),
    complemento: input.complemento?.trim() || null,
    bairro: input.bairro.trim(),
    cidade: input.cidade.trim(),
    uf: input.uf.trim().toUpperCase().slice(0, 2),
    observacao: input.observacao?.trim() || null,
    status: "pendente",
    criadoEm: serverTimestamp(),
  });

  return ref.id;
}
