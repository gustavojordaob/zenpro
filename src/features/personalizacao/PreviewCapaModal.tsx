"use client";

import { useEffect, useMemo, useState } from "react";
import { CasePreview } from "@/features/personalizacao/CasePreviewLazy";
import {
  CaseFake3dPreview,
  isFake3dSupported,
} from "@/features/personalizacao/CaseFake3dPreview";
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

/** Altura reservada p/ header + toggle + rodapé + paddings + safe-area. */
const CHROME_VH = 210;
/** Margem extra do fake 3D (sombra / perspectiva). */
const FAKE3D_EXTRA_H = 72;

/**
 * Prévia ilustrativa no editor — reutiliza CasePreview (mesmo render do
 * carrinho/checkout) para evitar desalinhamento arte×borda×câmera.
 * Capa padrão: opção local de fake 3D (exceto fold/flip).
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
  const podeFake3d = isFake3dSupported(modeloId);
  const [modoFake3d, setModoFake3d] = useState(true);
  const [previewWidth, setPreviewWidth] = useState(200);

  useEffect(() => {
    if (!aberto) return;

    const recalcular = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const vw = window.visualViewport?.width ?? window.innerWidth;
      const disponivelH = Math.max(180, vh - CHROME_VH);
      const usarFake = podeFake3d && modoFake3d;
      const alturaUtil = usarFake
        ? Math.max(140, disponivelH - FAKE3D_EXTRA_H)
        : disponivelH;
      const porAltura = alturaUtil * MOLDURA_VISUAL.aspect;
      const porLargura = Math.min(vw - 56, usarFake ? 220 : 260);
      setPreviewWidth(
        Math.round(Math.max(130, Math.min(porAltura, porLargura))),
      );
    };

    recalcular();
    window.addEventListener("resize", recalcular);
    window.visualViewport?.addEventListener("resize", recalcular);
    return () => {
      window.removeEventListener("resize", recalcular);
      window.visualViewport?.removeEventListener("resize", recalcular);
    };
  }, [aberto, modoFake3d, podeFake3d]);

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

        {podeFake3d && (
          <div className="flex shrink-0 items-center justify-center gap-2 border-b border-zinc-100 px-4 py-2">
            <button
              type="button"
              onClick={() => setModoFake3d(true)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                modoFake3d
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              Na capinha
            </button>
            <button
              type="button"
              onClick={() => setModoFake3d(false)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                !modoFake3d
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              Vista frontal
            </button>
          </div>
        )}

        <div
          className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 py-3 sm:px-6 sm:py-5"
          style={{
            background:
              podeFake3d && modoFake3d
                ? "radial-gradient(ellipse at 50% 40%, #f4f4f5 0%, #e4e4e7 70%, #d4d4d8 100%)"
                : "#ececec",
          }}
        >
          {!principal ? (
            <div className="flex max-h-full items-center justify-center px-6 text-center text-sm text-red-600">
              Adicione pelo menos uma foto para ver a prévia.
            </div>
          ) : podeFake3d && modoFake3d ? (
            <CaseFake3dPreview
              fotoUrl={principal.url}
              transform={principal.transform}
              textos={textos}
              modeloId={modeloId}
              previewWidth={previewWidth}
            />
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
          {podeFake3d && modoFake3d
            ? "Visual ilustrativo da personalização aplicada na capinha."
            : `Visual ilustrativo — ${fotosValidas.length} foto${
                fotosValidas.length !== 1 ? "s" : ""
              } na case.`}
        </p>
      </div>
    </div>
  );
}
