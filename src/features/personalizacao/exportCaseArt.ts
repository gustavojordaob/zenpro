import Konva from "konva";
import { getFonteFamilia } from "./caseTextFonts";
import { getCaseLayout } from "./caseGeometry";
import { EXPORT_ART_WIDTH } from "./caseVisualConstants";
import { extrairCorPredominante } from "./extrairCorPredominante";
import { loadImageForCanvasExport } from "./loadImageForCanvasExport";
import { IPHONE_ASSETS } from "./moldura";
import type { TextoCapinha, Transform } from "./types";

const EDITOR_WIDTH = IPHONE_ASSETS.previewWidth;

async function loadMaskImage(maskUrl?: string): Promise<HTMLImageElement> {
  // Máscara pode vir do Storage (molde por modelo) — usar loader sem taint.
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
  // `scale` é multiplicador do tamanho natural da imagem no editor (base 280px).
  // Ao exportar/pré-visualizar numa largura maior, a escala precisa crescer no
  // mesmo fator, senão a foto sai menor que no editor ("Ver capa" errado).
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
  /** "mascara" = forma exata do modelo (produção); "retangulo" = capa cheia (preview) */
  clip?: "mascara" | "retangulo";
  /** Desenhar a foto do cliente (default: true). */
  incluirFoto?: boolean;
  /** Desenhar os textos do cliente (default: true). */
  incluirTexto?: boolean;
  /** Dimensões físicas do modelo — proporção da capa (default: iPhone). */
  larguraPx?: number;
  alturaPx?: number;
  /** Molde do modelo (PNG/SVG) para o recorte de produção. */
  maskUrl?: string;
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
  const incluirFoto = opts.incluirFoto ?? true;
  const incluirTexto = opts.incluirTexto ?? true;
  await garantirFontesCarregadas();

  const lw = opts.larguraPx && opts.larguraPx > 0 ? opts.larguraPx : IPHONE_ASSETS.width;
  const lh = opts.alturaPx && opts.alturaPx > 0 ? opts.alturaPx : IPHONE_ASSETS.height;

  const fator = exportWidth / EDITOR_WIDTH;
  const layoutEditor = getCaseLayout(EDITOR_WIDTH, lw, lh);
  const layout = getCaseLayout(exportWidth, lw, lh);
  const { molduraX, molduraY, molduraW, molduraH, stageWidth, stageHeight } =
    layout;
  const t = escalaTransform(transform, fator);

  const precisaMascara = incluirFoto && clip === "mascara";
  const [fotoImage, maskImage] = await Promise.all([
    incluirFoto
      ? loadImageForCanvasExport(fotoUrl)
      : Promise.resolve<HTMLImageElement | null>(null),
    precisaMascara
      ? loadMaskImage(opts.maskUrl)
      : Promise.resolve<HTMLImageElement | null>(null),
  ]);

  const container = document.createElement("div");
  const stage = new Konva.Stage({
    container,
    width: stageWidth,
    height: stageHeight,
  });
  const layer = new Konva.Layer();
  stage.add(layer);

  if (incluirFoto && fotoImage) {
    const corFundo = extrairCorPredominante(fotoImage, transform, {
      x: layoutEditor.molduraX,
      y: layoutEditor.molduraY,
      w: layoutEditor.molduraW,
      h: layoutEditor.molduraH,
    });

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
      Math.max(molduraW / fotoImage.width, molduraH / fotoImage.height) *
      bgBoost;
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
      // imagem não permite leitura de pixels — segue sem blur (cor cobre)
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
  }

  if (incluirTexto) {
    for (const texto of textos) {
      layer.add(criarTextoKonva(escalaTexto(texto, fator)));
    }
  }

  // Recorte só quando há foto. Arte só-texto sai com fundo transparente.
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
      // retângulo arredondado (capa cheia, sem furo de câmera).
      // Inset pequeno para a foto não vazar além do contorno nos cantos.
      const inset = molduraW * 0.02;
      layer.add(
        new Konva.Rect({
          x: molduraX + inset,
          y: molduraY + inset,
          width: molduraW - inset * 2,
          height: molduraH - inset * 2,
          cornerRadius: molduraW * 0.12,
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
    x: molduraX,
    y: molduraY,
    width: molduraW,
    height: molduraH,
  });

  stage.destroy();

  return dataUrl;
}

async function dataUrlParaBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

/** Geometria/molde do modelo repassados às artes de produção. */
export type ArtGeo = {
  larguraPx?: number;
  alturaPx?: number;
  maskUrl?: string;
};

/** Arte combinada (foto + texto) recortada na forma do modelo — produção. */
export async function exportCaseArtBlob(
  fotoUrl: string,
  transform: Transform,
  textos: TextoCapinha[] = [],
  exportWidth = EXPORT_ART_WIDTH,
  geo: ArtGeo = {},
): Promise<Blob> {
  const dataUrl = await exportCaseArtDataUrl(fotoUrl, transform, textos, {
    exportWidth,
    clip: "mascara",
    ...geo,
  });
  return dataUrlParaBlob(dataUrl);
}

/** Arte só com a foto do cliente (sem texto), recortada no modelo. */
export async function exportFotoArtBlob(
  fotoUrl: string,
  transform: Transform,
  exportWidth = EXPORT_ART_WIDTH,
  geo: ArtGeo = {},
): Promise<Blob> {
  const dataUrl = await exportCaseArtDataUrl(fotoUrl, transform, [], {
    exportWidth,
    clip: "mascara",
    incluirTexto: false,
    ...geo,
  });
  return dataUrlParaBlob(dataUrl);
}

/** Arte só com o texto do cliente, fundo transparente (PNG). */
export async function exportTextoArtBlob(
  transform: Transform,
  textos: TextoCapinha[],
  exportWidth = EXPORT_ART_WIDTH,
  geo: ArtGeo = {},
): Promise<Blob> {
  const dataUrl = await exportCaseArtDataUrl("", transform, textos, {
    exportWidth,
    incluirFoto: false,
    ...geo,
  });
  return dataUrlParaBlob(dataUrl);
}

export function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
