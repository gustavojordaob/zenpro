"use client";

import { useEffect, useState } from "react";
import {
  createEdgeBorderOverlay,
  createInnerShadowOverlay,
  createShadowSilhouette,
} from "./caseEffectsUtils";
import { IPHONE_ASSETS } from "./moldura";
import { createLuminanceAlphaMask } from "./maskUtils";
import { createCameraLensesOverlay } from "./overlayUtils";

export type CaseVisualAssets = {
  alphaMask: HTMLImageElement;
  shadowSilhouette: HTMLImageElement;
  innerShadow: HTMLImageElement;
  edgeBorder: HTMLImageElement;
  cameraLenses: HTMLImageElement;
};

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}

function canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  return loadHtmlImage(canvas.toDataURL("image/png"));
}

export function useCaseVisualAssets() {
  const [assets, setAssets] = useState<CaseVisualAssets | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      loadHtmlImage(IPHONE_ASSETS.maskUrl),
      loadHtmlImage(IPHONE_ASSETS.overlayUrl),
    ])
      .then(async ([maskImg, overlayImg]) => {
        const canvases = {
          alphaMask: createLuminanceAlphaMask(maskImg),
          shadowSilhouette: createShadowSilhouette(maskImg),
          innerShadow: createInnerShadowOverlay(maskImg),
          edgeBorder: createEdgeBorderOverlay(maskImg),
          cameraLenses: createCameraLensesOverlay(overlayImg),
        };

        const entries = await Promise.all(
          Object.entries(canvases).map(async ([key, canvas]) => [
            key,
            await canvasToImage(canvas),
          ]),
        );

        if (cancelled) return;
        setAssets(Object.fromEntries(entries) as CaseVisualAssets);
      })
      .catch(() => {
        if (!cancelled) setAssets(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return assets;
}
