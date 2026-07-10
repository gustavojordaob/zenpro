"use client";

import { useEffect, useRef, useState } from "react";
import { gerarFotoCriativaComIA } from "@/features/personalizacao/gerarFotoComIA";

type Props = {
  aberto: boolean;
  substituirExistente: boolean;
  gerando: boolean;
  onFechar: () => void;
  onConfirmar: (file: File) => void;
  onGerandoChange: (gerando: boolean) => void;
};

export function CriarFotoIAModal({
  aberto,
  substituirExistente,
  gerando,
  onFechar,
  onConfirmar,
  onGerandoChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [prompt, setPrompt] = useState(
    "Nós dois juntos na mesma foto, como se estivéssemos tirando uma selfie no mesmo lugar.",
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultado, setResultado] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gerandoIA, setGerandoIA] = useState(false);

  useEffect(() => {
    if (!aberto) {
      setArquivos([]);
      setPreviewUrl(null);
      setResultado(null);
      setErro(null);
      setGerandoIA(false);
    }
  }, [aberto]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleSelecionar(files: FileList | null) {
    if (!files?.length) return;
    const lista = Array.from(files).slice(0, 4);
    if (lista.length < 2) {
      setErro("Escolha pelo menos 2 fotos de referência.");
      return;
    }
    setErro(null);
    setResultado(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setArquivos(lista);
  }

  function removerIndice(i: number) {
    setArquivos((prev) => prev.filter((_, idx) => idx !== i));
    setResultado(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  async function handleGerar() {
    if (arquivos.length < 2) {
      setErro("Escolha entre 2 e 4 fotos.");
      return;
    }
    setErro(null);
    setGerandoIA(true);
    onGerandoChange(true);
    try {
      const file = await gerarFotoCriativaComIA(arquivos, prompt);
      setResultado(file);
      const url = URL.createObjectURL(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Não foi possível gerar a imagem. Tente novamente.";
      setErro(msg);
    } finally {
      setGerandoIA(false);
      onGerandoChange(false);
    }
  }

  function handleUsarNaCapa() {
    if (!resultado) return;
    onConfirmar(resultado);
  }

  if (!aberto) return null;

  const ocupado = gerando || gerandoIA;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Criar foto com IA
            </h2>
            <p className="text-xs text-zinc-500">
              Junta suas fotos numa cena só — ex.: você e alguém juntos
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={ocupado}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
          >
            Fechar
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {substituirExistente && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              A nova imagem substitui a foto atual na case. Depois você ainda
              pode ajustar posição, zoom e texto.
            </p>
          )}

          <div>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm font-medium text-zinc-700 hover:border-zinc-400 disabled:opacity-50"
            >
              {arquivos.length >= 2
                ? "Trocar fotos de referência"
                : "Escolher 2 a 4 fotos"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleSelecionar(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {arquivos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {arquivos.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700"
                >
                  Ref. {i + 1}
                  <button
                    type="button"
                    className="ml-1 text-zinc-400 hover:text-red-500"
                    onClick={() => removerIndice(i)}
                    aria-label={`Remover referência ${i + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <label
              htmlFor="prompt-ia"
              className="mb-1 block text-sm font-medium text-zinc-900"
            >
              Descreva a cena
            </label>
            <textarea
              id="prompt-ia"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={ocupado}
              placeholder="Ex.: Eu e o Neymar tirando uma selfie juntos no campo, sorrindo..."
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-800 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Quanto mais claro o pedido, melhor. A IA monta a cena — não é
              colagem com espaços brancos.
            </p>
          </div>

          <div className="flex justify-center rounded-xl bg-[#ececec] p-4">
            {gerandoIA ? (
              <div className="py-16 text-center">
                <p className="text-sm font-medium text-zinc-700">
                  IA montando sua foto...
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Pode levar até 1 minuto
                </p>
              </div>
            ) : previewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewUrl}
                alt="Resultado da IA"
                className="max-h-[320px] w-auto rounded-lg shadow-md"
                style={{ aspectRatio: "9/16", maxWidth: "min(100%, 200px)" }}
              />
            ) : (
              <p className="py-16 text-center text-sm text-zinc-500">
                Escolha as fotos, descreva a cena e toque em Gerar
              </p>
            )}
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <p className="text-xs text-zinc-400">
            Imagem gerada por IA (Gemini). Rostos podem variar — se não ficar
            bom, tente outro texto ou fotos mais nítidas de rosto.
          </p>
        </div>

        <div className="space-y-2 border-t border-zinc-200 px-4 py-3">
          {!resultado ? (
            <button
              type="button"
              disabled={ocupado || arquivos.length < 2}
              onClick={() => void handleGerar()}
              className="btn-gold w-full rounded-xl py-3 text-base disabled:opacity-40"
            >
              {gerandoIA ? "Gerando..." : "Gerar foto com IA"}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={ocupado}
                onClick={() => void handleGerar()}
                className="w-full rounded-xl border border-zinc-300 py-2.5 text-sm font-medium text-zinc-800 disabled:opacity-40"
              >
                Gerar de novo
              </button>
              <button
                type="button"
                disabled={ocupado}
                onClick={handleUsarNaCapa}
                className="btn-gold w-full rounded-xl py-3 text-base disabled:opacity-40"
              >
                Usar esta foto na case
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
