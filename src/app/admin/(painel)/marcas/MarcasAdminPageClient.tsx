"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  excluirMarcaAdmin,
  listarMarcasAdmin,
  type MarcaCatalogoAdmin,
} from "@/features/admin/catalogo/marcaAdminService";

type FiltroStatus = "todos" | "ativo" | "inativo";

export function MarcasAdminPageClient() {
  const [marcas, setMarcas] = useState<MarcaCatalogoAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setMarcas(await listarMarcasAdmin());
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar marcas.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return marcas.filter((m) => {
      if (filtroStatus === "ativo" && !m.ativo) return false;
      if (filtroStatus === "inativo" && m.ativo) return false;
      if (!q) return true;
      return m.nome.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
    });
  }, [marcas, busca, filtroStatus]);

  async function handleExcluir(m: MarcaCatalogoAdmin) {
    if (
      !confirm(
        `Excluir a marca "${m.nome}"?\n\nProdutos e modelos que apontam para ela podem ficar inconsistentes. Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }
    setExcluindoId(m.id);
    setErro(null);
    try {
      await excluirMarcaAdmin(m.id);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao excluir.");
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <AdminShell titulo="Marcas" subtitulo="Fabricantes / linhas de aparelho">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          {filtradas.length} de {marcas.length} marca(s)
        </p>
        <Link
          href="/admin/marcas/novo"
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Nova marca
        </Link>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar marca…"
          className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm sm:max-w-xs"
        />
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm"
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativas</option>
          <option value="inativo">Inativas</option>
        </select>
      </div>

      {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}
      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : filtradas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
          {marcas.length === 0
            ? "Nenhuma marca cadastrada."
            : "Nenhuma marca com esses filtros."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtradas.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium">{m.nome}</td>
                  <td className="px-4 py-3 text-center">
                    {m.ativo ? "Ativo" : "Inativo"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/marcas/editar?id=${m.id}`}
                      className="text-xs text-violet-700 underline"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      disabled={excluindoId === m.id}
                      onClick={() => void handleExcluir(m)}
                      className="ml-3 text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                    >
                      {excluindoId === m.id ? "…" : "Excluir"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
