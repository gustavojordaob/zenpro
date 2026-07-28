"use client";

import { useState } from "react";
import { CasePreview } from "@/features/personalizacao/CasePreviewLazy";
import { ProdutoImagem } from "@/components/loja/ProdutoImagem";
import type { ItemPedidoLojaFirestore } from "@/features/multitenant/types";
import { formatarPreco } from "@/features/loja/produtosMock";
import { baixarUrlComoArquivo } from "@/lib/baixarArquivo";
import { regenerarArtesItemPedidoAdmin } from "@/features/admin/pedidos/regenerarArtesPedido";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";

type Props = {
  item: ItemPedidoLojaFirestore;
  lojaId?: string;
  pedidoId?: string;
  itemIndex?: number;
  userIdCliente?: string | null;
  onArtesAtualizadas?: () => void;
};

export function PedidoItemPreview({
  item,
  lojaId,
  pedidoId,
  itemIndex,
  userIdCliente,
  onArtesAtualizadas,
}: Props) {
  const { user } = useAuthAdmin();
  const temPersonalizacao =
    Boolean(item.fotoUrl) &&
    item.transform !== null &&
    item.transform !== undefined;

  const [gerando, setGerando] = useState(false);
  const [erroGerar, setErroGerar] = useState<string | null>(null);

  const textoCliente = [
    item.titulo?.trim() || null,
    ...((item.textos ?? []).map((t) => t.conteudo?.trim() || null)),
  ].filter((linha): linha is string => Boolean(linha));

  const prefixo =
    item.personalizacaoId?.slice(0, 8) ||
    item.produtoId?.slice(0, 8) ||
    "pedido";

  async function gerarArtes() {
    if (
      lojaId == null ||
      pedidoId == null ||
      itemIndex == null ||
      (!userIdCliente && !user?.uid)
    ) {
      setErroGerar("Dados insuficientes para gerar a arte.");
      return;
    }
    setGerando(true);
    setErroGerar(null);
    try {
      await regenerarArtesItemPedidoAdmin(
        lojaId,
        pedidoId,
        itemIndex,
        userIdCliente || user!.uid,
      );
      onArtesAtualizadas?.();
    } catch (e) {
      console.error(e);
      setErroGerar(
        e instanceof Error ? e.message : "Falha ao gerar arte de produção.",
      );
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-start">
      <div className="shrink-0">
        {/* Mesmo mock do cliente — dono baixa o H5 à parte */}
        {temPersonalizacao ? (
          <div className="overflow-hidden rounded-lg bg-zinc-100 p-1">
            <CasePreview
              fotoUrl={item.fotoUrl!}
              transform={item.transform!}
              textos={item.textos ?? []}
              modeloId={
                item.modeloId ??
                (item.config?.modeloId as string | undefined)
              }
              larguraPx={item.config?.larguraPx as number | undefined}
              alturaPx={item.config?.alturaPx as number | undefined}
              previewWidth={140}
            />
          </div>
        ) : item.imagemUrl ? (
          <div className="relative h-40 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <ProdutoImagem src={item.imagemUrl} alt={item.nomeProduto ?? ""} />
          </div>
        ) : (
          <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white text-xs text-zinc-500">
            Sem preview
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-zinc-900">
          {item.nomeProduto ?? item.produtoId}
        </p>
        <p className="mt-1 text-zinc-600">Modelo: {item.modeloId}</p>
        <p className="text-zinc-600">
          Qtd: {item.quantidade} · {formatarPreco(item.precoCentavos)}
        </p>

        {textoCliente.length > 0 && (
          <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
              Texto do cliente
            </p>
            {textoCliente.map((linha, i) => (
              <p key={i} className="text-zinc-800">
                {linha}
              </p>
            ))}
          </div>
        )}

        {temPersonalizacao && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Arquivos para produção
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Preview = mock do cliente · Impressão H5 = silhueta + câmera do
              molde (borda H5). Pedidos antigos: use Regenerar arte H5.
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {item.arteProducaoUrl && (
                <ArteDownloadButton
                  href={item.arteProducaoUrl}
                  rotulo="Baixar impressão H5"
                  nomeArquivo={`${prefixo}-impressao-h5`}
                />
              )}
              {item.arteFotoUrl && (
                <ArteDownloadButton
                  href={item.arteFotoUrl}
                  rotulo="Só a foto (retângulo)"
                  nomeArquivo={`${prefixo}-so-foto`}
                  variante="neutro"
                />
              )}
              {item.arteTextoUrl && (
                <ArteDownloadButton
                  href={item.arteTextoUrl}
                  rotulo="Só o texto"
                  nomeArquivo={`${prefixo}-so-texto`}
                  variante="neutro"
                />
              )}
              {item.fotoUrl && (
                <ArteDownloadButton
                  href={item.fotoUrl}
                  rotulo="Foto original"
                  nomeArquivo={`${prefixo}-foto-original`}
                  variante="neutro"
                />
              )}
              {lojaId && pedidoId != null && itemIndex != null && (
                  <button
                    type="button"
                    onClick={() => void gerarArtes()}
                    disabled={gerando}
                    className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                  >
                    {gerando
                      ? "Gerando arte…"
                      : item.arteProducaoUrl
                        ? "Regenerar arte H5"
                        : "Gerar arte H5"}
                  </button>
                )}
            </div>
            {!item.arteProducaoUrl && (
              <p className="mt-1 text-xs text-amber-700">
                Arte H5 ainda não gerada — use o botão acima.
              </p>
            )}
            {erroGerar && (
              <p className="mt-1 text-xs text-red-600">{erroGerar}</p>
            )}
          </div>
        )}

        {item.personalizacaoId && (
          <p className="mt-2 text-xs text-zinc-400">
            personalizacaoId: {item.personalizacaoId}
          </p>
        )}
        {item.descricao && (
          <p className="mt-2 text-zinc-600">
            <span className="font-medium">Obs.:</span> {item.descricao}
          </p>
        )}
      </div>
    </div>
  );
}

function ArteDownloadButton({
  href,
  rotulo,
  nomeArquivo,
  variante = "gold",
}: {
  href: string;
  rotulo: string;
  nomeArquivo: string;
  variante?: "gold" | "neutro";
}) {
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const classe =
    variante === "gold"
      ? "border-gold/50 bg-gold/10 text-gold-dark hover:bg-gold/20"
      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50";

  return (
    <div className="inline-flex flex-col gap-0.5">
      <button
        type="button"
        disabled={baixando}
        onClick={() => {
          setErro(null);
          setBaixando(true);
          void baixarUrlComoArquivo(href, nomeArquivo)
            .catch((e) =>
              setErro(e instanceof Error ? e.message : "Falha no download"),
            )
            .finally(() => setBaixando(false));
        }}
        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${classe}`}
      >
        {baixando ? "Baixando…" : rotulo}
      </button>
      {erro && <span className="text-[10px] text-red-600">{erro}</span>}
    </div>
  );
}
