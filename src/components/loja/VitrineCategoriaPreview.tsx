"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProdutosVitrineFaixa } from "@/components/loja/ProdutosVitrineFaixa";
import { listarProdutosPorCategoriaVitrine } from "@/features/loja/catalogoProdutos";
import {
  obterCategoriaVitrine,
  type CategoriaVitrineId,
} from "@/features/loja/categoriasVitrine";
import { useLojaEfetiva } from "@/features/loja/useLojaEfetiva";
import { useLojaPaths } from "@/features/loja/useLojaPaths";
import type { ProdutoDestaque } from "@/features/loja/produtosMock";
import { isFirebaseConfigured } from "@/lib/firebase";

const LIMITE_HOME = 8;

type Props = {
  categoriaId: CategoriaVitrineId;
  /** Fundo alternado */
  tom?: "claro" | "branco";
};

/** Prévia de categoria na home + CTA para a listagem completa. */
export function VitrineCategoriaPreview({
  categoriaId,
  tom = "claro",
}: Props) {
  const categoria = obterCategoriaVitrine(categoriaId);
  const loja = useLojaEfetiva();
  const paths = useLojaPaths();
  const [produtos, setProdutos] = useState<ProdutoDestaque[]>([]);
  const [carregando, setCarregando] = useState(isFirebaseConfigured());

  useEffect(() => {
    if (!isFirebaseConfigured() || !categoria) return;
    void (async () => {
      setCarregando(true);
      try {
        const lista = await listarProdutosPorCategoriaVitrine(
          categoriaId,
          loja?.lojaId,
          { modoB2b: Boolean(loja?.isB2b) },
        );
        setProdutos(lista.slice(0, LIMITE_HOME));
      } catch (e) {
        console.error(e);
        setProdutos([]);
      } finally {
        setCarregando(false);
      }
    })();
  }, [categoriaId, categoria, loja?.lojaId, loja?.isB2b]);

  if (!categoria) return null;

  const bg =
    tom === "branco"
      ? "border-t border-zinc-200 bg-white"
      : "border-t border-zinc-200 bg-zinc-50";

  return (
    <section
      id={categoriaId === "personalizaveis" ? "personalizar" : categoriaId}
      className={bg}
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              {categoria.nome}
            </h2>
            <p className="mt-1 max-w-xl text-zinc-600">{categoria.descricao}</p>
          </div>
          <Link
            href={paths.categoria(categoria.slug)}
            className="btn-gold shrink-0 rounded-xl px-5 py-2.5 text-center text-sm font-semibold"
          >
            Ver todas
          </Link>
        </div>

        {carregando ? (
          <div className="h-40 animate-pulse rounded-2xl bg-zinc-200/70" />
        ) : produtos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-8 text-center text-sm text-zinc-500">
            Em breve produtos nesta categoria.
          </p>
        ) : (
          <ProdutosVitrineFaixa
            produtos={produtos}
            personalizavel={categoria.personalizavel}
          />
        )}
      </div>
    </section>
  );
}
