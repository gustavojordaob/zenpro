import Konva from "konva";
import { getFonteFamilia } from "./caseTextFonts";
import { getCaseLayout } from "./caseGeometry";
import { ART_CANVAS, EXPORT_ART_WIDTH } from "./caseVisualConstants";
import { hardenBodyMaskAlpha } from "./cameraMockClean";
import { extrairCorPredominante } from "./extrairCorPredominante";
import { loadImageForCanvasExport } from "./loadImageForCanvasExport";
import { IPHONE_ASSETS } from "./moldura";
import type { TextoCapinha, Transform } from "./types";

const EDITOR_WIDTH = ART_CANVAS.previewWidth;

export type FotoExportInput = {
  url: string;
  transform: Transform;
};

async function loadMaskImage(maskUrl?: string): Promise<HTMLImageElement> {
  return loadImageForCanvasExport(maskUrl || IPHONE_ASSETS.maskUrl);
}

async function garantirFontesCarregadas(textos: TextoCapinha[] = []) {
  if (typeof document === "undefined") return;
  const usadas = new Set(
    textos.map((t) => getFonteFamilia(t.fontId)).filter(Boolean),
  );
  if (usadas.size === 0) return;
  await Promise.all(
    [...usadas].map((f) => document.fonts.load(`16px "${f}"`)),
  );
}

function escalaTransform(transform: Transform, fator: number): Transform {
  return {
    x: transform.x * fator,
    y: transform.y * fator,
    scale: transform.scale * fator,
    rotation: transform.rotation,
  };
}

function escalaTexto(texto: TextoCapinha, fator: number): TextoCapinha {
  return {
    ...texto,
    x: texto.x * fator,
    y: texto.y * fator,
    fontSize: texto.fontSize * fator,
  };
}

function criarTextoKonva(texto: TextoCapinha): Konva.Text {
  const fontStyle =
    texto.fontStyle === "bold"
      ? "bold"
      : texto.fontStyle === "italic"
        ? "italic"
        : "normal";

  const node = new Konva.Text({
    text: texto.conteudo,
    x: texto.x,
    y: texto.y,
    fontSize: texto.fontSize,
    fontFamily: getFonteFamilia(texto.fontId),
    fontStyle,
    fill: texto.fill,
    rotation: texto.rotation,
    align: texto.align,
    shadowColor: "rgba(0,0,0,0.45)",
    shadowBlur: 4,
    shadowOffset: { x: 0, y: 1 },
  });

  if (texto.align === "center") {
    node.offsetX(node.width() / 2);
    node.offsetY(node.height() / 2);
  }

  return node;
}

type ExportOpts = {
  exportWidth?: number;
  /** mascara = silhueta; retangulo = full bleed; h5-print = guia RockB2B (laranja + contorno). */
  clip?: "mascara" | "retangulo" | "h5-print";
  incluirFoto?: boolean;
  incluirTexto?: boolean;
  larguraPx?: number;
  alturaPx?: number;
  maskUrl?: string;
  /** Filete da borda H5 (contorno) — usado no modo h5-print. */
  bodyRimUrl?: string;
  /**
   * Guia Rock frameImage (vermelho + câmera, preto transparente).
   * Quando presente, o recorte H5 fica igual ao print-h5.
   */
  printGuideUrl?: string;
  /** PNG da câmera H5 — fura a arte para a foto não cobrir o módulo. */
  cameraFrameUrl?: string;
  /**
   * Após o punch, redesenha a câmera H5 por cima (lentes reais).
   * Sem isso o buraco fica preto/transparente no download.
   */
  overlayCamera?: boolean;
  /** Proporção W/H da silhueta H5 (iPhone etc.). */
  molduraAspect?: number;
  corFundo?: string;
};

/** Fundo bleed do print-h5 RockB2B. */
export const H5_PRINT_BLEED = "#FF6A00";
/** Contorno do recorte no guia de impressão. */
export const H5_PRINT_CONTOUR_RGB = { r: 220, g: 38, b: 38 };

