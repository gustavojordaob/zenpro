"use client";

import { useState } from "react";
import { SeletorFormaPagamentoOnline } from "@/components/loja/SeletorFormaPagamentoOnline";
import {
  criarCheckoutMercadoPago,
  sincronizarPagamentoMercadoPago,
  urlCheckoutMercadoPago,
} from "@/features/pagamentos/mercadoPagoClient";
import {
  pagamentoMockAtivo,
  siteUrlBase,
} from "@/features/pagamentos/pagamentoConfig";
import type { MeuPedido } from "@/features/loja/meusPedidosService";
import { MARCA_LOJA_ID } from "@/features/multitenant/marcaLoja";
import type { PedidoLojaFormaPagamentoOnline } from "@/features/multitenant/types";

type Props = {
  pedido: MeuPedido;
  onAtualizado?: () => void;
};

export function ContinuarPagamentoPedido({ pedido, onAtualizado }: Props) {
  const [carregando, setCarregando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [formaPagamento, setFormaPagamento] =
    useState<PedidoLojaFormaPagamentoOnline>(pedido.formaOnline ?? "pix");
  const [parcelas, setParcelas] = useState(pedido.parcelas ?? 1);

  if (pedido.status !== "aguardando_pagamento" || pedido.pagamentoLiberadoEnvio) {
    return null;
  }

  const pagamentoEmAnalise =
    pedido.pagamentoProvider === "mercadopago" &&
    pedido.pagamentoId != null &&
    pedido.pagamentoStatus != null &&
    ["pending", "in_process", "authorized"].includes(pedido.pagamentoStatus);

  if (pagamentoMockAtivo()) {
    return (
      <p className="mt-3 text-xs text-zinc-500">
        Modo mock — pagamento simulado no checkout.
      </p>
    );
  }

  async function handleVerificarPagamento() {
    setVerificando(true);
    setErro(null);
    try {
      const resultado = await sincronizarPagamentoMercadoPago({
        tipo: "loja",
        lojaId: pedido.lojaId,
        pedidoId: pedido.pedidoId,
        paymentId: pedido.pagamentoId,
      });
      if (!resultado.sincronizado) {
        setErro(
          "Nenhum pagamento encontrado no Mercado Pago. Se acabou de pagar, aguarde alguns segundos e tente de novo.",
        );
      } else {
        onAtualizado?.();
      }
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível verificar o pagamento.",
      );
    } finally {
      setVerificando(false);
    }
  }

  async function handleContinuar() {
    setCarregando(true);
    setErro(null);
    try {
      const returnBase =
        pedido.lojaId === MARCA_LOJA_ID
          ? siteUrlBase()
          : `${siteUrlBase()}/${pedido.lojaId}`;

      const checkout = await criarCheckoutMercadoPago({
        tipo: "loja",
        lojaId: pedido.lojaId,
        pedidoId: pedido.pedidoId,
        formaPagamento,
        parcelas: formaPagamento === "cartao" ? parcelas : 1,
        returnBasePath: returnBase,
      });

      window.location.href = urlCheckoutMercadoPago(checkout);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir o pagamento.",
      );
      setCarregando(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div>
        <p className="text-sm font-semibold text-zinc-900">
          {pagamentoEmAnalise
            ? "Alterar forma de pagamento"
            : "Concluir pagamento"}
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          {pagamentoEmAnalise
            ? "Há uma tentativa anterior em análise. Você pode escolher outra forma e gerar um novo link no Mercado Pago."
            : "Escolha como pagar e abra o Mercado Pago. Se o cartão não funcionar, tente PIX."}
        </p>
      </div>

      <SeletorFormaPagamentoOnline
        formaPagamento={formaPagamento}
        onFormaChange={setFormaPagamento}
        parcelas={parcelas}
        onParcelasChange={setParcelas}
        totalCentavos={pedido.totalCentavos}
        compact
      />

      <button
        type="button"
        disabled={carregando}
        onClick={() => void handleContinuar()}
        className="btn-gold w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        {carregando
          ? "Abrindo Mercado Pago..."
          : pagamentoEmAnalise
            ? "Pagar com esta forma"
            : "Ir para pagamento"}
      </button>

      <button
        type="button"
        disabled={verificando || carregando}
        onClick={() => void handleVerificarPagamento()}
        className="w-full rounded-xl border border-zinc-300 bg-white py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        {verificando ? "Verificando pagamento…" : "Já paguei — atualizar status"}
      </button>

      {erro ? <p className="text-xs text-red-600">{erro}</p> : null}
    </div>
  );
}
