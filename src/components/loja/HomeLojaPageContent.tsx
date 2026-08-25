"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { HomeVideoHero } from "@/components/loja/HomeVideoSections";
import { PromocoesStrip } from "@/components/loja/PromocoesStrip";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { VitrineCategoriaPreview } from "@/components/loja/VitrineCategoriaPreview";
import { ZenProLogo } from "@/components/loja/ZenProLogo";
import { EntrarComoRevendedorLink } from "@/components/revendedor/EntrarComoRevendedorLink";
import { prefetchCatalogoVitrine } from "@/features/loja/catalogoProdutos";
import { listarCampanhasAtivas } from "@/features/loja/campanhaService";
import { useLojaEfetiva } from "@/features/loja/useLojaEfetiva";
import { isFirebaseConfigured } from "@/lib/firebase";

const HowItWorks = dynamic(
  () =>
    import("@/components/loja/HowItWorks").then((m) => ({
      default: m.HowItWorks,
    })),
  {
    loading: () => (
      <div className="border-t border-zinc-200 bg-white py-14">
        <div className="mx-auto h-32 max-w-6xl animate-pulse rounded-xl bg-zinc-100 px-4" />
      </div>
    ),
  },
);

const HomePartnersSection = dynamic(
  () =>
    import("@/components/loja/HomeVideoSections").then((m) => ({
      default: m.HomePartnersSection,
    })),
  {
    loading: () => (
      <div className="border-t border-zinc-200 bg-white py-14">
        <div className="mx-auto h-40 max-w-3xl animate-pulse rounded-xl bg-zinc-100" />
      </div>
    ),
  },
);

type HomeLojaVariant = "marca" | "revendedor" | "b2b";

function AvisoSomenteRevendedor() {
  const sp = useSearchParams();
  if (sp.get("aviso") !== "somente-revendedor") return null;
  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
      Esta conta não tem acesso de revendedor. Entre com o e-mail aprovado ou{" "}
      <Link href="/seja-revendedor" className="font-semibold underline">
        solicite cadastro
      </Link>
      .{" "}
      <EntrarComoRevendedorLink className="font-semibold underline" />
      {" · "}
      <Link href="/admin/login" className="font-semibold underline">
        Login admin
      </Link>
    </div>
  );
}

function SejaRevendedorSection() {
  return (
    <section className="border-t border-zinc-200 bg-white py-14">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-zinc-900">Quer vender cases Zen Pro?</h2>
        <p className="mx-auto mt-2 max-w-lg text-zinc-600">
          Cadastre-se como revendedor, compre no portal atacado com preços e
          faixas exclusivos, e gerencie pedidos no painel.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/seja-revendedor"
            className="btn-ink inline-block rounded-xl px-6 py-3 text-sm"
          >
            Seja um revendedor
          </Link>
          <EntrarComoRevendedorLink className="inline-block rounded-xl border border-teal-700 bg-teal-50 px-6 py-3 text-sm font-semibold text-teal-900" />
        </div>
      </div>
    </section>
  );
}

function HomeLojaFooter({ variant }: { variant: HomeLojaVariant }) {
  const loja = useLojaEfetiva();

  return (
    <footer className="border-t border-zinc-200 bg-zinc-900 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
        <ZenProLogo variant="gold" className="h-12 w-auto sm:h-14" href={null} />
        {variant === "revendedor" && loja && (
          <p className="text-sm text-zinc-300">
            Loja parceira{" "}
            <Link href={loja.basePath} className="font-semibold text-white underline">
              {loja.nome}
            </Link>
          </p>
        )}
        {variant === "b2b" && (
          <p className="text-sm text-teal-300">Portal do revendedor Zen Pro</p>
        )}
        <p className="text-sm text-zinc-400">
          © {new Date().getFullYear()} Zen Pro — cases personalizadas
        </p>
      </div>
    </footer>
  );
}

type Props = {
  variant: HomeLojaVariant;
};

function PrefetchCatalogoHome() {
  const loja = useLojaEfetiva();
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    void Promise.all([
      prefetchCatalogoVitrine(loja?.lojaId),
      listarCampanhasAtivas(),
    ]);
  }, [loja?.lojaId]);
  return null;
}

/** Home unificada: marca (/) e lojas revendedor (/[slug]). */
export function HomeLojaPageContent({ variant }: Props) {
  return (
    <>
      <PrefetchCatalogoHome />
      <StoreHeader />

      <main className="bg-zinc-50">
        {variant === "marca" ? (
          <Suspense fallback={null}>
            <AvisoSomenteRevendedor />
          </Suspense>
        ) : null}

        <HomeVideoHero />

        <PromocoesStrip />

        <VitrineCategoriaPreview categoriaId="capinhas" tom="branco" />

        <VitrineCategoriaPreview categoriaId="personalizaveis" tom="claro" />

        <VitrineCategoriaPreview categoriaId="personalizadas" tom="branco" />

        <VitrineCategoriaPreview categoriaId="termicos" tom="claro" />

        <VitrineCategoriaPreview categoriaId="acessorios" tom="branco" />

        <HowItWorks />

        <HomePartnersSection />

        {variant === "marca" ? <SejaRevendedorSection /> : null}
        {variant === "b2b" ? (
          <section className="border-t border-teal-100 bg-teal-50/50 py-8">
            <div className="mx-auto max-w-6xl px-4 text-center text-sm text-teal-900 sm:px-6">
              Você está no site do revendedor.{" "}
              <Link href="/" className="font-semibold underline">
                Voltar ao site comum
              </Link>
              {" · "}
              <Link href="/admin" className="font-semibold underline">
                Painel administrativo
              </Link>
            </div>
          </section>
        ) : null}
      </main>

      <HomeLojaFooter variant={variant} />
    </>
  );
}
