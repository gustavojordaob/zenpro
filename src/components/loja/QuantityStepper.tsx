"use client";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
  label?: string;
};

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  className = "",
  label = "Qtd",
}: Props) {
  const qty = Math.max(min, Math.floor(value) || min);
  const atMin = qty <= min;
  const atMax = typeof max === "number" && qty >= max;

  function set(next: number) {
    let n = Math.max(min, Math.floor(next) || min);
    if (typeof max === "number") n = Math.min(max, n);
    onChange(n);
  }

  return (
    <label className={`inline-flex items-center gap-2 text-sm text-zinc-700 ${className}`}>
      <span className="shrink-0">{label}</span>
      <span className="inline-flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white">
        <button
          type="button"
          aria-label="Diminuir quantidade"
          disabled={atMin}
          onClick={() => set(qty - 1)}
          className="flex h-9 w-9 items-center justify-center text-lg font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          −
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={qty}
          onChange={(e) => set(parseInt(e.target.value, 10) || min)}
          className="h-9 w-12 border-x border-zinc-300 bg-white text-center text-sm tabular-nums outline-none"
        />
        <button
          type="button"
          aria-label="Aumentar quantidade"
          disabled={atMax}
          onClick={() => set(qty + 1)}
          className="flex h-9 w-9 items-center justify-center text-lg font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          +
        </button>
      </span>
    </label>
  );
}
