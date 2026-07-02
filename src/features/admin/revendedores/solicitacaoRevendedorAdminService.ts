import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { criarRevendedorAdmin } from "@/features/admin/revendedores/revendedorAdminService";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  COLECAO_SOLICITACOES_REVENDEDOR,
  type SolicitacaoRevendedorFirestore,
  type SolicitacaoRevendedorStatus,
} from "@/features/revendedor/solicitacaoRevendedorTypes";
import { montarMailtoAprovacaoRevendedor } from "./emailRevendedorUtils";
import { enfileirarEmailAprovacaoRevendedor } from "./emailOutboxService";

export type SolicitacaoRevendedorAdmin = {
  id: string;
} & SolicitacaoRevendedorFirestore;

function requireDb() {
  if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
  return getFirebaseDb();
}

function mapSolicitacao(id: string, data: DocumentData): SolicitacaoRevendedorAdmin {
  return {
    id,
    nomeCompleto: String(data.nomeCompleto ?? ""),
    email: String(data.email ?? ""),
    telefone: String(data.telefone ?? ""),
    cnpj: String(data.cnpj ?? ""),
    razaoSocial: String(data.razaoSocial ?? ""),
    nomeLoja: String(data.nomeLoja ?? ""),
    slugDesejado: String(data.slugDesejado ?? ""),
    cep: String(data.cep ?? ""),
    logradouro: String(data.logradouro ?? ""),
    numero: String(data.numero ?? ""),
    complemento: (data.complemento as string | null) ?? null,
    bairro: String(data.bairro ?? ""),
    cidade: String(data.cidade ?? ""),
    uf: String(data.uf ?? ""),
    observacao: (data.observacao as string | null) ?? null,
    status: (data.status as SolicitacaoRevendedorStatus) ?? "pendente",
    criadoEm: data.criadoEm,
    processadoEm: data.processadoEm,
    processadoPorUid: (data.processadoPorUid as string | null) ?? null,
    lojaIdCriada: (data.lojaIdCriada as string | null) ?? null,
    motivoRecusa: (data.motivoRecusa as string | null) ?? null,
  };
}

export async function listarSolicitacoesRevendedorAdmin(
  status?: SolicitacaoRevendedorStatus | "todas",
): Promise<SolicitacaoRevendedorAdmin[]> {
  const db = requireDb();
  let snap;

  if (status && status !== "todas") {
    snap = await getDocs(
      query(
        collection(db, COLECAO_SOLICITACOES_REVENDEDOR),
        where("status", "==", status),
      ),
    );
  } else {
    snap = await getDocs(collection(db, COLECAO_SOLICITACOES_REVENDEDOR));
  }

  return snap.docs
    .map((d) => mapSolicitacao(d.id, d.data()))
    .sort((a, b) => {
      const pa = a.status === "pendente" ? 0 : 1;
      const pb = b.status === "pendente" ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return a.nomeLoja.localeCompare(b.nomeLoja, "pt-BR");
    });
}

export async function obterSolicitacaoRevendedorAdmin(
  id: string,
): Promise<SolicitacaoRevendedorAdmin | null> {
  const db = requireDb();
  const snap = await getDoc(doc(db, COLECAO_SOLICITACOES_REVENDEDOR, id));
  if (!snap.exists()) return null;
  return mapSolicitacao(snap.id, snap.data());
}

export async function aprovarSolicitacaoRevendedorAdmin(
  solicitacaoId: string,
  processadoPorUid: string,
): Promise<{
  lojaId: string;
  senhaProvisoria: string | null;
  contaExistente: boolean;
  mailtoUrl: string;
  emailEnfileirado: boolean;
  emailOutboxId: string | null;
}> {
  const solicitacao = await obterSolicitacaoRevendedorAdmin(solicitacaoId);
  if (!solicitacao) throw new Error("Solicitação não encontrada.");
  if (solicitacao.status !== "pendente") {
    throw new Error("Esta solicitação já foi processada.");
  }

  const { lojaId, senhaProvisoria, contaExistente } = await criarRevendedorAdmin({
    nomeLoja: solicitacao.nomeLoja,
    slug: solicitacao.slugDesejado,
    emailDono: solicitacao.email,
    nomeDono: solicitacao.nomeCompleto,
  });

  const db = requireDb();
  await updateDoc(doc(db, COLECAO_SOLICITACOES_REVENDEDOR, solicitacaoId), {
    status: "aprovada",
    processadoEm: serverTimestamp(),
    processadoPorUid,
    lojaIdCriada: lojaId,
    motivoRecusa: null,
  });

  const mailtoUrl = montarMailtoAprovacaoRevendedor({
    emailDestino: solicitacao.email,
    nome: solicitacao.nomeCompleto,
    nomeLoja: solicitacao.nomeLoja,
    loginEmail: solicitacao.email,
    senhaProvisoria,
    contaExistente,
    slug: lojaId,
  });

  let emailOutboxId: string | null = null;
  let emailEnfileirado = false;
  try {
    emailOutboxId = await enfileirarEmailAprovacaoRevendedor({
      emailDestino: solicitacao.email,
      nome: solicitacao.nomeCompleto,
      nomeLoja: solicitacao.nomeLoja,
      loginEmail: solicitacao.email,
      senhaProvisoria,
      contaExistente,
      slug: lojaId,
    });
    emailEnfileirado = true;
  } catch {
    emailEnfileirado = false;
  }

  return {
    lojaId,
    senhaProvisoria,
    contaExistente,
    mailtoUrl,
    emailEnfileirado,
    emailOutboxId,
  };
}

export async function recusarSolicitacaoRevendedorAdmin(
  solicitacaoId: string,
  processadoPorUid: string,
  motivo: string,
): Promise<void> {
  const solicitacao = await obterSolicitacaoRevendedorAdmin(solicitacaoId);
  if (!solicitacao) throw new Error("Solicitação não encontrada.");
  if (solicitacao.status !== "pendente") {
    throw new Error("Esta solicitação já foi processada.");
  }

  const db = requireDb();
  await updateDoc(doc(db, COLECAO_SOLICITACOES_REVENDEDOR, solicitacaoId), {
    status: "recusada",
    processadoEm: serverTimestamp(),
    processadoPorUid,
    motivoRecusa: motivo.trim() || "Não informado",
  });
}
