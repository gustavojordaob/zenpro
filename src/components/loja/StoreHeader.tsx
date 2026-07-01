import Link from "next/link";
import { AuthLink } from "@/components/loja/AuthLink";
import { CartLink } from "@/components/loja/CartLink";
import { ZenProLogo } from "@/components/loja/ZenProLogo";

export function StoreHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6">
        <ZenProLogo variant="dark" priority />

        <nav
          className="hidden items-center gap-6 text-sm font-medium text-zinc-600 md:flex"
          aria-label="Principal"
        >
          <Link href="/#produtos" className="transition hover:text-zinc-900">
            Produtos
          </Link>
          <Link href="/#personalizar" className="transition hover:text-zinc-900">
            Personalizar
          </Link>
          <Link href="/contato" className="transition hover:text-zinc-900">
            Contato
          </Link>
          <Link href="/#como-funciona" className="transition hover:text-zinc-900">
            Como funciona
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <AuthLink />
          <CartLink />
        </div>
      </div>
    </header>
  );
}
