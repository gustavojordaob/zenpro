"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePapelUsuario } from "@/features/auth/PapelUsuarioProvider";
import { sair } from "@/features/auth/authService";
import { useLojaEfetiva } from "@/features/loja/useLojaEfetiva";

export function AuthLink() {
  const { user, carregando } = useAuth();
  const { podeAcessarPortalRevendedor, carregando: papelCarregando } =
    usePapelUsuario();
  const loja = useLojaEfetiva();
  /** Só no portal /revendedor — não no site comum. */
  const mostrarAdmin =
    Boolean(loja?.isB2b) && podeAcessarPortalRevendedor;

  if (carregando || papelCarregando) {
    return (
      <span className="hidden text-sm text-zinc-400 sm:inline">...</span>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3 sm:gap-4">
        {mostrarAdmin && (
          <Link
            href="/admin"
            className="rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-zinc-800"
          >
            Admin
          </Link>
        )}
        <button
          type="button"
          onClick={() => void sair()}
          className="text-sm font-medium text-zinc-400 transition hover:text-zinc-700"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zinc-800"
    >
      Entrar
    </Link>
  );
}
