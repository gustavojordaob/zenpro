import { CasePreview } from "@/features/personalizacao/CasePreviewLazy";
import { ProdutoImagem } from "@/components/loja/ProdutoImagem";
import type { ItemPedidoLojaFirestore } from "@/features/multitenant/types";
import { formatarPreco } from "@/features/loja/produtosMock";

type Props = {
  item: ItemPedidoLojaFirestore;
};

export function PedidoItemPreview({ item }: Props) {
  const temPersonalizacao =
    Boolean(item.fotoUrl) && item.transform !== null && item.transform !== undefined;

  const textoCliente = [
    item.titulo?.trim() || null,
    ...((item.textos ?? []).map((t) => t.conteudo?.trim() || null)),
  ].filter((linha): linha is string => Boolean(linha));

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-start">
      <div className="shrink-0">
        {temPersonalizacao ? (
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
            previewWidth={160}
          />
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
            <div className="mt-1.5 flex flex-wrap gap-2">
              {item.arteProducaoUrl && (
                <ArteLink href={item.arteProducaoUrl} rotulo="Arte final (foto + texto)" />
              )}
              {item.arteFotoUrl && (
                <ArteLink href={item.arteFotoUrl} rotulo="Só a foto" />
              )}
              {item.arteTextoUrl && (
                <ArteLink href={item.arteTextoUrl} rotulo="Só o texto" />
              )}
              {item.fotoUrl && (
                <ArteLink href={item.fotoUrl} rotulo="Foto original" variante="neutro" />
              )}
            </div>
            {!item.arteProducaoUrl && !item.arteFotoUrl && (
              <p className="mt-1 text-xs text-amber-700">
                Artes ainda não geradas para este item.
              </p>
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

function ArteLink({
  href,
  rotulo,
  variante = "gold",
}: {
  href: string;
  rotulo: string;
  variante?: "gold" | "neutro";
}) {
  const classe =
    variante === "gold"
      ? "border-gold/50 bg-gold/10 text-gold-dark hover:bg-gold/20"
      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      download
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${classe}`}
    >
      ↓ {rotulo}
    </a>
  );
}
