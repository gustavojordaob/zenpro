"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Image as KonvaImage, Layer, Rect, Stage } from "react-konva";
import Konva from "konva";
import { buildCameraModuleSvgFromSpec, getCameraSpec, getCorAparelho } from "./cameraModules";
import { ZenProLogoOverlay } from "./ZenProLogoOverlay";
import { getCaseFrameSpec } from "./caseFrame";
import { CaseTextNode } from "./CaseTextNode";
import { getCaseLayout } from "./caseGeometry";
import { ART_CANVAS, CASE_BORDER } from "./caseVisualConstants";
import { usePersonalizacaoVisual } from "./PersonalizacaoVisualContext";
import type { TextoCapinha, Transform } from "./types";
import { useCapinhaFontsReady } from "./useCapinhaFontsReady";
import { useCorPredominante } from "./useCorPredominante";
import { cameraPunchProps } from "./cameraPunch";
import { useCameraMockDepth } from "./useCameraMockDepth";

const STUDIO_BG = "#ececec";
const EDITOR_PREVIEW_WIDTH = ART_CANVAS.previewWidth;

type Props = {
  fotoUrl: string;
  transform: Transform;
  textos?: TextoCapinha[];
  modeloId?: string;
  /** Largura visual da capinha (px). Transform usa coords do editor (280px). */
  previewWidth?: number;
  /** Sem padding/fundo de studio — para embutir no fake 3D. */
  embedded?: boolean;
  /** Sem anéis CASE_BORDER (a casca TPU do fake 3D faz a borda). */
  hideBorder?: boolean;
  /** @deprecated Canvas 9:16 fixo — não afeta layout. */
  larguraPx?: number;
  /** @deprecated Canvas 9:16 fixo — não afeta layout. */
  alturaPx?: number;
};

function comCacheBuster(src: string): string {
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  return src + (src.includes("?") ? "&" : "?") + "nocors=1";
}

function loadHtmlImage(
  src: string,
  options?: { crossOrigin?: boolean },
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (options?.crossOrigin) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}

function useCanBlur(img: HTMLImageElement | null) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!img) {
      setOk(false);
      return;
    }
    try {
      const c = document.createElement("canvas");
      c.width = 1;
      c.height = 1;
      const ctx = c.getContext("2d");
      if (!ctx) {
        setOk(false);
        return;
      }
      ctx.drawImage(img, 0, 0, 1, 1);
      ctx.getImageData(0, 0, 1, 1);
      setOk(true);
    } catch {
      setOk(false);
    }
  }, [img]);
  return ok;
}

