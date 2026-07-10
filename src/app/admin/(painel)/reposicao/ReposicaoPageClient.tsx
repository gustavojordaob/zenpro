"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";
import {
  listarProdutosCentral,
  type ProdutoCentral,
} from "@/features/admin/produtos/produtoCentralService";
import {
  atualizarStatusReposicao,
  criarPedidoReposicao,
  listarReposicoes,
  REPOSICAO_STATUS_OPCOES,
  rotuloStatusReposicao,
  type PedidoReposicao,
  type ReposicaoStatus,
} from "@/features/admin/reposicao/reposicaoService";
import {
  obterRevendedorAdmin,
  type RevendedorAdmin,
} from "@/features/admin/revendedores/revendedorAdminService";
import { formatarPreco } from "@/features/loja/produtosMock";
import {
  criarCheckoutMercadoPago,
  urlCheckoutMercadoPago,
} from "@/features/pagamentos/mercadoPagoClient";
import { pagamentoMockAtivo } from "@/features/pagamentos/pagamentoConfig";
import { SeletorFormaPagamentoOnline } from "@/components/loja/SeletorFormaPagamentoOnline";
import type { PedidoLojaFormaPagamentoOnline } from "@/features/multitenant/types";
import { linkWhatsAppAtendimento } from "@/features/revendedor/revendedorComercialConstants";
import {
  formatarReaisCentavos,
  pedidoMinimoRevendedorCentavos,
} from "@/features/revendedor/revendedorComercialUtils";

const ESTILO_STATUS: Record<ReposicaoStatus, string> = {
  aguardando_pagamento: "bg-amber-100 text-amber-900",
  pago: "bg-emerald-100 text-emerald-900",
  solicitado: "bg-amber-100 text-amber-900",
  aprovado: "bg-sky-100 text-sky-900",
  enviado: "bg-violet-100 text-violet-900",
  recebido: "bg-emerald-100 text-emerald-900",
  cancelado: "bg-rose-100 text-rose-900",
};

