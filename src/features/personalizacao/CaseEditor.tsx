"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Group, Image as KonvaImage, Layer, Rect, Stage } from "react-konva";
import Konva from "konva";
import type KonvaType from "konva";
import { CaseTextNode } from "./CaseTextNode";
import { getCaseLayout } from "./caseGeometry";
import type { ModeloCelular, TextoCapinha, Transform } from "./types";
import { useCapinhaFontsReady } from "./useCapinhaFontsReady";
import { useCaseVisualAssets } from "./useCaseVisualAssets";
import { useCorPredominante } from "./useCorPredominante";

const STUDIO_BG = "#ececec";
const DROP_SHADOW_OFFSET_Y = 10;
const DROP_SHADOW_BLUR = 18;
const DROP_SHADOW_OPACITY = 0.26;
const PLACEHOLDER_FILL = "#dddddd";

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
        loadHtmlImage(src).then((img) => {
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

function coverTransform(
  img: HTMLImageElement,
  area: { x: number; y: number; w: number; h: number },
  marginScale = 1,
): Pick<Transform, "x" | "y" | "scale"> {
  const scale = Math.max(area.w / img.width, area.h / img.height) * marginScale;
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

function applyShadowFilters(node: KonvaType.Image) {
  node.filters([Konva.Filters.Blur]);
  node.blurRadius(DROP_SHADOW_BLUR);
  node.cache({ offset: DROP_SHADOW_BLUR * 2, drawBorder: false });
  node.getLayer()?.batchDraw();
}

function CaseMaskClip({
  assets,
  molduraX,
  molduraY,
  molduraW,
  molduraH,
  children,
}: {
  assets: NonNullable<ReturnType<typeof useCaseVisualAssets>>;
  molduraX: number;
  molduraY: number;
  molduraW: number;
  molduraH: number;
  children: ReactNode;
}) {
  return (
    <Group>
      {children}
      <KonvaImage
        image={assets.alphaMask}
        x={molduraX}
        y={molduraY}
        width={molduraW}
        height={molduraH}
        globalCompositeOperation="destination-in"
        listening={false}
      />
    </Group>
  );
}

export function CaseEditor({
  modelo: _modelo,
  fotoUrl,
  transform,
  textos,
  textoSelecionadoId,
  onTransformChange,
  onTextosChange,
  onTextoSelecionadoChange,
}: Props) {
  useCapinhaFontsReady();
  const visualAssets = useCaseVisualAssets();
  const { image: fotoImage, loadError } = useHtmlImage(fotoUrl);
  const contentLayerRef = useRef<Konva.Layer>(null);
  const shadowRef = useRef<Konva.Image>(null);
  const lastFotoUrl = useRef<string | null>(null);

  const layout = getCaseLayout();
  const {
    stageWidth: W,
    stageHeight: H,
    molduraX,
    molduraY,
    molduraW,
    molduraH,
    areaUtil,
  } = layout;

  const corFundo = useCorPredominante(fotoImage, transform, {
    x: molduraX,
    y: molduraY,
    w: molduraW,
    h: molduraH,
  });

  useEffect(() => {
    if (!fotoImage || !fotoUrl) {
      lastFotoUrl.current = null;
      return;
    }

    if (lastFotoUrl.current === fotoUrl) return;

    lastFotoUrl.current = fotoUrl;
    onTransformChange(fitImageToArea(fotoImage, areaUtil));
  }, [fotoImage, fotoUrl, areaUtil, onTransformChange]);

  useEffect(() => {
    const node = shadowRef.current;
    if (!node || !visualAssets) return;

    applyShadowFilters(node);

    return () => {
      node.clearCache();
    };
  }, [visualAssets]);

  useEffect(() => {
    contentLayerRef.current?.batchDraw();
  }, [visualAssets, fotoImage, transform, corFundo, textos]);

  function atualizarTexto(next: TextoCapinha) {
    onTextosChange(textos.map((t) => (t.id === next.id ? next : t)));
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className="rounded-2xl p-5" style={{ backgroundColor: STUDIO_BG }}>
        <Stage
          width={W}
          height={H}
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
          </Layer>

          {visualAssets && (
            <Layer listening={false}>
              <KonvaImage
                ref={shadowRef}
                image={visualAssets.shadowSilhouette}
                x={molduraX}
                y={molduraY + DROP_SHADOW_OFFSET_Y}
                width={molduraW}
                height={molduraH}
                opacity={DROP_SHADOW_OPACITY}
                listening={false}
              />
            </Layer>
          )}

          <Layer ref={contentLayerRef}>
            {visualAssets && (
              <Group>
                <CaseMaskClip
                  assets={visualAssets}
                  molduraX={molduraX}
                  molduraY={molduraY}
                  molduraW={molduraW}
                  molduraH={molduraH}
                >
                  {!fotoImage && !loadError && (
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
                      <KonvaImage
                        image={fotoImage}
                        x={transform.x}
                        y={transform.y}
                        scaleX={transform.scale}
                        scaleY={transform.scale}
                        rotation={transform.rotation}
                        draggable
                        onDragMove={(e) => {
                          onTransformChange({
                            ...transform,
                            x: e.target.x(),
                            y: e.target.y(),
                          });
                        }}
                        onDragEnd={(e) => {
                          onTransformChange({
                            ...transform,
                            x: e.target.x(),
                            y: e.target.y(),
                          });
                        }}
                        onClick={() => onTextoSelecionadoChange(null)}
                        onTap={() => onTextoSelecionadoChange(null)}
                      />
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
                </CaseMaskClip>

                <KonvaImage
                  image={visualAssets.innerShadow}
                  x={molduraX}
                  y={molduraY}
                  width={molduraW}
                  height={molduraH}
                  listening={false}
                />
                <KonvaImage
                  image={visualAssets.edgeBorder}
                  x={molduraX}
                  y={molduraY}
                  width={molduraW}
                  height={molduraH}
                  listening={false}
                />
                <KonvaImage
                  image={visualAssets.cameraLenses}
                  x={molduraX}
                  y={molduraY}
                  width={molduraW}
                  height={molduraH}
                  listening={false}
                />
              </Group>
            )}
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
