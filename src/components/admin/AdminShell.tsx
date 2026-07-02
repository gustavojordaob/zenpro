"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { sair } from "@/features/auth/authService";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";

type Props = {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
};

export function AdminShell({ titulo, subtitulo, children }: Props) {
  const { sessao, papel, lojaId } = useAuthAdmin();

  async function handleSair() {
    await sair();
    window.location.href = "/admin/login";
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Admin Zen Pro
            </p>
            <h1 className="text-lg font-bold text-zinc-900">{titulo}</h1>
            {subtitulo && (
              <p className="text-sm text-zinc-600">{subtitulo}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {papel && (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                {papel === "marca" ? "Marca" : "Revendedor"}
                {lojaId ? ` · ${lojaId}` : ""}
              </span>
            )}
            <Link
              href="/admin"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              Dashboard
            </Link>
            {sessao?.papel === "marca" && (
              <>
                <Link
                  href="/admin/revendedores"
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
                >
                  Revendedores
                </Link>
                <Link
                  href="/admin/solicitacoes-revendedor"
                  className="text-sm font-medium text-violet-700 hover:text-violet-900"
                >
                  Candidaturas
                </Link>
                <Link
                  href="/admin/tipos"
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
                >
                  Tipos
                </Link>
                <Link
                  href="/admin/marcas"
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
                >
                  Marcas
                </Link>
                <Link
                  href="/admin/modelos"
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
                >
                  Modelos
                </Link>
                <Link
                  href="/admin/produtos"
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
                >
                  Produtos
                </Link>
              </>
            )}
            <Link
              href="/admin/pedidos"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              Pedidos
            </Link>
            <Link
              href="/admin/estoque"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              Estoque
            </Link>
            <Link
              href="/admin/pedidos/nova"
              className="text-sm font-medium text-violet-700 hover:text-violet-900"
            >
              Venda presencial
            </Link>
            {sessao?.papel === "revendedor" && sessao.lojaId && (
              <Link
                href={`/admin/lojas/${sessao.lojaId}`}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
              >
                Minha loja
              </Link>
            )}
            <button
              type="button"
              onClick={() => void handleSair()}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
