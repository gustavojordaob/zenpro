"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AuthLink } from "@/components/loja/AuthLink";
import { CartLink } from "@/components/loja/CartLink";
import { ZenProLogo } from "@/components/loja/ZenProLogo";
import { useLojaEfetiva } from "@/features/loja/useLojaEfetiva";
import { useLojaPaths } from "@/features/loja/useLojaPaths";

export function StoreHeader() {
  const loja = useLojaEfetiva();
  const paths = useLojaPaths();
  const pathname = usePathname();
  const corAccent = loja?.config.cor ?? undefined;
  const [menuAberto, setMenuAberto] = useState(false);

  // Dourado só quando é a página atual (não antes de clicar). Links com âncora
  // (#) apontam para a home, então não entram no destaque de rota ativa.
  const rotaAtiva = (href: string) => {
    const base = href.split("#")[0];
    return base.length > 1 ? pathname === base : false;
  };
  const classeLink = (href: string) =>
    `transition ${
      rotaAtiva(href)
        ? "text-gold-dark"
        : "text-zinc-600 hover:text-gold-dark"
    }`;

  const links = [
    { href: paths.produtosHash, label: "Produtos" },
    { href: paths.personalizarHash, label: "Personalizar" },
    { href: "/meus-pedidos", label: "Meus pedidos" },
    { href: "/conta", label: "Minha conta" },
    ...(loja
      ? []
      : [
          { href: "/seja-revendedor", label: "Seja um revendedor", destaque: true },
          { href: paths.contato, label: "Contato" },
          { href: "/#como-funciona", label: "Como funciona" },
        ]),
  ];

  return (
    <header
      className="sticky top-0 z-50 border-b border-zinc-200 bg-white"
      style={corAccent ? { borderBottomColor: `${corAccent}33` } : undefined}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6">
        {loja ? (
          <Link
            href={paths.home}
            className="flex min-w-0 items-center gap-2.5"
          >
            {loja.config.logo ? (
              <Image
                src={loja.config.logo}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-lg object-cover"
                unoptimized
              />
            ) : (
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: corAccent ?? "#18181b" }}
                aria-hidden
              >
                {loja.nome.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate font-semibold text-zinc-900">
              {loja.nome}
            </span>
          </Link>
        ) : (
          <ZenProLogo variant="dark" priority />
        )}

        <nav
          className="hidden items-center gap-6 text-sm font-medium text-zinc-600 md:flex"
          aria-label="Principal"
        >
          <Link href={paths.produtosHash} className={classeLink(paths.produtosHash)}>
            Produtos
          </Link>
          <Link
            href={paths.personalizarHash}
            className={classeLink(paths.personalizarHash)}
          >
            Personalizar
          </Link>
          {!loja && (
            <>
              <Link href="/seja-revendedor" className={classeLink("/seja-revendedor")}>
                Seja um revendedor
              </Link>
              <Link href={paths.contato} className={classeLink(paths.contato)}>
                Contato
              </Link>
              <Link href="/#como-funciona" className={classeLink("/#como-funciona")}>
                Como funciona
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {loja && (
            <span className="flex items-center gap-1.5 border-r border-zinc-200 pr-2 sm:pr-3">
              <span className="hidden text-[10px] font-medium uppercase tracking-wide text-zinc-400 sm:inline">
                por
              </span>
              <ZenProLogo
                variant="dark"
                href="/"
                className="h-5 w-auto sm:h-6"
              />
            </span>
          )}
          <AuthLink />
          <CartLink />
          <button
            type="button"
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((v) => !v)}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-300 p-2 text-zinc-700 md:hidden"
          >
            <svg
              width="20"
              height="20"
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

      {/* Menu mobile */}
      {menuAberto && (
        <nav
          className="border-t border-zinc-200 bg-white px-4 py-2 md:hidden"
          aria-label="Principal mobile"
        >
          <div className="mx-auto flex max-w-6xl flex-col">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuAberto(false)}
                className={`rounded-lg px-2 py-2.5 text-sm font-medium ${
                  "destaque" in l && l.destaque
                    ? "text-gold-dark hover:bg-gold-soft/30"
                    : "text-zinc-700 hover:bg-zinc-50 hover:text-gold-dark"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
