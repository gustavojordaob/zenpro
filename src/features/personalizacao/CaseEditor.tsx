"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Group, Image as KonvaImage, Layer, Rect, Stage } from "react-konva";
import Konva from "konva";
import { buildCameraModuleSvgFromSpec, getCameraSpec, getCorAparelho } from "./cameraModules";
import { ZenProLogoOverlay } from "./ZenProLogoOverlay";
import { CaseTextNode } from "./CaseTextNode";
import { getCaseFrameSpec } from "./caseFrame";
import { getCaseLayout } from "./caseGeometry";
import { usePersonalizacaoVisual } from "./PersonalizacaoVisualContext";
import type { ModeloCelular, TextoCapinha, Transform } from "./types";
import { useCapinhaFontsReady } from "./useCapinhaFontsReady";
import { DEFAULT_TRANSFORM } from "./types";
import {
  DEFAULT_COR_FUNDO_CAPINHA,
  ZOOM_MAX,
  ZOOM_MIN,
  CASE_BORDER,
} from "./caseVisualConstants";
import {
  fitImageToArea,
  getLayoutSlots,
} from "./fotoLayoutPresets";
import {
  cameraClearLipProps,
  cameraContactShadowProps,
  cameraPunchProps,
} from "./cameraPunch";

const STUDIO_BG = "#ececec";
const PLACEHOLDER_FILL = "#e4e4e7";

export type FotoCamada = {
  id: string;
  url: string;
  transform: Transform;
};

