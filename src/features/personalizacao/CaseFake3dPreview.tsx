"use client";

import { CasePreview } from "@/features/personalizacao/CasePreviewLazy";
import { MOLDURA_VISUAL } from "./caseVisualConstants";
import type { TextoCapinha, Transform } from "./types";

/** Foldables: proporção diferente — fake 3D genérico não serve. */
const FAKE3D_EXCLUIDOS = /(?:^|-)(z-?flip|z-?fold|flip|fold)(?:-|$)/i;

type Props = {
  fotoUrl: string;
  transform: Transform;
  textos: TextoCapinha[];
  modeloId: string;
  previewWidth?: number;
};

/** Fake 3D no "Ver na case" — todos os modelos de capa, exceto fold/flip. */
export function isFake3dSupported(modeloId: string): boolean {
  const id = modeloId.trim();
  if (!id) return false;
  return !FAKE3D_EXCLUIDOS.test(id);
}

function BotaoLateral({
  side,
  top,
  height,
  width = 4.5,
}: {
  side: "left" | "right";
  top: string;
  height: number;
  width?: number;
}) {
  const isLeft = side === "left";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        [isLeft ? "left" : "right"]: -width + 0.5,
        top,
        width,
        height,
        borderRadius: 2.5,
        background: isLeft
          ? "linear-gradient(90deg, #9a9aa3 0%, #e8e8ee 45%, #c4c4cc 100%)"
          : "linear-gradient(90deg, #c4c4cc 0%, #e8e8ee 55%, #9a9aa3 100%)",
        boxShadow: `
          ${isLeft ? "-1px" : "1px"} 1px 2px rgba(0,0,0,0.28),
          inset 0 1px 0 rgba(255,255,255,0.65),
          inset 0 -1px 0 rgba(0,0,0,0.18)
        `,
        transform: "translateZ(3px)",
      }}
    />
  );
}

/**
 * Protótipo local de fake 3D (capas padrão; exclui fold/flip).
 * Print full-bleed + casca TPU com volume, luz e botões.
 */
export function CaseFake3dPreview({
  fotoUrl,
  transform,
  textos,
  modeloId,
  previewWidth = 260,
}: Props) {
  const caseW = previewWidth;
  const caseH = Math.round(caseW / MOLDURA_VISUAL.aspect);
  const shellPad = Math.max(3.5, Math.round(caseW * 0.014));
  const radius = Math.round(caseW * 0.118);
  const printRadius = Math.max(7, radius - shellPad);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: caseW + 88,
        height: caseH + 72,
        perspective: "1400px",
        perspectiveOrigin: "48% 38%",
      }}
    >
      {/* Sombra de contato no chão */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[100%]"
        style={{
          bottom: 6,
          width: caseW * 0.78,
          height: 26,
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.12) 42%, rgba(0,0,0,0) 70%)",
          filter: "blur(7px)",
          transform: "translateX(8px)",
        }}
      />

      <div
        className="relative"
        style={{
          width: caseW + shellPad * 2,
          height: caseH + shellPad * 2,
          transformStyle: "preserve-3d",
          transform: "rotateY(-20deg) rotateX(8deg) rotateZ(-1.2deg)",
        }}
      >
        {/* Face traseira (espessura) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: radius,
            transform: "translateZ(-9px) translateX(1px)",
            background:
              "linear-gradient(160deg, #d8d8de 0%, #b4b4bc 55%, #9c9ca4 100%)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
          }}
        />

        {/* Lado direito (espessura) */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: 10,
            bottom: 10,
            right: 0,
            width: 10,
            borderRadius: `0 ${radius}px ${radius}px 0`,
            transform: "translateZ(-5px) rotateY(90deg)",
            transformOrigin: "right center",
            background:
              "linear-gradient(180deg, rgba(250,250,252,0.85) 0%, rgba(210,210,218,0.9) 40%, rgba(150,150,160,0.95) 100%)",
            boxShadow: "inset 1px 0 0 rgba(255,255,255,0.5)",
          }}
        />

        {/* Base inferior (espessura) */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: 12,
            right: 12,
            bottom: 0,
            height: 8,
            borderRadius: `0 0 ${radius}px ${radius}px`,
            transform: "translateZ(-4px) rotateX(-88deg)",
            transformOrigin: "center bottom",
            background:
              "linear-gradient(90deg, #c8c8d0 0%, #e4e4ea 50%, #b0b0b8 100%)",
          }}
        />

        {/* Casca TPU frontal */}
        <div
          className="relative overflow-hidden"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: radius,
            padding: shellPad,
            background:
              "linear-gradient(150deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 32%, rgba(230,230,236,0.28) 70%, rgba(200,200,210,0.35) 100%)",
            boxShadow: `
              0 22px 44px rgba(0,0,0,0.28),
              0 2px 0 rgba(255,255,255,0.75) inset,
              0 -2px 6px rgba(0,0,0,0.08) inset,
              inset 0 0 0 1.25px rgba(255,255,255,0.55),
              inset 0 0 18px rgba(255,255,255,0.12)
            `,
            transform: "translateZ(0.5px)",
          }}
        >
          {/* Print */}
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: printRadius,
              boxShadow: `
                0 0 0 0.6px rgba(0,0,0,0.18),
                inset 0 0 10px rgba(0,0,0,0.06)
              `,
            }}
          >
            <CasePreview
              fotoUrl={fotoUrl}
              transform={transform}
              textos={textos}
              modeloId={modeloId}
              previewWidth={caseW}
              embedded
              hideBorder
            />

            {/* AO suave nos cantos do print */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                borderRadius: printRadius,
                boxShadow: "inset 0 0 14px rgba(0,0,0,0.12)",
              }}
            />
          </div>

          {/* Lip interno (cristal) */}
          <div
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              inset: shellPad - 0.5,
              borderRadius: printRadius + 0.5,
              boxShadow: `
                inset 0 0 0 1px rgba(255,255,255,0.35),
                inset 0 1px 2px rgba(255,255,255,0.25)
              `,
            }}
          />

          {/* Specular topo-esquerda */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              borderRadius: radius,
              background:
                "linear-gradient(118deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 14%, transparent 32%)",
            }}
          />

          {/* Specular fino na borda direita */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-6 bottom-6 right-0 w-[2px]"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.55) 30%, rgba(255,255,255,0.2) 70%, transparent 100%)",
              opacity: 0.7,
            }}
          />
        </div>

        <BotaoLateral side="left" top="20%" height={Math.round(caseH * 0.035)} />
        <BotaoLateral side="left" top="27%" height={Math.round(caseH * 0.07)} />
        <BotaoLateral side="left" top="37%" height={Math.round(caseH * 0.07)} />
        <BotaoLateral side="right" top="30%" height={Math.round(caseH * 0.12)} />
      </div>
    </div>
  );
}
