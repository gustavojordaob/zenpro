"use client";

import {
  CORES_TEXTO,
  EMOJIS_RAPIDOS,
  FONTES_CAPINHA,
  type TextoCapinha,
} from "@/features/personalizacao/caseTextFonts";

type Props = {
  textos: TextoCapinha[];
  textoSelecionadoId: string | null;
  onTextosChange: (textos: TextoCapinha[]) => void;
  onTextoSelecionadoChange: (id: string | null) => void;
  onAdicionarTexto: () => void;
};

export function TextoCapinhaPanel({
  textos,
  textoSelecionadoId,
  onTextosChange,
  onTextoSelecionadoChange,
  onAdicionarTexto,
}: Props) {
  const selecionado = textos.find((t) => t.id === textoSelecionadoId) ?? null;

  function atualizarTexto(patch: Partial<TextoCapinha>) {
    if (!selecionado) return;
    onTextosChange(
      textos.map((t) => (t.id === selecionado.id ? { ...t, ...patch } : t)),
    );
  }

  function removerTexto(id: string) {
    onTextosChange(textos.filter((t) => t.id !== id));
    if (textoSelecionadoId === id) onTextoSelecionadoChange(null);
  }

  function inserirEmoji(emoji: string) {
    if (!selecionado) return;
    atualizarTexto({ conteudo: `${selecionado.conteudo}${emoji}` });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Texto na case</h2>
          <p className="text-xs text-zinc-500">
            Arraste o texto no preview. Toque para selecionar.
          </p>
        </div>
        <button
          type="button"
          onClick={onAdicionarTexto}
          className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
        >
          + Texto
        </button>
      </div>

      {textos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {textos.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTextoSelecionadoChange(t.id)}
              className={`max-w-full truncate rounded-full px-3 py-1 text-xs transition ${
                t.id === textoSelecionadoId
                  ? "bg-violet-100 font-medium text-violet-800 ring-2 ring-violet-400"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {t.conteudo.trim() || `Texto ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {selecionado ? (
        <div className="space-y-4 border-t border-zinc-100 pt-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-600">Conteúdo</span>
            <textarea
              value={selecionado.conteudo}
              onChange={(e) => atualizarTexto({ conteudo: e.target.value })}
              rows={2}
              placeholder="Seu nome, frase favorita..."
              className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </label>

          <div>
            <p className="mb-2 text-xs font-medium text-zinc-600">Emojis</p>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS_RAPIDOS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => inserirEmoji(emoji)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-50 text-lg hover:bg-zinc-100"
                  aria-label={`Inserir ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-zinc-600">Fonte</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FONTES_CAPINHA.map((fonte) => (
                <button
                  key={fonte.id}
                  type="button"
                  onClick={() => atualizarTexto({ fontId: fonte.id })}
                  className={`rounded-lg border px-2 py-2 text-left transition ${
                    selecionado.fontId === fonte.id
                      ? "border-violet-500 bg-violet-50"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                  style={{ fontFamily: fonte.familia }}
                >
                  <span className="block text-lg leading-none">{fonte.amostra}</span>
                  <span className="text-[10px] text-zinc-500">{fonte.rotulo}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-600">
              Tamanho — {selecionado.fontSize}px
            </span>
            <input
              type="range"
              min={12}
              max={48}
              value={selecionado.fontSize}
              onChange={(e) =>
                atualizarTexto({ fontSize: Number(e.target.value) })
              }
              className="w-full accent-violet-600"
            />
          </label>

          <div>
            <p className="mb-2 text-xs font-medium text-zinc-600">Cor</p>
            <div className="flex flex-wrap gap-2">
              {CORES_TEXTO.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => atualizarTexto({ fill: cor })}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    selecionado.fill === cor
                      ? "border-violet-500 ring-2 ring-violet-200"
                      : "border-zinc-200"
                  }`}
                  style={{ backgroundColor: cor }}
                  aria-label={`Cor ${cor}`}
                />
              ))}
              <input
                type="color"
                value={selecionado.fill.startsWith("#") ? selecionado.fill : "#ffffff"}
                onChange={(e) => atualizarTexto({ fill: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded-full border border-zinc-200"
                title="Cor personalizada"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                atualizarTexto({
                  fontStyle: selecionado.fontStyle === "bold" ? "normal" : "bold",
                })
              }
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                selecionado.fontStyle === "bold"
                  ? "border-violet-500 bg-violet-50 text-violet-800"
                  : "border-zinc-300 text-zinc-700"
              }`}
            >
              Negrito
            </button>
            <button
              type="button"
              onClick={() =>
                atualizarTexto({
                  fontStyle:
                    selecionado.fontStyle === "italic" ? "normal" : "italic",
                })
              }
              className={`rounded-lg border px-3 py-1.5 text-xs italic ${
                selecionado.fontStyle === "italic"
                  ? "border-violet-500 bg-violet-50 text-violet-800"
                  : "border-zinc-300 text-zinc-700"
              }`}
            >
              Itálico
            </button>
            <button
              type="button"
              onClick={() => removerTexto(selecionado.id)}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
            >
              Remover
            </button>
          </div>
        </div>
      ) : textos.length === 0 ? (
        <p className="text-xs text-zinc-500">
          Adicione frases, nomes ou emojis em cima da foto.
        </p>
      ) : (
        <p className="text-xs text-zinc-500">
          Selecione um texto acima ou toque nele no preview.
        </p>
      )}
    </section>
  );
}
