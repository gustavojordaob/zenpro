"use client";

type Props = {
  pagina: number;
  totalPaginas: number;
  totalItens: number;
  porPagina: number;
  onChange: (pagina: number) => void;
  /** Texto do contador, já no plural adequado — ex. "produtos", "opções". */
  rotulo?: string;
};

export function PaginationBar({
  pagina,
  totalPaginas,
  totalItens,
  porPagina,
  onChange,
  rotulo = "itens",
}: Props) {
  if (totalItens === 0 || totalPaginas <= 1) {
    if (totalItens === 0) return null;
    return (
      <p className="mt-4 text-center text-sm text-zinc-500">
        {totalItens} {rotulo}
      </p>
    );
  }

  const inicio = (pagina - 1) * porPagina + 1;
  const fim = Math.min(pagina * porPagina, totalItens);

  const paginas = numerosVisiveis(pagina, totalPaginas);

  return (
    <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-sm text-zinc-500">
        {inicio}–{fim} de {totalItens} {rotulo}
      </p>
      <nav
        className="flex flex-wrap items-center justify-center gap-1"
        aria-label="Paginação"
      >
        <button
          type="button"
          disabled={pagina <= 1}
          onClick={() => onChange(pagina - 1)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>
        {paginas.map((p, i) =>
          p === "…" ? (
            <span
              key={`e-${i}`}
              className="px-1.5 text-sm text-zinc-400"
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === pagina ? "page" : undefined}
              onClick={() => onChange(p)}
              className={`min-w-9 rounded-lg px-2.5 py-1.5 text-sm font-medium ${
                p === pagina
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={pagina >= totalPaginas}
          onClick={() => onChange(pagina + 1)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Próxima
        </button>
      </nav>
    </div>
  );
}

export function fatiaPagina<T>(itens: T[], pagina: number, porPagina: number): T[] {
  const inicio = (pagina - 1) * porPagina;
  return itens.slice(inicio, inicio + porPagina);
}

export function totalPaginasDe(totalItens: number, porPagina: number): number {
  return Math.max(1, Math.ceil(totalItens / porPagina));
}

function numerosVisiveis(
  atual: number,
  total: number,
): Array<number | "…"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: Array<number | "…"> = [1];
  const start = Math.max(2, atual - 1);
  const end = Math.min(total - 1, atual + 1);
  if (start > 2) out.push("…");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}

/** Tamanhos padrão — grade 4 colunas × 3 linhas na loja; tabela no admin. */
export const PAGINA_LOJA = 12;
export const PAGINA_ADMIN = 20;
