"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthLink } from "@/components/loja/AuthLink";
import { CartLink } from "@/components/loja/CartLink";
import {
  NavDropdownCapinhas,
  NavDropdownTermicos,
} from "@/components/loja/NavMegaMenus";
import { ZenProLogo } from "@/components/loja/ZenProLogo";
import { EntrarComoRevendedorLink } from "@/components/revendedor/EntrarComoRevendedorLink";
import {
  listarCampanhasAtivas,
  type Campanha,
} from "@/features/loja/campanhaService";
import { TERMICOS_SUBTIPOS } from "@/features/loja/categoriasVitrine";
import {
  listarMarcasAtivas,
  listarModelosAtivos,
} from "@/features/catalogo/catalogoRuntimeService";
import { useLojaEfetiva } from "@/features/loja/useLojaEfetiva";
import { useLojaPaths } from "@/features/loja/useLojaPaths";
import { isFirebaseConfigured } from "@/lib/firebase";

const btnTealOutline =
  "rounded-lg border border-teal-700 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50";

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StoreHeader() {
  const loja = useLojaEfetiva();
  const paths = useLojaPaths();
  const pathname = usePathname();
  const corAccent = loja?.config.cor ?? undefined;
  const [menuAberto, setMenuAberto] = useState(false);
  const [maisAberto, setMaisAberto] = useState(false);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [marcasMobile, setMarcasMobile] = useState<{ id: string; nome: string }[]>(
    [],
  );
  const [modelosMobile, setModelosMobile] = useState<
    { id: string; nome: string; marcaId: string }[]
  >([]);
  const [marcaMobileAberta, setMarcaMobileAberta] = useState<string | null>(
    null,
  );
  const [termicosMobileAberto, setTermicosMobileAberto] = useState(false);
  const [capinhasMobileAberto, setCapinhasMobileAberto] = useState(false);
  const maisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    void listarCampanhasAtivas()
      .then(setCampanhas)
      .catch(() => setCampanhas([]));
    void Promise.all([listarMarcasAtivas(), listarModelosAtivos()])
      .then(([m, mod]) => {
        setMarcasMobile(
          [...m]
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
            .map((x) => ({ id: x.id, nome: x.nome })),
        );
        setModelosMobile(
          mod.map((x) => ({ id: x.id, nome: x.nome, marcaId: x.marcaId })),
        );
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!maisRef.current?.contains(e.target as Node)) setMaisAberto(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const rotaAtiva = (href: string) => {
    const base = href.split("?")[0].split("#")[0];
    return base.length > 1
      ? pathname === base || pathname.startsWith(`${base}/`)
      : false;
  };
  const classeLink = (href: string) =>
    `transition ${
      rotaAtiva(href)
        ? "text-gold-dark"
        : "text-zinc-600 hover:text-gold-dark"
    }`;

  type NavLink = {
    href: string;
    label: string;
    destaque?: boolean;
    component?: "entrar-revendedor";
  };

  const linksExtras: NavLink[] = [
    { href: "/meus-pedidos", label: "Meus pedidos" },
    { href: "/conta", label: "Minha conta" },
    ...(loja
      ? loja.isB2b
        ? ([{ href: "/", label: "Site comum" }] as NavLink[])
        : ([] as NavLink[])
      : ([
          {
            href: "/seja-revendedor",
            label: "Seja um revendedor",
            destaque: true,
          },
          {
            href: "/revendedor",
            label: "Entrar como revendedor",
            destaque: true,
            component: "entrar-revendedor",
          },
          { href: paths.contato, label: "Contato" },
          { href: "/#como-funciona", label: "Como funciona" },
        ] as NavLink[])),
  ];

  const promoPrincipal = campanhas[0] ?? null;

  return (
    <header
      className="sticky top-0 z-50 border-b border-zinc-200 bg-white"
      style={corAccent ? { borderBottomColor: `${corAccent}33` } : undefined}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6">
        <div className="min-w-0 shrink-0">
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
        </div>

        {/* Categorias — sem scroll; só o essencial */}
        <nav
          className="ml-2 hidden items-center gap-4 text-sm font-medium text-zinc-600 md:flex lg:ml-6 lg:gap-5"
          aria-label="Categorias"
        >
          {promoPrincipal && (
            <Link
              href={paths.promocao(promoPrincipal.slug)}
              className="max-w-[9rem] truncate font-semibold text-gold-dark hover:text-gold lg:max-w-none"
              title={promoPrincipal.titulo}
            >
              {promoPrincipal.titulo}
            </Link>
          )}
          <NavDropdownCapinhas />
          <NavDropdownTermicos />
          <Link
            href={paths.categoria("personalizaveis")}
            className={classeLink(paths.categoria("personalizaveis"))}
          >
            Personalizáveis
          </Link>
          <Link
            href={paths.categoria("personalizadas")}
            className={classeLink(paths.categoria("personalizadas"))}
          >
            Personalizadas
          </Link>
          <Link
            href={paths.categoria("acessorios")}
            className={classeLink(paths.categoria("acessorios"))}
          >
            Acessórios
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {loja && (
            <span className="hidden items-center gap-1.5 border-r border-zinc-200 pr-3 lg:flex">
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                por
              </span>
              <ZenProLogo variant="dark" href="/" className="h-5 w-auto" />
            </span>
          )}

          {!loja && (
            <div className="hidden items-center gap-2 lg:flex">
              <Link
                href="/seja-revendedor"
                className="whitespace-nowrap text-sm font-medium text-zinc-600 hover:text-gold-dark"
              >
                Seja um revendedor
              </Link>
              <EntrarComoRevendedorLink className="whitespace-nowrap rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-teal-700" />
            </div>
          )}

          {/* Mais: contato, outras promos — desktop */}
          <div ref={maisRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setMaisAberto((v) => !v)}
              className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-gold-dark"
              aria-expanded={maisAberto}
            >
              Mais
              <ChevronDown />
            </button>
            {maisAberto && (
              <div className="absolute right-0 top-full z-50 mt-2 min-w-[12rem] rounded-xl border border-zinc-200 bg-white py-2 shadow-lg">
                {campanhas.slice(1).map((c) => (
                  <Link
                    key={c.id}
                    href={paths.promocao(c.slug)}
                    onClick={() => setMaisAberto(false)}
                    className="block px-4 py-2 text-sm font-medium text-gold-dark hover:bg-zinc-50"
                  >
                    {c.titulo}
                  </Link>
                ))}
                {!loja && (
                  <>
                    {/* Revendedor também no Mais em telas md (sem lg) */}
                    <Link
                      href="/seja-revendedor"
                      onClick={() => setMaisAberto(false)}
                      className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 lg:hidden"
                    >
                      Seja um revendedor
                    </Link>
                    <div className="px-3 py-1.5 lg:hidden">
                      <EntrarComoRevendedorLink
                        className="block w-full rounded-lg border border-teal-700 px-3 py-2 text-center text-xs font-semibold text-teal-800 hover:bg-teal-50"
                        onClick={() => setMaisAberto(false)}
                      />
                    </div>
                    <Link
                      href={paths.contato}
                      onClick={() => setMaisAberto(false)}
                      className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      Contato
                    </Link>
                    <Link
                      href="/#como-funciona"
                      onClick={() => setMaisAberto(false)}
                      className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      Como funciona
                    </Link>
                  </>
                )}
                {loja?.isB2b && (
                  <Link
                    href="/"
                    onClick={() => setMaisAberto(false)}
                    className={`mx-3 my-1 block text-center ${btnTealOutline}`}
                  >
                    Site comum
                  </Link>
                )}
                <Link
                  href="/meus-pedidos"
                  onClick={() => setMaisAberto(false)}
                  className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Meus pedidos
                </Link>
                <Link
                  href="/conta"
                  onClick={() => setMaisAberto(false)}
                  className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Minha conta
                </Link>
              </div>
            )}
          </div>

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

      {/* Só mobile: menu completo */}
      {menuAberto && (
        <nav
          className="max-h-[min(75vh,32rem)] overflow-y-auto overscroll-contain border-t border-zinc-200 bg-white px-4 py-2 md:hidden"
          aria-label="Principal mobile"
        >
          <div className="mx-auto flex max-w-6xl flex-col">
            {campanhas.map((c) => (
              <Link
                key={c.id}
                href={paths.promocao(c.slug)}
                onClick={() => setMenuAberto(false)}
                className="rounded-lg px-2 py-2.5 text-sm font-semibold text-gold-dark hover:bg-gold-soft/30"
              >
                {c.titulo}
              </Link>
            ))}

            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg px-2 py-2.5 text-left text-sm font-medium text-zinc-800"
              onClick={() => setCapinhasMobileAberto((v) => !v)}
            >
              Capinhas
              <span className="text-zinc-400">
                {capinhasMobileAberto ? "−" : "+"}
              </span>
            </button>
            {capinhasMobileAberto && (
              <div className="mb-2 ml-2 border-l border-zinc-200 pl-2">
                <Link
                  href={paths.categoria("capinhas")}
                  onClick={() => setMenuAberto(false)}
                  className="block rounded-lg px-2 py-2 text-sm text-zinc-700"
                >
                  Ver todas
                </Link>
                {marcasMobile.map((m) => (
                  <div key={m.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-zinc-700"
                      onClick={() =>
                        setMarcaMobileAberta((cur) =>
                          cur === m.id ? null : m.id,
                        )
                      }
                    >
                      {m.nome}
                      <span className="text-zinc-400">
                        {marcaMobileAberta === m.id ? "−" : "+"}
                      </span>
                    </button>
                    {marcaMobileAberta === m.id && (
                      <div className="ml-2 border-l border-zinc-100 pl-2">
                        <Link
                          href={`${paths.categoria("capinhas")}?marca=${encodeURIComponent(m.id)}`}
                          onClick={() => setMenuAberto(false)}
                          className="block rounded-lg px-2 py-1.5 text-sm text-zinc-600"
                        >
                          Todos {m.nome}
                        </Link>
                        {modelosMobile
                          .filter((mod) => mod.marcaId === m.id)
                          .map((mod) => (
                            <Link
                              key={mod.id}
                              href={`${paths.categoria("capinhas")}?marca=${encodeURIComponent(m.id)}&modelo=${encodeURIComponent(mod.id)}`}
                              onClick={() => setMenuAberto(false)}
                              className="block rounded-lg px-2 py-1.5 text-sm text-zinc-600"
                            >
                              {mod.nome}
                            </Link>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg px-2 py-2.5 text-left text-sm font-medium text-zinc-800"
              onClick={() => setTermicosMobileAberto((v) => !v)}
            >
              Térmicos
              <span className="text-zinc-400">
                {termicosMobileAberto ? "−" : "+"}
              </span>
            </button>
            {termicosMobileAberto && (
              <div className="mb-2 ml-2 border-l border-zinc-200 pl-2">
                <Link
                  href={paths.categoria("termicos")}
                  onClick={() => setMenuAberto(false)}
                  className="block rounded-lg px-2 py-2 text-sm text-zinc-700"
                >
                  Ver todos
                </Link>
                {TERMICOS_SUBTIPOS.map((s) => (
                  <Link
                    key={s.id}
                    href={`${paths.categoria("termicos")}?sub=${encodeURIComponent(s.id)}`}
                    onClick={() => setMenuAberto(false)}
                    className="block rounded-lg px-2 py-2 text-sm text-zinc-700"
                  >
                    {s.nome}
                  </Link>
                ))}
              </div>
            )}

            <Link
              href={paths.categoria("personalizaveis")}
              onClick={() => setMenuAberto(false)}
              className="rounded-lg px-2 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Personalizáveis
            </Link>

            <Link
              href={paths.categoria("personalizadas")}
              onClick={() => setMenuAberto(false)}
              className="rounded-lg px-2 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Personalizadas
            </Link>

            <Link
              href={paths.categoria("acessorios")}
              onClick={() => setMenuAberto(false)}
              className="rounded-lg px-2 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Acessórios
            </Link>

            {linksExtras.map((l) => {
              const className = `rounded-lg px-2 py-2.5 text-sm font-medium ${
                l.destaque
                  ? "text-gold-dark hover:bg-gold-soft/30"
                  : "text-zinc-700 hover:bg-zinc-50 hover:text-gold-dark"
              }`;
              if (l.component === "entrar-revendedor") {
                return (
                  <EntrarComoRevendedorLink
                    key={l.href}
                    className={className}
                    onClick={() => setMenuAberto(false)}
                  />
                );
              }
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuAberto(false)}
                  className={className}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
