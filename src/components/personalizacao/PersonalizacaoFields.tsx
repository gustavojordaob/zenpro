"use client";

import {
  DESCRICAO_MAX,
  SUGESTOES_PERSONALIZACAO,
  TITULO_MAX,
} from "@/features/personalizacao/caseVisualConstants";

type Props = {
  titulo: string;
  descricao: string;
  onTituloChange: (value: string) => void;
  onDescricaoChange: (value: string) => void;
};

export function PersonalizacaoFields({
  titulo,
  descricao,
  onTituloChange,
  onDescricaoChange,
}: Props) {
  function aplicarSugestao(texto: string) {
    const base = descricao.trim();
    onDescricaoChange(base ? `${base}\n${texto}` : texto);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">
          Deixe sua case única
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Conte o que você imagina — usamos isso na produção e no acabamento.
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-zinc-700">
          Nome da case{" "}
          <span className="font-normal text-zinc-400">(opcional)</span>
        </span>
        <input
          type="text"
          maxLength={TITULO_MAX}
          value={titulo}
          onChange={(e) => onTituloChange(e.target.value)}
          placeholder='Ex: "Presente da Ana", "Viagem 2026"'
          className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-zinc-700">
          Descrição / instruções para produção
        </span>
        <textarea
          rows={4}
          maxLength={DESCRICAO_MAX}
          value={descricao}
          onChange={(e) => onDescricaoChange(e.target.value)}
          placeholder="Ex: Quero a foto centralizada no rosto, sem cortar a cabeça. Preferência por cores quentes. É um presente — se possível caprichar no acabamento."
          className="w-full resize-y rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
        />
        <span className="text-xs text-zinc-400">
          {descricao.length}/{DESCRICAO_MAX}
        </span>
      </label>

      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-500">Sugestões rápidas</p>
        <div className="flex flex-wrap gap-2">
          {SUGESTOES_PERSONALIZACAO.map((sugestao) => (
            <button
              key={sugestao}
              type="button"
              onClick={() => aplicarSugestao(sugestao)}
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
            >
              {sugestao}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