/** Converte filete (branco/alpha) em contorno vermelho estilo Rock H5. */
function rimComoContornoVermelho(
  src: HTMLImageElement | HTMLCanvasElement,
): HTMLCanvasElement {
  const w =
    "naturalWidth" in src ? src.naturalWidth || src.width : src.width;
  const h =
    "naturalHeight" in src ? src.naturalHeight || src.height : src.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const { r, g, b } = H5_PRINT_CONTOUR_RGB;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 24) {
      d[i + 3] = 0;
      continue;
    }
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Contorno a partir da máscara (anel externo) se não houver body-rim. */
function contornoDaMascara(
  mask: HTMLImageElement | HTMLCanvasElement,
  strokePx = 4,
): HTMLCanvasElement {
  const w =
    "naturalWidth" in mask ? mask.naturalWidth || mask.width : mask.width;
  const h =
    "naturalHeight" in mask ? mask.naturalHeight || mask.height : mask.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(mask, 0, 0, w, h);
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const s = src.data;
  const o = out.data;
  const { r, g, b } = H5_PRINT_CONTOUR_RGB;
  const thr = 128;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = s[i + 3];
      if (a < thr) continue;
      let borda = false;
      for (let dy = -strokePx; dy <= strokePx && !borda; dy++) {
        for (let dx = -strokePx; dx <= strokePx; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
            borda = true;
            break;
          }
          if (s[(ny * w + nx) * 4 + 3] < thr) {
            borda = true;
            break;
          }
        }
      }
      if (borda) {
        o[i] = r;
        o[i + 1] = g;
        o[i + 2] = b;
        o[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

function normalizarFotos(
  fotoUrlOrFotos: string | FotoExportInput[],
  transformLegado: Transform,
): FotoExportInput[] {
  if (typeof fotoUrlOrFotos === "string") {
    if (!fotoUrlOrFotos.trim()) return [];
    return [{ url: fotoUrlOrFotos, transform: transformLegado }];
  }
  return fotoUrlOrFotos.filter((f) => f.url.trim());
}

async function desenharFotoNoLayer(
  layer: Konva.Layer,
  fotoImage: HTMLImageElement,
  transform: Transform,
  areaUtil: { x: number; y: number; w: number; h: number },
  molduraW: number,
  comBlur: boolean,
) {
  if (comBlur) {
    const bgBoost = 1.18;
    const bgScale =
      Math.max(areaUtil.w / fotoImage.width, areaUtil.h / fotoImage.height) *
      bgBoost;
    const bgW = fotoImage.width * bgScale;
    const bgH = fotoImage.height * bgScale;
    const bgFoto = new Konva.Image({
      image: fotoImage,
      x: areaUtil.x + (areaUtil.w - bgW) / 2,
      y: areaUtil.y + (areaUtil.h - bgH) / 2,
      scaleX: bgScale,
      scaleY: bgScale,
    });
    try {
      bgFoto.cache();
      bgFoto.filters([Konva.Filters.Blur]);
      bgFoto.blurRadius(Math.round(molduraW * 0.16));
    } catch {
      // segue sem blur
    }
    layer.add(bgFoto);
  }

  layer.add(
    new Konva.Image({
      image: fotoImage,
      x: transform.x,
      y: transform.y,
      scaleX: transform.scale,
      scaleY: transform.scale,
      rotation: transform.rotation,
    }),
  );
}

/** Arte 9:16 — uma ou várias fotos empilhadas + textos. */
export async function exportCaseArtDataUrl(
  fotoUrlOrFotos: string | FotoExportInput[],
  transform: Transform,
  textos: TextoCapinha[] = [],
  opts: ExportOpts = {},
): Promise<string> {
  const fotos = normalizarFotos(fotoUrlOrFotos, transform);
  const exportWidth = opts.exportWidth ?? EXPORT_ART_WIDTH;
  const clip = opts.clip ?? "mascara";
  const incluirFoto = opts.incluirFoto ?? true;
  const incluirTexto = opts.incluirTexto ?? true;

  if (incluirFoto && fotos.length === 0) {
    throw new Error("Nenhuma foto para exportar.");
  }

  await garantirFontesCarregadas(incluirTexto ? textos : []);

  const fator = exportWidth / EDITOR_WIDTH;
  const layout = getCaseLayout(
    exportWidth,
    ART_CANVAS.width,
    ART_CANVAS.height,
    undefined,
    { molduraAspect: opts.molduraAspect },
  );
  const { molduraX, molduraY, molduraW, molduraH, stageWidth, stageHeight, areaUtil } =
    layout;

  const precisaMascara = incluirFoto && clip === "mascara";
  const isH5Print = clip === "h5-print";

  // Recorte H5: overlay do frame Rock original (vermelho + câmera).
  // Mock/máscara: body mask + cameraFrame processado.
  const printGuideUrl = isH5Print
    ? opts.printGuideUrl?.trim() || undefined
    : undefined;
  const cameraFrameUrl = !isH5Print
    ? opts.cameraFrameUrl?.trim() || undefined
    : undefined;
  const precisaCamera =
    Boolean(incluirFoto && cameraFrameUrl) &&
    (clip === "mascara" || opts.overlayCamera === true);

  const [imagens, maskImage, printGuideImg, cameraImg] = await Promise.all([
    incluirFoto
      ? Promise.all(
          fotos.map(async (f) => ({
            ...f,
            img: await loadImageForCanvasExport(f.url),
            t: escalaTransform(f.transform, fator),
          })),
        )
      : Promise.resolve(
          [] as Array<
            FotoExportInput & { img: HTMLImageElement; t: Transform }
          >,
        ),
    precisaMascara && opts.maskUrl
      ? loadMaskImage(opts.maskUrl).catch(() => null)
      : Promise.resolve(null),
    printGuideUrl
      ? loadImageForCanvasExport(printGuideUrl).catch(() => null)
      : Promise.resolve(null),
    precisaCamera && cameraFrameUrl
      ? loadImageForCanvasExport(cameraFrameUrl).catch(() => null)
      : Promise.resolve(null),
  ]);

  const maskHard =
    maskImage != null ? hardenBodyMaskAlpha(maskImage, 140) : null;

  const container = document.createElement("div");
  const stage = new Konva.Stage({
    container,
    width: stageWidth,
    height: stageHeight,
  });
  const layer = new Konva.Layer();
  stage.add(layer);

  if (incluirFoto || isH5Print) {
    const corEscolhida = opts.corFundo?.trim();
    let corBase = isH5Print
      ? H5_PRINT_BLEED
      : corEscolhida || "#d4d4d4";
    if (!isH5Print && !corEscolhida && imagens[0]) {
      try {
        corBase = extrairCorPredominante(
          imagens[0].img,
          imagens[0].t,
          areaUtil,
        );
      } catch {
        // mantém fallback
      }
    }

    layer.add(
      new Konva.Rect({
        x: areaUtil.x,
        y: areaUtil.y,
        width: areaUtil.w,
        height: areaUtil.h,
        fill: corBase,
      }),
    );

    for (let i = 0; i < imagens.length; i++) {
      const { img, t } = imagens[i];
      await desenharFotoNoLayer(
        layer,
        img,
        t,
        areaUtil,
        molduraW,
        // No H5 print a foto pode sair do contorno sobre o laranja — sem blur cover.
        !isH5Print && i === 0 && !corEscolhida,
      );
    }
  }

  if (incluirTexto) {
    for (const texto of textos) {
      layer.add(criarTextoKonva(escalaTexto(texto, fator)));
    }
  }

  // Punch + overlay câmera (só mock / máscara — H5 print usa printGuide).
  if (precisaCamera && cameraImg) {
    layer.add(
      new Konva.Image({
        image: cameraImg,
        x: molduraX,
        y: molduraY,
        width: molduraW,
        height: molduraH,
        globalCompositeOperation: "destination-out",
      }),
    );
    if (opts.overlayCamera !== false) {
      layer.add(
        new Konva.Image({
          image: cameraImg,
          x: molduraX,
          y: molduraY,
          width: molduraW,
          height: molduraH,
        }),
      );
    }
  }

  // Guia Rock exatamente como print-h5: vermelho + câmera por cima da arte.
  if (isH5Print && printGuideImg) {
    layer.add(
      new Konva.Image({
        image: printGuideImg,
        x: molduraX,
        y: molduraY,
        width: molduraW,
        height: molduraH,
      }),
    );
  } else if (isH5Print && !printGuideImg) {
    // Fallback legado se faltar print-guide no modelo
    const rimUrl = opts.bodyRimUrl?.trim();
    if (rimUrl) {
      try {
        const rimImg = await loadImageForCanvasExport(rimUrl);
        layer.add(
          new Konva.Image({
            image: rimComoContornoVermelho(rimImg),
            x: molduraX,
            y: molduraY,
            width: molduraW,
            height: molduraH,
          }),
        );
      } catch {
        /* ignore */
      }
    }
  }

  if (incluirFoto && !isH5Print) {
    if (clip === "mascara" && (maskHard || maskImage)) {
      layer.add(
        new Konva.Image({
          image: maskHard ?? maskImage!,
          x: molduraX,
          y: molduraY,
          width: molduraW,
          height: molduraH,
          globalCompositeOperation: "destination-in",
        }),
      );
    } else if (clip === "retangulo") {
      layer.add(
        new Konva.Rect({
          x: areaUtil.x,
          y: areaUtil.y,
          width: areaUtil.w,
          height: areaUtil.h,
          fill: "#000",
          globalCompositeOperation: "destination-in",
        }),
      );
    }
  }

  layer.draw();

  const dataUrl = stage.toDataURL({
    pixelRatio: 1,
    mimeType: "image/png",
    x: areaUtil.x,
    y: areaUtil.y,
    width: areaUtil.w,
    height: areaUtil.h,
  });

  stage.destroy();
  return dataUrl;
}

async function dataUrlParaBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export type ArtGeo = {
  larguraPx?: number;
  alturaPx?: number;
  maskUrl?: string;
  bodyRimUrl?: string;
  printGuideUrl?: string;
  cameraFrameUrl?: string;
  molduraAspect?: number;
  corFundo?: string;
};

/** Largura de export no admin (pedido) — qualidade boa, bem mais rápido que 1080. */
export const ADMIN_EXPORT_WIDTH = 720;

/**
 * Guia de impressão RockB2B (só dono / pedido admin):
 * retângulo laranja + foto/texto (podem sair do contorno) + câmera + filete vermelho.
 */
export async function exportH5PrintArtBlob(
  fotoUrlOrFotos: string | FotoExportInput[],
  transform: Transform,
  textos: TextoCapinha[] = [],
  exportWidth: number = EXPORT_ART_WIDTH,
  geo: ArtGeo = {},
): Promise<Blob> {
  const dataUrl = await exportCaseArtDataUrl(fotoUrlOrFotos, transform, textos, {
    exportWidth,
    clip: "h5-print",
    overlayCamera: true,
    ...geo,
  });
  return dataUrlParaBlob(dataUrl);
}

/** Arte silhueta = foto+texto como o cliente vê. */
export async function exportCaseArtBlob(
  fotoUrlOrFotos: string | FotoExportInput[],
  transform: Transform,
  textos: TextoCapinha[] = [],
  exportWidth: number = EXPORT_ART_WIDTH,
  geo: ArtGeo = {},
): Promise<Blob> {
  const dataUrl = await exportCaseArtDataUrl(fotoUrlOrFotos, transform, textos, {
    exportWidth,
    clip: "mascara",
    overlayCamera: true,
    ...geo,
  });
  return dataUrlParaBlob(dataUrl);
}

/** Camada só foto — retângulo full-bleed (sem punch) para composição de impressão. */
export async function exportFotoArtBlob(
  fotoUrlOrFotos: string | FotoExportInput[],
  transform: Transform,
  exportWidth: number = EXPORT_ART_WIDTH,
  geo: ArtGeo = {},
): Promise<Blob> {
  const { cameraFrameUrl: _c, ...geoSemCamera } = geo;
  const dataUrl = await exportCaseArtDataUrl(fotoUrlOrFotos, transform, [], {
    exportWidth,
    clip: "retangulo",
    incluirTexto: false,
    overlayCamera: false,
    ...geoSemCamera,
  });
  return dataUrlParaBlob(dataUrl);
}

export async function exportTextoArtBlob(
  transform: Transform,
  textos: TextoCapinha[],
  exportWidth: number = EXPORT_ART_WIDTH,
  geo: ArtGeo = {},
): Promise<Blob> {
  const dataUrl = await exportCaseArtDataUrl([], transform, textos, {
    exportWidth,
    incluirFoto: false,
    ...geo,
  });
  return dataUrlParaBlob(dataUrl);
}
