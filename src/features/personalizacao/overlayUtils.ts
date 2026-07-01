/** Só os traços das lentes (canto superior) — sem corpo azul do overlay. */
export function createCameraLensesOverlay(
  source: HTMLImageElement,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.naturalWidth;
  canvas.height = source.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.drawImage(source, 0, 0);
  const { data, width, height } = ctx.getImageData(
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const cameraZoneMaxY = Math.floor(height * 0.3);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    const y = Math.floor(i / 4 / width);

    if (a < 8 || y > cameraZoneMaxY) {
      data[i + 3] = 0;
      continue;
    }

    const lum = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = lum - min;

    const isWhiteStroke = lum > 168 && sat < 55;

    if (isWhiteStroke) {
      data[i] = 72;
      data[i + 1] = 74;
      data[i + 2] = 78;
      data[i + 3] = 145;
      continue;
    }

    data[i + 3] = 0;
  }

  ctx.putImageData(new ImageData(data, width, height), 0, 0);
  return canvas;
}
