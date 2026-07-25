"use client";

import { useMemo, useState } from "react";
import { CasePreview } from "@/features/personalizacao/CasePreviewLazy";
import {
  CaseFake3dPreview,
  isFake3dSupported,
} from "@/features/personalizacao/CaseFake3dPreview";
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

        {podeFake3d && (
          <div className="flex items-center justify-center gap-2 border-b border-zinc-100 px-4 py-2">
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
          className="flex items-center justify-center p-6"
          style={{
            background:
              podeFake3d && modoFake3d
                ? "radial-gradient(ellipse at 50% 40%, #f4f4f5 0%, #e4e4e7 70%, #d4d4d8 100%)"
                : "#ececec",
          }}
        >
          {!principal ? (
            <div className="flex h-[420px] items-center justify-center px-6 text-center text-sm text-red-600">
              Adicione pelo menos uma foto para ver a prévia.
            </div>
          ) : podeFake3d && modoFake3d ? (
            <CaseFake3dPreview
              fotoUrl={principal.url}
              transform={principal.transform}
              textos={textos}
              modeloId={modeloId}
              previewWidth={240}
            />
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
