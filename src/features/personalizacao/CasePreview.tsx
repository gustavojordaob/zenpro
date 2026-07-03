"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Image as KonvaImage, Layer, Rect, Stage } from "react-konva";
import Konva from "konva";
import { buildCameraModuleSvgFromSpec, getCameraSpec, getCorAparelho } from "./cameraModules";
import { getCaseFrameSpec } from "./caseFrame";
import { CaseTextNode } from "./CaseTextNode";
import { getCaseLayout } from "./caseGeometry";
import { IPHONE_ASSETS } from "./moldura";
import { usePersonalizacaoVisual } from "./PersonalizacaoVisualContext";
import type { TextoCapinha, Transform } from "./types";
import { useCapinhaFontsReady } from "./useCapinhaFontsReady";
import { useCorPredominante } from "./useCorPredominante";

const STUDIO_BG = "#ececec";
const BORDER_STROKE = "#cbe6fb";
const EDITOR_PREVIEW_WIDTH = IPHONE_ASSETS.previewWidth;

type Props = {
  fotoUrl: string;
  transform: Transform;
  textos?: TextoCapinha[];
  modeloId?: string;
  /** Largura visual da capinha (px). Transform usa coords do editor (280px). */
  previewWidth?: number;
  /** Dimensões físicas do modelo — definem a proporção (aspecto) da capa. */
  larguraPx?: number;
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
  larguraPx,
  alturaPx,
}: Props) {
  useCapinhaFontsReady();
  const visualCtx = usePersonalizacaoVisual();
  const fotoImage = useHtmlImage(fotoUrl);
  const bgRef = useRef<Konva.Image>(null);

  const lw = visualCtx?.larguraPx ?? larguraPx ?? IPHONE_ASSETS.width;
  const lh = visualCtx?.alturaPx ?? alturaPx ?? IPHONE_ASSETS.height;
  const layout = getCaseLayout(EDITOR_PREVIEW_WIDTH, lw, lh);
  const {
    stageWidth: W,
    stageHeight: H,
    molduraX,
    molduraY,
    molduraW,
    molduraH,
  } = layout;

  const frame = visualCtx?.caseFrame ?? getCaseFrameSpec(modeloId);
  const radius = frame.radius * molduraW;
  const borderWidth = Math.max(2, molduraW * 0.02);

  const cameraUrl = useMemo(() => {
    const cameraSpec = visualCtx?.camera ?? getCameraSpec(modeloId);
    const cor = visualCtx?.corAparelho ?? getCorAparelho(modeloId);
    const svg = buildCameraModuleSvgFromSpec(
      cameraSpec,
      molduraW,
      molduraH,
      cor,
    );
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [visualCtx, modeloId, molduraW, molduraH]);
  const cameraImage = useHtmlImage(cameraUrl);

  const clipInset = borderWidth;
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

  const corFundo = useCorPredominante(fotoImage, transform, {
    x: molduraX,
    y: molduraY,
    w: molduraW,
    h: molduraH,
  });

  const canBlur = useCanBlur(fotoImage);

  const bg = useMemo(() => {
    if (!fotoImage || !canBlur) return null;
    const boost = 1.18;
    const s =
      Math.max(molduraW / fotoImage.width, molduraH / fotoImage.height) * boost;
    const w = fotoImage.width * s;
    const h = fotoImage.height * s;
    return {
      x: molduraX + (molduraW - w) / 2,
      y: molduraY + (molduraH - h) / 2,
      scale: s,
    };
  }, [fotoImage, canBlur, molduraX, molduraY, molduraW, molduraH]);

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

  const scale = previewWidth / EDITOR_PREVIEW_WIDTH;
  const displayW = Math.round(W * scale);
  const displayH = Math.round(H * scale);
  const padOuter = Math.max(4, Math.round(previewWidth * 0.05));

  return (
    <div
      className="inline-flex shrink-0 overflow-hidden rounded-xl"
      style={{
        backgroundColor: STUDIO_BG,
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
        scaleX={scale}
        scaleY={scale}
        listening={false}
      >
        <Layer listening={false}>
          <Rect x={0} y={0} width={W} height={H} fill={STUDIO_BG} />
        </Layer>
        <Layer listening={false}>
              {fotoImage && (
                <Group>
                  <Group clipFunc={clipRoundRect}>
                    <Rect
                      x={molduraX}
                      y={molduraY}
                      width={molduraW}
                      height={molduraH}
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

                  {cameraImage && (
                    <KonvaImage
                      image={cameraImage}
                      x={molduraX}
                      y={molduraY}
                      width={molduraW}
                      height={molduraH}
                      listening={false}
                    />
                  )}
                  <Rect
                    x={molduraX + borderWidth / 2}
                    y={molduraY + borderWidth / 2}
                    width={molduraW - borderWidth}
                    height={molduraH - borderWidth}
                    cornerRadius={radius}
                    stroke={BORDER_STROKE}
                    strokeWidth={borderWidth}
                    listening={false}
                  />
                </Group>
              )}
        </Layer>
      </Stage>
    </div>
  );
}
