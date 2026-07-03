"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LojaProvider } from "@/features/multitenant/LojaContext";
import { LojaCarrinhoBinder } from "@/features/multitenant/LojaCarrinhoBinder";
import {
  buscarLojaPorSlug,
  type LojaPublica,
} from "@/features/multitenant/lojaPublicaService";
import { LojaRevendedorStrip } from "@/components/loja/LojaRevendedorStrip";
import { MARCA_LOJA_SLUG } from "@/features/multitenant/catalogoSeedData";
import { isFirebaseConfigured } from "@/lib/firebase";

type Props = {
  slug: string;
  children: ReactNode;
};

export function LojaLayoutClient({ slug, children }: Props) {
  const pathname = usePathname();
  // Sob `output: export` a casca genérica (/loja) é reescrita para qualquer
  // /{slug}; o slug REAL vem sempre da URL atual, não do param pré-renderizado.
  const slugAtual = pathname?.split("/").filter(Boolean)[0] ?? slug;
  const [loja, setLoja] = useState<LojaPublica | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrada, setNaoEncontrada] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setNaoEncontrada(true);
      setCarregando(false);
      return;
    }

    // A marca (Zen Pro) mora na raiz "/", nunca em /zenpro como revendedor.
    if (slugAtual === MARCA_LOJA_SLUG) {
      window.location.replace("/");
      return;
    }

    void (async () => {
      setCarregando(true);
      try {
        const resultado = await buscarLojaPorSlug(slugAtual);
        if (!resultado) {
          setNaoEncontrada(true);
          setLoja(null);
        } else {
          setLoja(resultado);
          setNaoEncontrada(false);
        }
      } catch {
        setNaoEncontrada(true);
        setLoja(null);
      } finally {
        setCarregando(false);
      }
    })();
  }, [slugAtual]);

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        Carregando loja...
      </div>
    );
  }

  if (naoEncontrada || !loja) {
    return <LojaNotFound slug={slugAtual} />;
  }

  return (
    <LojaProvider loja={loja}>
      <LojaCarrinhoBinder loja={loja} />
      <LojaRevendedorStrip loja={loja} />
      {children}
    </LojaProvider>
  );
}

function LojaNotFound({ slug }: { slug: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 text-center">
      <p className="text-6xl font-bold text-zinc-200">404</p>
      <h1 className="mt-4 text-xl font-semibold text-zinc-900">
        Loja não encontrada
      </h1>
      <p className="mt-2 max-w-md text-sm text-zinc-600">
        O endereço <strong className="text-zinc-800">/{slug}</strong> não existe
        ou a loja está inativa.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
      >
        Ir para Zen Pro
      </Link>
    </div>
  );
}
