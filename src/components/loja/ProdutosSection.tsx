"use client";

import { useMemo, useState } from "react";
import { CatalogProductCard } from "@/components/loja/CatalogProductCard";
import {
  CATEGORIAS_PRODUTO,
  filtrarProdutos,
  PRODUTOS_LOJA,
  type CategoriaProduto,
} from "@/features/loja/produtosMock";

export function ProdutosSection() {
  const [categoria, setCategoria] = useState<CategoriaProduto | "todos">(
    "todos",
  );
  const [busca, setBusca] = useState("");

  const produtosFiltrados = useMemo(
    () => filtrarProdutos(PRODUTOS_LOJA, categoria, busca),
    [categoria, busca],
  );

  return (
    <section id="produtos" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Produtos
          </h2>
          <p className="mt-1 text-zinc-600">
            Capinhas, acessórios, películas e carregadores — prontos para
            comprar.
          </p>
        </div>

        <label className="block max-w-xl">
          <span className="sr-only">Buscar produtos</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou descrição..."
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2"
          />
        </label>

        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filtrar produtos"
        >
          {CATEGORIAS_PRODUTO.map((cat) => {
            const ativo = categoria === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={ativo}
                onClick={() => setCategoria(cat.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  ativo
                    ? "bg-zinc-900 text-white"
                    : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
                }`}
              >
                {cat.rotulo}
              </button>
            );
          })}
        </div>
      </div>

      {produtosFiltrados.length === 0 ? (
        <p className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-600">
          Nenhum produto encontrado
          {busca.trim() ? ` para “${busca.trim()}”` : " nesta categoria"}.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {produtosFiltrados.map((produto) => (
            <li key={produto.id} className="h-full">
              <CatalogProductCard produto={produto} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
