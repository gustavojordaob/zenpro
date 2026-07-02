"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  alternarAtivoMarcaAdmin,
  listarMarcasAdmin,
  type MarcaCatalogoAdmin,
} from "@/features/admin/catalogo/marcaAdminService";

export function MarcasAdminPageClient() {
  const [marcas, setMarcas] = useState<MarcaCatalogoAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

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

  return (
    <AdminShell titulo="Marcas" subtitulo="Fabricantes / linhas de aparelho">
      <div className="mb-6 flex justify-between">
        <p className="text-sm text-zinc-600">{marcas.length} marca(s)</p>
        <Link href="/admin/marcas/novo" className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white">Nova marca</Link>
      </div>
      {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}
      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr><th className="px-4 py-3 text-left">Nome</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {marcas.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium">{m.nome}</td>
                  <td className="px-4 py-3 text-center">{m.ativo ? "Ativo" : "Inativo"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/marcas/editar?id=${m.id}`} className="text-violet-700 underline text-xs">Editar</Link>
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
