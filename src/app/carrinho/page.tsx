"use client";

import Link from "next/link";
import { VerPreviewPersonalizacaoButton } from "@/components/personalizacao/VerPreviewPersonalizacaoButton";
import { CartItemPreview } from "@/components/loja/CartItemPreview";
import { PageBackLink } from "@/components/loja/PageBackLink";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { useCarrinho } from "@/features/loja/CarrinhoProvider";
import { formatarPreco } from "@/features/loja/produtosMock";

export default function CarrinhoPage() {
  const { itens, totalCentavos, remover } = useCarrinho();

  return (
    <div className="min-h-screen bg-zinc-50">
      <StoreHeader />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8">
        <PageBackLink href="/" />

        <h1 className="mt-4 text-2xl font-bold text-zinc-900 sm:text-3xl">
          Carrinho
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          {itens.length === 0
            ? "Nenhum item ainda."
            : `${itens.length} ${itens.length === 1 ? "item" : "itens"}`}
        </p>

        {itens.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-10 text-center">
            <p className="text-zinc-600">Seu carrinho está vazio.</p>
            <Link
              href="/#produtos"
              className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Ver produtos
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-8 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white shadow-sm">
              {itens.map((item) => (
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
                    <p className="mt-2 font-semibold text-zinc-900">
                      {formatarPreco(item.precoCentavos)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remover(item.id)}
                    className="self-start text-sm font-medium text-red-600 hover:text-red-700 sm:self-center"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col items-stretch gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg font-semibold text-zinc-900">
                Total:{" "}
                <span className="tabular-nums">
                  {formatarPreco(totalCentavos)}
                </span>
              </p>
              <Link
                href="/checkout"
                className="rounded-xl bg-emerald-600 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Finalizar compra
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
