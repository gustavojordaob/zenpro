"use client";

import {
  FORMAS_PAGAMENTO_ONLINE,
  PARCELAMENTO_MAXIMO,
  rotuloParcelaCheckout,
} from "@/features/pagamentos/pagamentoConfig";
import type { PedidoLojaFormaPagamentoOnline } from "@/features/multitenant/types";

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
}: Props) {
  const formas = FORMAS_PAGAMENTO_ONLINE.filter(
    (f) => !formasPermitidas || formasPermitidas.includes(f.id),
  );
  const max = Math.min(PARCELAMENTO_MAXIMO, Math.max(1, maxParcelas));

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
        {formas.map((forma) => (
          <button
            key={forma.id}
            type="button"
            onClick={() => onFormaChange(forma.id)}
            className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
              formaPagamento === forma.id
                ? "border-gold bg-amber-50 ring-1 ring-gold"
                : "border-zinc-200 hover:border-zinc-300"
            }`}
          >
            <span className="font-semibold text-zinc-900">{forma.rotulo}</span>
            <span className="mt-1 block text-xs text-zinc-500">
              {forma.id === "cartao"
                ? `Até ${max}x — à vista sem juros`
                : forma.descricao}
            </span>
          </button>
        ))}
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
        <p className="text-xs text-zinc-500">
          Após gerar o PIX, o pagamento costuma confirmar em segundos.
        </p>
      )}
    </div>
  );
}
