import { FirebaseError } from "firebase/app";

const MENSAGENS: Record<string, string> = {
  "auth/invalid-email": "E-mail inválido.",
  "auth/user-disabled": "Conta desativada.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/email-already-in-use": "Este e-mail já está cadastrado.",
  "auth/weak-password": "Senha fraca — use pelo menos 6 caracteres.",
  "auth/too-many-requests": "Muitas tentativas. Tente novamente em instantes.",
};

export function traduzirErroAuth(error: unknown): string {
  if (error instanceof FirebaseError && MENSAGENS[error.code]) {
    return MENSAGENS[error.code];
  }
  return "Não foi possível autenticar. Tente novamente.";
}
