"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  alternarAtivoTipoAdmin,
  listarTiposAdmin,
  type TipoCatalogoAdmin,
} from "@/features/admin/catalogo/tipoAdminService";
import { ROTULOS_TIPO_PERSONALIZACAO } from "@/features/catalogo/types";

export function TiposAdminPageClient() {
  const [tipos, setTipos] = useState<TipoCatalogoAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

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
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
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
