"use client";

import {
  FORMAS_PAGAMENTO_ONLINE,
  PARCELAMENTO_MAXIMO,
  PARCELAMENTO_SEM_JUROS,
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
};

export function SeletorFormaPagamentoOnline({
  formaPagamento,
  onFormaChange,
  parcelas,
  onParcelasChange,
  totalCentavos,
  compact = false,
}: Props) {
  return (
    <div className="space-y-3">
      <div
        className={
          compact
            ? "grid gap-2"
            : "grid gap-2 sm:grid-cols-3"
        }
      >
        {FORMAS_PAGAMENTO_ONLINE.map((forma) => (
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
              {forma.descricao}
            </span>
          </button>
        ))}
      </div>

      {formaPagamento === "cartao" && (
        <label className="block space-y-1.5">
          <span className="text-sm text-zinc-600">Parcelas</span>
          <select
            value={parcelas}
            onChange={(e) => onParcelasChange(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm"
          >
            {Array.from({ length: PARCELAMENTO_MAXIMO }, (_, i) => i + 1).map(
              (n) => (
                <option key={n} value={n}>
                  {rotuloParcelaCheckout(totalCentavos, n)}
                </option>
              ),
            )}
          </select>
          <p className="text-xs text-zinc-500">
            * Acima de {PARCELAMENTO_SEM_JUROS}x: juros calculados no Mercado
            Pago.
          </p>
          <p className="text-xs text-amber-800">
            Se o cartão não for aceito, escolha PIX — costuma ser o mais rápido.
          </p>
        </label>
      )}

      {formaPagamento === "boleto" && (
        <p className="text-xs text-amber-800">
          O envio só é liberado após a compensação do boleto.
        </p>
      )}

      {formaPagamento === "pix" && (
        <p className="text-xs text-zinc-600">
          Você verá o QR Code ou código PIX na tela do Mercado Pago.
        </p>
      )}
    </div>
  );
}
