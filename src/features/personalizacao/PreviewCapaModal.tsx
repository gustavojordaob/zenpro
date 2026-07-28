"use client";

import { useEffect, useMemo, useState } from "react";
import { CasePreview } from "@/features/personalizacao/CasePreviewLazy";
import { useCaseVisual } from "./useCaseVisual";
import { MOLDURA_VISUAL } from "./caseVisualConstants";
import type { FotoExportInput } from "./exportCaseArt";
import type { TextoCapinha } from "./types";

type Props = {
  aberto: boolean;
  fotos: FotoExportInput[];
  corFundo?: string;
  textos: TextoCapinha[];
  modeloId: string;
  modeloRotulo: string;
  onFechar: () => void;
};

/** Altura reservada p/ header + rodapé + paddings + safe-area. */
const CHROME_VH = 160;

/**
 * Prévia ilustrativa — só vista frontal (mesmo CasePreview do carrinho/checkout).
 */
export function PreviewCapaModal({
  aberto,
  fotos,
  textos,
  modeloId,
  modeloRotulo,
  onFechar,
}: Props) {
  const fotosValidas = useMemo(
    () => fotos.filter((f) => f.url.trim()),
    [fotos],
  );
  const principal = fotosValidas[0];
  const visual = useCaseVisual(modeloId);
  const molduraAspect =
    visual.molduraAspect && visual.molduraAspect > 0.2
      ? visual.molduraAspect
      : MOLDURA_VISUAL.aspect;
  const [previewWidth, setPreviewWidth] = useState(200);

  useEffect(() => {
    if (!aberto) return;

    const recalcular = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const vw = window.visualViewport?.width ?? window.innerWidth;
      const alturaUtil = Math.max(180, vh - CHROME_VH);
      const porAltura = alturaUtil * molduraAspect;
      const porLargura = Math.min(vw - 56, 280);
      setPreviewWidth(
        Math.round(Math.max(140, Math.min(porAltura, porLargura))),
      );
    };

    recalcular();
    window.addEventListener("resize", recalcular);
    window.visualViewport?.addEventListener("resize", recalcular);
    return () => {
      window.removeEventListener("resize", recalcular);
      window.visualViewport?.removeEventListener("resize", recalcular);
    };
  }, [aberto, molduraAspect]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[100dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[min(100dvh,920px)] sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div className="min-w-0 pr-2">
            <h2 className="text-base font-semibold text-zinc-900">
              Prévia da case
            </h2>
            <p className="truncate text-xs text-zinc-500">{modeloRotulo}</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            Fechar
          </button>
        </div>

        <div
          className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 py-3 sm:px-6 sm:py-5"
          style={{ background: "#ececec" }}
        >
          {!principal ? (
            <div className="flex max-h-full items-center justify-center px-6 text-center text-sm text-red-600">
              Adicione pelo menos uma foto para ver a prévia.
            </div>
          ) : (
            <CasePreview
              fotoUrl={principal.url}
              transform={principal.transform}
              textos={textos}
              modeloId={modeloId}
              previewWidth={previewWidth}
            />
          )}
        </div>

        <p className="shrink-0 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs text-zinc-500">
          Visual ilustrativo — {fotosValidas.length} foto
          {fotosValidas.length !== 1 ? "s" : ""} na case.
        </p>
      </div>
    </div>
  );
}
