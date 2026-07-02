import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import type { PapelUsuario } from "@/features/multitenant/types";

export type SessaoAdmin = {
  uid: string;
  email: string | null;
  papel: PapelUsuario;
  lojaId: string | null;
  nomeCompleto: string | null;
};

export function adminHomePath(
  papel: PapelUsuario,
  _lojaId: string | null,
): string {
  if (papel === "marca" || papel === "revendedor") return "/admin";
  return "/admin/login";
}

export function isPapelAdmin(papel: unknown): papel is PapelUsuario {
  return papel === "marca" || papel === "revendedor";
}

export async function carregarSessaoAdmin(
  uid: string,
  email: string | null,
): Promise<SessaoAdmin | null> {
  if (!isFirebaseConfigured()) return null;

  const snap = await getDoc(doc(getFirebaseDb(), "usuarios", uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  if (!isPapelAdmin(data.papel)) return null;

  return {
    uid,
    email,
    papel: data.papel,
    lojaId: (data.lojaId as string | null | undefined) ?? null,
    nomeCompleto: (data.nomeCompleto as string | undefined) ?? null,
  };
}

export function revendedorPodeAcessarLoja(
  sessao: SessaoAdmin,
  lojaId: string,
): boolean {
  if (sessao.papel === "marca") return true;
  return sessao.papel === "revendedor" && sessao.lojaId === lojaId;
}

export function revendedorPodeAcessarPainelMarca(sessao: SessaoAdmin): boolean {
  return sessao.papel === "marca";
}
