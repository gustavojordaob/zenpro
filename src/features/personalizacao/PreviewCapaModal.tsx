"use client";

import { useEffect, useMemo, useState } from "react";
import { buildCameraModuleSvg } from "./cameraModules";
import { buildCaseFrameSvg } from "./caseFrame";
import { exportCaseArtDataUrl } from "./exportCaseArt";
import type { TextoCapinha, Transform } from "./types";

type Props = {
  aberto: boolean;
  fotoUrl: string;
  transform: Transform;
  textos: TextoCapinha[];
  modeloId: string;
  modeloRotulo: string;
  onFechar: () => void;
};

export function PreviewCapaModal({
  aberto,
  fotoUrl,
  transform,
  textos,
  modeloId,
  modeloRotulo,
  onFechar,
}: Props) {
  const [arteUrl, setArteUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const borderUrl = useMemo(() => {
    const svg = buildCaseFrameSvg(modeloId, 280, 572);
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [modeloId]);

  const cameraUrl = useMemo(() => {
    const svg = buildCameraModuleSvg(modeloId, 280, 572);
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [modeloId]);

  useEffect(() => {
    if (!aberto) {
      setArteUrl(null);
      setErro(null);
      return;
    }
    let ativo = true;
    setErro(null);
    exportCaseArtDataUrl(fotoUrl, transform, textos, { clip: "retangulo" })
      .then((url) => {
        if (ativo) setArteUrl(url);
      })
      .catch((e) => {
        console.error(e);
        if (ativo) setErro("Não foi possível gerar a prévia.");
      });
    return () => {
      ativo = false;
    };
  }, [aberto, fotoUrl, transform, textos]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Prévia da capa
            </h2>
            <p className="text-xs text-zinc-500">{modeloRotulo}</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            Fechar
          </button>
        </div>

        <div className="flex items-center justify-center bg-[#ececec] p-6">
          {erro ? (
            <div className="flex h-[460px] items-center justify-center px-6 text-center text-sm text-red-600">
              {erro}
            </div>
          ) : arteUrl ? (
            <div
              className="relative overflow-hidden rounded-[12%] shadow-lg ring-1 ring-black/10"
              style={{ width: 260, aspectRatio: "280 / 572" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={arteUrl}
                alt="Sua arte na capa"
                className="absolute inset-0 h-full w-full object-fill"
              />
              {/* módulo de câmera realista por cima */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cameraUrl}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
              {/* borda da capa */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={borderUrl}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
            </div>
          ) : (
            <div className="flex h-[460px] items-center justify-center text-sm text-zinc-500">
              Montando a prévia...
            </div>
          )}
        </div>

        <p className="px-4 py-3 text-center text-xs text-zinc-500">
          Visual ilustrativo da capa — a arte impressa é a do editor.
        </p>
      </div>
    </div>
  );
}
