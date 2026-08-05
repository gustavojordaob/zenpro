"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  alternarAtivoCampanhaAdmin,
  excluirCampanhaAdmin,
  listarCampanhasAdmin,
  type CampanhaAdmin,
} from "@/features/admin/campanhas/campanhaAdminService";

export function CampanhasAdminPageClient() {
  const [itens, setItens] = useState<CampanhaAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setItens(await listarCampanhasAdmin());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar campanhas.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function toggleAtivo(c: CampanhaAdmin) {
    setBusyId(c.id);
    try {
      await alternarAtivoCampanhaAdmin(c.id, !c.ativo);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao atualizar.");
    } finally {
      setBusyId(null);
    }
  }

  async function excluir(c: CampanhaAdmin) {
    if (!confirm(`Excluir a campanha "${c.titulo}"?`)) return;
    setBusyId(c.id);
    try {
      await excluirCampanhaAdmin(c.id);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell
      titulo="Campanhas / promoções"
      subtitulo="Faixas no menu e páginas de promoção (ex.: Dia dos pais)"
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-600">
          Campanhas ativas aparecem no header e na home. Clique leva aos
          produtos selecionados.
        </p>
        <Link
          href="/admin/campanhas/novo"
          className="btn-gold inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold sm:w-auto"
        >
          Nova campanha
        </Link>
      </div>

      {erro && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando…</p>
      ) : itens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          Nenhuma campanha ainda. Crie a primeira para aparecer no site.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          {itens.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900">{c.titulo}</p>
                <p className="mt-0.5 truncate text-sm text-zinc-500">
                  /promocao?slug={c.slug} · {c.produtoIds.length} produto(s) ·
                  ordem {c.ordem}
                  {c.ativo ? "" : " · inativa"}
                </p>
                {c.descricao ? (
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                    {c.descricao}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/campanhas/editar?id=${encodeURIComponent(c.id)}`}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  Editar
                </Link>
                <button
                  type="button"
                  disabled={busyId === c.id}
                  onClick={() => void toggleAtivo(c)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {c.ativo ? "Desativar" : "Ativar"}
                </button>
                <button
                  type="button"
                  disabled={busyId === c.id}
                  onClick={() => void excluir(c)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
