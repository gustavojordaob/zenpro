import { ART_CANVAS } from "./caseVisualConstants";
import type { Transform } from "./types";
import { DEFAULT_TRANSFORM } from "./types";

export type AreaRect = { x: number; y: number; w: number; h: number };

/** Espaço entre células (escala do editor 360px). */
export const LAYOUT_GAP_BASE = 4;

function gapForArea(area: AreaRect): number {
  return Math.max(
    2,
    Math.round((area.w / ART_CANVAS.previewWidth) * LAYOUT_GAP_BASE),
  );
}

export function fitImageToArea(
  img: HTMLImageElement,
  area: AreaRect,
): Transform {
  const scale = Math.max(area.w / img.width, area.h / img.height);
  const scaledW = img.width * scale;
  const scaledH = img.height * scale;
  return {
    x: area.x + (area.w - scaledW) / 2,
    y: area.y + (area.h - scaledH) / 2,
    scale,
    rotation: 0,
  };
}

/** Regiões de encaixe por quantidade de fotos (1–4). */
export function getLayoutSlots(count: number, area: AreaRect): AreaRect[] {
  const n = Math.min(Math.max(count, 1), 4);
  if (n === 1) return [area];

  const gap = gapForArea(area);

  if (n === 2) {
    const h = (area.h - gap) / 2;
    return [
      { x: area.x, y: area.y, w: area.w, h },
      { x: area.x, y: area.y + h + gap, w: area.w, h },
    ];
  }

  if (n === 3) {
    const topH = (area.h - gap) / 2;
    const botH = area.h - topH - gap;
    const halfW = (area.w - gap) / 2;
    return [
      { x: area.x, y: area.y, w: halfW, h: topH },
      { x: area.x + halfW + gap, y: area.y, w: halfW, h: topH },
      { x: area.x, y: area.y + topH + gap, w: area.w, h: botH },
    ];
  }

  const cellW = (area.w - gap) / 2;
  const cellH = (area.h - gap) / 2;
  return [
    { x: area.x, y: area.y, w: cellW, h: cellH },
    { x: area.x + cellW + gap, y: area.y, w: cellW, h: cellH },
    { x: area.x, y: area.y + cellH + gap, w: cellW, h: cellH },
    { x: area.x + cellW + gap, y: area.y + cellH + gap, w: cellW, h: cellH },
  ];
}

export function rotuloLayoutPadrao(count: number): string {
  if (count <= 1) return "Página inteira";
  if (count === 2) return "Uma em cima da outra";
  if (count === 3) return "2 em cima, 1 em baixo";
  return "Grade 2×2";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao ler imagem"));
    };
    img.src = url;
  });
}

function drawCoverInSlot(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  slot: AreaRect,
) {
  const scale = Math.max(slot.w / img.width, slot.h / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = slot.x + (slot.w - w) / 2;
  const y = slot.y + (slot.h - h) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(slot.x, slot.y, slot.w, slot.h);
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

export type ColagemOptions = {
  corFundo?: string;
  /** Largura de saída (altura = 9:16). Padrão 1080. */
  outWidth?: number;
};

/**
 * Junta 2–4 fotos em uma única imagem 9:16 (colagem).
 * Retorna JPEG pronto para o editor de capinha.
 */
export async function gerarColagem916(
  files: File[],
  options?: ColagemOptions,
): Promise<File> {
  const count = files.length;
  if (count < 2 || count > 4) {
    throw new Error("Selecione entre 2 e 4 fotos para a colagem.");
  }

  const outW = options?.outWidth ?? ART_CANVAS.width;
  const outH = Math.round((ART_CANVAS.height / ART_CANVAS.width) * outW);
  const area = { x: 0, y: 0, w: outW, h: outH };
  const corFundo = options?.corFundo ?? "#ffffff";

  const imagens = await Promise.all(files.map((f) => loadImageFromFile(f)));
  const slots = getLayoutSlots(count, area);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  ctx.fillStyle = corFundo;
  ctx.fillRect(0, 0, outW, outH);

  for (let i = 0; i < imagens.length; i++) {
    const slot = slots[i];
    if (slot) drawCoverInSlot(ctx, imagens[i], slot);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar colagem"))),
      "image/jpeg",
      0.92,
    );
  });

  return new File([blob], `colagem-${Date.now()}.jpg`, { type: "image/jpeg" });
}

/** Prévia da colagem (data URL) — usa resolução menor para o modal. */
export async function gerarColagem916DataUrl(
  files: File[],
  options?: ColagemOptions,
): Promise<string> {
  const file = await gerarColagem916(files, {
    ...options,
    outWidth: options?.outWidth ?? 360,
  });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Falha na prévia"));
    reader.readAsDataURL(file);
  });
}

/** Calcula transform cover para cada foto nos slots do layout. */
export async function calcularTransformsLayout(
  fotos: { id: string; url: string }[],
  areaUtil: AreaRect,
): Promise<Record<string, Transform>> {
  if (fotos.length === 0) return {};

  const slots = getLayoutSlots(fotos.length, areaUtil);
  const out: Record<string, Transform> = {};

  await Promise.all(
    fotos.map(async (foto, i) => {
      const slot = slots[i];
      if (!slot || !foto.url.trim()) {
        out[foto.id] = DEFAULT_TRANSFORM;
        return;
      }
      try {
        const img = await loadImage(foto.url);
        out[foto.id] = fitImageToArea(img, slot);
      } catch {
        out[foto.id] = DEFAULT_TRANSFORM;
      }
    }),
  );

  return out;
}
