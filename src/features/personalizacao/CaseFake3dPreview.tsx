"use client";

import type { CSSProperties } from "react";
import { CasePreview } from "@/features/personalizacao/CasePreviewLazy";
import { useCaseVisual } from "./useCaseVisual";
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

function rockMaskStyle(maskUrl: string | undefined): CSSProperties {
  if (!maskUrl) return {};
  return {
    WebkitMaskImage: `url(${maskUrl})`,
    maskImage: `url(${maskUrl})`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  };
}

/**
 * Fake 3D — molde H5.
 * Com body-mask: stack FLAT (sem preserve-3d) + máscara no wrapper rotacionado
 * — evita foto “fugindo” na direita. Moldura TPU bem visível (lip opaco).
 */
export function CaseFake3dPreview({
  fotoUrl,
  transform,
  textos,
  modeloId,
  previewWidth = 260,
}: Props) {
  const visual = useCaseVisual(modeloId);
  const aspect =
    visual.molduraAspect && visual.molduraAspect > 0.2
      ? visual.molduraAspect
      : MOLDURA_VISUAL.aspect;
  const radiusFrac = visual.caseFrame?.radius ?? 0.118;
  const bodyMaskUrl = visual.bodyMaskUrl?.trim() || undefined;
  const comMoldeH5 = Boolean(bodyMaskUrl);
  const botoesCss = !comMoldeH5;

  const caseW = previewWidth;
  const caseH = Math.round(caseW / aspect);
  /** Lip TPU visível — a “moldura” entre silhueta e print. */
  const shellPad = comMoldeH5
    ? Math.max(7, Math.round(caseW * 0.028))
    : Math.max(3.5, Math.round(caseW * 0.014));
  const radius = Math.round(caseW * radiusFrac);
  const printRadius = Math.max(6, radius - shellPad);
  const maskCss = rockMaskStyle(bodyMaskUrl);

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

      {/*
        H5: máscara + overflow no MESMO nó da rotação, transform-style flat.
        preserve-3d faz o canvas do Konva escapar da mask na borda direita.
      */}
      <div
        className="relative overflow-hidden"
        style={{
          width: caseW + shellPad * 2,
          height: caseH + shellPad * 2,
          transformStyle: comMoldeH5 ? "flat" : "preserve-3d",
          transform: comMoldeH5
            ? "rotateY(-16deg) rotateX(6deg)"
            : "rotateY(-18deg) rotateX(7deg) rotateZ(-1deg)",
          ...(comMoldeH5 ? maskCss : {}),
          borderRadius: comMoldeH5 ? 0 : undefined,
        }}
      >
        {!comMoldeH5 && (
          <>
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
          </>
        )}

        {/* Casca TPU — moldura opaca ao redor do print */}
        <div
          className="relative h-full w-full overflow-hidden"
          style={{
            borderRadius: comMoldeH5 ? 0 : radius,
            padding: shellPad,
            background: comMoldeH5
              ? `
                linear-gradient(145deg,
                  #f2f2f6 0%,
                  #d8d8e0 28%,
                  #c4c4cc 55%,
                  #b0b0ba 78%,
                  #a0a0aa 100%)
              `
              : "linear-gradient(150deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 32%, rgba(230,230,236,0.28) 70%, rgba(200,200,210,0.35) 100%)",
            boxShadow: comMoldeH5
              ? `
                0 18px 36px rgba(0,0,0,0.28),
                inset 0 1px 0 rgba(255,255,255,0.85),
                inset 0 -2px 4px rgba(0,0,0,0.12),
                inset 0 0 0 1.5px rgba(255,255,255,0.55),
                inset 0 0 0 ${shellPad}px rgba(255,255,255,0.08)
              `
              : `
                0 22px 44px rgba(0,0,0,0.28),
                0 2px 0 rgba(255,255,255,0.75) inset,
                0 -2px 6px rgba(0,0,0,0.08) inset,
                inset 0 0 0 1.25px rgba(255,255,255,0.55)
              `,
            ...(!comMoldeH5 ? maskCss : {}),
          }}
        >
          {/* Print — clip Konva na silhueta H5; sem scale extra */}
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: comMoldeH5 ? Math.max(4, printRadius * 0.85) : printRadius,
              boxShadow: `
                0 0 0 1px rgba(0,0,0,0.22),
                inset 0 0 10px rgba(0,0,0,0.08)
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
              silhouetteClip
            />

            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                borderRadius: comMoldeH5
                  ? Math.max(4, printRadius * 0.85)
                  : printRadius,
                boxShadow: "inset 0 0 14px rgba(0,0,0,0.14)",
              }}
            />
          </div>

          {/* Anel interno da moldura (cristal / lip) */}
          <div
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              inset: Math.max(0, shellPad - 1),
              borderRadius: comMoldeH5
                ? Math.max(5, printRadius * 0.9)
                : printRadius + 0.5,
              boxShadow: comMoldeH5
                ? `
                  inset 0 0 0 1.5px rgba(255,255,255,0.65),
                  inset 0 0 0 3px rgba(0,0,0,0.06),
                  inset 0 2px 3px rgba(255,255,255,0.35)
                `
                : `
                  inset 0 0 0 1px rgba(255,255,255,0.35),
                  inset 0 1px 2px rgba(255,255,255,0.25)
                `,
            }}
          />

          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              borderRadius: comMoldeH5 ? 0 : radius,
              background: comMoldeH5
                ? "linear-gradient(125deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 16%, transparent 34%)"
                : "linear-gradient(118deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 14%, transparent 32%)",
            }}
          />
        </div>

        {botoesCss && (
          <>
            <BotaoLateral
              side="left"
              top="20%"
              height={Math.round(caseH * 0.035)}
            />
            <BotaoLateral
              side="left"
              top="27%"
              height={Math.round(caseH * 0.07)}
            />
            <BotaoLateral
              side="left"
              top="37%"
              height={Math.round(caseH * 0.07)}
            />
            <BotaoLateral
              side="right"
              top="30%"
              height={Math.round(caseH * 0.12)}
            />
          </>
        )}
      </div>
    </div>
  );
}
