"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PedidoItemPreview } from "@/components/admin/PedidoItemPreview";
import { PedidoStatusBadge } from "@/components/admin/PedidoStatusBadge";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";
import {
  formatarDataPedido,
  numeroPedidoCurto,
  PEDIDO_STATUS_OPCOES,
  rotuloFormaPagamentoPresencial,
  rotuloOrigemPedido,
} from "@/features/admin/pedidos/pedidoAdminUtils";
import {
  atualizarStatusPedidoAdmin,
  atualizarEnvioPedidoAdmin,
  atualizarNotaFiscalPedidoAdmin,
  obterPedidoAdmin,
  observarPedidoAdmin,
  reemitirNotaFiscalPedidoAdmin,
  sincronizarNotaFiscalPedidoAdmin,
  type PedidoAdmin,
} from "@/features/admin/pedidos/pedidoAdminService";
import { formatarPreco } from "@/features/loja/produtosMock";
import type {
  NotaFiscalFirestore,
  PedidoEnvioFirestore,
  PedidoLojaStatus,
} from "@/features/multitenant/types";

type Props = {
  lojaId: string;
  pedidoId: string;
};

export function PedidoDetalhePageClient({ lojaId, pedidoId }: Props) {
  const router = useRouter();
  const { isMarca, lojaId: lojaRevendedor } = useAuthAdmin();
  const [pedido, setPedido] = useState<PedidoAdmin | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [transportadora, setTransportadora] = useState("");
  const [codigoRastreio, setCodigoRastreio] = useState("");
  const [urlRastreio, setUrlRastreio] = useState("");
  const [salvandoEnvio, setSalvandoEnvio] = useState(false);
  const [nfNumero, setNfNumero] = useState("");
  const [nfChave, setNfChave] = useState("");
  const [nfPdfUrl, setNfPdfUrl] = useState("");
  const [salvandoNf, setSalvandoNf] = useState(false);
  const [reemitindoNf, setReemitindoNf] = useState(false);
  const [consultandoNf, setConsultandoNf] = useState(false);

  const nfAguardandoSefaz =
    pedido?.notaFiscal?.status === "processando" ||
    (pedido?.notaFiscal?.status === "erro" &&
      /timeout|processamento|sefaz/i.test(pedido.notaFiscal.erro ?? ""));

  function sincronizarNotaFiscalUi(data: PedidoAdmin) {
    setPedido(data);
    setNfNumero(data.notaFiscal?.numero ?? "");
    setNfChave(data.notaFiscal?.chaveAcesso ?? "");
    setNfPdfUrl(data.notaFiscal?.pdfUrl ?? "");
  }

  useEffect(() => {
    if (!isMarca && lojaRevendedor && lojaId !== lojaRevendedor) {
      router.replace("/admin/pedidos");
    }
  }, [isMarca, lojaRevendedor, lojaId, router]);

  useEffect(() => {
    void (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const data = await obterPedidoAdmin(lojaId, pedidoId);
        if (!data) {
          setErro("Pedido não encontrado.");
          return;
        }
        setPedido(data);
        setTransportadora(data.envio?.transportadora ?? "");
        setCodigoRastreio(data.envio?.codigoRastreio ?? "");
        setUrlRastreio(data.envio?.urlRastreio ?? "");
        setNfNumero(data.notaFiscal?.numero ?? "");
        setNfChave(data.notaFiscal?.chaveAcesso ?? "");
        setNfPdfUrl(data.notaFiscal?.pdfUrl ?? "");
      } catch (error) {
        setErro(
          error instanceof Error ? error.message : "Erro ao carregar pedido.",
        );
      } finally {
        setCarregando(false);
      }
    })();
  }, [lojaId, pedidoId]);

  async function handleStatusChange(novoStatus: PedidoLojaStatus) {
    if (!pedido) return;
    setSalvandoStatus(true);
    setErro(null);
    try {
      await atualizarStatusPedidoAdmin(lojaId, pedidoId, novoStatus, pedido);
      setPedido({ ...pedido, status: novoStatus });
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao atualizar status.",
      );
    } finally {
      setSalvandoStatus(false);
    }
  }

  async function salvarEnvio() {
    if (!pedido) return;
    setSalvandoEnvio(true);
    setErro(null);
    const envio: PedidoEnvioFirestore = {
      transportadora: transportadora.trim() || null,
      codigoRastreio: codigoRastreio.trim() || null,
      urlRastreio: urlRastreio.trim() || null,
    };
    try {
      await atualizarEnvioPedidoAdmin(lojaId, pedidoId, envio);
      setPedido({ ...pedido, envio });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar envio.");
    } finally {
      setSalvandoEnvio(false);
    }
  }

  async function handleSincronizarNotaFiscal() {
    if (!pedido) return;
    setConsultandoNf(true);
    setErro(null);
    try {
      const resultado = await sincronizarNotaFiscalPedidoAdmin(lojaId, pedidoId);
      const atualizado = await obterPedidoAdmin(lojaId, pedidoId);
      if (atualizado) {
        sincronizarNotaFiscalUi(atualizado);
      }
      if (resultado.status === "erro" && resultado.erro) {
        setErro(resultado.erro);
      }
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível consultar a nota fiscal.",
      );
    } finally {
      setConsultandoNf(false);
    }
  }

  async function handleReemitirNotaFiscal() {
    if (!pedido) return;
    setReemitindoNf(true);
    setErro(null);
    try {
      await reemitirNotaFiscalPedidoAdmin(lojaId, pedidoId);

      await new Promise<void>((resolve) => {
        let unsub: (() => void) | null = null;
        const timeout = window.setTimeout(() => {
          unsub?.();
          resolve();
        }, 120_000);

        unsub = observarPedidoAdmin(lojaId, pedidoId, (atualizado) => {
          if (!atualizado) return;
          sincronizarNotaFiscalUi(atualizado);
          const status = atualizado.notaFiscal?.status;
          if (status === "emitida" || status === "erro" || status === "processando") {
            if (status !== "processando") {
              window.clearTimeout(timeout);
              unsub?.();
              resolve();
            }
          }
        });
      });
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível reemitir a nota fiscal.",
      );
    } finally {
      setReemitindoNf(false);
    }
  }

  async function salvarNotaFiscal() {
    if (!pedido) return;
    setSalvandoNf(true);
    setErro(null);
    const notaFiscal: NotaFiscalFirestore = {
      status: nfPdfUrl.trim() || nfChave.trim() ? "emitida" : "pendente",
      numero: nfNumero.trim() || null,
      chaveAcesso: nfChave.trim() || null,
      pdfUrl: nfPdfUrl.trim() || null,
      provedor: "manual",
    };
    try {
      await atualizarNotaFiscalPedidoAdmin(lojaId, pedidoId, notaFiscal);
      setPedido({ ...pedido, notaFiscal });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar NF.");
    } finally {
      setSalvandoNf(false);
    }
  }

  if (carregando) {
    return (
      <AdminShell titulo="Pedido">
        <p className="text-sm text-zinc-500">Carregando...</p>
      </AdminShell>
    );
  }

  if (!pedido) {
    return (
      <AdminShell titulo="Pedido">
        <p className="text-sm text-red-600">{erro ?? "Pedido não encontrado."}</p>
        <Link href="/admin/pedidos" className="mt-4 inline-block text-sm underline">
          Voltar aos pedidos
        </Link>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      titulo={`Pedido ${numeroPedidoCurto(pedido.id)}`}
      subtitulo={`Loja ${pedido.lojaId} · ${formatarDataPedido(pedido.criadoEm, pedido.atualizadoEm)}`}
    >
      <div className="mb-6">
        <Link
          href="/admin/pedidos"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          ← Voltar aos pedidos
        </Link>
      </div>

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">Itens</h2>
          {pedido.itens.map((item, index) => (
            <PedidoItemPreview key={`${item.produtoId}-${index}`} item={item} />
          ))}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-zinc-900">Resumo</h2>
            <p className="mt-3 text-2xl font-bold text-zinc-900">
              {formatarPreco(pedido.totalCentavos)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PedidoStatusBadge status={pedido.status} />
              {pedido.filaProducaoMarca && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                  {rotuloOrigemPedido(pedido.origem, {
                    filaProducaoMarca: true,
                    origemLojaNome: pedido.origemLojaNome,
                  })}
                </span>
              )}
              {pedido.origem === "presencial" && (
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-900">
                  {rotuloOrigemPedido(pedido.origem)}
                </span>
              )}
            </div>
            {pedido.filaProducaoMarca && pedido.origemPedidoId && (
              <p className="mt-2 text-sm text-zinc-600">
                Pedido revendedor:{" "}
                <strong>{numeroPedidoCurto(pedido.origemPedidoId)}</strong>
                {pedido.origemLojaId ? ` · loja ${pedido.origemLojaId}` : null}
              </p>
            )}
            {pedido.origem === "presencial" && (
              <p className="mt-2 text-sm text-zinc-600">
                Pagamento:{" "}
                <strong>
                  {rotuloFormaPagamentoPresencial(pedido.pagamento.forma)}
                </strong>
              </p>
            )}
            {pedido.origem === "online" && pedido.pagamento.provider && (
              <p className="mt-2 text-sm text-zinc-600">
                Pagamento:{" "}
                <strong>
                  {pedido.pagamento.formaOnline ?? pedido.pagamento.metodoMp ?? pedido.pagamento.provider}
                </strong>
                {pedido.pagamento.status ? ` · ${pedido.pagamento.status}` : null}
                {pedido.pagamento.parcelas && pedido.pagamento.parcelas > 1
                  ? ` · ${pedido.pagamento.parcelas}x`
                  : null}
              </p>
            )}
            {!pedido.pagamentoLiberadoEnvio &&
              pedido.origem === "online" &&
              pedido.pagamento.provider === "mercadopago" && (
                <p className="mt-2 text-xs text-amber-800">
                  Envio bloqueado até confirmação do pagamento (boleto/PIX/cartão).
                </p>
              )}
            {pedido.observacao && (
              <p className="mt-2 text-sm text-zinc-600">
                Obs.: {pedido.observacao}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-zinc-900">Cliente</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-zinc-500">Nome</dt>
                <dd className="font-medium text-zinc-900">
                  {pedido.cliente.nome || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Contato</dt>
                <dd className="text-zinc-800">{pedido.cliente.contato || "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Endereço</dt>
                <dd className="text-zinc-800">{pedido.cliente.endereco || "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-zinc-900">Status</h2>
            <label className="mt-3 block space-y-1.5">
              <span className="text-sm text-zinc-600">Alterar status</span>
              <select
                value={pedido.status}
                disabled={salvandoStatus}
                onChange={(e) =>
                  void handleStatusChange(e.target.value as PedidoLojaStatus)
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50"
              >
                {PEDIDO_STATUS_OPCOES.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-zinc-900">Rastreio</h2>
            <div className="mt-3 space-y-2">
              <input
                value={transportadora}
                onChange={(e) => setTransportadora(e.target.value)}
                placeholder="Transportadora"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                value={codigoRastreio}
                onChange={(e) => setCodigoRastreio(e.target.value)}
                placeholder="Código de rastreio"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                value={urlRastreio}
                onChange={(e) => setUrlRastreio(e.target.value)}
                placeholder="URL de rastreio (opcional)"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={salvandoEnvio}
                onClick={() => void salvarEnvio()}
                className="w-full rounded-lg border border-zinc-300 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
              >
                {salvandoEnvio ? "Salvando..." : "Salvar rastreio"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-zinc-900">Nota fiscal</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Status: {pedido.notaFiscal?.status ?? "pendente"}
              {reemitindoNf && pedido.notaFiscal?.status === "pendente"
                ? " — processando emissão…"
                : null}
            </p>
            {pedido.notaFiscal?.status === "erro" && pedido.notaFiscal.erro ? (
              <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {pedido.notaFiscal.erro}
              </p>
            ) : null}
            {pedido.notaFiscal?.status === "processando" ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Nota enviada à Sefaz. A autorização pode levar alguns minutos.
              </p>
            ) : null}
            {nfAguardandoSefaz ? (
              <button
                type="button"
                disabled={consultandoNf || reemitindoNf || salvandoNf}
                onClick={() => void handleSincronizarNotaFiscal()}
                className="mt-3 w-full rounded-lg border border-sky-300 bg-sky-50 py-2 text-sm font-medium text-sky-900 hover:bg-sky-100 disabled:opacity-50"
              >
                {consultandoNf ? "Consultando Sefaz…" : "Consultar status na Sefaz"}
              </button>
            ) : null}
            {pedido.notaFiscal?.status === "erro" ? (
              <button
                type="button"
                disabled={reemitindoNf || salvandoNf}
                onClick={() => void handleReemitirNotaFiscal()}
                className="mt-3 w-full rounded-lg border border-amber-300 bg-amber-50 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
              >
                {reemitindoNf
                  ? "Gerando nota novamente…"
                  : "Gerar nota novamente"}
              </button>
            ) : null}
            <div className="mt-3 space-y-2">
              <input
                value={nfNumero}
                onChange={(e) => setNfNumero(e.target.value)}
                placeholder="Número NF"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                value={nfChave}
                onChange={(e) => setNfChave(e.target.value)}
                placeholder="Chave de acesso (44 dígitos)"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                value={nfPdfUrl}
                onChange={(e) => setNfPdfUrl(e.target.value)}
                placeholder="URL do PDF/DANFE"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              {pedido.notaFiscal?.pdfUrl && (
                <a
                  href={pedido.notaFiscal.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-sm font-medium text-sky-700 underline"
                >
                  Abrir nota emitida
                </a>
              )}
              <button
                type="button"
                disabled={salvandoNf}
                onClick={() => void salvarNotaFiscal()}
                className="w-full rounded-lg border border-zinc-300 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
              >
                {salvandoNf ? "Salvando..." : "Salvar nota fiscal"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
