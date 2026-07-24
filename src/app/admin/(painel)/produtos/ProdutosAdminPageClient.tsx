"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  alternarAtivoProdutoCentral,
  excluirProdutoCentral,
  listarProdutosCentral,
  type ProdutoCentral,
} from "@/features/admin/produtos/produtoCentralService";
import { formatarPreco } from "@/features/loja/produtosMock";

type FiltroStatus = "todos" | "ativo" | "inativo";
type FiltroTipo = "todos" | "personalizada" | "pronta";

export function ProdutosAdminPageClient() {
  const [produtos, setProdutos] = useState<ProdutoCentral[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [alternandoId, setAlternandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setProdutos(await listarProdutosCentral());
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar produtos.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      if (filtroStatus === "ativo" && !p.ativo) return false;
      if (filtroStatus === "inativo" && p.ativo) return false;
      if (filtroTipo === "personalizada" && !p.personalizavel) return false;
      if (filtroTipo === "pronta" && p.personalizavel) return false;
      if (!q) return true;
      return (
        p.nome.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.material ?? "").toLowerCase().includes(q)
      );
    });
  }, [produtos, busca, filtroStatus, filtroTipo]);

  async function handleAlternarAtivo(produto: ProdutoCentral) {
    setAlternandoId(produto.id);
    try {
      await alternarAtivoProdutoCentral(produto.id, !produto.ativo);
      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao atualizar produto.",
      );
    } finally {
      setAlternandoId(null);
    }
  }

  async function handleExcluir(produto: ProdutoCentral) {
    const ok = window.confirm(
      `Excluir "${produto.nome}" do catálogo?\n\nEsta ação não pode ser desfeita.`,
    );
    if (!ok) return;

    setExcluindoId(produto.id);
    setErro(null);
    try {
      await excluirProdutoCentral(produto.id);
      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao excluir produto.",
      );
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <AdminShell
      titulo="Produtos"
      subtitulo="Catálogo central da marca — todos os revendedores vendem estes itens"
    >
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
        <p className="font-semibold">Aparelho novo?</p>
        <p className="mt-1 text-amber-900">
          Para cadastrar um modelo de celular com case personalizável, use{" "}
          <Link href="/admin/capinha-nova" className="font-semibold underline">
            + Nova case
          </Link>
          . Aqui em Produtos você só cria variantes (material, preço) de itens
          já existentes no catálogo.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          {filtrados.length} de {produtos.length} produto
          {produtos.length !== 1 ? "s" : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/produtos/novo"
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Novo produto
          </Link>
          <Link
            href="/admin/estoque"
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            Gerenciar estoque
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, material…"
          className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm sm:max-w-xs"
        />
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm"
        >
          <option value="todos">Todos os tipos</option>
          <option value="personalizada">Capinhas personalizadas</option>
          <option value="pronta">Produtos prontos</option>
        </select>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm"
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
      </div>

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando produtos...</p>
      ) : produtos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-zinc-600">Nenhum produto no catálogo.</p>
          <Link
            href="/admin/produtos/novo"
            className="mt-4 inline-block text-sm font-medium text-violet-700 underline"
          >
            Criar o primeiro produto
          </Link>
        </div>
      ) : filtrados.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          Nenhum produto com esses filtros.
        </p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm sm:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3">Loja</th>
                    <th className="px-4 py-3">Revendedor</th>
                    <th className="px-4 py-3">Estoque</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtrados.map((produto) => (
                    <tr key={produto.id} className="hover:bg-zinc-50/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                            {produto.imagens[0] ? (
                              <Image
                                src={produto.imagens[0]}
                                alt=""
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">
                                Sem foto
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900">
                              {produto.nome}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {produto.personalizavel
                                ? "Personalizada"
                                : "Pronta"}
                              {produto.material
                                ? ` · ${produto.material}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {formatarPreco(produto.precoBaseCentavos)}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {produto.precoRevendedorCentavos != null &&
                        produto.precoRevendedorCentavos > 0 ? (
                          formatarPreco(produto.precoRevendedorCentavos)
                        ) : (
                          <span
                            className="text-zinc-400"
                            title="Usa preço da loja"
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {produto.personalizavel || !produto.controlaEstoque ? (
                          <span className="text-zinc-400">—</span>
                        ) : (
                          <Link
                            href="/admin/estoque"
                            className="font-medium tabular-nums underline decoration-zinc-300 hover:decoration-zinc-600"
                            title="Alterar em Estoque"
                          >
                            {produto.estoqueCentral}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            produto.ativo
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-zinc-200 text-zinc-600"
                          }`}
                        >
                          {produto.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/produtos/editar?id=${encodeURIComponent(produto.id)}`}
                            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Editar
                          </Link>
                          <button
                            type="button"
                            disabled={alternandoId === produto.id}
                            onClick={() => void handleAlternarAtivo(produto)}
                            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                          >
                            {alternandoId === produto.id
                              ? "..."
                              : produto.ativo
                                ? "Desativar"
                                : "Ativar"}
                          </button>
                          <button
                            type="button"
                            disabled={excluindoId === produto.id}
                            onClick={() => void handleExcluir(produto)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {excluindoId === produto.id ? "..." : "Excluir"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {filtrados.map((produto) => (
              <div
                key={`m-${produto.id}`}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                    {produto.imagens[0] ? (
                      <Image
                        src={produto.imagens[0]}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">
                        Sem foto
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900">{produto.nome}</p>
                    <p className="text-sm text-zinc-700">
                      Loja {formatarPreco(produto.precoBaseCentavos)}
                      {produto.precoRevendedorCentavos != null &&
                      produto.precoRevendedorCentavos > 0
                        ? ` · Rev. ${formatarPreco(produto.precoRevendedorCentavos)}`
                        : ""}
                    </p>
                    {!produto.personalizavel && produto.controlaEstoque && (
                      <p className="text-xs text-zinc-500">
                        Estoque:{" "}
                        <Link
                          href="/admin/estoque"
                          className="font-medium underline"
                        >
                          {produto.estoqueCentral} un.
                        </Link>
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      produto.ativo
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {produto.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/admin/produtos/editar?id=${encodeURIComponent(produto.id)}`}
                    className="flex-1 rounded-xl border border-zinc-300 px-3 py-2.5 text-center text-sm font-medium text-zinc-800 active:bg-zinc-100"
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    disabled={alternandoId === produto.id}
                    onClick={() => void handleAlternarAtivo(produto)}
                    className="flex-1 rounded-xl border border-zinc-300 px-3 py-2.5 text-center text-sm font-medium text-zinc-700 active:bg-zinc-100 disabled:opacity-50"
                  >
                    {alternandoId === produto.id
                      ? "..."
                      : produto.ativo
                        ? "Desativar"
                        : "Ativar"}
                  </button>
                  <button
                    type="button"
                    disabled={excluindoId === produto.id}
                    onClick={() => void handleExcluir(produto)}
                    className="rounded-xl border border-red-200 px-3 py-2.5 text-sm font-medium text-red-700 active:bg-red-50 disabled:opacity-50"
                  >
                    {excluindoId === produto.id ? "..." : "Excluir"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminShell>
  );
}
