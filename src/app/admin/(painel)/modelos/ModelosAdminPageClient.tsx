"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { listarMarcasAdmin } from "@/features/admin/catalogo/marcaAdminService";
import {
  listarModelosAdmin,
  type ModeloCatalogoAdmin,
} from "@/features/admin/catalogo/modeloAdminService";

export function ModelosAdminPageClient() {
  const [modelos, setModelos] = useState<ModeloCatalogoAdmin[]>([]);
  const [marcasMap, setMarcasMap] = useState<Record<string, string>>({});
  const [marcasOpcoes, setMarcasOpcoes] = useState<
    { id: string; nome: string }[]
  >([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("todos");

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [modelosLista, marcas] = await Promise.all([
      listarModelosAdmin(),
      listarMarcasAdmin(),
    ]);
    setModelos(modelosLista);
    setMarcasMap(Object.fromEntries(marcas.map((m) => [m.id, m.nome])));
    setMarcasOpcoes(marcas.map((m) => ({ id: m.id, nome: m.nome })));
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return modelos.filter((m) => {
      if (filtroMarca !== "todos" && m.marcaId !== filtroMarca) return false;
      if (!q) return true;
      const marcaNome = (marcasMap[m.marcaId] ?? "").toLowerCase();
      return (
        m.nome.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        marcaNome.includes(q)
      );
    });
  }, [modelos, busca, filtroMarca, marcasMap]);

  return (
    <AdminShell
      titulo="Modelos"
      subtitulo="Máscaras e overlays por aparelho (case)"
    >
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Quer o jeito mais fácil?</p>
        <p className="mt-1">
          Use o assistente{" "}
          <Link href="/admin/capinha-nova" className="font-semibold underline">
            + Nova case personalizável
          </Link>{" "}
          — ele cria o aparelho e o produto de uma vez, sem enviar máscara/moldura.
        </p>
        <p className="mt-3 font-semibold">Ou faça manualmente (2 passos)</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            <strong>Aqui em Modelos → Novo modelo:</strong> cadastre o aparelho
            (marca, nome, dimensões, molde da máscara e câmera).
          </li>
          <li>
            : para variantes (material/preço), use{" "}
            <Link
              href="/admin/produtos/novo"
              className="font-semibold underline"
            >
              Produtos → Novo produto
            </Link>
            . Aparelho novo sempre via{" "}
            <Link href="/admin/capinha-nova" className="font-semibold underline">
              + Nova case
            </Link>
            .
          </li>
        </ol>
        <p className="mt-2 text-xs text-amber-800">
          Precisa de marca nova? Cadastre antes em{" "}
          <Link href="/admin/marcas/novo" className="underline">
            Marcas
          </Link>
          .
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          {filtrados.length} de {modelos.length} modelo(s)
        </p>
        <Link
          href="/admin/modelos/novo"
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Novo modelo
        </Link>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar modelo ou marca…"
          className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm sm:max-w-xs"
        />
        <select
          value={filtroMarca}
          onChange={(e) => setFiltroMarca(e.target.value)}
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm"
        >
          <option value="todos">Todas as marcas</option>
          {marcasOpcoes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </div>

      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
          {modelos.length === 0
            ? "Nenhum modelo cadastrado ainda."
            : "Nenhum modelo com esses filtros."}
        </p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border bg-white shadow-sm sm:block">
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
                {filtrados.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-medium">{m.nome}</td>
                    <td className="px-4 py-3">
                      {marcasMap[m.marcaId] ?? m.marcaId}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-xs text-zinc-500">
                      {m.maskUrl}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/modelos/editar?id=${m.id}`}
                        className="text-xs text-violet-700 underline"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {filtrados.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <p className="font-medium text-zinc-900">{m.nome}</p>
                <p className="text-sm text-zinc-600">
                  {marcasMap[m.marcaId] ?? m.marcaId}
                </p>
                <Link
                  href={`/admin/modelos/editar?id=${m.id}`}
                  className="mt-3 block rounded-xl border border-zinc-300 px-3 py-2.5 text-center text-sm font-medium text-zinc-800 active:bg-zinc-100"
                >
                  Editar
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminShell>
  );
}
