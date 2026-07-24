import type { Personalizacao } from "@/features/personalizacao/types";
import type { ProdutoDestaque } from "./produtosMock";
import { getPrecoPorModelo, getRotuloModelo } from "./carrinhoCatalogo";
import type { ItemCarrinho } from "./carrinhoTypes";

export function criarItemPersonalizado(
  personalizacao: Personalizacao,
  personalizacaoId: string,
  produtoId?: string,
  quantidadeInicial = 1,
): ItemCarrinho {
  const id =
    produtoId ??
    personalizacao.produtoId ??
    `custom-${personalizacao.modeloId}`;

  return {
    id: crypto.randomUUID(),
    tipo: "personalizada",
    produtoId: id,
    nomeProduto:
      personalizacao.produtoNome ??
      (personalizacao.material
        ? `Capinha ${personalizacao.material}`
        : "Capinha personalizada"),
    modeloId: personalizacao.modeloId,
    personalizacaoId,
    personalizacao,
    precoCentavos:
      personalizacao.precoCentavos ?? getPrecoPorModelo(personalizacao.modeloId),
    quantidade: Math.max(1, Math.floor(quantidadeInicial) || 1),
    rotuloModelo: getRotuloModelo(personalizacao.modeloId),
  };
}

export function criarItemPronto(produto: ProdutoDestaque): ItemCarrinho {
  return {
    id: crypto.randomUUID(),
    tipo: "pronta",
    produtoId: produto.produtoBaseId ?? produto.id,
    nomeProduto: produto.nome,
    modeloId: produto.modeloId,
    personalizacaoId: null,
    personalizacao: null,
    precoCentavos: produto.precoCentavos,
    quantidade: Math.max(1, produto.quantidadeInicial ?? 1),
    rotuloModelo: produto.marca,
    imagemUrl: produto.imagemUrl,
    gradienteCapa: produto.gradienteCapa,
    faixasPrecoRevendedor: produto.faixasPrecoRevendedor,
    pedidoMinimoRevendedorCentavos: produto.pedidoMinimoRevendedorCentavos,
    precoBaseCentavos: produto.precoBaseCentavos,
    precoRevendedorCentavos: produto.precoRevendedorCentavos,
  };
}

export { getPrecoPorModelo, getRotuloModelo } from "./carrinhoCatalogo";
