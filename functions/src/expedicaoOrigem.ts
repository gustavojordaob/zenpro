import { MARCA_LOJA_ID } from "./mercadoPagoShared";

export type EnderecoExpedicao = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  nomeRemetente?: string | null;
};

export type LojaConfigExpedicao = {
  expedicao?: EnderecoExpedicao | null;
};

export type MotivoOrigemExpedicao =
  | "personalizada_zenpro"
  | "pronta_loja_pedido";

export type OrigemExpedicaoResolvida = {
  lojaId: string;
  motivo: MotivoOrigemExpedicao;
  endereco: EnderecoExpedicao | null;
};

type ItemPedido = { personalizacaoId?: string | null };

export function pedidoTemItemPersonalizado(itens: ItemPedido[]): boolean {
  return itens.some(
    (item) =>
      item.personalizacaoId != null && String(item.personalizacaoId).length > 0,
  );
}

export function resolverOrigemExpedicaoPedido(
  lojaIdPedido: string,
  itens: ItemPedido[],
  lojaPedidoConfig?: LojaConfigExpedicao | null,
  lojaZenProConfig?: LojaConfigExpedicao | null,
): OrigemExpedicaoResolvida {
  if (pedidoTemItemPersonalizado(itens)) {
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
