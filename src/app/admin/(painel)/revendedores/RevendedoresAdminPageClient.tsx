"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  alternarAtivoRevendedorAdmin,
  listarRevendedoresAdmin,
  type RevendedorAdmin,
} from "@/features/admin/revendedores/revendedorAdminService";

export function RevendedoresAdminPageClient() {
  const [lojas, setLojas] = useState<RevendedorAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setLojas(await listarRevendedoresAdmin());
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar revendedores.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <AdminShell
      titulo="Revendedores"
      subtitulo="Gerencie lojas, donos e branding"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">{lojas.length} loja(s)</p>
        <Link
          href="/admin/revendedores/novo"
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Novo revendedor
        </Link>
      </div>

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Loja</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Dono</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {lojas.map((loja) => (
                <tr key={loja.lojaId}>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {loja.nome}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/${loja.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-700 underline"
                    >
                      /{loja.slug}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    <div>{loja.donoNome ?? "—"}</div>
                    <div className="text-xs text-zinc-500">{loja.donoEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    {loja.ativo ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        Ativa
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                        Inativa
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/revendedores/editar?id=${loja.lojaId}`}
                      className="text-xs font-medium text-violet-700 underline"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      className="ml-3 text-xs text-zinc-600 hover:text-zinc-900"
                      onClick={() =>
                        void alternarAtivoRevendedorAdmin(
                          loja.lojaId,
                          !loja.ativo,
                        ).then(carregar)
                      }
                    >
                      {loja.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
              {lojas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    Nenhuma loja cadastrada. Crie o primeiro revendedor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
