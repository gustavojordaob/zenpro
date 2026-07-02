"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";
import {
  definirEstoqueLojaProduto,
  listarProdutosEstoqueAdmin,
  type ProdutoEstoqueAdmin,
} from "@/features/admin/estoque/estoqueAdminService";
import { listarRevendedoresAdmin } from "@/features/admin/revendedores/revendedorAdminService";
import { listarProdutosCentral } from "@/features/admin/produtos/produtoCentralService";

export function EstoqueAdminPageClient() {
  const { sessao } = useAuthAdmin();
  const ehMarca = sessao?.papel === "marca";
  const lojaPadrao = sessao?.lojaId ?? "";

  const [lojaId, setLojaId] = useState(lojaPadrao);
  const [lojas, setLojas] = useState<{ id: string; nome: string }[]>([]);
  const [itens, setItens] = useState<ProdutoEstoqueAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!ehMarca) return;
    void listarRevendedoresAdmin().then((lista) => {
      setLojas(lista.map((l) => ({ id: l.lojaId, nome: l.nome })));
    });
  }, [ehMarca]);

  useEffect(() => {
    if (lojaPadrao) setLojaId(lojaPadrao);
  }, [lojaPadrao]);

  const carregar = useCallback(async () => {
    if (!lojaId) {
      setItens([]);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro(null);
    try {
      const produtos = await listarProdutosCentral();
      const lista = await listarProdutosEstoqueAdmin(
        lojaId,
        produtos.map((p) => ({ id: p.id, data: p })),
      );
      setItens(lista);
      setRascunho(
        Object.fromEntries(lista.map((i) => [i.produtoId, String(i.estoqueLoja)])),
      );
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar estoque.");
    } finally {
      setCarregando(false);
    }
  }, [lojaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar(produtoId: string) {
    if (!lojaId) return;
    const item = itens.find((i) => i.produtoId === produtoId);
    const qtd = Math.max(0, parseInt(rascunho[produtoId] ?? "0", 10) || 0);

    if (item && item.controlaEstoque && qtd > item.estoqueCentral) {
      setErro(
        `Estoque da loja não pode passar do central (${item.estoqueCentral} un.).`,
      );
      return;
    }

    setSalvandoId(produtoId);
    setErro(null);
    try {
      await definirEstoqueLojaProduto(lojaId, produtoId, qtd);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSalvandoId(null);
    }
  }

  return (
    <AdminShell
      titulo="Estoque"
      subtitulo={
        ehMarca
          ? "Depósito central nos produtos · quantidade por loja aqui"
          : "Quantidade disponível na sua loja"
      }
    >
      {ehMarca && (
        <label className="mb-6 block max-w-md">
          <span className="text-sm font-medium text-zinc-700">Loja</span>
          <select
            value={lojaId}
            onChange={(e) => setLojaId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5"
          >
            <option value="">Selecione uma loja</option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome} ({l.id})
              </option>
            ))}
          </select>
        </label>
      )}

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      )}

      {!lojaId ? (
        <p className="text-sm text-zinc-500">Selecione uma loja para ver o estoque.</p>
      ) : carregando ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Produto</th>
                {ehMarca && <th className="px-4 py-3">Central</th>}
                <th className="px-4 py-3">Na loja</th>
                <th className="px-4 py-3">Disponível venda</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.produtoId} className="border-t border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">{item.nome}</td>
                  {ehMarca && (
                    <td className="px-4 py-3 text-zinc-600">
                      {item.controlaEstoque ? item.estoqueCentral : "—"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {item.controlaEstoque ? (
                      <input
                        type="number"
                        min={0}
                        max={ehMarca ? item.estoqueCentral : undefined}
                        value={rascunho[item.produtoId] ?? "0"}
                        onChange={(e) =>
                          setRascunho((prev) => ({
                            ...prev,
                            [item.produtoId]: e.target.value,
                          }))
                        }
                        className="w-24 rounded-lg border border-zinc-300 px-2 py-1"
                      />
                    ) : (
                      <span className="text-zinc-500">Sob encomenda</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.controlaEstoque ? (
                      <span
                        className={
                          item.disponivelVenda > 0
                            ? "font-medium text-emerald-700"
                            : "font-medium text-red-600"
                        }
                      >
                        {item.disponivelVenda}
                      </span>
                    ) : (
                      "∞"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.controlaEstoque && (
                      <button
                        type="button"
                        disabled={salvandoId === item.produtoId}
                        onClick={() => void salvar(item.produtoId)}
                        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {salvandoId === item.produtoId ? "Salvando..." : "Salvar"}
                      </button>
                    )}
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
