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
import type { ModeloVisualAssets } from "@/features/catalogo/catalogoRuntimeService";

function resolveAssetUrl(value: string | undefined, fallback: string): string {
  const trimmed = String(value ?? "").trim();
  return trimmed || fallback;
}

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
    if (src.startsWith("http://") || src.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src}`));
    img.src = src;
  });
}

function canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  return loadHtmlImage(canvas.toDataURL("image/png"));
}

export function useCaseVisualAssets(visual?: ModeloVisualAssets | null) {
  const [assets, setAssets] = useState<CaseVisualAssets | null>(null);

  const maskUrl = resolveAssetUrl(visual?.maskUrl, IPHONE_ASSETS.maskUrl);
  const overlayUrl = resolveAssetUrl(visual?.overlayUrl, IPHONE_ASSETS.overlayUrl);

  useEffect(() => {
    let cancelled = false;

    async function loadAssets(mask: string, overlay: string) {
      const [maskImg, overlayImg] = await Promise.all([
        loadHtmlImage(mask),
        loadHtmlImage(overlay),
      ]);
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
      return Object.fromEntries(entries) as CaseVisualAssets;
    }

    void loadAssets(maskUrl, overlayUrl)
      .then((loaded) => {
        if (!cancelled) setAssets(loaded);
      })
      .catch(() => {
        if (cancelled) return;
        const fallbackMask = IPHONE_ASSETS.maskUrl;
        const fallbackOverlay = IPHONE_ASSETS.overlayUrl;
        if (maskUrl === fallbackMask && overlayUrl === fallbackOverlay) {
          setAssets(null);
          return;
        }
        void loadAssets(fallbackMask, fallbackOverlay)
          .then((loaded) => {
            if (!cancelled) setAssets(loaded);
          })
          .catch(() => {
            if (!cancelled) setAssets(null);
          });
      });

    return () => {
      cancelled = true;
    };
  }, [maskUrl, overlayUrl]);

  return assets;
}
