"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { sair } from "@/features/auth/authService";

export function AuthLink() {
  const { user, carregando } = useAuth();

  if (carregando) {
    return (
      <span className="hidden text-sm text-zinc-400 sm:inline">...</span>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-4 sm:gap-5">
        <Link
          href="/meus-pedidos"
          className="hidden text-sm font-medium text-zinc-600 transition hover:text-gold-dark sm:inline"
        >
          Meus pedidos
        </Link>
        <Link
          href="/conta"
          className="hidden text-sm font-medium text-zinc-600 transition hover:text-gold-dark sm:inline"
        >
          Minha conta
        </Link>
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
