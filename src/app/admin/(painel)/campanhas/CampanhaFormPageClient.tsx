"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  atualizarCampanhaAdmin,
  criarCampanhaAdmin,
  obterCampanhaAdmin,
  slugifyCampanha,
} from "@/features/admin/campanhas/campanhaAdminService";
import {
  listarProdutosCentral,
  type ProdutoCentral,
} from "@/features/admin/produtos/produtoCentralService";

type Props = {
  campanhaId?: string;
};

export function CampanhaFormPageClient({ campanhaId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFromQuery = (searchParams.get("id") ?? "").trim();
  const editId = campanhaId || idFromQuery || null;

  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [ordem, setOrdem] = useState("0");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [produtoIds, setProdutoIds] = useState<string[]>([]);
  const [produtos, setProdutos] = useState<ProdutoCentral[]>([]);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [carregando, setCarregando] = useState(Boolean(editId));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void listarProdutosCentral()
      .then(setProdutos)
      .catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    if (!editId) return;
    void (async () => {
      setCarregando(true);
      try {
        const c = await obterCampanhaAdmin(editId);
        if (!c) {
          setErro("Campanha não encontrada.");
          return;
        }
        setTitulo(c.titulo);
        setSlug(c.slug);
        setSlugManual(true);
        setDescricao(c.descricao);
        setAtivo(c.ativo);
        setOrdem(String(c.ordem));
        setInicio(c.inicio ?? "");
        setFim(c.fim ?? "");
        setProdutoIds(c.produtoIds);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao carregar.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [editId]);

  const produtosFiltrados = useMemo(() => {
    const q = buscaProduto.trim().toLowerCase();
    return produtos.filter((p) => {
      if (!p.ativo) return false;
      if (!q) return true;
      return (
        p.nome.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
      );
    });
  }, [produtos, buscaProduto]);

  function toggleProduto(id: string) {
    setProdutoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!titulo.trim()) {
      setErro("Informe o título da promoção.");
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        slug: slug.trim() || slugifyCampanha(titulo),
        descricao: descricao.trim(),
        ativo,
        ordem: Number(ordem) || 0,
        inicio: inicio.trim() || null,
        fim: fim.trim() || null,
        produtoIds,
      };
      if (editId) {
        await atualizarCampanhaAdmin(editId, payload);
      } else {
        await criarCampanhaAdmin(payload);
      }
      router.push("/admin/campanhas");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <AdminShell titulo="Campanha">
        <p className="text-sm text-zinc-500">Carregando…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      titulo={editId ? "Editar campanha" : "Nova campanha"}
      subtitulo="Título e descrição aparecem no menu e na página da promoção"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="mx-auto max-w-2xl space-y-5">
        <Link
          href="/admin/campanhas"
          className="inline-block text-sm text-zinc-600 underline"
        >
          ← Voltar
        </Link>

        {erro && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </p>
        )}

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-700">Título</span>
          <input
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value);
              if (!slugManual) setSlug(slugifyCampanha(e.target.value));
            }}
            placeholder="Ex.: Dia dos pais"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-700">Slug (URL)</span>
          <input
            value={slug}
            onChange={(e) => {
              setSlugManual(true);
              setSlug(e.target.value);
            }}
            placeholder="dia-dos-pais"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 font-mono text-sm"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-700">Descrição</span>
          <textarea
            rows={3}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Presentes pra ele! Capinhas, térmicos e mais."
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">Ordem</span>
            <input
              type="number"
              value={ordem}
              onChange={(e) => setOrdem(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">Início</span>
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">Fim</span>
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-800">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Campanha ativa (visível no site)
        </label>

        <fieldset className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
          <legend className="px-1 text-sm font-semibold text-zinc-900">
            Produtos da promoção ({produtoIds.length})
          </legend>
          <input
            type="search"
            value={buscaProduto}
            onChange={(e) => setBuscaProduto(e.target.value)}
            placeholder="Buscar produto…"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {produtosFiltrados.map((p) => {
              const marcado = produtoIds.includes(p.id);
              return (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => toggleProduto(p.id)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    <span className="min-w-0 flex-1 truncate text-zinc-800">
                      {p.nome}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <button
          type="submit"
          disabled={salvando}
          className="btn-gold w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
        >
          {salvando ? "Salvando…" : "Salvar campanha"}
        </button>
      </form>
    </AdminShell>
  );
}
