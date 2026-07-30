"use client";

import {
  FORMAS_PAGAMENTO_ONLINE,
  PARCELAMENTO_MAXIMO,
  rotuloParcelaCheckout,
} from "@/features/pagamentos/pagamentoConfig";
import type { PedidoLojaFormaPagamentoOnline } from "@/features/multitenant/types";
import { formatarPreco } from "@/features/loja/produtosMock";

type Props = {
  formaPagamento: PedidoLojaFormaPagamentoOnline;
  onFormaChange: (forma: PedidoLojaFormaPagamentoOnline) => void;
  parcelas: number;
  onParcelasChange: (parcelas: number) => void;
  totalCentavos: number;
  compact?: boolean;
  /** Se omitido, mostra todas as formas. */
  formasPermitidas?: PedidoLojaFormaPagamentoOnline[];
  maxParcelas?: number;
  /** % de desconto no PIX (0 = sem desconto). */
  descontoPixPercentual?: number;
  /** Valor do desconto em centavos (só exibição). */
  descontoPixCentavosValor?: number;
};

export function SeletorFormaPagamentoOnline({
  formaPagamento,
  onFormaChange,
  parcelas,
  onParcelasChange,
  totalCentavos,
  compact = false,
  formasPermitidas,
  maxParcelas = PARCELAMENTO_MAXIMO,
  descontoPixPercentual = 0,
  descontoPixCentavosValor = 0,
}: Props) {
  const formas = FORMAS_PAGAMENTO_ONLINE.filter(
    (f) => !formasPermitidas || formasPermitidas.includes(f.id),
  );
  const max = Math.min(PARCELAMENTO_MAXIMO, Math.max(1, maxParcelas));
  const temDescontoPix = descontoPixPercentual > 0;

  return (
    <div className="space-y-3">
      <div
        className={
          compact
            ? "grid gap-2"
            : formas.length >= 3
              ? "grid gap-2 sm:grid-cols-3"
              : "grid gap-2 sm:grid-cols-2"
        }
      >
        {formas.map((forma) => {
          const ativo = formaPagamento === forma.id;
          let descricao = forma.descricao;
          if (forma.id === "cartao") {
            descricao = `Até ${max}x — à vista sem juros`;
          } else if (forma.id === "pix" && temDescontoPix) {
            descricao = `${descontoPixPercentual}% de desconto`;
          }
          return (
            <button
              key={forma.id}
              type="button"
              onClick={() => onFormaChange(forma.id)}
              className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                ativo
                  ? "border-gold bg-amber-50 ring-1 ring-gold"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <span className="font-semibold text-zinc-900">{forma.rotulo}</span>
              <span
                className={`mt-1 block text-xs ${
                  forma.id === "pix" && temDescontoPix
                    ? "font-medium text-gold-dark"
                    : "text-zinc-500"
                }`}
              >
                {descricao}
              </span>
            </button>
          );
        })}
      </div>

      {formas.length === 0 && (
        <p className="text-sm text-amber-800">
          Nenhum meio de pagamento disponível para os itens do carrinho.
        </p>
      )}

      {formaPagamento === "cartao" && formas.some((f) => f.id === "cartao") && (
        <label className="block space-y-1.5">
          <span className="text-sm text-zinc-600">Parcelas</span>
          <select
            value={Math.min(parcelas, max)}
            onChange={(e) => onParcelasChange(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm"
          >
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {rotuloParcelaCheckout(totalCentavos, n)}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500">
            * A partir de 2x: juros calculados no Mercado Pago.
          </p>
          <p className="text-xs text-amber-900">
            No Mercado Pago a 1ª tela mostra só “Cartão”. Depois de escolher o
            cartão, as parcelas vão até {Math.min(parcelas, max)}x (já
            pré-selecionado).
          </p>
          <p className="text-xs text-amber-800">
            Se o cartão não for aceito, escolha PIX — costuma ser o mais rápido.
          </p>
        </label>
      )}

      {formaPagamento === "boleto" && (
        <p className="text-xs text-zinc-500">
          O envio só é liberado após a compensação do boleto.
        </p>
      )}

      {formaPagamento === "pix" && (
        <div className="space-y-1">
          {temDescontoPix && descontoPixCentavosValor > 0 ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Desconto de {descontoPixPercentual}% no PIX: −
              {formatarPreco(descontoPixCentavosValor)}. O valor cobrado no PIX
              já inclui esse desconto.
            </p>
          ) : null}
          <p className="text-xs text-zinc-500">
            Após gerar o PIX, o pagamento costuma confirmar em segundos.
          </p>
        </div>
      )}
    </div>
  );
}
