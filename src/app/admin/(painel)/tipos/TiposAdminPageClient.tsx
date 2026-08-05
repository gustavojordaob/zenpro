"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  alternarAtivoTipoAdmin,
  excluirTipoAdmin,
  listarTiposAdmin,
  type TipoCatalogoAdmin,
} from "@/features/admin/catalogo/tipoAdminService";
import { ROTULOS_TIPO_PERSONALIZACAO } from "@/features/catalogo/types";

export function TiposAdminPageClient() {
  const [tipos, setTipos] = useState<TipoCatalogoAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setTipos(await listarTiposAdmin());
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar tipos.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function handleExcluir(tipo: TipoCatalogoAdmin) {
    if (
      !confirm(
        `Excluir o tipo "${tipo.nome}"?\n\nProdutos que usam este tipo podem ficar inconsistentes. Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }
    setExcluindoId(tipo.id);
    setErro(null);
    try {
      await excluirTipoAdmin(tipo.id);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao excluir.");
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <AdminShell titulo="Tipos de produto" subtitulo="Define como cada categoria se personaliza">
      <div className="mb-6 flex justify-between gap-3">
        <p className="text-sm text-zinc-600">{tipos.length} tipo(s)</p>
        <Link href="/admin/tipos/novo" className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800">
          Novo tipo
        </Link>
      </div>
      {erro && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}
      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm sm:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Personalização</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {tipos.map((tipo) => (
                  <tr key={tipo.id}>
                    <td className="px-4 py-3 font-medium">{tipo.nome}</td>
                    <td className="px-4 py-3 text-zinc-600">{ROTULOS_TIPO_PERSONALIZACAO[tipo.tipoPersonalizacao]}</td>
                    <td className="px-4 py-3">{tipo.ativo ? "Ativo" : "Inativo"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/tipos/editar?id=${tipo.id}`} className="text-xs font-medium text-violet-700 underline">
                        Editar
                      </Link>
                      <button type="button" className="ml-3 text-xs text-zinc-600" onClick={() => void alternarAtivoTipoAdmin(tipo.id, !tipo.ativo).then(carregar)}>
                        {tipo.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        disabled={excluindoId === tipo.id}
                        className="ml-3 text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                        onClick={() => void handleExcluir(tipo)}
                      >
                        {excluindoId === tipo.id ? "…" : "Excluir"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {tipos.map((tipo) => (
              <div key={tipo.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-zinc-900">{tipo.nome}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${tipo.ativo ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"}`}>
                    {tipo.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-600">{ROTULOS_TIPO_PERSONALIZACAO[tipo.tipoPersonalizacao]}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/tipos/editar?id=${tipo.id}`}
                    className="min-w-[30%] flex-1 rounded-xl border border-zinc-300 px-3 py-2.5 text-center text-sm font-medium text-zinc-800 active:bg-zinc-100"
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    className="min-w-[30%] flex-1 rounded-xl border border-zinc-300 px-3 py-2.5 text-center text-sm font-medium text-zinc-700 active:bg-zinc-100"
                    onClick={() => void alternarAtivoTipoAdmin(tipo.id, !tipo.ativo).then(carregar)}
                  >
                    {tipo.ativo ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    disabled={excluindoId === tipo.id}
                    className="min-w-[30%] flex-1 rounded-xl border border-red-200 px-3 py-2.5 text-center text-sm font-medium text-red-700 active:bg-red-50 disabled:opacity-50"
                    onClick={() => void handleExcluir(tipo)}
                  >
                    {excluindoId === tipo.id ? "…" : "Excluir"}
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
