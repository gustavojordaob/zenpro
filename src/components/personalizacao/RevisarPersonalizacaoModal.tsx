"use client";

import { CasePreview } from "@/features/personalizacao/CasePreviewLazy";
import type { Personalizacao } from "@/features/personalizacao/types";

type Props = {
  aberto: boolean;
  personalizacao: Pick<
    Personalizacao,
    "fotoUrl" | "transform" | "textos" | "titulo" | "descricao"
  >;
  modeloRotulo: string;
  modeloId?: string;
  confirmando?: boolean;
  tituloBotao?: string;
  somenteLeitura?: boolean;
  onFechar: () => void;
  onConfirmar: () => void;
};

export function RevisarPersonalizacaoModal({
  aberto,
  personalizacao,
  modeloRotulo,
  modeloId,
  confirmando = false,
  tituloBotao = "Confirmar e continuar",
  somenteLeitura = false,
  onFechar,
  onConfirmar,
}: Props) {
  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="revisar-titulo"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="border-b border-zinc-200 px-5 py-4">
          <h2 id="revisar-titulo" className="text-lg font-bold text-zinc-900">
            Como ficou sua case?
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Confira o preview antes de finalizar. {modeloRotulo}
          </p>
        </div>

        <div className="flex flex-col items-center bg-zinc-50 px-5 py-6">
          <CasePreview
            fotoUrl={personalizacao.fotoUrl}
            transform={personalizacao.transform}
            textos={personalizacao.textos}
            modeloId={modeloId}
            previewWidth={260}
          />
        </div>

        {(personalizacao.titulo || personalizacao.descricao) && (
          <div className="space-y-2 border-t border-zinc-100 px-5 py-4 text-sm">
            {personalizacao.titulo && (
              <p>
                <span className="text-zinc-500">Nome: </span>
                <span className="font-medium text-zinc-900">
                  {personalizacao.titulo}
                </span>
              </p>
            )}
            {personalizacao.descricao && (
              <div>
                <p className="text-zinc-500">Descrição:</p>
                <p className="mt-1 whitespace-pre-wrap text-zinc-800">
                  {personalizacao.descricao}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="pb-safe flex flex-col gap-2 border-t border-zinc-200 px-5 py-4 sm:flex-row-reverse sm:pb-4">
          {somenteLeitura ? (
            <button
              type="button"
              onClick={onFechar}
              className="rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Fechar
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={confirmando}
                onClick={onConfirmar}
                className="btn-gold rounded-xl py-3 text-sm disabled:opacity-50"
              >
                {confirmando ? "Salvando..." : tituloBotao}
              </button>
              <button
                type="button"
                disabled={confirmando}
                onClick={onFechar}
                className="rounded-xl border border-zinc-300 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Voltar e editar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
