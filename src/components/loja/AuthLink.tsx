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
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/conta"
          className="hidden rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 sm:inline-block"
        >
          Minha conta
        </Link>
        <button
          type="button"
          onClick={() => void sair()}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
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
