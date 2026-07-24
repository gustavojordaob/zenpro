"use client";

import { useState } from "react";
import { enviarRedefinicaoSenha } from "@/features/auth/authService";
import { isFirebaseConfigured } from "@/lib/firebase";

type Props = {
  email: string;
  destino: "loja" | "admin";
  className?: string;
};

/**
 * Envia e-mail de reset do Firebase Auth.
 * Usa o e-mail já digitado no formulário de login.
 */
export function BotaoEsqueciSenha({ email, destino, className }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handleClick() {
    setMsg(null);
    setErro(null);

    if (!isFirebaseConfigured()) {
      setErro("Firebase não configurado.");
      return;
    }
    if (!email.trim()) {
      setErro("Digite seu e-mail acima e clique de novo.");
      return;
    }

    setEnviando(true);
    try {
      await enviarRedefinicaoSenha(email, destino);
      setMsg(
        "Se este e-mail estiver cadastrado, enviamos um link para redefinir a senha. Confira a caixa de entrada e o spam.",
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o e-mail de redefinição.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={enviando}
        className="text-sm font-medium text-zinc-700 underline hover:text-zinc-900 disabled:opacity-50"
      >
        {enviando ? "Enviando…" : "Esqueci a senha"}
      </button>
      {msg && <p className="mt-2 text-sm text-emerald-700">{msg}</p>}
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </div>
  );
}