function useHtmlImage(src: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }

    let cancelled = false;
    setImage(null);

    void loadHtmlImage(src, { crossOrigin: true })
      .then((img) => {
        if (!cancelled) setImage(img);
      })
      .catch(() =>
        // Fallback sem CORS. Usa cache-buster para não colidir com a request
        // CORS que falhou (bug comum no Safari mobile: imagem não aparecia).
        loadHtmlImage(comCacheBuster(src)).then((img) => {
          if (!cancelled) setImage(img);
        }),
      )
      .catch(() => {
        if (!cancelled) setImage(null);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return image;
}

export function CasePreview({
  fotoUrl,
  transform,
  textos = [],
  modeloId = "iphone-17-pro-max",
  previewWidth = 120,
  embedded = false,
  hideBorder = false,
}: Props) {
  useCapinhaFontsReady();
  const visualCtx = usePersonalizacaoVisual();
  const fotoImage = useHtmlImage(fotoUrl);
  const bgRef = useRef<Konva.Image>(null);

  const layout = getCaseLayout(EDITOR_PREVIEW_WIDTH);
  const {
    stageWidth: W,
    stageHeight: H,
    molduraX,
    molduraY,
    molduraW,
    molduraH,
    areaUtil,
  } = layout;

  const frame = visualCtx?.caseFrame ?? getCaseFrameSpec(modeloId);
  const radius = frame.radius * molduraW;
  const borderWidth = Math.max(2.5, molduraW * CASE_BORDER.widthRatio);

  const cameraSpec = visualCtx?.camera ?? getCameraSpec(modeloId);
  const rockFrameUrl = visualCtx?.cameraFrameUrl?.trim() || null;
  const rockCameraImage = useHtmlImage(rockFrameUrl);

  const cameraUrl = useMemo(() => {
    if (rockFrameUrl) return null;
    const cor = visualCtx?.corAparelho ?? getCorAparelho(modeloId);
    const svg = buildCameraModuleSvgFromSpec(
      cameraSpec,
      molduraW,
      molduraH,
      cor,
    );
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [
    rockFrameUrl,
    cameraSpec,
    visualCtx?.corAparelho,
    modeloId,
    molduraW,
    molduraH,
  ]);
  const svgCameraImage = useHtmlImage(cameraUrl);
  const cameraImage = rockCameraImage ?? svgCameraImage;
  const corAparelho = visualCtx?.corAparelho ?? getCorAparelho(modeloId);
  const cameraDepth = useCameraMockDepth(cameraImage, corAparelho);

  const clipInset = hideBorder ? Math.max(1, borderWidth * 0.15) : borderWidth;
  const clipRoundRect = (ctx: Konva.Context) => {
    const x = molduraX + clipInset;
    const y = molduraY + clipInset;
    const w = molduraW - clipInset * 2;
    const h = molduraH - clipInset * 2;
    const r = Math.max(0, radius - clipInset);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const corFundo = useCorPredominante(fotoImage, transform, areaUtil);

  const canBlur = useCanBlur(fotoImage);

  const bg = useMemo(() => {
    if (!fotoImage || !canBlur) return null;
    const boost = 1.18;
    const s =
      Math.max(areaUtil.w / fotoImage.width, areaUtil.h / fotoImage.height) * boost;
    const w = fotoImage.width * s;
    const h = fotoImage.height * s;
    return {
      x: areaUtil.x + (areaUtil.w - w) / 2,
      y: areaUtil.y + (areaUtil.h - h) / 2,
      scale: s,
    };
  }, [fotoImage, canBlur, areaUtil]);

  const blurRadius = Math.round(molduraW * 0.16);

  useEffect(() => {
    const node = bgRef.current;
    if (!node || !fotoImage || !bg) return;
    node.cache();
    node.filters([Konva.Filters.Blur]);
    node.blurRadius(blurRadius);
    node.getLayer()?.batchDraw();
    return () => {
      node.clearCache();
    };
  }, [fotoImage, bg, blurRadius]);

  // Embedded (fake 3D): a capa ocupa 100% do canvas — sem studio em volta.
  const scale = embedded
    ? previewWidth / molduraW
    : previewWidth / EDITOR_PREVIEW_WIDTH;
  const displayW = embedded ? previewWidth : Math.round(W * scale);
  const displayH = embedded
    ? Math.round(molduraH * scale)
    : Math.round(H * scale);
  const stageX = embedded ? -molduraX * scale : 0;
  const stageY = embedded ? -molduraY * scale : 0;
  const padOuter = embedded ? 0 : Math.max(4, Math.round(previewWidth * 0.05));

  return (
    <div
      className={`inline-flex shrink-0 overflow-hidden ${embedded ? "" : "rounded-xl"}`}
      style={{
        backgroundColor: embedded ? "transparent" : STUDIO_BG,
        padding: padOuter,
        width: displayW + padOuter * 2,
        height: displayH + padOuter * 2,
      }}
    >
      {/* Escala aplicada no próprio Stage (scaleX/scaleY) — evita bugs de
          `transform: scale` do CSS no Safari mobile (preview sumia / foto
          aparecia no canto). Coordenadas internas seguem a base 280. */}
      <Stage
        width={displayW}
        height={displayH}
        x={stageX}
        y={stageY}
        scaleX={scale}
        scaleY={scale}
        listening={false}
      >
        <Layer listening={false}>
          {!embedded && (
            <Rect x={0} y={0} width={W} height={H} fill={STUDIO_BG} />
          )}
        </Layer>
        <Layer listening={false}>
          {fotoImage && (
            <>
              {/* Arte só na silhueta da capa */}
              <Group clipFunc={clipRoundRect}>
                <Rect
                  x={areaUtil.x}
                  y={areaUtil.y}
                  width={areaUtil.w}
                  height={areaUtil.h}
                  fill={corFundo}
                  listening={false}
                />
                {bg && (
                  <KonvaImage
                    ref={bgRef}
                    image={fotoImage}
                    x={bg.x}
                    y={bg.y}
                    scaleX={bg.scale}
                    scaleY={bg.scale}
                    listening={false}
                  />
                )}
                <KonvaImage
                  image={fotoImage}
                  x={transform.x}
                  y={transform.y}
                  scaleX={transform.scale}
                  scaleY={transform.scale}
                  rotation={transform.rotation}
                  listening={false}
                />
                {textos.map((texto) => (
                  <CaseTextNode
                    key={texto.id}
                    texto={texto}
                    selecionado={false}
                    editavel={false}
                    onChange={() => {}}
                    onSelect={() => {}}
                  />
                ))}
              </Group>

              {/* Molde H5: fura a foto no módulo da câmera */}
              {cameraImage && (
                <KonvaImage
                  {...cameraPunchProps(cameraImage, {
                    molduraX,
                    molduraY,
                    molduraW,
                    molduraH,
                  })}
                />
              )}

              <ZenProLogoOverlay
                cameraSpec={cameraSpec}
                molduraX={molduraX}
                molduraY={molduraY}
                molduraW={molduraW}
                molduraH={molduraH}
              />
              {cameraImage && (
                <>
                  {cameraDepth && (
                    <>
                      <KonvaImage
                        image={cameraDepth.contactShadow}
                        x={molduraX}
                        y={molduraY + Math.max(1, molduraW * 0.008)}
                        width={molduraW}
                        height={molduraH}
                        listening={false}
                      />
                      <KonvaImage
                        image={cameraDepth.bodyFill}
                        x={molduraX}
                        y={molduraY}
                        width={molduraW}
                        height={molduraH}
                        listening={false}
                      />
                    </>
                  )}
                  <KonvaImage
                    image={cameraImage}
                    x={molduraX}
                    y={molduraY}
                    width={molduraW}
                    height={molduraH}
                    listening={false}
                  />
                </>
              )}
              {!hideBorder && (
                <>
                  <Rect
                    x={molduraX + borderWidth / 2}
                    y={molduraY + borderWidth / 2}
                    width={molduraW - borderWidth}
                    height={molduraH - borderWidth}
                    cornerRadius={radius}
                    stroke={CASE_BORDER.outer}
                    strokeWidth={borderWidth}
                    shadowColor="#000000"
                    shadowBlur={Math.max(8, molduraW * 0.04)}
                    shadowOffsetY={Math.max(2, molduraW * 0.012)}
                    shadowOpacity={0.28}
                    listening={false}
                  />
                  <Rect
                    x={molduraX + borderWidth * 0.78}
                    y={molduraY + borderWidth * 0.78}
                    width={molduraW - borderWidth * 1.56}
                    height={molduraH - borderWidth * 1.56}
                    cornerRadius={Math.max(0, radius - borderWidth * 0.32)}
                    stroke={CASE_BORDER.inner}
                    strokeWidth={Math.max(1.5, borderWidth * 0.45)}
                    listening={false}
                  />
                </>
              )}
            </>
          )}
        </Layer>
      </Stage>
    </div>
  );
}
