"use client";

import Link from "next/link";
import { VerPreviewPersonalizacaoButton } from "@/components/personalizacao/VerPreviewPersonalizacaoButton";
import { CartItemPreview } from "@/components/loja/CartItemPreview";
import { PageBackLink } from "@/components/loja/PageBackLink";
import { QuantityStepper } from "@/components/loja/QuantityStepper";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { useCarrinho } from "@/features/loja/CarrinhoProvider";
import { useLojaEfetiva } from "@/features/loja/useLojaEfetiva";
import { useLojaPaths } from "@/features/loja/useLojaPaths";
import { formatarPreco } from "@/features/loja/produtosMock";
import {
  linhaAtingePedidoMinimo,
  pedidoMinimoRevendedorCentavos,
} from "@/features/revendedor/precoRevendedorFaixas";
import { useBeneficiosCheckoutB2b } from "@/features/revendedor/useBeneficiosCheckoutB2b";
import { rotuloNivelRevendedor } from "@/features/admin/revendedores/niveisRevendedorService";

type Props = {
  mostrarCheckout?: boolean;
};

export function CarrinhoPageContent({ mostrarCheckout = true }: Props) {
  const { itens, totalCentavos, remover, alterarQuantidade } = useCarrinho();
  const paths = useLojaPaths();
  const loja = useLojaEfetiva();
  const isB2b = Boolean(loja?.isB2b);
  const beneficios = useBeneficiosCheckoutB2b(totalCentavos);
  const totalExibir = beneficios?.totalComDesconto ?? totalCentavos;

  const linhasInvalidas = isB2b
    ? itens.filter(
        (item) =>
          !linhaAtingePedidoMinimo(
            {
              precoBaseCentavos: item.precoBaseCentavos ?? item.precoCentavos,
              precoRevendedorCentavos: item.precoRevendedorCentavos,
              faixasPrecoRevendedor: item.faixasPrecoRevendedor,
              pedidoMinimoRevendedorCentavos: item.pedidoMinimoRevendedorCentavos,
            },
            item.quantidade || 1,
          ),
      )
    : [];

  const podeCheckout = linhasInvalidas.length === 0;

  return (
    <div className="min-h-screen bg-zinc-50">
      <StoreHeader />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8">
        <PageBackLink href={paths.home} />

        <h1 className="mt-4 text-2xl font-bold text-zinc-900 sm:text-3xl">
          {isB2b ? "Carrinho do revendedor" : "Carrinho"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          {itens.length === 0
            ? "Nenhum item ainda."
            : `${itens.length} ${itens.length === 1 ? "linha" : "linhas"}`}
        </p>

        {itens.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-10 text-center">
            <p className="text-zinc-600">Seu carrinho está vazio.</p>
            <Link
              href={paths.produtosHash}
              className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Ver produtos
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-8 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white shadow-sm">
              {itens.map((item) => {
                const qty = item.quantidade || 1;
                const min = pedidoMinimoRevendedorCentavos({
                  precoBaseCentavos: item.precoBaseCentavos ?? item.precoCentavos,
                  pedidoMinimoRevendedorCentavos: item.pedidoMinimoRevendedorCentavos,
                });
                const okMin = !isB2b || linhaAtingePedidoMinimo(
                  {
                    precoBaseCentavos: item.precoBaseCentavos ?? item.precoCentavos,
                    precoRevendedorCentavos: item.precoRevendedorCentavos,
                    faixasPrecoRevendedor: item.faixasPrecoRevendedor,
                    pedidoMinimoRevendedorCentavos: item.pedidoMinimoRevendedorCentavos,
                  },
                  qty,
                );
                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6"
                  >
                    <CartItemPreview item={item} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-900">
                        {item.nomeProduto}
                      </p>
                      <p className="text-sm text-zinc-600">{item.rotuloModelo}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.tipo === "personalizada"
                          ? "Com sua foto"
                          : "Produto pronto"}
                      </p>
                      {item.personalizacao?.descricao && (
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                          {item.personalizacao.descricao}
                        </p>
                      )}
                      <VerPreviewPersonalizacaoButton item={item} />
                      <QuantityStepper
                        className="mt-2"
                        value={qty}
                        onChange={(n) => alterarQuantidade(item.id, n)}
                      />
                      <p className="mt-2 font-semibold text-zinc-900">
                        {formatarPreco(item.precoCentavos)}
                        {qty > 1 ? (
                          <span className="text-sm font-normal text-zinc-500">
                            {" "}
                            × {qty} = {formatarPreco(item.precoCentavos * qty)}
                          </span>
                        ) : null}
                      </p>
                      {isB2b && min > 0 && !okMin && (
                        <p className="mt-1 text-xs text-amber-700">
                          Pedido mínimo deste produto: {formatarPreco(min)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => remover(item.id)}
                      className="self-start text-sm font-medium text-red-600 hover:text-red-700 sm:self-center"
                    >
                      Remover
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex flex-col items-stretch gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                {beneficios && beneficios.descontoCentavos > 0 && (
                  <p className="text-sm text-emerald-700">
                    Nível {rotuloNivelRevendedor(beneficios.metricas.nivel)} −
                    {beneficios.descontoPercentual}% (
                    {formatarPreco(beneficios.descontoCentavos)})
                  </p>
                )}
                {beneficios?.freteGratis && (
                  <p className="text-sm text-emerald-700">Frete grátis no nível</p>
                )}
                {beneficios && beneficios.textos.length > 0 && (
                  <ul className="mt-1 list-inside list-disc text-xs text-zinc-600">
                    {beneficios.textos.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                )}
                <p className="text-lg font-semibold text-zinc-900">
                  Total:{" "}
                  <span className="tabular-nums">
                    {formatarPreco(totalExibir)}
                  </span>
                  {beneficios && beneficios.descontoCentavos > 0 && (
                    <span className="ml-2 text-sm font-normal text-zinc-400 line-through">
                      {formatarPreco(totalCentavos)}
                    </span>
                  )}
                </p>
              </div>
              {mostrarCheckout ? (
                podeCheckout ? (
                  <Link
                    href={paths.checkout}
                    className="btn-gold rounded-xl px-6 py-3 text-center text-sm"
                  >
                    Finalizar compra
                  </Link>
                ) : (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
                    Ajuste as quantidades para atingir o pedido mínimo de cada
                    produto.
                  </p>
                )
              ) : (
                <p className="rounded-xl bg-zinc-100 px-4 py-3 text-center text-sm text-zinc-600">
                  Checkout disponível em breve nesta loja
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
