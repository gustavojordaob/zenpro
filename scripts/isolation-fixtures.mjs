/** Fixtures compartilhadas — seed (TS) e testes de rules (mjs). */
export const SEED_IDS = {
  LOJA_A: "loja-a",
  LOJA_B: "loja-b",
  PEDIDO_A: "pedido-loja-a-001",
  PEDIDO_B: "pedido-loja-b-001",
};

export const SEED_UIDS = {
  MARCA: "uid-marca-test",
  REV_A: "uid-revendedor-loja-a",
  REV_B: "uid-revendedor-loja-b",
  CLIENTE: "uid-cliente-test",
};

export function pedidoExemplo(lojaRotulo) {
  return {
    totalCentavos: 4990,
    status: "aguardando_pagamento",
    itens: [
      {
        produtoId: "cap-iphone15-classic",
        modeloId: "iphone-15",
        personalizacaoId: null,
        precoCentavos: 4990,
        quantidade: 1,
      },
    ],
    cliente: {
      nome: `Cliente ${lojaRotulo}`,
      contato: `cliente-${lojaRotulo.toLowerCase()}@test.local`,
      endereco: "Rua Teste, 1",
    },
    pagamento: { provider: null, id: null, status: null },
  };
}
