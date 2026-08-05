"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CatalogProductCard } from "@/components/loja/CatalogProductCard";
import { PageBackLink } from "@/components/loja/PageBackLink";
import { ProductCard } from "@/components/loja/ProductCard";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { obterCampanhaPorSlug } from "@/features/loja/campanhaService";
import { listarProdutosPorIds } from "@/features/loja/catalogoProdutos";
import { useLojaEfetiva } from "@/features/loja/useLojaEfetiva";
import { useLojaPaths } from "@/features/loja/useLojaPaths";
import type { ProdutoDestaque } from "@/features/loja/produtosMock";
import { isFirebaseConfigured } from "@/lib/firebase";

export function PromocaoPageClient() {
  const searchParams = useSearchParams();
  const slug = (searchParams.get("slug") ?? "").trim();
  const loja = useLojaEfetiva();
  const paths = useLojaPaths();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [produtos, setProdutos] = useState<ProdutoDestaque[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !isFirebaseConfigured()) {
      setCarregando(false);
      setErro(!slug ? "Promoção não informada." : "Firebase não configurado.");
      return;
    }
    void (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const campanha = await obterCampanhaPorSlug(slug);
        if (!campanha) {
          setErro("Promoção não encontrada ou inativa.");
          setProdutos([]);
          return;
        }
        setTitulo(campanha.titulo);
        setDescricao(campanha.descricao);
        const lista = await listarProdutosPorIds(
          campanha.produtoIds,
          loja?.lojaId,
          { modoB2b: Boolean(loja?.isB2b) },
        );
        setProdutos(lista);
      } catch (e) {
        console.error(e);
        setErro(
          e instanceof Error ? e.message : "Não foi possível carregar a promoção.",
        );
      } finally {
        setCarregando(false);
      }
    })();
  }, [slug, loja?.lojaId, loja?.isB2b]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <StoreHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <PageBackLink href={paths.home} label="← Voltar" />

        {carregando ? (
          <p className="mt-10 text-center text-zinc-500">Carregando…</p>
        ) : erro ? (
          <p className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {erro}
          </p>
        ) : (
          <>
            <div className="mt-6 mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                {titulo}
              </h1>
              {descricao ? (
                <p className="mt-2 max-w-2xl text-zinc-600">{descricao}</p>
              ) : null}
              <p className="mt-2 text-sm text-zinc-500">
                {produtos.length} produto{produtos.length === 1 ? "" : "s"}
              </p>
            </div>

            {produtos.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
                Nenhum produto nesta promoção.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {produtos.map((p) => (
                  <li key={p.id}>
                    {p.personalizavel || p.tipo === "personalizada" ? (
                      <ProductCard produto={p} />
                    ) : (
                      <CatalogProductCard produto={p} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
