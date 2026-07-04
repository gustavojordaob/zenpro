"use client";

import { useEffect, useMemo, useState } from "react";
import { buildCameraModuleSvgFromSpec, getCameraSpec, getCorAparelho } from "./cameraModules";
import { buildCaseFrameSvgFromSpec, getCaseFrameSpec } from "./caseFrame";
import { getCaseLayout } from "./caseGeometry";
import { ART_CANVAS } from "./caseVisualConstants";
import { exportCaseArtDataUrl, type FotoExportInput } from "./exportCaseArt";
import { usePersonalizacaoVisual } from "./PersonalizacaoVisualContext";
import type { TextoCapinha, Transform } from "./types";

type Props = {
  aberto: boolean;
  fotos: FotoExportInput[];
  corFundo?: string;
  textos: TextoCapinha[];
  modeloId: string;
  modeloRotulo: string;
  onFechar: () => void;
};

export function PreviewCapaModal({
  aberto,
  fotos,
  corFundo,
  textos,
  modeloId,
  modeloRotulo,
  onFechar,
}: Props) {
  const visualCtx = usePersonalizacaoVisual();
  const [arteUrl, setArteUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const frameSpec = visualCtx?.caseFrame ?? getCaseFrameSpec(modeloId);
  const cameraSpec = visualCtx?.camera ?? getCameraSpec(modeloId);
  const corAparelho = visualCtx?.corAparelho ?? getCorAparelho(modeloId);

  const previewLayout = getCaseLayout(ART_CANVAS.previewWidth);
  const { molduraW, molduraH } = previewLayout;

  const borderUrl = useMemo(() => {
    const svg = buildCaseFrameSvgFromSpec(frameSpec, molduraW, molduraH);
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [frameSpec, molduraW, molduraH]);

  const cameraUrl = useMemo(() => {
    const svg = buildCameraModuleSvgFromSpec(
      cameraSpec,
      molduraW,
      molduraH,
      corAparelho,
    );
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [cameraSpec, corAparelho, molduraW, molduraH]);

  const fotosValidas = useMemo(
    () => fotos.filter((f) => f.url.trim()),
    [fotos],
  );

  useEffect(() => {
    if (!aberto) {
      setArteUrl(null);
      setErro(null);
      return;
    }
    if (fotosValidas.length === 0) {
      setErro("Adicione pelo menos uma foto para ver a prévia.");
      return;
    }

    let ativo = true;
    setArteUrl(null);
    setErro(null);

    exportCaseArtDataUrl(fotosValidas, fotosValidas[0].transform, textos, {
      clip: "retangulo",
      exportWidth: ART_CANVAS.previewWidth * 2,
      maskUrl: visualCtx?.maskUrl,
      corFundo,
    })
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
  }, [aberto, fotosValidas, textos, visualCtx?.maskUrl, corFundo]);

  if (!aberto) return null;

  const aspectRatio = `${molduraW} / ${molduraH}`;

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
              style={{ width: 260, aspectRatio }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={arteUrl}
                alt="Sua arte na capa"
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cameraUrl}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
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
          Visual ilustrativo — {fotosValidas.length} foto
          {fotosValidas.length !== 1 ? "s" : ""} empilhada
          {fotosValidas.length !== 1 ? "s" : ""} na capa.
        </p>
      </div>
    </div>
  );
}
