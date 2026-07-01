"use client";

import { useEffect, useState } from "react";
import { Group, Image as KonvaImage, Layer, Rect, Stage } from "react-konva";
import { CaseTextNode } from "./CaseTextNode";
import { getCaseLayout } from "./caseGeometry";
import { IPHONE_ASSETS } from "./moldura";
import type { TextoCapinha, Transform } from "./types";
import { useCapinhaFontsReady } from "./useCapinhaFontsReady";
import { useCaseVisualAssets } from "./useCaseVisualAssets";
import { useCorPredominante } from "./useCorPredominante";

const STUDIO_BG = "#ececec";
const EDITOR_PREVIEW_WIDTH = IPHONE_ASSETS.previewWidth;

type Props = {
  fotoUrl: string;
  transform: Transform;
  textos?: TextoCapinha[];
  /** Largura visual da capinha (px). Transform usa coords do editor (280px). */
  previewWidth?: number;
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
        loadHtmlImage(src).then((img) => {
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
  previewWidth = 120,
}: Props) {
  useCapinhaFontsReady();
  const visualAssets = useCaseVisualAssets();
  const fotoImage = useHtmlImage(fotoUrl);

  const layout = getCaseLayout(EDITOR_PREVIEW_WIDTH);
  const {
    stageWidth: W,
    stageHeight: H,
    molduraX,
    molduraY,
    molduraW,
    molduraH,
  } = layout;

  const corFundo = useCorPredominante(fotoImage, transform, {
    x: molduraX,
    y: molduraY,
    w: molduraW,
    h: molduraH,
  });

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
      <div
        style={{
          width: displayW,
          height: displayH,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: W,
            height: H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <Stage width={W} height={H} listening={false}>
            <Layer listening={false}>
              <Rect x={0} y={0} width={W} height={H} fill={STUDIO_BG} />
            </Layer>
            <Layer listening={false}>
              {visualAssets && fotoImage && (
                <Group>
                  <Group>
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
                    <KonvaImage
                      image={visualAssets.alphaMask}
                      x={molduraX}
                      y={molduraY}
                      width={molduraW}
                      height={molduraH}
                      globalCompositeOperation="destination-in"
                      listening={false}
                    />
                  </Group>
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
      </div>
    </div>
  );
}
