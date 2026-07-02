"use client";

import type { LojaPublica } from "@/features/multitenant/lojaPublicaService";

type Props = {
  loja: LojaPublica;
};

/** Faixa no topo do site público identificando o revendedor. */
export function LojaRevendedorStrip({ loja }: Props) {
  const cor = loja.config.cor ?? "#18181b";
  const whatsapp = loja.config.whatsapp?.replace(/\D/g, "");

  return (
    <div
      className="border-b border-zinc-200 px-4 py-2 text-center text-xs text-zinc-700 sm:text-sm"
      style={{ backgroundColor: `${cor}12` }}
    >
      <span className="font-medium" style={{ color: cor }}>
        Revendedor autorizado · {loja.nome}
      </span>
      <span className="mx-2 hidden text-zinc-400 sm:inline">·</span>
      <span className="hidden text-zinc-600 sm:inline">
        Catálogo oficial Zen Pro nesta loja
      </span>
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="ml-2 font-semibold underline"
          style={{ color: cor }}
        >
          WhatsApp
        </a>
      )}
    </div>
  );
}
