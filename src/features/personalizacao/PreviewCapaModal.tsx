"use client";

import { useMemo } from "react";
import { CasePreview } from "@/features/personalizacao/CasePreviewLazy";
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

/**
 * Prévia ilustrativa no editor — reutiliza CasePreview (mesmo render do
 * carrinho/checkout) para evitar desalinhamento arte×borda×câmera.
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

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Prévia da case
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
          {!principal ? (
            <div className="flex h-[420px] items-center justify-center px-6 text-center text-sm text-red-600">
              Adicione pelo menos uma foto para ver a prévia.
            </div>
          ) : (
            <CasePreview
              fotoUrl={principal.url}
              transform={principal.transform}
              textos={textos}
              modeloId={modeloId}
              previewWidth={280}
            />
          )}
        </div>

        <p className="px-4 py-3 text-center text-xs text-zinc-500">
          Visual ilustrativo — {fotosValidas.length} foto
          {fotosValidas.length !== 1 ? "s" : ""} na case.
        </p>
      </div>
    </div>
  );
}
