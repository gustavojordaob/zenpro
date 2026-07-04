"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  gerarColagem916,
  gerarColagem916DataUrl,
  rotuloLayoutPadrao,
} from "@/features/personalizacao/fotoLayoutPresets";
import { DEFAULT_COR_FUNDO_CAPINHA } from "@/features/personalizacao/caseVisualConstants";

const CORES_FUNDO = [
  { rotulo: "Branco", hex: "#ffffff" },
  { rotulo: "Preto", hex: "#171717" },
  { rotulo: "Cinza", hex: "#e4e4e7" },
  { rotulo: "Rosa", hex: "#fecdd3" },
  { rotulo: "Azul", hex: "#bfdbfe" },
  { rotulo: "Bege", hex: "#fef3c7" },
] as const;

type Props = {
  aberto: boolean;
  substituirExistente: boolean;
  corFundoInicial?: string;
  gerando: boolean;
  onFechar: () => void;
  onConfirmar: (file: File) => void;
};

export function MontarColagemModal({
  aberto,
  substituirExistente,
  corFundoInicial = DEFAULT_COR_FUNDO_CAPINHA,
  gerando,
  onFechar,
  onConfirmar,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [corFundo, setCorFundo] = useState(corFundoInicial);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [montandoPreview, setMontandoPreview] = useState(false);

  useEffect(() => {
    if (!aberto) {
      setArquivos([]);
      setPreviewUrl(null);
      setErro(null);
      setCorFundo(corFundoInicial);
      return;
    }
    setCorFundo(corFundoInicial);
  }, [aberto, corFundoInicial]);

  const atualizarPreview = useCallback(async (lista: File[], cor: string) => {
    if (lista.length < 2) {
      setPreviewUrl(null);
      return;
    }
    setMontandoPreview(true);
    setErro(null);
    try {
      const url = await gerarColagem916DataUrl(lista, { corFundo: cor });
      setPreviewUrl(url);
    } catch {
      setErro("Não foi possível montar a prévia. Tente outras fotos.");
      setPreviewUrl(null);
    } finally {
      setMontandoPreview(false);
    }
  }, []);

  useEffect(() => {
    if (!aberto || arquivos.length < 2) return;
    void atualizarPreview(arquivos, corFundo);
  }, [aberto, arquivos, corFundo, atualizarPreview]);

  function handleSelecionar(files: FileList | null) {
    if (!files?.length) return;
    const lista = Array.from(files).slice(0, 4);
    if (lista.length < 2) {
      setErro("Escolha pelo menos 2 fotos.");
      return;
    }
    setErro(null);
    setArquivos(lista);
  }

  function removerIndice(i: number) {
    setArquivos((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      if (next.length > 0 && next.length < 2) {
        setErro("A colagem precisa de pelo menos 2 fotos.");
      }
      return next;
    });
  }

  async function handleConfirmar() {
    if (arquivos.length < 2) {
      setErro("Escolha entre 2 e 4 fotos.");
      return;
    }
    setErro(null);
    try {
      const file = await gerarColagem916(arquivos, { corFundo });
      onConfirmar(file);
    } catch {
      setErro("Não foi possível gerar a colagem. Tente novamente.");
    }
  }

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Montar colagem
            </h2>
            <p className="text-xs text-zinc-500">
              Junta 2 a 4 fotos em uma imagem só (9:16)
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={gerando}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
          >
            Fechar
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {substituirExistente && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              A colagem substitui a foto atual na capa. Depois você ainda pode
              arrastar, dar zoom e adicionar texto no editor.
            </p>
          )}

          <div>
            <button
              type="button"
              disabled={gerando}
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm font-medium text-zinc-700 hover:border-zinc-400 disabled:opacity-50"
            >
              {arquivos.length >= 2
                ? "Trocar fotos selecionadas"
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
                  Foto {i + 1}
                  <button
                    type="button"
                    className="ml-1 text-zinc-400 hover:text-red-500"
                    onClick={() => removerIndice(i)}
                    aria-label={`Remover foto ${i + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
              {arquivos.length >= 2 && (
                <span className="self-center text-xs text-zinc-500">
                  Layout: {rotuloLayoutPadrao(arquivos.length)}
                </span>
              )}
            </div>
          )}

          {arquivos.length >= 2 && (
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-900">
                Cor entre as fotos
              </p>
              <div className="flex flex-wrap gap-2">
                {CORES_FUNDO.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.rotulo}
                    onClick={() => setCorFundo(c.hex)}
                    className={`h-9 w-9 rounded-full border-2 transition ${
                      corFundo === c.hex
                        ? "border-zinc-900 ring-2 ring-zinc-400"
                        : "border-zinc-300"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
                <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 px-2 text-xs text-zinc-600">
                  Outra
                  <input
                    type="color"
                    value={corFundo}
                    onChange={(e) => setCorFundo(e.target.value)}
                    className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
                  />
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-center rounded-xl bg-[#ececec] p-4">
            {montandoPreview ? (
              <p className="py-16 text-sm text-zinc-500">Montando prévia...</p>
            ) : previewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewUrl}
                alt="Prévia da colagem"
                className="max-h-[320px] w-auto rounded-lg shadow-md"
                style={{ aspectRatio: "9/16", maxWidth: "min(100%, 200px)" }}
              />
            ) : (
              <p className="py-16 text-center text-sm text-zinc-500">
                Selecione 2 a 4 fotos para ver a colagem
              </p>
            )}
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}
        </div>

        <div className="border-t border-zinc-200 px-4 py-3">
          <button
            type="button"
            disabled={gerando || arquivos.length < 2 || montandoPreview}
            onClick={() => void handleConfirmar()}
            className="btn-gold w-full rounded-xl py-3 text-base disabled:opacity-40"
          >
            {gerando ? "Enviando colagem..." : "Usar esta colagem na capa"}
          </button>
          <p className="mt-2 text-center text-xs text-zinc-500">
            Gera uma foto única — depois ajuste posição e tamanho no editor.
          </p>
        </div>
      </div>
    </div>
  );
}
