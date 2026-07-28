import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import {
  criarUsuarioAuthRest,
  EmailAuthJaExisteError,
  gerarSenhaProvisoria,
} from "@/features/auth/firebaseAuthRest";
import {
  chaveIndiceEmail,
  COLECAO_INDICE_EMAIL,
} from "@/features/usuario/perfilIndices";
import {
  COLECOES,
  type LojaConfig,
  type LojaFirestore,
} from "@/features/multitenant/types";
import { MARCA_LOJA_ID, MARCA_LOJA_SLUG } from "@/features/multitenant/catalogoSeedData";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { normalizarSlugLoja, slugLojaValido } from "./revendedorAdminUtils";

export type RevendedorAdmin = {
  lojaId: string;
  nome: string;
  slug: string;
  donoUid: string;
  donoEmail: string;
  donoNome: string | null;
  ativo: boolean;
  config: LojaConfig;
  criadoEm: unknown;
};

export type CriarRevendedorResult = {
  lojaId: string;
  /** Null quando a pessoa já tinha conta de cliente — usa a senha atual dela */
  senhaProvisoria: string | null;
  contaExistente: boolean;
};

async function buscarUidPorEmail(email: string): Promise<string | null> {
  const emailNorm = email.trim().toLowerCase();
  const db = requireDb();

  const indiceSnap = await getDoc(
    doc(db, COLECAO_INDICE_EMAIL, chaveIndiceEmail(emailNorm)),
  );
  if (indiceSnap.exists()) {
    const uid = indiceSnap.data().uid;
    if (typeof uid === "string" && uid) return uid;
  }

  const usuariosSnap = await getDocs(collection(db, COLECOES.USUARIOS));
  const match = usuariosSnap.docs.find(
    (d) => String(d.data().email ?? "").trim().toLowerCase() === emailNorm,
  );
  return match?.id ?? null;
}

async function validarPodePromoverRevendedor(uid: string): Promise<void> {
  const snap = await getDoc(doc(requireDb(), COLECOES.USUARIOS, uid));
  if (!snap.exists()) return;

  const data = snap.data();
  if (data.papel === "marca") {
    throw new Error("Este e-mail pertence à conta administradora da marca.");
  }
  if (data.papel === "revendedor" && data.lojaId) {
    throw new Error(
      `Este usuário já é revendedor da loja "${String(data.lojaId)}".`,
    );
  }
}

async function resolverUidDono(
  emailDono: string,
  senha: string,
): Promise<{ uid: string; contaExistente: boolean; senhaProvisoria: string | null }> {
  const email = emailDono.trim().toLowerCase();

  try {
    const { uid } = await criarUsuarioAuthRest(email, senha);
    return { uid, contaExistente: false, senhaProvisoria: senha };
  } catch (error) {
    if (!(error instanceof EmailAuthJaExisteError)) throw error;

    const uid = await buscarUidPorEmail(email);
    if (!uid) {
      throw new Error(
        "Este e-mail já tem login, mas não encontramos o perfil vinculado. Peça ao candidato acessar /conta uma vez e tente aprovar de novo.",
      );
    }

    await validarPodePromoverRevendedor(uid);
    return { uid, contaExistente: true, senhaProvisoria: null };
  }
}

export type CriarRevendedorInput = {
  nomeLoja: string;
  slug: string;
  emailDono: string;
  nomeDono: string;
  senhaProvisoria?: string;
};

export type AtualizarLojaInput = {
  nome: string;
  slug?: string;
  config: LojaConfig;
};

function requireDb() {
  if (!isFirebaseConfigured()) throw new Error("Firebase não configurado.");
  return getFirebaseDb();
}

function mapLoja(
  lojaId: string,
  data: DocumentData,
  donoEmail = "",
  donoNome: string | null = null,
): RevendedorAdmin {
  return {
    lojaId,
    nome: String(data.nome ?? ""),
    slug: String(data.slug ?? lojaId),
    donoUid: String(data.donoUid ?? ""),
    donoEmail: String(data.donoEmail ?? donoEmail),
    donoNome,
    ativo: Boolean(data.ativo),
    config: (data.config as LojaConfig) ?? {},
    criadoEm: data.criadoEm,
  };
}

export async function slugLojaDisponivel(
  slug: string,
  lojaIdAtual?: string,
): Promise<boolean> {
  const normalizado = normalizarSlugLoja(slug);
  if (!slugLojaValido(normalizado)) return false;

  const db = requireDb();
  const snap = await getDocs(
    query(collection(db, COLECOES.LOJAS), where("slug", "==", normalizado)),
  );

  if (snap.empty) return true;
  if (lojaIdAtual && snap.docs.length === 1 && snap.docs[0].id === lojaIdAtual) {
    return true;
  }
  return false;
}

