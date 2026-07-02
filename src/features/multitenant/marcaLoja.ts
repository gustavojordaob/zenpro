/**
 * Loja "oficial" do dono (papel `marca`).
 *
 * A raiz do site ("/") é a loja do próprio dono: pedidos feitos fora de um
 * revendedor (/[slug]) são gravados em `lojas/{MARCA_LOJA_ID}/pedidos` e
 * aparecem no admin junto com as demais (com filtro por loja).
 */
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { COLECOES, type LojaConfig } from "./types";
import {
  MARCA_LOJA_ID,
  MARCA_LOJA_NOME,
  MARCA_LOJA_SLUG,
} from "./catalogoSeedData";
import type { LojaEfetiva } from "@/features/loja/useLojaEfetiva";

export { MARCA_LOJA_ID, MARCA_LOJA_NOME, MARCA_LOJA_SLUG };

/** Loja efetiva usada no checkout da raiz (sem revendedor). */
export const MARCA_LOJA_EFETIVA: LojaEfetiva = {
  lojaId: MARCA_LOJA_ID,
  slug: MARCA_LOJA_SLUG,
  nome: MARCA_LOJA_NOME,
  ativo: true,
  config: {},
  basePath: "",
  isMarca: true,
};

/**
 * Garante que o documento `lojas/{MARCA_LOJA_ID}` exista (dono = marca logada).
 * Idempotente — deve ser chamado com a marca autenticada (regras exigem isMarca).
 */
export async function ensureMarcaLoja(
  uid: string,
  email: string | null,
): Promise<void> {
  if (!isFirebaseConfigured()) return;

  const db = getFirebaseDb();
  const lojaRef = doc(db, COLECOES.LOJAS, MARCA_LOJA_ID);
  const snap = await getDoc(lojaRef);
  if (snap.exists()) return;

  const config: LojaConfig = { logo: null, cor: "#18181b", whatsapp: null };
  await setDoc(lojaRef, {
    nome: MARCA_LOJA_NOME,
    slug: MARCA_LOJA_SLUG,
    donoUid: uid,
    donoEmail: email ?? undefined,
    ativo: true,
    config,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
}
