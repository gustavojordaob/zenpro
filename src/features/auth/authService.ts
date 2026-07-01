import {
  createUserWithEmailAndPassword,
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

export async function sair(): Promise<void> {
  await signOut(requireAuth());
}
