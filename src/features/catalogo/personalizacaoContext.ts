import {
  modeloCatalogoParaCelular,
  obterModeloCatalogo,
} from "./catalogoRuntimeService";
import { obterProdutoCatalogo } from "./catalogoProdutoService";
import {
  parsePersonalizacaoVisualJson,
  resolverVisualPersonalizacao,
  type ResolvedPersonalizacaoVisual,
} from "./personalizacaoVisual";
import type { ModeloCelular } from "@/features/personalizacao/types";

/** Variante vendável (SKU) — ex.: "Capinha Couro iPhone 17 Pro Max". */
export type ProdutoPersonalizacaoContext = {
  produtoId: string;
  nome: string;
  precoCentavos: number;
  material?: string;
  modelosCompativeis: string[];
  imagemUrl?: string;
};

/** Tudo que o editor precisa para renderizar e salvar. */
export type PersonalizacaoEditorContext = {
  modeloId: string;
  modelo: ModeloCelular;
  visual: ResolvedPersonalizacaoVisual;
  produto?: ProdutoPersonalizacaoContext;
  /** Modelos que o cliente pode escolher nesta variante. */
  modelosDisponiveis: string[];
};

export async function carregarContextoPersonalizacao(
  modeloId: string,
  produtoId?: string | null,
): Promise<PersonalizacaoEditorContext | null> {
  const modeloCatalogo = await obterModeloCatalogo(modeloId);
  if (!modeloCatalogo) return null;

  const produto = produtoId ? await obterProdutoCatalogo(produtoId) : null;

  if (produto && !produto.personalizavel) return null;

  const modelosDisponiveis = produto?.modelosCompativeis?.length
    ? produto.modelosCompativeis
    : [modeloId];

  if (produto && !modelosDisponiveis.includes(modeloId)) {
    return null;
  }

  const visual = resolverVisualPersonalizacao(modeloId, {
    modelo: parsePersonalizacaoVisualJson(modeloCatalogo.personalizacao),
    produto: parsePersonalizacaoVisualJson(produto?.visualPersonalizacao),
    assets: {
      larguraPx: modeloCatalogo.larguraPx,
      alturaPx: modeloCatalogo.alturaPx,
      maskUrl: modeloCatalogo.maskUrl,
    },
  });

  const produtoCtx: ProdutoPersonalizacaoContext | undefined = produto
    ? {
        produtoId: produto.id,
        nome: produto.nome,
        precoCentavos: produto.precoBaseCentavos,
        material: produto.material ?? undefined,
        modelosCompativeis: produto.modelosCompativeis ?? [],
        imagemUrl: produto.imagens[0],
      }
    : undefined;

  return {
    modeloId,
    modelo: modeloCatalogoParaCelular(modeloCatalogo),
    visual,
    produto: produtoCtx,
    modelosDisponiveis,
  };
}
