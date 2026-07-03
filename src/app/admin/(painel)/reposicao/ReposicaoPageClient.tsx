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
import { formatarPreco } from "@/features/loja/produtosMock";

const ESTILO_STATUS: Record<ReposicaoStatus, string> = {
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

  const carregar = useCallback(async () => {
    if (!papel) return;
    setCarregando(true);
    setErro(null);
    try {
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
  }, [papel, isMarca, isRevendedor, uid]);

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
      await criarPedidoReposicao({
        lojaId,
        lojaNome: lojaId,
        revendedorUid: uid,
        revendedorEmail: user?.email ?? null,
        itens,
        observacao,
      });
      setQtd({});
      setObservacao("");
      setOk("Pedido de reposição enviado ao dono da Zen Pro.");
      await carregar();
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível enviar o pedido.",
      );
    } finally {
      setEnviando(false);
    }
  }

  async function mudarStatus(id: string, status: ReposicaoStatus) {
    try {
      await atualizarStatusReposicao(id, status);
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
          <h2 className="text-lg font-semibold text-zinc-900">
            Novo pedido de reposição
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Escolha as quantidades de cada produto do catálogo Zen Pro.
          </p>

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
            {enviando ? "Enviando..." : "Enviar pedido de reposição"}
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

                {isRevendedor && p.status === "solicitado" && (
                  <button
                    type="button"
                    onClick={() => void mudarStatus(p.id, "cancelado")}
                    className="mt-3 rounded-lg border border-rose-300 px-3 py-1 text-xs text-rose-700 hover:bg-rose-50"
                  >
                    Cancelar pedido
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
