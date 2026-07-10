import type { CSSProperties } from "react";
import { ART_CANVAS } from "./caseVisualConstants";

export const ZENPRO_LOGO_SRC = "/brand/logo-gold.png";
export const ZENPRO_LOGO_ASPECT = 98 / 415;

export type LogoPlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
  padX: number;
  padY: number;
};

/**
 * Logo Zen Pro sobre a foto — centralizado embaixo, o mais próximo possível
 * da borda inferior (respeitando margem segura da case).
 */
export function getZenProLogoPlacement(
  _spec: unknown,
  molduraW: number,
  molduraH: number,
  molduraX = 0,
  molduraY = 0,
): LogoPlacement {
  const logoW = molduraW * 0.22;
  const logoH = logoW * ZENPRO_LOGO_ASPECT;
  const padX = logoW * 0.12;
  const padY = logoH * 0.18;

  const marginBottom = molduraH * ART_CANVAS.safeBottomRatio * 0.35;
  const groupH = logoH + padY * 2;
  const y = molduraY + molduraH - marginBottom - groupH;
  const x = molduraX + (molduraW - logoW) / 2;

  return { x, y, width: logoW, height: logoH, padX, padY };
}

export function loadZenProLogoImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar logo Zen Pro"));
    img.src = ZENPRO_LOGO_SRC;
  });
}

export function getZenProLogoCssStyle(
  spec: unknown,
  molduraW: number,
  molduraH: number,
  molduraX: number,
  molduraY: number,
): CSSProperties {
  const p = getZenProLogoPlacement(spec, molduraW, molduraH, molduraX, molduraY);
  const groupW = p.width + p.padX * 2;
  const groupH = p.height + p.padY * 2;

  return {
    left: `${((p.x - p.padX - molduraX) / molduraW) * 100}%`,
    top: `${((p.y - p.padY - molduraY) / molduraH) * 100}%`,
    width: `${(groupW / molduraW) * 100}%`,
    height: `${(groupH / molduraH) * 100}%`,
    padding: `${(p.padY / groupH) * 100}% ${(p.padX / groupW) * 100}%`,
    boxSizing: "border-box",
    background: "rgba(0,0,0,0.42)",
    borderRadius: "8px",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
  };
}
