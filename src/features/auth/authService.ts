import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { traduzirErroAuth } from "./authErrors";

function requireAuth() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }
  return getFirebaseAuth();
}

function urlContinuidadeReset(destino: "loja" | "admin"): string {
  const base =
    (typeof window !== "undefined" ? window.location.origin : null) ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://usezenpro.com.br";
  return destino === "admin" ? `${base}/admin/login` : `${base}/login`;
}

export async function entrarComEmail(
  email: string,
  senha: string,
): Promise<User> {
  try {
    const cred = await signInWithEmailAndPassword(
      requireAuth(),
      email.trim(),
      senha,
    );
    return cred.user;
  } catch (error) {
    throw new Error(traduzirErroAuth(error));
  }
}

export async function criarContaComEmail(
  email: string,
  senha: string,
): Promise<User> {
  try {
    const cred = await createUserWithEmailAndPassword(
      requireAuth(),
      email.trim(),
      senha,
    );
    return cred.user;
  } catch (error) {
    throw new Error(traduzirErroAuth(error));
  }
}

/** Envia e-mail do Firebase Auth com link para redefinir a senha. */
export async function enviarRedefinicaoSenha(
  email: string,
  destino: "loja" | "admin" = "loja",
): Promise<void> {
  const emailTrim = email.trim();
  if (!emailTrim) {
    throw new Error("Informe o e-mail para redefinir a senha.");
  }
  try {
    await sendPasswordResetEmail(requireAuth(), emailTrim, {
      url: urlContinuidadeReset(destino),
      handleCodeInApp: false,
    });
  } catch (error) {
    // Não revela se o e-mail existe (proteção de enumeração).
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "auth/user-not-found"
    ) {
      return;
    }
    throw new Error(traduzirErroAuth(error));
  }
}

export async function sair(): Promise<void> {
  await signOut(requireAuth());
}
