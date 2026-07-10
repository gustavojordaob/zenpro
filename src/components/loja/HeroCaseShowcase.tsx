"use client";

import Link from "next/link";
import { CasePreview } from "@/features/personalizacao/CasePreviewLazy";
import type { TextoCapinha, Transform } from "@/features/personalizacao/types";

const DEMO_FOTO = "/brand/hero-demo.jpg";

const DEMO_TRANSFORM: Transform = {
  x: -8,
  y: 52,
  scale: 0.52,
  rotation: 0,
};

const DEMO_TEXTOS: TextoCapinha[] = [
  {
    id: "hero-demo",
    conteudo: "Seu nome ✨",
    x: 140,
    y: 368,
    fontSize: 22,
    fontId: "pacifico",
    fill: "#ffffff",
    rotation: 0,
    align: "center",
    fontStyle: "bold",
  },
];

export function HeroCaseShowcase() {
  return (
    <Link
      href="/#personalizar"
      className="group flex flex-col items-center gap-3 outline-none"
    >
      <div className="relative rounded-[2rem] bg-[#ececec] p-4 shadow-xl ring-1 ring-zinc-300/60 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-focus-visible:ring-2 group-focus-visible:ring-zinc-900">
        <CasePreview
          fotoUrl={DEMO_FOTO}
          transform={DEMO_TRANSFORM}
          textos={DEMO_TEXTOS}
          previewWidth={220}
        />
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white opacity-0 transition group-hover:opacity-100">
          Personalizar
        </span>
      </div>
      <p className="max-w-[220px] text-center text-xs text-zinc-500 transition group-hover:text-zinc-800">
        Preview real do editor — foto, texto e emojis na case
      </p>
    </Link>
  );
}
