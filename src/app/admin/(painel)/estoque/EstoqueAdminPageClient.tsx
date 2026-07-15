"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";
import {
  definirEstoqueLojaOficialMarca,
  listarProdutosEstoqueAdmin,
  type ProdutoEstoqueAdmin,
} from "@/features/admin/estoque/estoqueAdminService";
import { listarProdutosCentral } from "@/features/admin/produtos/produtoCentralService";
import { MARCA_LOJA_ID } from "@/features/multitenant/marcaLoja";
import { ExpedicaoLojaAdminCard } from "@/components/admin/ExpedicaoLojaAdminCard";

/**
 * Estoque só da loja oficial Zen Pro (marca).
 * Revendedores compram no /revendedor — não há mais alocação por loja.
 */
export function EstoqueAdminPageClient() {
  const { sessao } = useAuthAdmin();
  const ehMarca = sessao?.papel === "marca";

  const [itens, setItens] = useState<ProdutoEstoqueAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const produtos = await listarProdutosCentral();
      const lista = await listarProdutosEstoqueAdmin(
        MARCA_LOJA_ID,
        produtos.map((p) => ({ id: p.id, data: p })),
      );
      setItens(lista);
      setRascunho(
        Object.fromEntries(
          lista.map((i) => [
            i.produtoId,
            String(Math.max(i.estoqueCentral, i.estoqueLoja)),
          ]),
        ),
      );
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar estoque.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!ehMarca) return;
    void carregar();
  }, [carregar, ehMarca]);

  async function salvar(produtoId: string) {
    const qtd = Math.max(0, parseInt(rascunho[produtoId] ?? "0", 10) || 0);
    setSalvandoId(produtoId);
    setErro(null);
    try {
      await definirEstoqueLojaOficialMarca(produtoId, qtd, MARCA_LOJA_ID);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSalvandoId(null);
    }
  }

  if (!ehMarca) {
    return (
      <AdminShell
        titulo="Estoque"
        subtitulo="Disponível apenas para a marca Zen Pro"
      >
        <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
          Revendedores pedem produtos no{" "}
          <a href="/revendedor" className="font-semibold text-teal-800 underline">
            site do revendedor
          </a>
          . O estoque do site é gerido pela Zen Pro.
        </p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      titulo="Estoque"
      subtitulo="Quantidade disponível no site zenpro-capinhas.web.app"
    >
      <ExpedicaoLojaAdminCard
        lojaId={MARCA_LOJA_ID}
        titulo="Galpão Zen Pro — endereço de expedição"
        descricao="Usado em pedidos personalizados e em produtos prontos vendidos no site. Necessário para Melhor Envio / etiquetas."
      />
      <p className="mb-6 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        Um número por produto — estoque do site e do galpão juntos. Ao salvar,
        o produto fica disponível na vitrine com essa quantidade.
      </p>

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Estoque</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.produtoId} className="border-t border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {item.nome}
                  </td>
                  <td className="px-4 py-3">
                    {item.controlaEstoque ? (
                      <input
                        type="number"
                        min={0}
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
