"use client";

import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CatalogProductCard } from "@/components/loja/CatalogProductCard";
import { PageBackLink } from "@/components/loja/PageBackLink";
import { ProductCard } from "@/components/loja/ProductCard";
import { StoreHeader } from "@/components/loja/StoreHeader";
import {
  fatiaPagina,
  PAGINA_LOJA,
  PaginationBar,
  totalPaginasDe,
} from "@/components/ui/PaginationBar";
import { rotuloMaterial } from "@/features/catalogo/materiaisCapinha";
import {
  listarMarcasAtivas,
  listarModelosAtivos,
} from "@/features/catalogo/catalogoRuntimeService";
import { listarProdutosPorCategoriaVitrine } from "@/features/loja/catalogoProdutos";
import {
  obterCategoriaVitrine,
  obterTermicoSubtipo,
  type CategoriaVitrineId,
} from "@/features/loja/categoriasVitrine";
import { useLojaEfetiva } from "@/features/loja/useLojaEfetiva";
import { useLojaPaths } from "@/features/loja/useLojaPaths";
import type { ProdutoDestaque } from "@/features/loja/produtosMock";
import { isFirebaseConfigured } from "@/lib/firebase";

type Ordenacao = "nome" | "preco-asc" | "preco-desc";

function slugDaUrl(
  pathname: string,
  params: ReturnType<typeof useParams>,
  slugOverride?: string,
): string {
  if (slugOverride) return slugOverride;
  if (typeof params?.categoriaSlug === "string") return params.categoriaSlug;
  if (typeof params?.slug === "string" && pathname.includes("/c/")) {
    // Em /c/[slug] o param é a categoria; em /[loja]/c/... o slug é a loja
    const m = pathname.match(/\/c\/([^/?#]+)/);
    if (m?.[1]) return decodeURIComponent(m[1]);
    // Rota raiz /c/[slug] sem loja prefix
    if (pathname.startsWith("/c/")) return params.slug;
  }
  const m = pathname.match(/\/c\/([^/?#]+)/);
  return m?.[1] ? decodeURIComponent(m[1]) : "";
}

export function CategoriaPageClient({
  slugOverride,
}: {
  slugOverride?: string;
}) {
  const params = useParams();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const slugParam = slugDaUrl(pathname, params, slugOverride);
  const categoria = obterCategoriaVitrine(slugParam);
  const loja = useLojaEfetiva();
  const paths = useLojaPaths();
  const modoB2b = Boolean(loja?.isB2b);

  const marcaQuery = (searchParams.get("marca") ?? "").trim();
  const modeloQuery = (searchParams.get("modelo") ?? "").trim();
  const subQuery = (searchParams.get("sub") ?? "").trim();

  const [produtos, setProdutos] = useState<ProdutoDestaque[]>([]);
  const [marcas, setMarcas] = useState<{ id: string; nome: string }[]>([]);
  const [modelos, setModelos] = useState<
    { id: string; nome: string; marcaId: string }[]
  >([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("todos");
  const [filtroModelo, setFiltroModelo] = useState("todos");
  const [filtroMaterial, setFiltroMaterial] = useState("todos");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("nome");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    setFiltroMarca(marcaQuery || "todos");
    setFiltroModelo(modeloQuery || "todos");
  }, [marcaQuery, modeloQuery]);

  useEffect(() => {
    if (!categoria || !isFirebaseConfigured()) {
      setCarregando(false);
      return;
    }
    void (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const [lista, marcasAtivas, modelosAtivos] = await Promise.all([
          listarProdutosPorCategoriaVitrine(
            categoria.id as CategoriaVitrineId,
            loja?.lojaId,
            { modoB2b },
          ),
          listarMarcasAtivas(),
          listarModelosAtivos(),
        ]);
        setProdutos(lista);
        setMarcas(
          [...marcasAtivas]
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
            .map((m) => ({ id: m.id, nome: m.nome })),
        );
        setModelos(
          modelosAtivos.map((m) => ({
            id: m.id,
            nome: m.nome,
            marcaId: m.marcaId,
          })),
        );
      } catch (e) {
        console.error(e);
        setErro(
          e instanceof Error ? e.message : "Não foi possível carregar.",
        );
        setProdutos([]);
      } finally {
        setCarregando(false);
      }
    })();
  }, [categoria, loja?.lojaId, modoB2b]);

  const materiaisDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const p of produtos) {
      if (p.material?.trim()) set.add(p.material.trim());
    }
    return Array.from(set).sort((a, b) =>
      (rotuloMaterial(a) ?? a).localeCompare(rotuloMaterial(b) ?? b, "pt-BR"),
    );
  }, [produtos]);

  const usaFiltroMarcaModelo =
    categoria?.id === "personalizaveis" ||
    categoria?.id === "personalizadas" ||
    categoria?.id === "capinhas";

  const subtipoTermico = obterTermicoSubtipo(subQuery);

  const tituloExtra = useMemo(() => {
    if (categoria?.id === "termicos" && subtipoTermico) {
      return subtipoTermico.nome;
    }
    if (usaFiltroMarcaModelo && filtroModelo !== "todos") {
      const m = modelos.find((x) => x.id === filtroModelo);
      return m?.nome;
    }
    if (usaFiltroMarcaModelo && filtroMarca !== "todos") {
      const m = marcas.find((x) => x.id === filtroMarca);
      return m?.nome;
    }
    return null;
  }, [
    categoria?.id,
    subtipoTermico,
    usaFiltroMarcaModelo,
    filtroModelo,
    filtroMarca,
    modelos,
    marcas,
  ]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = produtos.filter((p) => {
      if (categoria?.id === "termicos" && subtipoTermico) {
        const hay = `${p.nome} ${p.descricao}`.toLowerCase();
        const ok = subtipoTermico.keywords.some((k) =>
          hay.includes(k.toLowerCase()),
        );
        if (!ok) return false;
      }
      if (usaFiltroMarcaModelo) {
        if (filtroMarca !== "todos") {
          const marca = marcas.find((m) => m.id === filtroMarca);
          const modelosDaMarca = new Set(
            modelos
              .filter((m) => m.marcaId === filtroMarca)
              .map((m) => m.id),
          );
          const compativeis = p.modelosCompativeis?.length
            ? p.modelosCompativeis
            : [p.modeloId];
          const marcaOk =
            p.marca === filtroMarca ||
            (marca != null && p.marca === marca.nome) ||
            compativeis.some((id) => modelosDaMarca.has(id));
          if (!marcaOk) return false;
        }
        if (filtroModelo !== "todos") {
          const compativeis = p.modelosCompativeis?.length
            ? p.modelosCompativeis
            : [p.modeloId];
          if (!compativeis.includes(filtroModelo)) return false;
        }
        if (
          categoria?.id === "personalizaveis" &&
          filtroMaterial !== "todos" &&
          (p.material ?? "") !== filtroMaterial
        ) {
          return false;
        }
      }
      if (!q) return true;
      return (
        p.nome.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q) ||
        p.marca.toLowerCase().includes(q)
      );
    });
    lista.sort((a, b) => {
      if (ordenacao === "preco-asc") return a.precoCentavos - b.precoCentavos;
      if (ordenacao === "preco-desc") return b.precoCentavos - a.precoCentavos;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
    return lista;
  }, [
    produtos,
    busca,
    filtroMarca,
    filtroModelo,
    filtroMaterial,
    ordenacao,
    marcas,
    modelos,
    categoria?.id,
    usaFiltroMarcaModelo,
    subtipoTermico,
  ]);

  useEffect(() => {
    setPagina(1);
  }, [
    busca,
    filtroMarca,
    filtroModelo,
    filtroMaterial,
    ordenacao,
    slugParam,
    subQuery,
  ]);

  const totalPaginas = totalPaginasDe(filtrados.length, PAGINA_LOJA);
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginaItens = fatiaPagina(filtrados, paginaAtual, PAGINA_LOJA);

  if (!categoria) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <StoreHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <PageBackLink href={paths.home} label="← Voltar" />
          <p className="mt-6 text-zinc-600">Categoria não encontrada.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <StoreHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <PageBackLink href={paths.home} label="← Voltar" />
        <div className="mt-6 mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {tituloExtra ?? categoria.nome}
          </h1>
          <p className="mt-2 max-w-2xl text-zinc-600">
            {tituloExtra
              ? `${categoria.nome} · ${categoria.descricao}`
              : categoria.descricao}
          </p>
          {!carregando && (
            <p className="mt-2 text-sm text-zinc-500">
              {filtrados.length} produto
              {filtrados.length === 1 ? "" : "s"} encontrado
              {filtrados.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar…"
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm sm:max-w-xs"
          />
          {usaFiltroMarcaModelo && (
            <>
              <select
                value={filtroMarca}
                onChange={(e) => {
                  setFiltroMarca(e.target.value);
                  setFiltroModelo("todos");
                }}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="todos">Todas as marcas</option>
                {marcas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
              <select
                value={filtroModelo}
                onChange={(e) => setFiltroModelo(e.target.value)}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="todos">Todos os modelos</option>
                {modelos
                  .filter(
                    (m) =>
                      filtroMarca === "todos" || m.marcaId === filtroMarca,
                  )
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
              </select>
              {categoria.id === "personalizaveis" &&
                materiaisDisponiveis.length > 0 && (
                <select
                  value={filtroMaterial}
                  onChange={(e) => setFiltroMaterial(e.target.value)}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="todos">Todos os materiais</option>
                  {materiaisDisponiveis.map((m) => (
                    <option key={m} value={m}>
                      {rotuloMaterial(m) ?? m}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
          <select
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm"
          >
            <option value="nome">Ordenar por nome</option>
            <option value="preco-asc">Menor preço</option>
            <option value="preco-desc">Maior preço</option>
          </select>
        </div>

        {carregando ? (
          <p className="text-zinc-500">Carregando…</p>
        ) : erro ? (
          <p className="text-sm text-red-600">{erro}</p>
        ) : paginaItens.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
            Nenhum produto nesta categoria ainda.
          </p>
        ) : (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {paginaItens.map((p) => (
                <li key={p.id}>
                  {categoria.personalizavel ? (
                    <ProductCard produto={p} />
                  ) : (
                    <CatalogProductCard produto={p} />
                  )}
                </li>
              ))}
            </ul>
            <PaginationBar
              pagina={paginaAtual}
              totalPaginas={totalPaginas}
              totalItens={filtrados.length}
              porPagina={PAGINA_LOJA}
              onChange={setPagina}
              rotulo="produtos"
            />
          </>
        )}
      </main>
    </div>
  );
}
