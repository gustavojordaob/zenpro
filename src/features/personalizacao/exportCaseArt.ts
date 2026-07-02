import Konva from "konva";
import { getFonteFamilia } from "./caseTextFonts";
import { getCaseLayout } from "./caseGeometry";
import { EXPORT_ART_WIDTH } from "./caseVisualConstants";
import { extrairCorPredominante } from "./extrairCorPredominante";
import { loadImageForCanvasExport } from "./loadImageForCanvasExport";
import { IPHONE_ASSETS } from "./moldura";
import type { TextoCapinha, Transform } from "./types";

const EDITOR_WIDTH = IPHONE_ASSETS.previewWidth;

function loadHtmlImage(
  src: string,
  crossOrigin = true,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}

async function loadMaskImage(): Promise<HTMLImageElement> {
  return loadHtmlImage(IPHONE_ASSETS.maskUrl, false);
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
    scale: transform.scale,
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
  /** "mascara" = forma exata do modelo (produção); "retangulo" = capa cheia (preview) */
  clip?: "mascara" | "retangulo";
};

/** Arte só da área útil (para impressão) — alta resolução, como dataURL */
export async function exportCaseArtDataUrl(
  fotoUrl: string,
  transform: Transform,
  textos: TextoCapinha[] = [],
  opts: ExportOpts = {},
): Promise<string> {
  const exportWidth = opts.exportWidth ?? EXPORT_ART_WIDTH;
  const clip = opts.clip ?? "mascara";
  await garantirFontesCarregadas();

  const fator = exportWidth / EDITOR_WIDTH;
  const layoutEditor = getCaseLayout(EDITOR_WIDTH);
  const layout = getCaseLayout(exportWidth);
  const { molduraX, molduraY, molduraW, molduraH, stageWidth, stageHeight } =
    layout;
  const t = escalaTransform(transform, fator);

  const [fotoImage, maskImage] = await Promise.all([
    loadImageForCanvasExport(fotoUrl),
    clip === "mascara"
      ? loadMaskImage()
      : Promise.resolve<HTMLImageElement | null>(null),
  ]);

  const corFundo = extrairCorPredominante(fotoImage, transform, {
    x: layoutEditor.molduraX,
    y: layoutEditor.molduraY,
    w: layoutEditor.molduraW,
    h: layoutEditor.molduraH,
  });

  const container = document.createElement("div");
  const stage = new Konva.Stage({
    container,
    width: stageWidth,
    height: stageHeight,
  });
  const layer = new Konva.Layer();
  stage.add(layer);

  const fundo = new Konva.Rect({
    x: molduraX,
    y: molduraY,
    width: molduraW,
    height: molduraH,
    fill: corFundo,
  });

  // Fundo borrado = a própria foto cobrindo toda a capa (preenche vãos).
  const bgBoost = 1.18;
  const bgScale =
    Math.max(molduraW / fotoImage.width, molduraH / fotoImage.height) * bgBoost;
  const bgW = fotoImage.width * bgScale;
  const bgH = fotoImage.height * bgScale;
  const bgFoto = new Konva.Image({
    image: fotoImage,
    x: molduraX + (molduraW - bgW) / 2,
    y: molduraY + (molduraH - bgH) / 2,
    scaleX: bgScale,
    scaleY: bgScale,
  });
  try {
    bgFoto.cache();
    bgFoto.filters([Konva.Filters.Blur]);
    bgFoto.blurRadius(Math.round(molduraW * 0.16));
  } catch {
    // imagem não permite leitura de pixels — segue sem blur (cor de fundo cobre)
  }

  const foto = new Konva.Image({
    image: fotoImage,
    x: t.x,
    y: t.y,
    scaleX: t.scale,
    scaleY: t.scale,
    rotation: t.rotation,
  });

  layer.add(fundo);
  layer.add(bgFoto);
  layer.add(foto);

  for (const texto of textos) {
    layer.add(criarTextoKonva(escalaTexto(texto, fator)));
  }

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
    // recorte em retângulo arredondado (capa cheia, sem furo de câmera)
    layer.add(
      new Konva.Rect({
        x: molduraX,
        y: molduraY,
        width: molduraW,
        height: molduraH,
        cornerRadius: molduraW * 0.12,
        fill: "#000",
        globalCompositeOperation: "destination-in",
      }),
    );
  }

  layer.draw();

  const dataUrl = stage.toDataURL({
    pixelRatio: 1,
    mimeType: "image/png",
    x: molduraX,
    y: molduraY,
    width: molduraW,
    height: molduraH,
  });

  stage.destroy();

  return dataUrl;
}

/** Arte só da área útil (para impressão) — alta resolução */
export async function exportCaseArtBlob(
  fotoUrl: string,
  transform: Transform,
  textos: TextoCapinha[] = [],
  exportWidth = EXPORT_ART_WIDTH,
): Promise<Blob> {
  const dataUrl = await exportCaseArtDataUrl(fotoUrl, transform, textos, {
    exportWidth,
    clip: "mascara",
  });
  const res = await fetch(dataUrl);
  return res.blob();
}

export function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
