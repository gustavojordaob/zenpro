"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { listarMarcasAdmin } from "@/features/admin/catalogo/marcaAdminService";
import {
  listarModelosAdmin,
  type ModeloCatalogoAdmin,
} from "@/features/admin/catalogo/modeloAdminService";

export function ModelosAdminPageClient() {
  const [modelos, setModelos] = useState<ModeloCatalogoAdmin[]>([]);
  const [marcasMap, setMarcasMap] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [modelosLista, marcas] = await Promise.all([
      listarModelosAdmin(),
      listarMarcasAdmin(),
    ]);
    setModelos(modelosLista);
    setMarcasMap(Object.fromEntries(marcas.map((m) => [m.id, m.nome])));
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <AdminShell titulo="Modelos" subtitulo="Máscaras e overlays por aparelho (capinha)">
      <div className="mb-6 flex justify-between">
        <p className="text-sm text-zinc-600">{modelos.length} modelo(s)</p>
        <Link href="/admin/modelos/novo" className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white">Novo modelo</Link>
      </div>
      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left">Modelo</th>
                <th className="px-4 py-3 text-left">Marca</th>
                <th className="px-4 py-3 text-left">Máscara</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {modelos.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium">{m.nome}</td>
                  <td className="px-4 py-3">{marcasMap[m.marcaId] ?? m.marcaId}</td>
                  <td className="px-4 py-3 truncate max-w-[200px] text-xs text-zinc-500">{m.maskUrl}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/modelos/editar?id=${m.id}`} className="text-violet-700 underline text-xs">Editar</Link>
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
