import { MARCA_LOJA_ID } from "./marcaLoja";
import type {
  EnderecoExpedicao,
  ItemPedidoLojaFirestore,
  LojaConfig,
} from "./types";

export type MotivoOrigemExpedicao =
  | "personalizada_zenpro"
  | "pronta_loja_pedido";

export type OrigemExpedicaoResolvida = {
  lojaId: string;
  motivo: MotivoOrigemExpedicao;
  endereco: EnderecoExpedicao | null;
};

export function pedidoTemItemPersonalizado(
  itens: Pick<ItemPedidoLojaFirestore, "personalizacaoId">[],
): boolean {
  return itens.some(
    (item) =>
      item.personalizacaoId != null && String(item.personalizacaoId).length > 0,
  );
}

/**
 * Regra de negócio:
 * - Personalizada → sempre expede da Zen Pro (produção na marca).
 * - Pronta → expede da loja do pedido (Zen Pro ou revendedor).
 *
 * Pedido misto (pronta + personalizada) → Zen Pro (qualquer personalizada
 * centraliza a expedição na marca).
 */
export function resolverOrigemExpedicaoPedido(
  lojaIdPedido: string,
  itens: Pick<ItemPedidoLojaFirestore, "personalizacaoId">[],
  lojaPedidoConfig?: LojaConfig | null,
  lojaZenProConfig?: LojaConfig | null,
): OrigemExpedicaoResolvida {
  const personalizada = pedidoTemItemPersonalizado(itens);

  if (personalizada) {
    return {
      lojaId: MARCA_LOJA_ID,
      motivo: "personalizada_zenpro",
      endereco: lojaZenProConfig?.expedicao ?? null,
    };
  }

  const config =
    lojaIdPedido === MARCA_LOJA_ID ? lojaZenProConfig : lojaPedidoConfig;

  return {
    lojaId: lojaIdPedido,
    motivo: "pronta_loja_pedido",
    endereco: config?.expedicao ?? null,
  };
}

export function rotuloMotivoOrigemExpedicao(motivo: MotivoOrigemExpedicao): string {
  if (motivo === "personalizada_zenpro") {
    return "Produção personalizada — expede da Zen Pro";
  }
  return "Produto pronto — expede da loja do pedido";
}
