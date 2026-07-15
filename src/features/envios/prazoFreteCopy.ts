/**
 * Texto de prazo de frete: o relógio da transportadora só começa após a postagem.
 * Capinha personalizada: só após fabricada + postada.
 */

export function pedidoTemPersonalizacao(
  itens: Array<{ personalizacaoId?: string | null }>,
): boolean {
  return itens.some(
    (i) =>
      i.personalizacaoId != null && String(i.personalizacaoId).length > 0,
  );
}

/** Linha curta junto à opção de frete (ex.: "até 3 dias úteis…"). */
export function textoPrazoFreteOpcao(
  prazoDias: number | null | undefined,
  personalizado: boolean,
): string | null {
  if (prazoDias == null || prazoDias <= 0) return null;
  const dias = `${prazoDias} dia${prazoDias === 1 ? "" : "s"} úteis`;
  if (personalizado) {
    return `Prazo de ${dias} após fabricado e postado`;
  }
  return `Prazo de ${dias} após postado`;
}

/** Aviso geral abaixo da lista / no resumo do pedido. */
export function avisoPrazoFreteCheckout(personalizado: boolean): string {
  if (personalizado) {
    return "O prazo em dias úteis da transportadora só começa a contar depois que a capinha for fabricada e o pacote for postado na agência.";
  }
  return "O prazo em dias úteis da transportadora só começa a contar depois que o pacote for postado na agência.";
}
