"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/loja/ProductCard";
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
import { listarProdutosPersonalizaveisAtivos } from "@/features/loja/catalogoProdutos";
import { useLojaEfetiva } from "@/features/loja/useLojaEfetiva";
import type { ProdutoDestaque } from "@/features/loja/produtosMock";
import { isFirebaseConfigured } from "@/lib/firebase";

type Ordenacao = "nome" | "preco-asc" | "preco-desc";

export function PersonalizarSection() {
  const loja = useLojaEfetiva();
  const modoB2b = Boolean(loja?.isB2b);
  const [produtos, setProdutos] = useState<ProdutoDestaque[]>([]);
  const [marcas, setMarcas] = useState<{ id: string; nome: string }[]>([]);
  const [modelos, setModelos] = useState<
    { id: string; nome: string; marcaId: string }[]
  >([]);
  const [carregando, setCarregando] = useState(isFirebaseConfigured());
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("todos");
  const [filtroModelo, setFiltroModelo] = useState("todos");
  const [filtroMaterial, setFiltroMaterial] = useState("todos");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("nome");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    void (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const [lista, marcasAtivas, modelosAtivos] = await Promise.all([
          listarProdutosPersonalizaveisAtivos({ modoB2b }),
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
          e instanceof Error
            ? e.message
            : "Não foi possível carregar os produtos.",
        );
        setProdutos([]);
      } finally {
        setCarregando(false);
      }
    })();
  }, [modoB2b]);

  /** Todas as marcas do catálogo (não só as que já têm produto). */
  const marcasDisponiveis = useMemo(() => {
    if (marcas.length > 0) return marcas;
    const nomes = new Set(
      produtos.map((p) => p.marca.trim()).filter(Boolean),
    );
    return Array.from(nomes)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((nome) => ({ id: nome, nome }));
  }, [marcas, produtos]);

  /** Todos os modelos do catálogo; estreita por marca quando filtrado. */
  const modelosDisponiveis = useMemo(() => {
    let lista = [...modelos];
    if (filtroMarca !== "todos") {
      const marca = marcasDisponiveis.find((m) => m.id === filtroMarca);
      const porMarcaId = lista.filter((m) => m.marcaId === filtroMarca);
      if (porMarcaId.length > 0) {
        lista = porMarcaId;
      } else if (marca) {
        const produtosMarca = new Set(
          produtos
            .filter((p) => p.marca === marca.nome)
            .map((p) => p.modeloId),
        );
        lista = lista.filter((m) => produtosMarca.has(m.id));
      }
    }
    return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [modelos, filtroMarca, marcasDisponiveis, produtos]);

  const materiaisDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const p of produtos) {
      if (p.material?.trim()) set.add(p.material.trim());
    }
    return Array.from(set).sort((a, b) =>
      (rotuloMaterial(a) ?? a).localeCompare(rotuloMaterial(b) ?? b, "pt-BR"),
    );
  }, [produtos]);

  useEffect(() => {
    if (
      filtroModelo !== "todos" &&
      !modelosDisponiveis.some((m) => m.id === filtroModelo)
    ) {
      setFiltroModelo("todos");
    }
  }, [filtroModelo, modelosDisponiveis]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = produtos.filter((p) => {
      if (filtroMarca !== "todos") {
        const marca = marcasDisponiveis.find((m) => m.id === filtroMarca);
        const marcaOk =
          p.marca === filtroMarca ||
          (marca != null && p.marca === marca.nome);
        if (!marcaOk) return false;
      }
      if (filtroModelo !== "todos" && p.modeloId !== filtroModelo) return false;
      if (filtroMaterial !== "todos" && (p.material ?? "") !== filtroMaterial) {
        return false;
      }
      if (!q) return true;
      return (
        p.nome.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q) ||
        p.marca.toLowerCase().includes(q) ||
        (p.material ?? "").toLowerCase().includes(q)
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
    marcasDisponiveis,
  ]);

  useEffect(() => {
    setPagina(1);
  }, [busca, filtroMarca, filtroModelo, filtroMaterial, ordenacao]);

  const totalPaginas = totalPaginasDe(filtrados.length, PAGINA_LOJA);
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginaItens = fatiaPagina(filtrados, paginaAtual, PAGINA_LOJA);

  return (
    <section id="personalizar" className="border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Personalize com sua foto
          </h2>
          <p className="mt-1 text-zinc-600">
            Compare marcas, modelos e materiais e escolha a case ideal.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="block w-full sm:max-w-xs">
            <span className="sr-only">Buscar capinha</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou material…"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none ring-zinc-900 placeholder:text-zinc-400 focus:ring-2"
            />
          </label>
          <select
            value={filtroMarca}
            onChange={(e) => {
              setFiltroMarca(e.target.value);
              setFiltroModelo("todos");
            }}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900"
            aria-label="Filtrar por marca"
          >
            <option value="todos">Todas as marcas</option>
            {marcasDisponiveis.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
          <select
            value={filtroModelo}
            onChange={(e) => setFiltroModelo(e.target.value)}
            className="min-w-[10rem] rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 sm:max-w-xs"
            aria-label="Filtrar por modelo"
          >
            <option value="todos">Todos os modelos</option>
            {modelosDisponiveis.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
          <select
            value={filtroMaterial}
            onChange={(e) => setFiltroMaterial(e.target.value)}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900"
            aria-label="Filtrar por material"
          >
            <option value="todos">Todos os materiais</option>
            {materiaisDisponiveis.map((mat) => (
              <option key={mat} value={mat}>
                {rotuloMaterial(mat) ?? mat}
              </option>
            ))}
          </select>
          <select
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900"
            aria-label="Ordenar"
          >
            <option value="nome">Ordenar: nome</option>
            <option value="preco-asc">Menor preço</option>
            <option value="preco-desc">Maior preço</option>
          </select>
        </div>

        {erro && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            {erro.includes("permission") || erro.includes("Permission")
              ? "Erro de permissão ao carregar produtos. Verifique as regras do Firebase."
              : erro}
          </p>
        )}
        {carregando ? (
          <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center text-zinc-600">
            Carregando produtos personalizáveis...
          </p>
        ) : produtos.length === 0 ? (
          <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center text-zinc-600">
            Nenhum produto personalizável disponível no momento.
          </p>
        ) : filtrados.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-zinc-600">
            Nenhuma capinha com esses filtros. Tente outra marca, modelo ou
            material.
          </p>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
              {paginaItens.map((produto) => (
                <li
                  key={`${produto.produtoBaseId ?? produto.id}-${produto.modeloId}`}
                  className="h-full"
                >
                  <ProductCard produto={produto} />
                </li>
              ))}
            </ul>
            <PaginationBar
              pagina={paginaAtual}
              totalPaginas={totalPaginas}
              totalItens={filtrados.length}
              porPagina={PAGINA_LOJA}
              onChange={setPagina}
              rotulo="opções"
            />
          </>
        )}
      </div>
    </section>
  );
}
