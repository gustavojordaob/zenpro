import type { FaixaPrecoRevendedor } from "@/features/multitenant/types";

export type ProdutoPrecoRevendedor = {
  precoBaseCentavos: number;
  precoRevendedorCentavos?: number | null;
  pedidoMinimoRevendedorCentavos?: number | null;
  faixasPrecoRevendedor?: FaixaPrecoRevendedor[] | null;
};

function faixaValida(f: FaixaPrecoRevendedor): boolean {
  return (
    Number.isFinite(f.quantidadeMin) &&
    f.quantidadeMin >= 1 &&
    (f.quantidadeMax == null || f.quantidadeMax >= f.quantidadeMin) &&
    Number.isFinite(f.precoCentavos) &&
    f.precoCentavos > 0
  );
}

/** Normaliza e ordena faixas; ignora inválidas. */
export function normalizarFaixasPrecoRevendedor(
  faixas: FaixaPrecoRevendedor[] | null | undefined,
  fallbackCentavos?: number | null,
): FaixaPrecoRevendedor[] {
  const limpas = (faixas ?? [])
    .filter(faixaValida)
    .map((f) => ({
      quantidadeMin: Math.floor(f.quantidadeMin),
      quantidadeMax:
        f.quantidadeMax == null ? null : Math.floor(f.quantidadeMax),
      precoCentavos: Math.round(f.precoCentavos),
    }))
    .sort((a, b) => a.quantidadeMin - b.quantidadeMin);

  if (limpas.length > 0) return limpas;

  const rev =
    typeof fallbackCentavos === "number" && fallbackCentavos > 0
      ? fallbackCentavos
      : 0;
  if (rev <= 0) return [];

  return [
    {
      quantidadeMin: 1,
      quantidadeMax: null,
      precoCentavos: Math.round(rev),
    },
  ];
}

/** Preço unitário pela quantidade (faixa correspondente). */
export function precoRevendedorPorQuantidade(
  produto: ProdutoPrecoRevendedor,
  quantidade: number,
): number {
  const qty = Math.max(1, Math.floor(quantidade));
  const faixas = normalizarFaixasPrecoRevendedor(
    produto.faixasPrecoRevendedor,
    produto.precoRevendedorCentavos ?? produto.precoBaseCentavos,
  );

  if (faixas.length === 0) {
    const rev = produto.precoRevendedorCentavos;
    if (typeof rev === "number" && rev > 0) return rev;
    return produto.precoBaseCentavos || 0;
  }

  let escolhida = faixas[0];
  for (const f of faixas) {
    if (qty >= f.quantidadeMin) {
      if (f.quantidadeMax == null || qty <= f.quantidadeMax) {
        escolhida = f;
      } else {
        escolhida = f;
      }
    }
  }

  for (let i = faixas.length - 1; i >= 0; i--) {
    const f = faixas[i];
    if (qty >= f.quantidadeMin) {
      escolhida = f;
      break;
    }
  }

  return escolhida.precoCentavos;
}

/** Menor preço unitário entre as faixas (exibir “a partir de”). */
export function precoRevendedorAPartirDe(
  produto: ProdutoPrecoRevendedor,
): number {
  const faixas = normalizarFaixasPrecoRevendedor(
    produto.faixasPrecoRevendedor,
    produto.precoRevendedorCentavos ?? produto.precoBaseCentavos,
  );
  if (faixas.length === 0) {
    return precoRevendedorPorQuantidade(produto, 1);
  }
  return Math.min(...faixas.map((f) => f.precoCentavos));
}

export function pedidoMinimoRevendedorCentavos(
  produto: ProdutoPrecoRevendedor,
): number {
  const v = produto.pedidoMinimoRevendedorCentavos;
  if (typeof v === "number" && v > 0) return v;
  return 0;
}

/** Linha atinge o mínimo do produto (valor qty × unitário). */
export function linhaAtingePedidoMinimo(
  produto: ProdutoPrecoRevendedor,
  quantidade: number,
): boolean {
  const min = pedidoMinimoRevendedorCentavos(produto);
  if (min <= 0) return true;
  const unit = precoRevendedorPorQuantidade(produto, quantidade);
  return quantidade * unit >= min;
}

/** Valida faixas no formulário admin (sem buracos óbvios / min crescente). */
export function validarFaixasPrecoRevendedor(
  faixas: FaixaPrecoRevendedor[],
): string | null {
  if (faixas.length === 0) {
    return "Cadastre ao menos uma faixa de preço para revendedor.";
  }
  const norm = normalizarFaixasPrecoRevendedor(faixas);
  if (norm.length !== faixas.filter(faixaValida).length) {
    return "Há faixa inválida (quantidade ou preço).";
  }
  if (norm[0].quantidadeMin !== 1) {
    return "A primeira faixa deve começar em 1 unidade.";
  }
  for (let i = 0; i < norm.length; i++) {
    const f = norm[i];
    if (f.precoCentavos <= 0) {
      return "Cada faixa precisa de um preço maior que zero.";
    }
    if (i > 0) {
      const prev = norm[i - 1];
      if (prev.quantidadeMax == null) {
        return "Só a última faixa pode ser sem limite (ex.: 50+).";
      }
      if (f.quantidadeMin !== prev.quantidadeMax + 1) {
        return `Faixas devem ser contínuas (após ${prev.quantidadeMax} vem ${prev.quantidadeMax + 1}).`;
      }
    }
  }
  const last = norm[norm.length - 1];
  if (last.quantidadeMax != null && norm.length === 1 && last.quantidadeMax < 1) {
    return "Faixa inválida.";
  }
  return null;
}

export function faixaDefaultFromPreco(
  precoCentavos: number,
): FaixaPrecoRevendedor[] {
  return [
    {
      quantidadeMin: 1,
      quantidadeMax: null,
      precoCentavos: Math.max(0, Math.round(precoCentavos)),
    },
  ];
}
