"use client";

import { useEffect, useState } from "react";
import { extrairCorPredominante } from "./extrairCorPredominante";
import type { Transform } from "./types";

export function useCorPredominante(
  image: HTMLImageElement | null,
  transform: Transform,
  moldura: { x: number; y: number; w: number; h: number },
): string {
  const [cor, setCor] = useState("#d4d4d4");

  useEffect(() => {
    if (!image) {
      setCor("#d4d4d4");
      return;
    }

    const id = window.requestAnimationFrame(() => {
      setCor(extrairCorPredominante(image, transform, moldura));
    });

    return () => window.cancelAnimationFrame(id);
  }, [image, transform, moldura.x, moldura.y, moldura.w, moldura.h]);

  return cor;
}
