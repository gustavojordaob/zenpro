import { getModeloById } from "@/features/personalizacao/modelos";
import type { Personalizacao } from "@/features/personalizacao/types";
import type { ProdutoDestaque } from "./produtosMock";
import { getPrecoPorModelo, getRotuloModelo } from "./carrinhoCatalogo";

export function criarItemPersonalizado(
  personalizacao: Personalizacao,
  personalizacaoId: string,
  produtoId?: string,
) {
  const id =
    produtoId ??
    personalizacao.produtoId ??
    `custom-${personalizacao.modeloId}`;

  return {
    id: crypto.randomUUID(),
    tipo: "personalizada" as const,
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
    rotuloModelo: getRotuloModelo(personalizacao.modeloId),
  };
}

export function criarItemPronto(produto: ProdutoDestaque) {
  return {
    id: crypto.randomUUID(),
    tipo: "pronta" as const,
    produtoId: produto.produtoBaseId ?? produto.id,
    nomeProduto: produto.nome,
    modeloId: produto.modeloId,
    personalizacaoId: null,
    personalizacao: null,
    precoCentavos: produto.precoCentavos,
    rotuloModelo: produto.marca,
    imagemUrl: produto.imagemUrl,
    gradienteCapa: produto.gradienteCapa,
  };
}

export { getPrecoPorModelo, getRotuloModelo } from "./carrinhoCatalogo";
