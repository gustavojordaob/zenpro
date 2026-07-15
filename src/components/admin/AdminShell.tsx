"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { sair } from "@/features/auth/authService";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";
import { linkWhatsAppAtendimento } from "@/features/revendedor/revendedorComercialConstants";

type Props = {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
};

type NavItem = { href: string; label: string; destaque?: boolean };

export function AdminShell({ titulo, subtitulo, children }: Props) {
  const { sessao, papel, lojaId } = useAuthAdmin();
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = usePathname();

  // Dourado só na página atual (não antes de clicar).
  const rotaAtiva = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  async function handleSair() {
    await sair();
    window.location.href = "/admin/login";
  }

  const links: NavItem[] = [
    { href: "/admin", label: "Dashboard" },
    ...(sessao?.papel === "marca"
      ? [
          { href: "/admin/revendedores", label: "Revendedores" },
          {
            href: "/admin/solicitacoes-revendedor",
            label: "Candidaturas",
            destaque: true,
          },
          { href: "/admin/capinha-nova", label: "+ Nova case", destaque: true },
          { href: "/admin/tipos", label: "Tipos" },
          { href: "/admin/marcas", label: "Marcas" },
          { href: "/admin/modelos", label: "Modelos" },
          { href: "/admin/produtos", label: "Produtos" },
        ]
      : []),
    { href: "/admin/pedidos", label: "Pedidos" },
    // Estoque só da marca (loja oficial). Revendedor compra em /revendedor.
    ...(sessao?.papel === "marca"
      ? [
          { href: "/admin/estoque", label: "Estoque" },
          { href: "/admin/reposicao", label: "Reposição" },
        ]
      : [
          {
            href: "/revendedor",
            label: "Site revendedor",
            destaque: true,
          },
        ]),
    ...(sessao?.papel === "marca"
      ? [{ href: "/admin/pedidos/nova", label: "Venda presencial", destaque: true }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="h-1 w-full bg-gradient-to-r from-gold-dark via-gold to-gold-dark" />
      <header className="border-b border-zinc-200 bg-ink">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Admin Zen Pro
            </p>
            <h1 className="truncate text-lg font-bold text-white">{titulo}</h1>
            {subtitulo && (
              <p className="truncate text-sm text-zinc-300">{subtitulo}</p>
            )}
          </div>

          {/* Nav desktop */}
          <nav className="hidden items-center gap-3 lg:flex">
            {papel && (
              <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
                {papel === "marca" ? "Marca" : "Revendedor"}
                {lojaId ? ` · ${lojaId}` : ""}
              </span>
            )}
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={rotaAtiva(l.href) ? "page" : undefined}
                className={`text-sm font-medium transition ${
                  rotaAtiva(l.href)
                    ? "text-gold"
                    : "text-zinc-300 hover:text-gold"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => void handleSair()}
              className="rounded-lg border border-gold/40 px-3 py-1.5 text-sm text-gold hover:bg-gold/10"
            >
              Sair
            </button>
            {sessao?.papel === "revendedor" && (
              <a
                href={linkWhatsAppAtendimento(
                  "Olá! Sou revendedor Zen Pro e preciso de atendimento.",
                )}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Fale conosco
              </a>
            )}
          </nav>

          {/* Botão menu mobile */}
          <button
            type="button"
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((v) => !v)}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-gold/40 p-2 text-gold lg:hidden"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {menuAberto ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Painel mobile */}
        {menuAberto && (
          <nav className="border-t border-white/10 bg-ink px-4 pb-4 lg:hidden">
            {papel && (
              <span className="mb-3 mt-3 inline-block rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
                {papel === "marca" ? "Marca" : "Revendedor"}
                {lojaId ? ` · ${lojaId}` : ""}
              </span>
            )}
            <div className="flex flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={rotaAtiva(l.href) ? "page" : undefined}
                  onClick={() => setMenuAberto(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    rotaAtiva(l.href)
                      ? "bg-gold/10 text-gold"
                      : "text-zinc-200 hover:bg-white/5 hover:text-gold"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => void handleSair()}
                className="mt-2 rounded-lg border border-gold/40 px-3 py-2 text-left text-sm text-gold hover:bg-gold/10"
              >
                Sair
              </button>
              {sessao?.papel === "revendedor" && (
                <a
                  href={linkWhatsAppAtendimento(
                    "Olá! Sou revendedor Zen Pro e preciso de atendimento.",
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-medium text-white"
                >
                  Fale conosco
                </a>
              )}
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
