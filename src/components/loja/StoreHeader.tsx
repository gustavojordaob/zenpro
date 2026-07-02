"use client";

import Image from "next/image";
import Link from "next/link";
import { AuthLink } from "@/components/loja/AuthLink";
import { CartLink } from "@/components/loja/CartLink";
import { ZenProLogo } from "@/components/loja/ZenProLogo";
import { useLojaEfetiva } from "@/features/loja/useLojaEfetiva";
import { useLojaPaths } from "@/features/loja/useLojaPaths";

export function StoreHeader() {
  const loja = useLojaEfetiva();
  const paths = useLojaPaths();
  const corAccent = loja?.config.cor ?? undefined;

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
          <Link href={paths.produtosHash} className="transition hover:text-zinc-900">
            Produtos
          </Link>
          <Link
            href={paths.personalizarHash}
            className="transition hover:text-zinc-900"
          >
            Personalizar
          </Link>
          {!loja && (
            <>
              <Link href="/seja-revendedor" className="font-medium text-violet-700 transition hover:text-violet-900">
                Seja um revendedor
              </Link>
              <Link href={paths.contato} className="transition hover:text-zinc-900">
                Contato
              </Link>
              <Link href="/#como-funciona" className="transition hover:text-zinc-900">
                Como funciona
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <AuthLink />
          <CartLink />
        </div>
      </div>
    </header>
  );
}
