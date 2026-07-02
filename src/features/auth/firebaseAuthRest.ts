/** Erro quando o e-mail já existe no Auth — caller pode promover a conta existente. */
export class EmailAuthJaExisteError extends Error {
  readonly code = "EMAIL_EXISTS" as const;

  constructor() {
    super("Este e-mail já está cadastrado no Firebase Auth.");
    this.name = "EmailAuthJaExisteError";
  }
}

/** Cria usuário via Identity Toolkit REST (mesmo fluxo do seed-admin-auth). */
export async function criarUsuarioAuthRest(
  email: string,
  password: string,
): Promise<{ uid: string; email: string }> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("Firebase API Key não configurada.");
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password, returnSecureToken: true }),
    },
  );

  const data = (await res.json()) as {
    localId?: string;
    error?: { message?: string };
  };

  if (!res.ok) {
    const code = data.error?.message ?? "unknown";
    if (code === "EMAIL_EXISTS") {
      throw new EmailAuthJaExisteError();
    }
    if (code === "WEAK_PASSWORD") {
      throw new Error("Senha fraca — use pelo menos 6 caracteres.");
    }
    if (code === "INVALID_EMAIL") {
      throw new Error("E-mail inválido.");
    }
    throw new Error(`Não foi possível criar a conta (${code}).`);
  }

  if (!data.localId) {
    throw new Error("Resposta inválida ao criar usuário.");
  }

  return { uid: data.localId, email: email.trim() };
}

export function gerarSenhaProvisoria(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  let senha = "Zp";
  for (let i = 0; i < 10; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha + "1!";
}
