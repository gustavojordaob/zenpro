"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gerarFotoCriativaComIA } from "@/features/personalizacao/gerarFotoComIA";

const SUGUESTAO_PROMPT =
  "Ex.: Nós dois juntos na mesma foto, como se estivéssemos tirando uma selfie no mesmo lugar.";

const MAX_FOTOS = 4;
const MIN_FOTOS = 2;

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
  const [prompt, setPrompt] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultado, setResultado] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gerandoIA, setGerandoIA] = useState(false);

  const miniaturas = useMemo(
    () => arquivos.map((f) => URL.createObjectURL(f)),
    [arquivos],
  );

  useEffect(() => {
    return () => {
      for (const url of miniaturas) URL.revokeObjectURL(url);
    };
  }, [miniaturas]);

  useEffect(() => {
    if (!aberto) {
      setArquivos([]);
      setPreviewUrl(null);
      setResultado(null);
      setErro(null);
      setGerandoIA(false);
      setPrompt("");
    }
  }, [aberto]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleSelecionar(files: FileList | null) {
    if (!files?.length) return;

    const novos = Array.from(files).filter(
      (f) =>
        !f.type ||
        f.type.startsWith("image/") ||
        /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name),
    );
    if (novos.length === 0) {
      setErro("Selecione arquivos de imagem (JPG, PNG, WEBP…).");
      return;
    }

    const vagas = MAX_FOTOS - arquivos.length;
    if (vagas <= 0) {
      setErro(`Máximo de ${MAX_FOTOS} fotos.`);
      return;
    }

    const adicionar = novos.slice(0, vagas);
    setArquivos((prev) => [...prev, ...adicionar]);
    if (novos.length > vagas) {
      setErro(`Só cabem mais ${vagas} foto(s). Máximo ${MAX_FOTOS}.`);
    } else {
      setErro(null);
    }
    setResultado(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  function removerIndice(i: number) {
    setArquivos((prev) => prev.filter((_, idx) => idx !== i));
    setResultado(null);
    setErro(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  async function handleGerar() {
    if (arquivos.length < MIN_FOTOS) {
      setErro(`Anexe pelo menos ${MIN_FOTOS} fotos para gerar.`);
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
  const podeAdicionar = arquivos.length < MAX_FOTOS;
  const podeGerar = arquivos.length >= MIN_FOTOS;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Criar foto com IA
            </h2>
            <p className="text-xs text-zinc-500">
              Anexe de {MIN_FOTOS} a {MAX_FOTOS} fotos (pode escolher uma de
              cada vez). Clientes: até 3 montagens por dia.
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
              disabled={ocupado || !podeAdicionar}
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm font-medium text-zinc-700 hover:border-zinc-400 disabled:opacity-50"
            >
              {arquivos.length === 0
                ? `Escolher fotos (${MIN_FOTOS} a ${MAX_FOTOS})`
                : podeAdicionar
                  ? `Adicionar mais fotos (${arquivos.length}/${MAX_FOTOS})`
                  : `${MAX_FOTOS} fotos anexadas`}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleSelecionar(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {arquivos.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-600">
                Fotos anexadas ({arquivos.length}/{MAX_FOTOS})
              </p>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {arquivos.map((f, i) => (
                  <li
                    key={`${f.name}-${f.size}-${i}`}
                    className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={miniaturas[i]}
                      alt={`Referência ${i + 1}`}
                      className="aspect-square h-28 w-full object-cover sm:h-24"
                    />
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {i + 1}
                    </span>
                    <button
                      type="button"
                      disabled={ocupado}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white hover:bg-red-600 disabled:opacity-50"
                      onClick={() => removerIndice(i)}
                      aria-label={`Remover referência ${i + 1}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label
              htmlFor="prompt-ia"
              className="mb-1 block text-sm font-medium text-zinc-900"
            >
              Descreva a cena (opcional)
            </label>
            <textarea
              id="prompt-ia"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={ocupado}
              placeholder={SUGUESTAO_PROMPT}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 disabled:opacity-50"
            />
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
                {podeGerar
                  ? "Toque em Gerar foto com IA"
                  : `Anexe pelo menos ${MIN_FOTOS} fotos para gerar`}
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
              disabled={ocupado || !podeGerar}
              onClick={() => void handleGerar()}
              className="btn-gold w-full rounded-xl py-3 text-base disabled:opacity-40"
            >
              {gerandoIA ? "Gerando..." : "Gerar foto com IA"}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={ocupado || !podeGerar}
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
