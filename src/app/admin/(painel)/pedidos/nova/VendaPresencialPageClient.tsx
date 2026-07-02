"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";
import { listarLojasResumo, type LojaResumo } from "@/features/admin/pedidos/pedidoAdminService";
import {
  criarVendaPresencialAdmin,
  FORMAS_PAGAMENTO_PRESENCIAL,
  type ItemVendaPresencialInput,
} from "@/features/admin/pedidos/vendaPresencialAdminService";
import { listarProdutosCentral, type ProdutoCentral } from "@/features/admin/produtos/produtoCentralService";
import { formatarPreco } from "@/features/loja/produtosMock";
import type { PedidoLojaStatus } from "@/features/multitenant/types";

type LinhaForm = {
  key: string;
  produtoId: string;
  quantidade: number;
  observacao: string;
  precoOverrideCentavos: string;
};

function novaLinha(): LinhaForm {
  return {
    key: `linha-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    produtoId: "",
    quantidade: 1,
    observacao: "",
    precoOverrideCentavos: "",
  };
}

export function VendaPresencialPageClient() {
  const router = useRouter();
  const { user, isMarca, lojaId: lojaRevendedor } = useAuthAdmin();

  const [lojas, setLojas] = useState<LojaResumo[]>([]);
  const [produtos, setProdutos] = useState<ProdutoCentral[]>([]);
  const [lojaId, setLojaId] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteContato, setClienteContato] = useState("");
  const [clienteEndereco, setClienteEndereco] = useState("");
  const [formaPagamento, setFormaPagamento] =
    useState<(typeof FORMAS_PAGAMENTO_PRESENCIAL)[number]["value"]>("dinheiro");
  const [status, setStatus] = useState<PedidoLojaStatus>("pago");
  const [observacaoPedido, setObservacaoPedido] = useState("");
  const [linhas, setLinhas] = useState<LinhaForm[]>([novaLinha()]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const produtosAtivos = useMemo(
    () => produtos.filter((p) => p.ativo),
    [produtos],
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const listaProdutos = await listarProdutosCentral();
      setProdutos(listaProdutos);

      if (isMarca) {
        const listaLojas = await listarLojasResumo();
        setLojas(listaLojas);
        if (listaLojas.length === 1) {
          setLojaId(listaLojas[0].id);
        }
      } else if (lojaRevendedor) {
        setLojaId(lojaRevendedor);
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar dados.");
    } finally {
      setCarregando(false);
    }
  }, [isMarca, lojaRevendedor]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const totalCentavos = useMemo(() => {
    return linhas.reduce((acc, linha) => {
      const produto = produtosAtivos.find((p) => p.id === linha.produtoId);
      if (!produto) return acc;
      const preco =
        linha.precoOverrideCentavos.trim() !== ""
          ? Math.round(Number(linha.precoOverrideCentavos.replace(",", ".")) * 100)
          : produto.precoBaseCentavos;
      if (!Number.isFinite(preco) || preco < 0) return acc;
      return acc + preco * linha.quantidade;
    }, 0);
  }, [linhas, produtosAtivos]);

  function atualizarLinha(key: string, patch: Partial<LinhaForm>) {
    setLinhas((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  }

  function removerLinha(key: string) {
    setLinhas((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }

  function montarItens(): ItemVendaPresencialInput[] {
    const itens: ItemVendaPresencialInput[] = [];

    for (const linha of linhas) {
      const produto = produtosAtivos.find((p) => p.id === linha.produtoId);
      if (!produto) continue;

      const precoCentavos =
        linha.precoOverrideCentavos.trim() !== ""
          ? Math.round(Number(linha.precoOverrideCentavos.replace(",", ".")) * 100)
          : produto.precoBaseCentavos;

      itens.push({
        produtoId: produto.id,
        nomeProduto: produto.nome,
        precoCentavos,
        quantidade: linha.quantidade,
        observacao: linha.observacao.trim() || undefined,
      });
    }

    return itens;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSalvando(true);
    setErro(null);

    try {
      const pedidoId = await criarVendaPresencialAdmin({
        lojaId: isMarca ? lojaId : (lojaRevendedor ?? ""),
        registradoPorUid: user.uid,
        clienteNome,
        clienteContato,
        clienteEndereco: clienteEndereco || undefined,
        itens: montarItens(),
        formaPagamento,
        status,
        observacaoPedido: observacaoPedido || undefined,
      });

      router.push(
        `/admin/pedidos/detalhe?lojaId=${encodeURIComponent(isMarca ? lojaId : lojaRevendedor ?? "")}&id=${encodeURIComponent(pedidoId)}`,
      );
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao registrar venda.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AdminShell
      titulo="Venda presencial"
      subtitulo="Registre uma venda feita na loja física ou balcão"
    >
      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
          {erro && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro}
            </p>
          )}

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-zinc-900">Loja e cliente</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {isMarca && (
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-zinc-700">Loja</span>
                  <select
                    required
                    value={lojaId}
                    onChange={(e) => setLojaId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
                  >
                    <option value="">Selecione a loja</option>
                    {lojas.map((loja) => (
                      <option key={loja.id} value={loja.id}>
                        {loja.nome} ({loja.slug})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block">
                <span className="text-sm font-medium text-zinc-700">
                  Nome do cliente
                </span>
                <input
                  required
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
                  placeholder="Maria Silva"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-700">
                  Contato (tel. ou e-mail)
                </span>
                <input
                  required
                  value={clienteContato}
                  onChange={(e) => setClienteContato(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
                  placeholder="(11) 99999-9999"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-zinc-700">
                  Endereço (opcional)
                </span>
                <input
                  value={clienteEndereco}
                  onChange={(e) => setClienteEndereco(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
                  placeholder="Deixe vazio para “Venda presencial”"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-zinc-900">Produtos</h2>
              <button
                type="button"
                onClick={() => setLinhas((prev) => [...prev, novaLinha()])}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                + Adicionar item
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {linhas.map((linha, index) => {
                const produto = produtosAtivos.find((p) => p.id === linha.produtoId);
                return (
                  <div
                    key={linha.key}
                    className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4"
                  >
                    <p className="mb-3 text-xs font-semibold uppercase text-zinc-500">
                      Item {index + 1}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="block sm:col-span-2 lg:col-span-2">
                        <span className="text-xs font-medium text-zinc-600">
                          Produto
                        </span>
                        <select
                          required
                          value={linha.produtoId}
                          onChange={(e) =>
                            atualizarLinha(linha.key, { produtoId: e.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Selecione</option>
                          {produtosAtivos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome} — {formatarPreco(p.precoBaseCentavos)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-xs font-medium text-zinc-600">Qtd.</span>
                        <input
                          type="number"
                          min={1}
                          required
                          value={linha.quantidade}
                          onChange={(e) =>
                            atualizarLinha(linha.key, {
                              quantidade: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-medium text-zinc-600">
                          Preço unit. (R$)
                        </span>
                        <input
                          value={linha.precoOverrideCentavos}
                          onChange={(e) =>
                            atualizarLinha(linha.key, {
                              precoOverrideCentavos: e.target.value,
                            })
                          }
                          placeholder={
                            produto
                              ? (produto.precoBaseCentavos / 100).toFixed(2)
                              : "0,00"
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="block sm:col-span-2 lg:col-span-4">
                        <span className="text-xs font-medium text-zinc-600">
                          Observação (modelo, personalização…)
                        </span>
                        <input
                          value={linha.observacao}
                          onChange={(e) =>
                            atualizarLinha(linha.key, { observacao: e.target.value })
                          }
                          placeholder="Ex.: iPhone 15, foto da família"
                          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                        />
                      </label>
                    </div>

                    {linhas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerLinha(linha.key)}
                        className="mt-3 text-xs text-red-600 hover:underline"
                      >
                        Remover item
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-right text-lg font-bold text-zinc-900">
              Total: {formatarPreco(totalCentavos)}
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-zinc-900">Pagamento e status</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-zinc-700">
                  Forma de pagamento
                </span>
                <select
                  value={formaPagamento}
                  onChange={(e) =>
                    setFormaPagamento(
                      e.target.value as (typeof FORMAS_PAGAMENTO_PRESENCIAL)[number]["value"],
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
                >
                  {FORMAS_PAGAMENTO_PRESENCIAL.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-700">
                  Status do pedido
                </span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PedidoLojaStatus)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
                >
                  <option value="pago">Pago (padrão — já recebeu)</option>
                  <option value="producao">Em produção</option>
                  <option value="enviado">Enviado / entregue</option>
                  <option value="aguardando_pagamento">Aguardando pagamento</option>
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-zinc-700">
                  Observação do pedido (opcional)
                </span>
                <textarea
                  value={observacaoPedido}
                  onChange={(e) => setObservacaoPedido(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
                  placeholder="Ex.: cliente retira amanhã"
                />
              </label>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={salvando || totalCentavos <= 0}
              className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {salvando ? "Registrando..." : "Registrar venda"}
            </button>
            <Link
              href="/admin/pedidos"
              className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </AdminShell>
  );
}
