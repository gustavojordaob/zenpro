import { ART_CANVAS } from "./caseVisualConstants";

const PREVIEW_WIDTH = 540;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
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

function coverRect(
  imgW: number,
  imgH: number,
  areaW: number,
  areaH: number,
): { x: number; y: number; w: number; h: number } {
  const scale = Math.max(areaW / imgW, areaH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return {
    x: (areaW - w) / 2,
    y: (areaH - h) / 2,
    w,
    h,
  };
}

/**
 * Recria a foto no padrão 9:16 (Stories): fundo borrado preenche topo/baixo
 * e a foto nítida fica centralizada (cover). Resultado pronto para editor/export.
 */
export async function expandirFotoPara916(file: File): Promise<File> {
  const img = await loadImageFromFile(file);
  const artW = ART_CANVAS.width;
  const artH = ART_CANVAS.height;
  const outW = PREVIEW_WIDTH;
  const outH = Math.round((artH / artW) * outW);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  const bg = coverRect(img.width, img.height, outW, outH);
  const fg = coverRect(img.width, img.height, outW, outH);

  ctx.filter = "blur(28px) saturate(1.15)";
  ctx.drawImage(img, bg.x, bg.y, bg.w, bg.h);
  ctx.filter = "none";

  ctx.globalAlpha = 0.92;
  ctx.drawImage(img, fg.x, fg.y, fg.w, fg.h);
  ctx.globalAlpha = 1;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar JPEG"))),
      "image/jpeg",
      0.92,
    );
  });

  const base = file.name.replace(/\.[^.]+$/, "") || "foto";
  return new File([blob], `${base}-916.jpg`, { type: "image/jpeg" });
}

/**
 * Normaliza saída da IA para case 9:16 full-bleed.
 * Preenche a tela inteira (cover) — sem faixa borrada / letterbox.
 */
export async function normalizarArteCase916(file: File): Promise<File> {
  const img = await loadImageFromFile(file);
  const artW = ART_CANVAS.width;
  const artH = ART_CANVAS.height;
  const outW = PREVIEW_WIDTH;
  const outH = Math.round((artH / artW) * outW);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  // Capa full-bleed: a foto cobre 100% do 9:16 (corta o que sobrar nas laterais/topo).
  const fill = coverRect(img.width, img.height, outW, outH);
  ctx.drawImage(img, fill.x, fill.y, fill.w, fill.h);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar JPEG"))),
      "image/jpeg",
      0.92,
    );
  });

  return new File([blob], `ia-case-${Date.now()}.jpg`, { type: "image/jpeg" });
}

/** Data URL estável para export/preview no browser (sem CORS). */
export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Falha ao ler imagem"));
    reader.readAsDataURL(file);
  });
}
