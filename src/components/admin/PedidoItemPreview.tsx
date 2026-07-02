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

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-start">
      <div className="shrink-0">
        {temPersonalizacao ? (
          <CasePreview
            fotoUrl={item.fotoUrl!}
            transform={item.transform!}
            textos={item.textos ?? []}
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
        {item.personalizacaoId && (
          <p className="mt-2 text-xs text-zinc-500">
            personalizacaoId: {item.personalizacaoId}
          </p>
        )}
        {item.titulo && (
          <p className="mt-2 text-zinc-700">
            <span className="font-medium">Título:</span> {item.titulo}
          </p>
        )}
        {item.descricao && (
          <p className="mt-1 text-zinc-600">{item.descricao}</p>
        )}
      </div>
    </div>
  );
}
