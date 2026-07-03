"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Image as KonvaImage, Layer, Rect, Stage } from "react-konva";
import Konva from "konva";
import { buildCameraModuleSvgFromSpec, getCameraSpec, getCorAparelho } from "./cameraModules";
import { CaseTextNode } from "./CaseTextNode";
import { getCaseFrameSpec } from "./caseFrame";
import { getCaseLayout } from "./caseGeometry";
import { usePersonalizacaoVisual } from "./PersonalizacaoVisualContext";
import type { ModeloCelular, TextoCapinha, Transform } from "./types";
import { useCapinhaFontsReady } from "./useCapinhaFontsReady";
import { useCorPredominante } from "./useCorPredominante";

const STUDIO_BG = "#ececec";
const PLACEHOLDER_FILL = "#e4e4e7";
const BORDER_STROKE = "#cbe6fb";

type Props = {
  modelo: ModeloCelular;
  fotoUrl: string | null;
  transform: Transform;
  textos: TextoCapinha[];
  textoSelecionadoId: string | null;
  onTransformChange: (transform: Transform) => void;
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
    if (options?.crossOrigin) {
      img.crossOrigin = "anonymous";
    }
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

/** true se dá para ler pixels da imagem (necessário para o filtro de blur). */
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

function coverTransform(
  img: HTMLImageElement,
  area: { x: number; y: number; w: number; h: number },
): Pick<Transform, "x" | "y" | "scale"> {
  const scale = Math.max(area.w / img.width, area.h / img.height);
  const scaledW = img.width * scale;
  const scaledH = img.height * scale;

  return {
    x: area.x + (area.w - scaledW) / 2,
    y: area.y + (area.h - scaledH) / 2,
    scale,
  };
}

function fitImageToArea(
  img: HTMLImageElement,
  area: { x: number; y: number; w: number; h: number },
): Transform {
  return { ...coverTransform(img, area), rotation: 0 };
}

/**
 * Folga de reposicionamento: quanto a foto pode passar da cobertura exata
 * (fração da área). Permite "descer/subir" a foto como nos editores de
 * mercado; o vão revelado é preenchido pela cor predominante, nunca vazio.
 */
const OVERSCAN = 0.35;
/** Escala mínima: um pouco abaixo da cobertura, para dar liberdade sem sumir. */
const MIN_SCALE_FACTOR = 0.82;

/**
 * Mantém a foto sempre presente na capa (sem jogar tudo pra fora), mas com
 * folga generosa para reposicionar. Considera rotação.
 */
function clampToCover(
  img: HTMLImageElement,
  area: { x: number; y: number; w: number; h: number },
  transform: Transform,
): Transform {
  const rad = (transform.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const acos = Math.abs(cos);
  const asin = Math.abs(sin);

  const w0 = img.width;
  const h0 = img.height;

  // escala de cobertura (bounding box rotacionada cobre a área)
  const coverScale = Math.max(
    area.w / (w0 * acos + h0 * asin),
    area.h / (w0 * asin + h0 * acos),
  );
  const scale = Math.max(transform.scale, coverScale * MIN_SCALE_FACTOR);

  const sw = w0 * scale;
  const sh = h0 * scale;

  // cantos rotacionados relativos à origem (x,y) do nó
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

  // se o intervalo inverter (foto menor que a área + folga), centraliza
  const x =
    xMin > xMax
      ? (xMin + xMax) / 2
      : Math.min(xMax, Math.max(xMin, transform.x));
  const y =
    yMin > yMax
      ? (yMin + yMax) / 2
      : Math.min(yMax, Math.max(yMin, transform.y));

  return { x, y, scale, rotation: transform.rotation };
}

export function CaseEditor({
  modelo,
  fotoUrl,
  transform,
  textos,
  textoSelecionadoId,
  onTransformChange,
  onTextosChange,
  onTextoSelecionadoChange,
}: Props) {
  useCapinhaFontsReady();
  const visualCtx = usePersonalizacaoVisual();
  const { image: fotoImage, loadError } = useHtmlImage(fotoUrl);
  const contentLayerRef = useRef<Konva.Layer>(null);
  const bgRef = useRef<Konva.Image>(null);
  const lastFotoUrl = useRef<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Base 280px de largura, ALTURA proporcional às dimensões do modelo
  // (larguraPx × alturaPx). CasePreview e exportCaseArt usam as MESMAS
  // dimensões, garantindo que o transform salvo mapeie 1:1 no preview/arte.
  // O Stage é apenas ESCALADO para caber na largura (mobile).
  const larguraPx = visualCtx?.larguraPx ?? modelo.larguraPx;
  const alturaPx = visualCtx?.alturaPx ?? modelo.alturaPx;
  const layout = getCaseLayout(undefined, larguraPx, alturaPx);
  const {
    stageWidth: W,
    stageHeight: H,
    molduraX,
    molduraY,
    molduraW,
    molduraH,
    areaUtil,
  } = layout;

  // Escala responsiva: encaixa o Stage (base W) na largura do container.
  const [fitScale, setFitScale] = useState(1);
  // Só liberamos a foto principal quando o cover já foi aplicado para ESTA url.
  const [fitUrl, setFitUrl] = useState<string | null>(null);
  const fotoPronta = !!fotoImage && fitUrl === fotoUrl;
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const INNER_PAD = 24; // padding do quadro (p-3) nos dois lados
    const atualizar = () => {
      const disponivel = el.clientWidth - INNER_PAD;
      const s = disponivel > 0 ? Math.min(1, disponivel / W) : 1;
      setFitScale(s);
    };
    atualizar();
    const ro = new ResizeObserver(atualizar);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W]);

  const frame = visualCtx?.caseFrame ?? getCaseFrameSpec(modelo.id);
  const radius = frame.radius * molduraW;
  const borderWidth = Math.max(2, molduraW * 0.02);

  const cameraUrl = useMemo(() => {
    const cameraSpec = visualCtx?.camera ?? getCameraSpec(modelo.id);
    const cor = visualCtx?.corAparelho ?? getCorAparelho(modelo.id);
    const svg = buildCameraModuleSvgFromSpec(
      cameraSpec,
      molduraW,
      molduraH,
      cor,
    );
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [visualCtx, modelo.id, molduraW, molduraH]);
  const { image: cameraImage } = useHtmlImage(cameraUrl);

  // Recorta a foto ligeiramente para DENTRO da borda, para nunca "vazar" além
  // do contorno da capa (principalmente nos cantos arredondados).
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

  // Fundo = a própria foto, borrada, cobrindo toda a capa (preenche vãos).
  const bg = useMemo(() => {
    if (!fotoImage || !canBlur) return null;
    const boost = 1.18;
    const scale =
      Math.max(molduraW / fotoImage.width, molduraH / fotoImage.height) * boost;
    const w = fotoImage.width * scale;
    const h = fotoImage.height * scale;
    return {
      x: molduraX + (molduraW - w) / 2,
      y: molduraY + (molduraH - h) / 2,
      scale,
    };
  }, [fotoImage, canBlur, molduraX, molduraY, molduraW, molduraH]);

  const blurRadius = Math.round(molduraW * 0.16);

  useEffect(() => {
    const node = bgRef.current;
    if (!node || !fotoImage || !bg) return;
    node.cache();
    node.filters([Konva.Filters.Blur]);
    node.blurRadius(blurRadius);
    contentLayerRef.current?.batchDraw();
    return () => {
      node.clearCache();
    };
  }, [fotoImage, bg, blurRadius]);

  useEffect(() => {
    if (!fotoImage || !fotoUrl) {
      lastFotoUrl.current = null;
      return;
    }
    if (lastFotoUrl.current === fotoUrl) return;
    lastFotoUrl.current = fotoUrl;
    // Aplica o enquadramento (cover) ANTES de liberar a foto na tela — evita o
    // flash de "super zoom" no mobile enquanto a foto grande ainda decodifica.
    onTransformChange(fitImageToArea(fotoImage, areaUtil));
    setFitUrl(fotoUrl);
  }, [fotoImage, fotoUrl, areaUtil, onTransformChange]);

  // Trava: sempre que o transform mudar (zoom/rotação), reforça a cobertura.
  useEffect(() => {
    if (!fotoImage) return;
    const c = clampToCover(fotoImage, areaUtil, transform);
    if (
      Math.abs(c.x - transform.x) > 0.5 ||
      Math.abs(c.y - transform.y) > 0.5 ||
      Math.abs(c.scale - transform.scale) > 0.001
    ) {
      onTransformChange(c);
    }
  }, [fotoImage, transform, areaUtil, onTransformChange]);

  useEffect(() => {
    contentLayerRef.current?.batchDraw();
  }, [fotoImage, cameraImage, bg, transform, corFundo, textos]);

  function atualizarTexto(next: TextoCapinha) {
    onTextosChange(textos.map((t) => (t.id === next.id ? next : t)));
  }

  return (
    <div ref={wrapRef} className="flex w-full flex-col items-center">
      <div className="rounded-2xl p-3 sm:p-4" style={{ backgroundColor: STUDIO_BG }}>
        <Stage
          width={W * fitScale}
          height={H * fitScale}
          scaleX={fitScale}
          scaleY={fitScale}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) {
              onTextoSelecionadoChange(null);
            }
          }}
          onTouchStart={(e) => {
            if (e.target === e.target.getStage()) {
              onTextoSelecionadoChange(null);
            }
          }}
        >
          <Layer listening={false}>
            <Rect x={0} y={0} width={W} height={H} fill={STUDIO_BG} />
            {/* sombra sutil da capa */}
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

          <Layer ref={contentLayerRef}>
            {/* conteúdo recortado na forma da capa */}
            <Group clipFunc={clipRoundRect}>
              {!fotoImage && (
                <Rect
                  x={molduraX}
                  y={molduraY}
                  width={molduraW}
                  height={molduraH}
                  fill={PLACEHOLDER_FILL}
                  listening={false}
                />
              )}

              {fotoImage && (
                <>
                  <Rect
                    x={molduraX}
                    y={molduraY}
                    width={molduraW}
                    height={molduraH}
                    fill={corFundo}
                    listening={false}
                  />
                  {bg && fotoPronta && (
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
                  {fotoPronta && (
                  <KonvaImage
                    image={fotoImage}
                    x={transform.x}
                    y={transform.y}
                    scaleX={transform.scale}
                    scaleY={transform.scale}
                    rotation={transform.rotation}
                    draggable
                    onDragMove={(e) => {
                      if (!fotoImage) return;
                      const c = clampToCover(fotoImage, areaUtil, {
                        ...transform,
                        x: e.target.x(),
                        y: e.target.y(),
                      });
                      e.target.x(c.x);
                      e.target.y(c.y);
                      onTransformChange(c);
                    }}
                    onDragEnd={(e) => {
                      if (!fotoImage) return;
                      const c = clampToCover(fotoImage, areaUtil, {
                        ...transform,
                        x: e.target.x(),
                        y: e.target.y(),
                      });
                      e.target.x(c.x);
                      e.target.y(c.y);
                      onTransformChange(c);
                    }}
                    onClick={() => onTextoSelecionadoChange(null)}
                    onTap={() => onTextoSelecionadoChange(null)}
                  />
                  )}
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
                </>
              )}
            </Group>

            {/* módulo de câmera realista por cima da foto */}
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

            {/* borda da capa */}
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
          </Layer>
        </Stage>
      </div>

      {loadError && fotoUrl && (
        <p className="mt-2 text-center text-xs text-red-500">
          Foto enviada, mas o preview não carregou. Tente recarregar a página.
        </p>
      )}
    </div>
  );
}