export function ReposicaoPageClient() {
  const { uid, user, papel, lojaId, isMarca, isRevendedor } = useAuthAdmin();

  const [produtos, setProdutos] = useState<ProdutoCentral[]>([]);
  const [qtd, setQtd] = useState<Record<string, string>>({});
  const [observacao, setObservacao] = useState("");
  const [pedidos, setPedidos] = useState<PedidoReposicao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const [formaPagamento, setFormaPagamento] =
    useState<PedidoLojaFormaPagamentoOnline>("pix");
  const [parcelas, setParcelas] = useState(1);
  const mockPagamento = pagamentoMockAtivo();

  const [lojaRevendedor, setLojaRevendedor] = useState<RevendedorAdmin | null>(
    null,
  );

  const pedidoMinimo = pedidoMinimoRevendedorCentavos(lojaRevendedor?.config);
  const limiteCredito = lojaRevendedor?.config.limiteCreditoCentavos ?? null;

  async function irParaPagamentoReposicao(pedidoId: string) {
    setPagandoId(pedidoId);
    setErro(null);
    try {
      const checkout = await criarCheckoutMercadoPago({
        tipo: "reposicao",
        pedidoId,
        formaPagamento,
        parcelas: formaPagamento === "cartao" ? parcelas : 1,
        returnBasePath: `${window.location.origin}/admin/reposicao`,
      });
      window.location.href = urlCheckoutMercadoPago(checkout);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao iniciar pagamento.");
      setPagandoId(null);
    }
  }

  const totalPedidoCentavos = produtos.reduce((soma, p) => {
    const q = Number(qtd[p.id] ?? 0);
    return soma + (q > 0 ? p.precoBaseCentavos * q : 0);
  }, 0);

  const carregar = useCallback(async () => {
    if (!papel) return;
    setCarregando(true);
    setErro(null);
    try {
      const loja =
        isRevendedor && lojaId
          ? await obterRevendedorAdmin(lojaId)
          : null;
      setLojaRevendedor(loja);
      const [prods, lista] = await Promise.all([
        isRevendedor ? listarProdutosCentral() : Promise.resolve([]),
        listarReposicoes({ marca: isMarca, revendedorUid: uid ?? undefined }),
      ]);
      setProdutos(prods.filter((p) => p.ativo));
      setPedidos(lista);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível carregar os dados.",
      );
    } finally {
      setCarregando(false);
    }
  }, [papel, isMarca, isRevendedor, uid, lojaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function enviarPedido() {
    if (!uid || !lojaId) {
      setErro("Sessão de revendedor inválida.");
      return;
    }
    setErro(null);
    setOk(null);
    const itens = produtos
      .map((p) => ({
        produtoId: p.id,
        nome: p.nome,
        quantidade: Number(qtd[p.id] ?? 0),
        precoCentavos: p.precoBaseCentavos,
      }))
      .filter((i) => i.quantidade > 0);

    if (itens.length === 0) {
      setErro("Informe a quantidade de pelo menos um produto.");
      return;
    }

    setEnviando(true);
    try {
      const novoId = await criarPedidoReposicao({
        lojaId,
        lojaNome: lojaId,
        revendedorUid: uid,
        revendedorEmail: user?.email ?? null,
        itens,
        observacao,
        pedidoMinimoCentavos: pedidoMinimo,
        limiteCreditoCentavos: limiteCredito,
      });
      setQtd({});
      setObservacao("");
      if (mockPagamento) {
        setOk("Pedido de reposição registrado (mock — marque como pago no admin).");
        await carregar();
        return;
      }
      await irParaPagamentoReposicao(novoId);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível enviar o pedido.",
      );
    } finally {
      setEnviando(false);
    }
  }

  async function mudarStatus(id: string, status: ReposicaoStatus) {
    const atual = pedidos.find((p) => p.id === id);
    try {
      await atualizarStatusReposicao(id, status, atual);
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p)),
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao atualizar status.");
    }
  }

  return (
    <AdminShell
      titulo="Reposição de estoque"
      subtitulo={
        isMarca
          ? "Pedidos de reposição enviados pelos revendedores"
          : "Peça produtos ao dono da Zen Pro para abastecer sua loja"
      }
    >
      {erro && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {erro}
        </div>
      )}
      {ok && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {ok}
        </div>
      )}

      {isRevendedor && (
        <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                Novo pedido de reposição
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Escolha as quantidades de cada produto do catálogo Zen Pro.
              </p>
            </div>
            <a
              href={linkWhatsAppAtendimento(
                "Olá! Preciso falar sobre pedido de reposição Zen Pro.",
              )}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Fale conosco
            </a>
          </div>

          <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-950">
            <p>
              <strong>Pedido mínimo:</strong> {formatarReaisCentavos(pedidoMinimo)}
              {totalPedidoCentavos > 0 && (
                <>
                  {" "}
                  · <strong>Total atual:</strong>{" "}
                  {formatarReaisCentavos(totalPedidoCentavos)}
                </>
              )}
            </p>
            {typeof limiteCredito === "number" && limiteCredito > 0 && (
              <p className="mt-1">
                <strong>Limite de crédito:</strong>{" "}
                {formatarReaisCentavos(limiteCredito)} (definido pela Zen Pro)
              </p>
            )}
            {lojaRevendedor?.config.comissaoPercentual != null && (
              <p className="mt-1">
                <strong>Comissão:</strong>{" "}
                {lojaRevendedor.config.comissaoPercentual}% por item vendido
              </p>
            )}
            <p className="mt-2 text-xs text-sky-800">
              Prazo de entrega: itens no seu estoque — você define; somente na
              Seven Tech / Zen Pro — prazo maior conforme política da marca (
              {lojaRevendedor?.config.prazoEntregaDiasZenPro ?? "a combinar"}{" "}
              dias úteis).
            </p>
          </div>

          {!mockPagamento && (
            <div className="mb-4 space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-zinc-900">
                Forma de pagamento
              </h3>
              <p className="text-xs text-zinc-500">
                PIX, boleto ou cartão via Mercado Pago. PIX é o padrão e costuma
                ser o mais rápido.
              </p>
              <SeletorFormaPagamentoOnline
                formaPagamento={formaPagamento}
                onFormaChange={setFormaPagamento}
                parcelas={parcelas}
                onParcelasChange={setParcelas}
                totalCentavos={totalPedidoCentavos || pedidoMinimo}
                compact
              />
            </div>
          )}

          {carregando ? (
            <p className="mt-4 text-sm text-zinc-500">Carregando produtos...</p>
          ) : (
            <div className="mt-4 space-y-2">
              {produtos.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">
                      {p.nome}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatarPreco(p.precoBaseCentavos)} / un.
                    </p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={qtd[p.id] ?? ""}
                    onChange={(e) =>
                      setQtd((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    placeholder="0"
                    className="w-20 rounded-lg border border-zinc-300 px-2 py-1.5 text-right text-sm"
                  />
                </div>
              ))}
              {produtos.length === 0 && (
                <p className="text-sm text-zinc-500">
                  Nenhum produto disponível no catálogo.
                </p>
              )}
            </div>
          )}

          <label className="mt-4 block text-sm">
            <span className="text-zinc-600">Observação (opcional)</span>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Ex.: preciso para o fim de semana"
            />
          </label>

          <button
            type="button"
            disabled={enviando}
            onClick={() => void enviarPedido()}
            className="btn-gold mt-4 rounded-xl px-5 py-2.5 text-sm disabled:opacity-50"
          >
            {enviando ? "Enviando..." : mockPagamento ? "Enviar pedido (mock)" : "Enviar e pagar"}
          </button>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {isMarca ? "Pedidos recebidos" : "Meus pedidos de reposição"}
        </h2>

        {carregando ? (
          <p className="text-sm text-zinc-500">Carregando...</p>
        ) : pedidos.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
            Nenhum pedido de reposição ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {pedidos.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900">
                      {isMarca
                        ? p.revendedorEmail ?? p.lojaId
                        : `#${p.id.slice(-6).toUpperCase()}`}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {p.itens.length} itens ·{" "}
                      {formatarPreco(p.totalCentavos)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      ESTILO_STATUS[p.status] ?? "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {rotuloStatusReposicao(p.status)}
                  </span>
                </div>

                <ul className="mt-2 space-y-0.5 text-sm text-zinc-700">
                  {p.itens.map((i) => (
                    <li key={i.produtoId} className="flex justify-between gap-2">
                      <span className="truncate">
                        {i.quantidade}× {i.nome}
                      </span>
                      <span className="shrink-0 tabular-nums text-zinc-500">
                        {formatarPreco(i.precoCentavos * i.quantidade)}
                      </span>
                    </li>
                  ))}
                </ul>

                {p.observacao && (
                  <p className="mt-2 text-sm text-zinc-500">
                    Obs.: {p.observacao}
                  </p>
                )}

                {isMarca && (
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-xs text-zinc-500">Status:</label>
                    <select
                      value={p.status}
                      onChange={(e) =>
                        void mudarStatus(
                          p.id,
                          e.target.value as ReposicaoStatus,
                        )
                      }
                      className="rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                    >
                      {REPOSICAO_STATUS_OPCOES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.rotulo}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {p.envio?.codigoRastreio && (
                  <p className="mt-2 text-sm text-zinc-600">
                    Rastreio:{" "}
                    {p.envio.urlRastreio ? (
                      <a
                        href={p.envio.urlRastreio}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-sky-700 underline"
                      >
                        {p.envio.codigoRastreio}
                      </a>
                    ) : (
                      <strong>{p.envio.codigoRastreio}</strong>
                    )}
                    {p.envio.transportadora ? ` · ${p.envio.transportadora}` : null}
                  </p>
                )}

                {p.notaFiscal?.status === "emitida" && p.notaFiscal.pdfUrl && (
                  <p className="mt-2 text-sm">
                    <a
                      href={p.notaFiscal.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-sky-700 underline"
                    >
                      Baixar nota fiscal
                    </a>
                  </p>
                )}

                {isRevendedor &&
                  (p.status === "aguardando_pagamento" ||
                    p.status === "solicitado") && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!mockPagamento && (
                      <button
                        type="button"
                        disabled={pagandoId === p.id}
                        onClick={() => void irParaPagamentoReposicao(p.id)}
                        className="btn-gold rounded-lg px-3 py-1.5 text-xs disabled:opacity-50"
                      >
                        {pagandoId === p.id
                          ? "Abrindo..."
                          : `Pagar com ${formaPagamento === "pix" ? "PIX" : formaPagamento === "boleto" ? "boleto" : "cartão"}`}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void mudarStatus(p.id, "cancelado")}
                      className="rounded-lg border border-rose-300 px-3 py-1 text-xs text-rose-700 hover:bg-rose-50"
                    >
                      Cancelar pedido
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
