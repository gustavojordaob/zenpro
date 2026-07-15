"use client";

import type { FaixaPrecoRevendedor } from "@/features/multitenant/types";
import {
  centavosParaReaisInput,
  reaisInputParaCentavos,
} from "@/features/admin/produtos/produtoFormUtils";

type FaixaDraft = {
  quantidadeMin: string;
  quantidadeMax: string; // "" = sem teto
  precoReais: string;
};

type Props = {
  faixas: FaixaDraft[];
  onChange: (next: FaixaDraft[]) => void;
};

export function faixasDraftFromDocs(
  faixas: FaixaPrecoRevendedor[] | null | undefined,
  fallbackCentavos?: number | null,
): FaixaDraft[] {
  if (faixas && faixas.length > 0) {
    return faixas.map((f) => ({
      quantidadeMin: String(f.quantidadeMin),
      quantidadeMax: f.quantidadeMax == null ? "" : String(f.quantidadeMax),
      precoReais: centavosParaReaisInput(f.precoCentavos),
    }));
  }
  const preco =
    typeof fallbackCentavos === "number" && fallbackCentavos > 0
      ? centavosParaReaisInput(fallbackCentavos)
      : "";
  return [{ quantidadeMin: "1", quantidadeMax: "", precoReais: preco }];
}

export function faixasDraftParaDocs(
  faixas: FaixaDraft[],
): FaixaPrecoRevendedor[] | null {
  const out: FaixaPrecoRevendedor[] = [];
  for (const f of faixas) {
    const min = parseInt(f.quantidadeMin, 10);
    const maxRaw = f.quantidadeMax.trim();
    const max = maxRaw === "" ? null : parseInt(maxRaw, 10);
    const preco = reaisInputParaCentavos(f.precoReais);
    if (!Number.isFinite(min) || min < 1 || preco == null || preco <= 0) {
      return null;
    }
    if (max != null && (!Number.isFinite(max) || max < min)) return null;
    out.push({
      quantidadeMin: min,
      quantidadeMax: max,
      precoCentavos: preco,
    });
  }
  return out;
}

export function FaixasPrecoRevendedorFields({ faixas, onChange }: Props) {
  function atualizar(i: number, patch: Partial<FaixaDraft>) {
    onChange(faixas.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  function adicionar() {
    const last = faixas[faixas.length - 1];
    const lastMax = last?.quantidadeMax.trim()
      ? parseInt(last.quantidadeMax, 10)
      : last
        ? parseInt(last.quantidadeMin, 10)
        : 0;
    const nextMin = Number.isFinite(lastMax) ? lastMax + 1 : 1;
    // Fecha a faixa anterior se estava aberta
    const base = faixas.map((f, idx) => {
      if (idx !== faixas.length - 1) return f;
      if (f.quantidadeMax.trim() !== "") return f;
      return {
        ...f,
        quantidadeMax: String(
          Math.max(nextMin - 1, parseInt(f.quantidadeMin, 10) || 1),
        ),
      };
    });
    onChange([
      ...base,
      {
        quantidadeMin: String(nextMin),
        quantidadeMax: "",
        precoReais: last?.precoReais ?? "",
      },
    ]);
  }

  function remover(i: number) {
    if (faixas.length <= 1) return;
    onChange(faixas.filter((_, idx) => idx !== i));
  }

  return (
    <fieldset className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
      <legend className="px-1 text-sm font-medium text-zinc-800">
        Faixas de preço (revendedor)
      </legend>
      <p className="text-xs text-zinc-600">
        Ex.: 1–9, 10–49, 50+ (deixe “até” vazio na última faixa). Contínuas, sem
        buracos.
      </p>
      <ul className="space-y-3">
        {faixas.map((f, i) => (
          <li
            key={i}
            className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:grid-cols-4"
          >
            <label className="block space-y-1">
              <span className="text-xs text-zinc-600">De (un.)</span>
              <input
                type="number"
                min={1}
                value={f.quantidadeMin}
                onChange={(e) => atualizar(i, { quantidadeMin: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-600">Até (vazio = +)</span>
              <input
                type="number"
                min={1}
                value={f.quantidadeMax}
                onChange={(e) => atualizar(i, { quantidadeMax: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1 sm:col-span-1">
              <span className="text-xs text-zinc-600">Preço un. (R$)</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="35,00"
                value={f.precoReais}
                onChange={(e) => atualizar(i, { precoReais: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                disabled={faixas.length <= 1}
                onClick={() => remover(i)}
                className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-xs font-medium text-red-700 disabled:opacity-40"
              >
                Remover
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={adicionar}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800"
      >
        + Adicionar faixa
      </button>
    </fieldset>
  );
}
