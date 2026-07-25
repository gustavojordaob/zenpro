"use client";

import { useEffect, useMemo, useState } from "react";
import { CatalogProductCard } from "@/components/loja/CatalogProductCard";
import {
  fatiaPagina,
  PAGINA_LOJA,
  PaginationBar,
  totalPaginasDe,
} from "@/components/ui/PaginationBar";
import { useLojaEfetiva } from "@/features/loja/useLojaEfetiva";
import { listarProdutosLojaAtivos } from "@/features/loja/catalogoProdutos";
import {
  CATEGORIAS_PRODUTO,
  filtrarProdutos,
  type CategoriaProduto,
  type ProdutoDestaque,
} from "@/features/loja/produtosMock";
import { isFirebaseConfigured } from "@/lib/firebase";

type Ordenacao = "nome" | "preco-asc" | "preco-desc";

export function ProdutosSection() {
  const loja = useLojaEfetiva();
  const [categoria, setCategoria] = useState<CategoriaProduto | "todos">(
    "todos",
  );
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("nome");
  const [pagina, setPagina] = useState(1);
  const [produtos, setProdutos] = useState<ProdutoDestaque[]>([]);
  const [carregando, setCarregando] = useState(isFirebaseConfigured());
  const [erroLista, setErroLista] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    void (async () => {
      setCarregando(true);
      setErroLista(null);
      try {
        setProdutos(
          await listarProdutosLojaAtivos(loja?.lojaId, {
            modoB2b: Boolean(loja?.isB2b),
          }),
        );
      } catch (e) {
        console.error(e);
        setErroLista(
          e instanceof Error ? e.message : "Não foi possível carregar produtos.",
        );
        setProdutos([]);
      } finally {
        setCarregando(false);
      }
    })();
  }, [loja?.lojaId, loja?.isB2b]);

  const produtosFiltrados = useMemo(() => {
    const lista = filtrarProdutos(produtos, categoria, busca);
    lista.sort((a, b) => {
      if (ordenacao === "preco-asc") return a.precoCentavos - b.precoCentavos;
      if (ordenacao === "preco-desc") return b.precoCentavos - a.precoCentavos;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
    return lista;
  }, [produtos, categoria, busca, ordenacao]);

  useEffect(() => {
    setPagina(1);
  }, [busca, categoria, ordenacao]);

  const totalPaginas = totalPaginasDe(produtosFiltrados.length, PAGINA_LOJA);
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginaItens = fatiaPagina(produtosFiltrados, paginaAtual, PAGINA_LOJA);

  return (
    <section id="produtos" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Produtos
          </h2>
          <p className="mt-1 text-zinc-600">
            {loja?.isB2b
              ? "Preços de revendedor — peça em quantidade e aproveite as faixas."
              : "Cases, acessórios, películas e carregadores — prontos para comprar."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="block w-full sm:max-w-xl">
            <span className="sr-only">Buscar produtos</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou descrição..."
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2"
            />
          </label>
          <select
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900"
            aria-label="Ordenar produtos"
          >
            <option value="nome">Ordenar: nome</option>
            <option value="preco-asc">Menor preço</option>
            <option value="preco-desc">Maior preço</option>
          </select>
        </div>

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

      {erroLista && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
          {erroLista.includes("permission") || erroLista.includes("Permission")
            ? "Erro de permissão ao carregar produtos."
            : erroLista}
        </p>
      )}

      {carregando ? (
        <p className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-600">
          Carregando produtos...
        </p>
      ) : produtosFiltrados.length === 0 ? (
        <p className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-600">
          Nenhum produto encontrado
          {busca.trim() ? ` para “${busca.trim()}”` : " nesta categoria"}.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {paginaItens.map((produto) => (
              <li key={produto.id} className="h-full">
                <CatalogProductCard produto={produto} />
              </li>
            ))}
          </ul>
          <PaginationBar
            pagina={paginaAtual}
            totalPaginas={totalPaginas}
            totalItens={produtosFiltrados.length}
            porPagina={PAGINA_LOJA}
            onChange={setPagina}
            rotulo="produtos"
          />
        </>
      )}
    </section>
  );
}