export async function listarRevendedoresAdmin(): Promise<RevendedorAdmin[]> {
  const db = requireDb();
  const snap = await getDocs(collection(db, COLECOES.LOJAS));

  const lojas = await Promise.all(
    snap.docs
      // A loja da MARCA (Zen Pro, raiz "/") não é um revendedor — não listar.
      .filter(
        (d) =>
          d.id !== MARCA_LOJA_ID &&
          String(d.data().slug ?? "") !== MARCA_LOJA_SLUG &&
          d.data().papel !== "marca",
      )
      .map(async (d) => {
      const data = d.data();
      let donoNome: string | null = null;
      const donoUid = String(data.donoUid ?? "");
      if (donoUid) {
        const userSnap = await getDoc(doc(db, COLECOES.USUARIOS, donoUid));
        if (userSnap.exists()) {
          donoNome = (userSnap.data().nomeCompleto as string | undefined) ?? null;
        }
      }
      return mapLoja(d.id, data, String(data.donoEmail ?? ""), donoNome);
    }),
  );

  return lojas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function obterRevendedorAdmin(
  lojaId: string,
): Promise<RevendedorAdmin | null> {
  const db = requireDb();
  const snap = await getDoc(doc(db, COLECOES.LOJAS, lojaId));
  if (!snap.exists()) return null;

  const data = snap.data();
  let donoNome: string | null = null;
  const donoUid = String(data.donoUid ?? "");
  if (donoUid) {
    const userSnap = await getDoc(doc(db, COLECOES.USUARIOS, donoUid));
    if (userSnap.exists()) {
      donoNome = (userSnap.data().nomeCompleto as string | undefined) ?? null;
    }
  }

  return mapLoja(snap.id, data, String(data.donoEmail ?? ""), donoNome);
}

export async function criarRevendedorAdmin(
  input: CriarRevendedorInput,
): Promise<CriarRevendedorResult> {
  const slug = normalizarSlugLoja(input.slug);
  if (!slugLojaValido(slug)) {
    throw new Error("Slug inválido. Use letras minúsculas, números e hífens (ex.: minha-loja).");
  }

  if (!(await slugLojaDisponivel(slug))) {
    throw new Error("Este slug já está em uso. Escolha outro endereço para a loja.");
  }

  const senha = input.senhaProvisoria?.trim() || gerarSenhaProvisoria();
  if (senha.length < 6) {
    throw new Error("Senha provisória deve ter pelo menos 6 caracteres.");
  }

  const { uid, contaExistente, senhaProvisoria } = await resolverUidDono(
    input.emailDono,
    senha,
  );

  const db = requireDb();
  const lojaId = slug;
  const config: LojaConfig = {
    logo: null,
    cor: "#18181b",
    whatsapp: null,
    pedidoMinimoCentavos: 80_000,
  };

  const lojaPayload: LojaFirestore & {
    donoEmail: string;
    criadoEm: ReturnType<typeof serverTimestamp>;
    atualizadoEm: ReturnType<typeof serverTimestamp>;
  } = {
    nome: input.nomeLoja.trim(),
    slug,
    donoUid: uid,
    donoEmail: input.emailDono.trim().toLowerCase(),
    ativo: true,
    config,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };

  await setDoc(doc(db, COLECOES.LOJAS, lojaId), lojaPayload);

  await setDoc(
    doc(db, COLECOES.USUARIOS, uid),
    {
      email: input.emailDono.trim().toLowerCase(),
      nomeCompleto: input.nomeDono.trim(),
      papel: "revendedor",
      lojaId,
      atualizadoEm: serverTimestamp(),
    },
    { merge: true },
  );

  return { lojaId, senhaProvisoria, contaExistente };
}

export async function alternarAtivoRevendedorAdmin(
  lojaId: string,
  ativo: boolean,
): Promise<void> {
  const db = requireDb();
  await updateDoc(doc(db, COLECOES.LOJAS, lojaId), {
    ativo,
    atualizadoEm: serverTimestamp(),
  });
}

export async function atualizarRevendedorAdmin(
  lojaId: string,
  input: AtualizarLojaInput,
  permitirTrocarSlug: boolean,
): Promise<void> {
  const db = requireDb();
  const ref = doc(db, COLECOES.LOJAS, lojaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Loja não encontrada.");

  const atual = snap.data() as LojaFirestore;
  const cfgAtual = atual.config ?? {};

  const payload: Record<string, unknown> = {
    nome: input.nome.trim(),
    config: {
      ...cfgAtual,
      logo: input.config.logo ?? null,
      cor: input.config.cor ?? null,
      whatsapp: input.config.whatsapp ?? null,
      limiteCreditoCentavos:
        input.config.limiteCreditoCentavos !== undefined
          ? input.config.limiteCreditoCentavos
          : (cfgAtual.limiteCreditoCentavos ?? null),
      pedidoMinimoCentavos:
        input.config.pedidoMinimoCentavos !== undefined
          ? input.config.pedidoMinimoCentavos
          : (cfgAtual.pedidoMinimoCentavos ?? null),
      comissaoPercentual:
        input.config.comissaoPercentual !== undefined
          ? input.config.comissaoPercentual
          : (cfgAtual.comissaoPercentual ?? null),
      prazoEntregaDiasLocal:
        input.config.prazoEntregaDiasLocal !== undefined
          ? input.config.prazoEntregaDiasLocal
          : (cfgAtual.prazoEntregaDiasLocal ?? null),
      prazoEntregaDiasZenPro:
        input.config.prazoEntregaDiasZenPro !== undefined
          ? input.config.prazoEntregaDiasZenPro
          : (cfgAtual.prazoEntregaDiasZenPro ?? null),
      expedicao:
        input.config.expedicao !== undefined
          ? input.config.expedicao
          : (cfgAtual.expedicao ?? null),
      pagamentoPadrao:
        input.config.pagamentoPadrao !== undefined
          ? input.config.pagamentoPadrao
          : (cfgAtual.pagamentoPadrao ?? null),
      niveisRevendedor: cfgAtual.niveisRevendedor ?? null,
    },
    atualizadoEm: serverTimestamp(),
  };

  if (permitirTrocarSlug && input.slug) {
    const slug = normalizarSlugLoja(input.slug);
    if (!slugLojaValido(slug)) {
      throw new Error("Slug inválido.");
    }
    if (!(await slugLojaDisponivel(slug, lojaId))) {
      throw new Error("Slug já em uso.");
    }
    payload.slug = slug;
  }

  await updateDoc(ref, payload);
}
