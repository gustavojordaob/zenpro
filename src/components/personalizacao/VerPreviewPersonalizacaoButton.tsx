"use client";

import { useState } from "react";
import { RevisarPersonalizacaoModal } from "@/components/personalizacao/RevisarPersonalizacaoModal";
import type { ItemCarrinho } from "@/features/loja/carrinhoTypes";

type Props = {
  item: ItemCarrinho;
};

export function VerPreviewPersonalizacaoButton({ item }: Props) {
  const [aberto, setAberto] = useState(false);

  if (item.tipo !== "personalizada" || !item.personalizacao) {
    return null;
  }

  const p = item.personalizacao;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-2 text-sm font-medium text-emerald-700 hover:text-emerald-800"
      >
        Ver como ficou →
      </button>

      <RevisarPersonalizacaoModal
        aberto={aberto}
        personalizacao={p}
        modeloRotulo={item.rotuloModelo}
        somenteLeitura
        onFechar={() => setAberto(false)}
        onConfirmar={() => setAberto(false)}
      />
    </>
  );
}
