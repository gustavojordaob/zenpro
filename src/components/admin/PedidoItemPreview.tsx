"use client";

import { useState } from "react";
import { CasePreview } from "@/features/personalizacao/CasePreviewLazy";
import { ProdutoImagem } from "@/components/loja/ProdutoImagem";
import type { ItemPedidoLojaFirestore } from "@/features/multitenant/types";
import { formatarPreco } from "@/features/loja/produtosMock";
import { baixarBlob, baixarUrlComoArquivo } from "@/lib/baixarArquivo";
import {
  geoH5PrintDoModelo,
  regenerarArtesItemPedidoAdmin,
} from "@/features/admin/pedidos/regenerarArtesPedido";
import {
  ADMIN_EXPORT_WIDTH,
  exportCaseArtBlob,
  exportH5PrintArtBlob,
} from "@/features/personalizacao/exportCaseArt";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";
import type { TextoCapinha } from "@/features/personalizacao/caseTextFonts";

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
  const [baixandoH5, setBaixandoH5] = useState(false);
  const [baixandoCliente, setBaixandoCliente] = useState(false);
  const [erroGerar, setErroGerar] = useState<string | null>(null);

  const textoCliente = [
    item.titulo?.trim() || null,
    ...((item.textos ?? []).map((t) => t.conteudo?.trim() || null)),
  ].filter((linha): linha is string => Boolean(linha));

  const prefixo =
    item.personalizacaoId?.slice(0, 8) ||
    item.produtoId?.slice(0, 8) ||
    "pedido";

  const modeloId =
    item.modeloId ?? (item.config?.modeloId as string | undefined) ?? "";

  const textosItem = (item.textos as TextoCapinha[] | null) ?? [];
  const geoBase = () =>
    geoH5PrintDoModelo(
      modeloId,
      (item.config as Record<string, unknown> | null) ?? null,
    );

  /** Foto + texto exatamente como o cliente montou (mesmo mock do preview). */
  async function baixarArteCliente() {
    if (!item.fotoUrl || !item.transform) {
      setErroGerar("Item sem foto/transform.");
      return;
    }
    setBaixandoCliente(true);
    setErroGerar(null);
    try {
      const base = geoBase();
      const blob = await exportCaseArtBlob(
        [{ url: item.fotoUrl, transform: item.transform }],
        item.transform,
        textosItem,
        ADMIN_EXPORT_WIDTH,
        {
          ...base,
          // Fundo sólido = sem blur pesado → download bem mais rápido
          corFundo: base.corFundo || "#ececec",
        },
      );
      baixarBlob(blob, `${prefixo}-arte-cliente.png`);
    } catch (e) {
      console.error(e);
      setErroGerar(
        e instanceof Error ? e.message : "Falha ao baixar arte do cliente.",
      );
    } finally {
      setBaixandoCliente(false);
    }
  }

  async function baixarImpressaoH5() {
    if (!item.fotoUrl || !item.transform) {
      setErroGerar("Item sem foto/transform.");
      return;
    }
    setBaixandoH5(true);
    setErroGerar(null);
    try {
      const blob = await exportH5PrintArtBlob(
        [{ url: item.fotoUrl, transform: item.transform }],
        item.transform,
        textosItem,
        undefined,
        geoBase(),
      );
      baixarBlob(blob, `${prefixo}-recorte-h5.png`);
    } catch (e) {
      console.error(e);
      setErroGerar(
        e instanceof Error ? e.message : "Falha ao gerar impressão H5.",
      );
    } finally {
      setBaixandoH5(false);
    }
  }

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
        {/* Preview = mock do cliente; download H5 = guia Rock (laranja + contorno) */}
        {temPersonalizacao ? (
          <div className="overflow-hidden rounded-lg bg-zinc-100 p-1">
            <CasePreview
              fotoUrl={item.fotoUrl!}
              transform={item.transform!}
              textos={item.textos ?? []}
              modeloId={modeloId || undefined}
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
              <strong>Arte do cliente</strong> = foto+texto iguais ao preview.
              <strong> Recorte H5</strong> = guia Rock (laranja + contorno
              vermelho + câmera do molde).
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={baixandoCliente}
                onClick={() => void baixarArteCliente()}
                className="rounded-lg border border-gold/50 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold-dark hover:bg-gold/20 disabled:opacity-60"
              >
                {baixandoCliente
                  ? "Gerando…"
                  : "Baixar arte do cliente (foto + texto)"}
              </button>
              <button
                type="button"
                disabled={baixandoH5}
                onClick={() => void baixarImpressaoH5()}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                {baixandoH5 ? "Gerando H5…" : "Baixar recorte H5"}
              </button>
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
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-60"
                >
                  {gerando ? "Salvando…" : "Salvar H5 no pedido"}
                </button>
              )}
            </div>
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
