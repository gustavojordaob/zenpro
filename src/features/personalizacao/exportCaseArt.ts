import Konva from "konva";
import { getFonteFamilia } from "./caseTextFonts";
import { getCaseLayout } from "./caseGeometry";
import { ART_CANVAS, EXPORT_ART_WIDTH } from "./caseVisualConstants";
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

async function garantirFontesCarregadas() {
  if (typeof document === "undefined") return;
  const familias = [
    "Montserrat",
    "Playfair Display",
    "Bebas Neue",
    "Pacifico",
    "Permanent Marker",
  ];
  await Promise.all(
    familias.map((f) => document.fonts.load(`16px "${f}"`)),
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
  clip?: "mascara" | "retangulo";
  incluirFoto?: boolean;
  incluirTexto?: boolean;
  larguraPx?: number;
  alturaPx?: number;
  maskUrl?: string;
  /** PNG da câmera H5 — fura a arte para a foto não cobrir o módulo. */
  cameraFrameUrl?: string;
  corFundo?: string;
};

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

  await garantirFontesCarregadas();

  const fator = exportWidth / EDITOR_WIDTH;
  const layout = getCaseLayout(
    exportWidth,
    ART_CANVAS.width,
    ART_CANVAS.height,
  );
  const { molduraX, molduraY, molduraW, molduraH, stageWidth, stageHeight, areaUtil } =
    layout;

  const precisaMascara = incluirFoto && clip === "mascara";
  const imagens = incluirFoto
    ? await Promise.all(
        fotos.map(async (f) => ({
          ...f,
          img: await loadImageForCanvasExport(f.url),
          t: escalaTransform(f.transform, fator),
        })),
      )
    : [];

  const maskImage = precisaMascara
    ? await loadMaskImage(opts.maskUrl)
    : null;

  const container = document.createElement("div");
  const stage = new Konva.Stage({
    container,
    width: stageWidth,
    height: stageHeight,
  });
  const layer = new Konva.Layer();
  stage.add(layer);

  if (incluirFoto) {
    const corEscolhida = opts.corFundo?.trim();
    let corBase = corEscolhida || "#d4d4d4";
    if (!corEscolhida && imagens[0]) {
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
        i === 0 && !corEscolhida,
      );
    }
  }

  if (incluirTexto) {
    for (const texto of textos) {
      layer.add(criarTextoKonva(escalaTexto(texto, fator)));
    }
  }

  // Molde H5: remove pixels da arte sob o módulo da câmera
  const cameraFrameUrl = opts.cameraFrameUrl?.trim();
  if (incluirFoto && cameraFrameUrl) {
    try {
      const cameraImg = await loadImageForCanvasExport(cameraFrameUrl);
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
    } catch {
      // segue sem punch se o asset falhar
    }
  }

  if (incluirFoto) {
    if (clip === "mascara" && maskImage) {
      layer.add(
        new Konva.Image({
          image: maskImage,
          x: molduraX,
          y: molduraY,
          width: molduraW,
          height: molduraH,
          globalCompositeOperation: "destination-in",
        }),
      );
    } else {
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
  cameraFrameUrl?: string;
  corFundo?: string;
};

export async function exportCaseArtBlob(
  fotoUrlOrFotos: string | FotoExportInput[],
  transform: Transform,
  textos: TextoCapinha[] = [],
  exportWidth = EXPORT_ART_WIDTH,
  geo: ArtGeo = {},
): Promise<Blob> {
  const dataUrl = await exportCaseArtDataUrl(fotoUrlOrFotos, transform, textos, {
    exportWidth,
    clip: "retangulo",
    ...geo,
  });
  return dataUrlParaBlob(dataUrl);
}

export async function exportFotoArtBlob(
  fotoUrlOrFotos: string | FotoExportInput[],
  transform: Transform,
  exportWidth = EXPORT_ART_WIDTH,
  geo: ArtGeo = {},
): Promise<Blob> {
  const dataUrl = await exportCaseArtDataUrl(fotoUrlOrFotos, transform, [], {
    exportWidth,
    clip: "retangulo",
    incluirTexto: false,
    ...geo,
  });
  return dataUrlParaBlob(dataUrl);
}

export async function exportTextoArtBlob(
  transform: Transform,
  textos: TextoCapinha[],
  exportWidth = EXPORT_ART_WIDTH,
  geo: ArtGeo = {},
): Promise<Blob> {
  const dataUrl = await exportCaseArtDataUrl([], transform, textos, {
    exportWidth,
    incluirFoto: false,
    ...geo,
  });
  return dataUrlParaBlob(dataUrl);
}
