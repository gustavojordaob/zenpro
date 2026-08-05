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
          { href: "/admin/capinha-nova", label: "Nova case", destaque: true },
          { href: "/admin/tipos", label: "Tipos" },
          { href: "/admin/marcas", label: "Marcas" },
          { href: "/admin/modelos", label: "Modelos" },
          { href: "/admin/produtos", label: "Produtos" },
          { href: "/admin/campanhas", label: "Campanhas" },
        ]
      : []),
    { href: "/admin/pedidos", label: "Pedidos" },
    ...(sessao?.papel === "marca"
      ? [
          { href: "/admin/estoque", label: "Estoque" },
          { href: "/admin/reposicao", label: "Reposição" },
          { href: "/admin/pedidos/nova", label: "Venda presencial", destaque: true },
        ]
      : [
          {
            href: "/revendedor",
            label: "Site revendedor",
            destaque: true,
          },
        ]),
  ];

  const badgePapel =
    papel === "marca" ? "Marca" : papel === "revendedor" ? "Revendedor" : null;

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="h-1 w-full bg-gradient-to-r from-gold-dark via-gold to-gold-dark" />
      <header className="border-b border-zinc-200 bg-ink">
        {/* Linha 1: marca + ações (nunca compete com os links) */}
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                Admin Zen Pro
              </p>
              {badgePapel && (
                <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[10px] font-medium text-gold">
                  {badgePapel}
                  {lojaId ? ` · ${lojaId}` : ""}
                </span>
              )}
            </div>
            <h1 className="mt-1 truncate text-base font-bold text-white sm:text-lg">
              {titulo}
            </h1>
            {subtitulo ? (
              <p className="mt-0.5 truncate text-xs text-zinc-400 sm:text-sm">
                {subtitulo}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSair()}
              className="hidden rounded-lg border border-gold/40 px-3 py-1.5 text-sm text-gold hover:bg-gold/10 sm:inline-flex"
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
                className="hidden rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 sm:inline-flex"
              >
                Fale conosco
              </a>
            )}
            <button
              type="button"
              aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuAberto}
              onClick={() => setMenuAberto((v) => !v)}
              className="inline-flex items-center justify-center rounded-lg border border-gold/40 p-2 text-gold lg:hidden"
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
        </div>

        {/* Linha 2 desktop: links em scroll horizontal */}
        <nav
          className="hidden border-t border-white/10 lg:block"
          aria-label="Admin"
        >
          <div className="mx-auto max-w-6xl overflow-x-auto px-4 sm:px-6">
            <ul className="flex min-w-max items-center gap-1 py-2">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={rotaAtiva(l.href) ? "page" : undefined}
                    className={`inline-block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      rotaAtiva(l.href)
                        ? "bg-gold/15 text-gold"
                        : l.destaque
                          ? "text-gold/90 hover:bg-white/5 hover:text-gold"
                          : "text-zinc-300 hover:bg-white/5 hover:text-gold"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Menu mobile / tablet */}
        {menuAberto && (
          <nav
            className="max-h-[70vh] overflow-y-auto border-t border-white/10 bg-ink px-4 pb-4 lg:hidden"
            aria-label="Admin mobile"
          >
            <div className="flex flex-col gap-0.5 pt-2">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={rotaAtiva(l.href) ? "page" : undefined}
                  onClick={() => setMenuAberto(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
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
                className="mt-2 rounded-lg border border-gold/40 px-3 py-2.5 text-left text-sm text-gold hover:bg-gold/10 sm:hidden"
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
                  className="mt-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-center text-sm font-medium text-white sm:hidden"
                >
                  Fale conosco
                </a>
              )}
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