type Props = {
  modelo: ModeloCelular;
  fotos: FotoCamada[];
  fotoAtivaId: string | null;
  corFundo?: string;
  textos: TextoCapinha[];
  textoSelecionadoId: string | null;
  onTransformChange: (id: string, transform: Transform) => void;
  onFotoInicializada?: (id: string, transform: Transform) => void;
  onTextosChange: (textos: TextoCapinha[]) => void;
  onTextoSelecionadoChange: (id: string | null) => void;
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
    if (options?.crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}

function useHtmlImage(src: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!src) {
      setImage(null);
      setLoadError(false);
      return;
    }

    setImage(null);
    setLoadError(false);
    let cancelled = false;

    void loadHtmlImage(src, { crossOrigin: true })
      .then((img) => {
        if (!cancelled) {
          setImage(img);
          setLoadError(false);
        }
      })
      .catch(() =>
        loadHtmlImage(comCacheBuster(src)).then((img) => {
          if (!cancelled) {
            setImage(img);
            setLoadError(false);
          }
        }),
      )
      .catch(() => {
        if (!cancelled) {
          setImage(null);
          setLoadError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return { image, loadError };
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

function isTransformPadrao(t: Transform): boolean {
  return (
    t.x === DEFAULT_TRANSFORM.x &&
    t.y === DEFAULT_TRANSFORM.y &&
    t.scale === DEFAULT_TRANSFORM.scale &&
    t.rotation === DEFAULT_TRANSFORM.rotation
  );
}

const OVERSCAN = 2;

/** Mantém posição dentro da área sem forçar escala mínima (permite zoom out). */
function clampPosicao(
  img: HTMLImageElement,
  area: { x: number; y: number; w: number; h: number },
  transform: Transform,
): Transform {
  const rad = (transform.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const acos = Math.abs(cos);
  const asin = Math.abs(sin);
  const scale = transform.scale;
  const sw = img.width * scale;
  const sh = img.height * scale;

  const corners = [
    [0, 0],
    [sw, 0],
    [sw, sh],
    [0, sh],
  ].map(([px, py]) => [px * cos - py * sin, px * sin + py * cos]);
  const minOffX = Math.min(...corners.map((c) => c[0]));
  const minOffY = Math.min(...corners.map((c) => c[1]));
  const bw = sw * acos + sh * asin;
  const bh = sw * asin + sh * acos;

  const slackX = area.w * OVERSCAN;
  const slackY = area.h * OVERSCAN;
  const xMax = area.x - minOffX + slackX;
  const xMin = area.x + area.w - bw - minOffX - slackX;
  const yMax = area.y - minOffY + slackY;
  const yMin = area.y + area.h - bh - minOffY - slackY;

  const x =
    xMin > xMax ? (xMin + xMax) / 2 : Math.min(xMax, Math.max(xMin, transform.x));
  const y =
    yMin > yMax ? (yMin + yMax) / 2 : Math.min(yMax, Math.max(yMin, transform.y));

  return { x, y, scale, rotation: transform.rotation };
}

function clampEscala(scale: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale));
}

type FotoLayerProps = {
  url: string;
  transform: Transform;
  areaSlot: { x: number; y: number; w: number; h: number };
  areaArraste: { x: number; y: number; w: number; h: number };
  ativa: boolean;
  opaca: boolean;
  onTransformChange: (next: Transform) => void;
  onInicializar: (next: Transform) => void;
};

function FotoLayer({
  url,
  transform,
  areaSlot,
  areaArraste,
  ativa,
  opaca,
  onTransformChange,
  onInicializar,
}: FotoLayerProps) {
  const { image } = useHtmlImage(url);
  const inicializada = useRef(false);
  const slotKey = `${areaSlot.x},${areaSlot.y},${areaSlot.w},${areaSlot.h}`;

  useEffect(() => {
    if (!image) return;
    if (inicializada.current) return;
    inicializada.current = true;
    if (isTransformPadrao(transform)) {
      onInicializar(fitImageToArea(image, areaSlot));
    }
  }, [image, areaSlot, slotKey, transform, onInicializar]);

  useEffect(() => {
    inicializada.current = false;
  }, [url, slotKey]);

  if (!image) return null;

  return (
    <KonvaImage
      image={image}
      x={transform.x}
      y={transform.y}
      scaleX={transform.scale}
      scaleY={transform.scale}
      rotation={transform.rotation}
      opacity={opaca ? (ativa ? 1 : 0.55) : 1}
      draggable={ativa}
      listening={ativa}
      onDragMove={(e) => {
        if (!ativa || !image) return;
        const c = clampPosicao(image, areaArraste, {
          ...transform,
          x: e.target.x(),
          y: e.target.y(),
        });
        e.target.x(c.x);
        e.target.y(c.y);
      }}
      onDragEnd={(e) => {
        if (!ativa || !image) return;
        const c = clampPosicao(image, areaArraste, {
          ...transform,
          x: e.target.x(),
          y: e.target.y(),
        });
        e.target.x(c.x);
        e.target.y(c.y);
        onTransformChange(c);
      }}
      onWheel={(e) => {
        if (!ativa) return;
        e.evt.preventDefault();
        const fator = e.evt.deltaY > 0 ? 0.92 : 1.08;
        const nextScale = clampEscala(transform.scale * fator);
        onTransformChange({ ...transform, scale: nextScale });
      }}
      onClick={() => ativa}
      onTap={() => ativa}
    />
  );
}

export function CaseEditor({
  modelo,
  fotos,
  fotoAtivaId,
  corFundo = DEFAULT_COR_FUNDO_CAPINHA,
  textos,
  textoSelecionadoId,
  onTransformChange,
  onFotoInicializada,
  onTextosChange,
  onTextoSelecionadoChange,
}: Props) {
  useCapinhaFontsReady();
  const visualCtx = usePersonalizacaoVisual();
  const wrapRef = useRef<HTMLDivElement>(null);

  const layout = getCaseLayout();
  const {
    stageWidth: W,
    stageHeight: H,
    molduraX,
    molduraY,
    molduraW,
    molduraH,
    areaUtil,
    areaMoldura,
  } = layout;

  const [fitScale, setFitScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const INNER_PAD = 24;
    const atualizar = () => {
      const disponivel = el.clientWidth - INNER_PAD;
      setFitScale(disponivel > 0 ? Math.min(1, disponivel / W) : 1);
    };
    atualizar();
    const ro = new ResizeObserver(atualizar);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W]);

  const frame = visualCtx?.caseFrame ?? getCaseFrameSpec(modelo.id);
  const radius = frame.radius * molduraW;
  const borderWidth = Math.max(2.5, molduraW * CASE_BORDER.widthRatio);

  const cameraSpec = visualCtx?.camera ?? getCameraSpec(modelo.id);
  const rockFrameUrl = visualCtx?.cameraFrameUrl?.trim() || null;
  const { image: rockCameraImage, loadError: rockFrameError } =
    useHtmlImage(rockFrameUrl);

  const cameraUrl = useMemo(() => {
    if (rockFrameUrl && !rockFrameError) return null;
    const cor = visualCtx?.corAparelho ?? getCorAparelho(modelo.id);
    const svg = buildCameraModuleSvgFromSpec(
      cameraSpec,
      molduraW,
      molduraH,
      cor,
    );
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [
    rockFrameUrl,
    rockFrameError,
    visualCtx?.corAparelho,
    cameraSpec,
    modelo.id,
    molduraW,
    molduraH,
  ]);
  const { image: svgCameraImage } = useHtmlImage(cameraUrl);
  const cameraImage = rockCameraImage ?? svgCameraImage;

  /** Área generosa para arraste — foto pode ultrapassar a moldura no editor. */
  const areaArraste = useMemo(
    () => ({
      x: areaUtil.x - areaUtil.w * 0.5,
      y: areaUtil.y - areaUtil.h * 0.25,
      w: areaUtil.w * 2,
      h: areaUtil.h * 1.5,
    }),
    [areaUtil],
  );

  const layoutSlots = useMemo(
    () => getLayoutSlots(fotos.length, areaUtil),
    [fotos.length, areaUtil],
  );

  const fotosOrdenadas = useMemo(() => {
    const ativa = fotoAtivaId ?? fotos[0]?.id ?? null;
    const inativas = fotos.filter((f) => f.id !== ativa);
    const ativaFoto = fotos.find((f) => f.id === ativa);
    return ativaFoto ? [...inativas, ativaFoto] : fotos;
  }, [fotos, fotoAtivaId]);

  /** Foto de base para o borrão de fundo (evita espaço em branco ao afastar/diminuir). */
  const fotoFundoUrl = fotos[0]?.url ?? null;
  const { image: fotoFundoImage } = useHtmlImage(fotoFundoUrl);
  const canBlurFundo = useCanBlur(fotoFundoImage);
  const bgBlurRef = useRef<Konva.Image>(null);

  const fundoBlur = useMemo(() => {
    if (!fotoFundoImage || !canBlurFundo) return null;
    const boost = 1.18;
    const s =
      Math.max(
        areaUtil.w / fotoFundoImage.width,
        areaUtil.h / fotoFundoImage.height,
      ) * boost;
    const w = fotoFundoImage.width * s;
    const h = fotoFundoImage.height * s;
    return {
      x: areaUtil.x + (areaUtil.w - w) / 2,
      y: areaUtil.y + (areaUtil.h - h) / 2,
      scale: s,
    };
  }, [fotoFundoImage, canBlurFundo, areaUtil]);

  const blurRadius = Math.round(molduraW * 0.16);

  useEffect(() => {
    const node = bgBlurRef.current;
    if (!node || !fotoFundoImage || !fundoBlur) return;
    node.cache();
    node.filters([Konva.Filters.Blur]);
    node.blurRadius(blurRadius);
    node.getLayer()?.batchDraw();
    return () => {
      node.clearCache();
    };
  }, [fotoFundoImage, fundoBlur, blurRadius]);

  function atualizarTexto(next: TextoCapinha) {
    onTextosChange(textos.map((t) => (t.id === next.id ? next : t)));
  }

  const multiplas = fotos.length > 1;
  const idAtivo = fotoAtivaId ?? fotos[0]?.id ?? null;
  const lastPinchDist = useRef<number | null>(null);
  const fotosRef = useRef(fotos);
  fotosRef.current = fotos;

  const handlePinchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      if (touches.length !== 2 || !idAtivo) return;
      e.evt.preventDefault();
      const dist = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      );
      const ativa = fotosRef.current.find((f) => f.id === idAtivo);
      if (!ativa) return;
      if (lastPinchDist.current != null && lastPinchDist.current > 0) {
        const ratio = dist / lastPinchDist.current;
        const nextScale = clampEscala(ativa.transform.scale * ratio);
        onTransformChange(ativa.id, { ...ativa.transform, scale: nextScale });
      }
      lastPinchDist.current = dist;
    },
    [idAtivo, onTransformChange],
  );

  const resetPinch = useCallback(() => {
    lastPinchDist.current = null;
  }, []);

  return (
    <div
      ref={wrapRef}
      className="flex w-full flex-col items-center"
      style={{ touchAction: "none" }}
    >
      <div className="rounded-2xl p-3 sm:p-4" style={{ backgroundColor: STUDIO_BG }}>
        <Stage
          width={W * fitScale}
          height={H * fitScale}
          scaleX={fitScale}
          scaleY={fitScale}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) onTextoSelecionadoChange(null);
          }}
          onTouchStart={(e) => {
            if (e.evt.touches.length < 2 && e.target === e.target.getStage()) {
              onTextoSelecionadoChange(null);
            }
            if (e.evt.touches.length === 2) resetPinch();
          }}
          onTouchMove={handlePinchMove}
          onTouchEnd={resetPinch}
          onTouchCancel={resetPinch}
        >
          <Layer listening={false}>
            <Rect x={0} y={0} width={W} height={H} fill={STUDIO_BG} />
            <Rect
              x={molduraX}
              y={molduraY + molduraH * 0.012}
              width={molduraW}
              height={molduraH}
              cornerRadius={radius}
              fill="#000000"
              opacity={0.12}
              shadowColor="#000000"
              shadowBlur={22}
              shadowOpacity={0.25}
            />
          </Layer>

          {/* Conteúdo da arte — punch da câmera H5 (foto não cobre o módulo). */}
          <Layer>
            {fotos.length > 0 && (
              <Group
                clipFunc={(ctx) => {
                  ctx.beginPath();
                  ctx.rect(areaUtil.x, areaUtil.y, areaUtil.w, areaUtil.h);
                  ctx.closePath();
                }}
              >
                <Rect
                  x={areaUtil.x}
                  y={areaUtil.y}
                  width={areaUtil.w}
                  height={areaUtil.h}
                  fill={corFundo}
                  listening={false}
                />
                {fundoBlur && fotoFundoImage && (
                  <KonvaImage
                    ref={bgBlurRef}
                    image={fotoFundoImage}
                    x={fundoBlur.x}
                    y={fundoBlur.y}
                    scaleX={fundoBlur.scale}
                    scaleY={fundoBlur.scale}
                    listening={false}
                  />
                )}
              </Group>
            )}

            {fotos.length === 0 && (
              <Rect
                x={areaMoldura.x}
                y={areaMoldura.y}
                width={areaMoldura.w}
                height={areaMoldura.h}
                fill={PLACEHOLDER_FILL}
                listening={false}
              />
            )}

            {fotosOrdenadas.map((foto) => {
              const slotIndex = fotos.findIndex((f) => f.id === foto.id);
              const areaSlot = layoutSlots[slotIndex] ?? areaUtil;
              return (
                <FotoLayer
                  key={foto.id}
                  url={foto.url}
                  transform={foto.transform}
                  areaSlot={areaSlot}
                  areaArraste={areaArraste}
                  ativa={foto.id === (fotoAtivaId ?? fotos[0]?.id)}
                  opaca={multiplas}
                  onTransformChange={(next) => onTransformChange(foto.id, next)}
                  onInicializar={(next) =>
                    onFotoInicializada?.(foto.id, next) ??
                    onTransformChange(foto.id, next)
                  }
                />
              );
            })}

            {textos.map((texto) => (
              <CaseTextNode
                key={texto.id}
                texto={texto}
                selecionado={texto.id === textoSelecionadoId}
                editavel
                onChange={atualizarTexto}
                onSelect={() => onTextoSelecionadoChange(texto.id)}
              />
            ))}

            <ZenProLogoOverlay
              cameraSpec={cameraSpec}
              molduraX={molduraX}
              molduraY={molduraY}
              molduraW={molduraW}
              molduraH={molduraH}
            />

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
          </Layer>

          {/* Overlay H5 (câmera) + borda — acima do buraco da foto */}
          <Layer listening={false}>
            {cameraImage && (
              <>
                <KonvaImage
                  {...cameraContactShadowProps(cameraImage, {
                    molduraX,
                    molduraY,
                    molduraW,
                    molduraH,
                  })}
                />
                <KonvaImage
                  {...cameraClearLipProps(cameraImage, {
                    molduraX,
                    molduraY,
                    molduraW,
                    molduraH,
                  })}
                />
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
            <Rect
              x={molduraX + borderWidth / 2}
              y={molduraY + borderWidth / 2}
              width={molduraW - borderWidth}
              height={molduraH - borderWidth}
              cornerRadius={radius}
              stroke={CASE_BORDER.outer}
              strokeWidth={borderWidth}
              shadowColor="#000000"
              shadowBlur={Math.max(3, molduraW * 0.015)}
              shadowOpacity={0.2}
              listening={false}
            />
            <Rect
              x={molduraX + borderWidth * 0.78}
              y={molduraY + borderWidth * 0.78}
              width={molduraW - borderWidth * 1.56}
              height={molduraH - borderWidth * 1.56}
              cornerRadius={Math.max(0, radius - borderWidth * 0.32)}
              stroke={CASE_BORDER.inner}
              strokeWidth={Math.max(2, borderWidth * 0.58)}
              listening={false}
            />
          </Layer>
        </Stage>
      </div>

      {fotos.length > 0 && (
        <p className="mt-2 text-center text-xs text-zinc-500">
          {multiplas
            ? "Layout automático — selecione a aba para ajustar cada foto. "
            : ""}
          Pinça com dois dedos, barra de tamanho ou scroll para zoom. A foto pode
          ultrapassar a moldura — use &quot;Ver na case&quot; para o resultado final.
        </p>
      )}
    </div>
  );
}
