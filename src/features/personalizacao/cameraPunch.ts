/**
 * Punch da câmera H5 — a foto não ocupa o módulo (mesmo asset do overlay).
 * Usar num Layer separado do fundo do studio para o composite não apagar o bg.
 */
export const CAMERA_PUNCH_COMPOSITE = "destination-out" as const;

export type CameraPunchLayout = {
  molduraX: number;
  molduraY: number;
  molduraW: number;
  molduraH: number;
};

export function cameraPunchProps(
  cameraImage: HTMLImageElement,
  layout: CameraPunchLayout,
) {
  return {
    image: cameraImage,
    x: layout.molduraX,
    y: layout.molduraY,
    width: layout.molduraW,
    height: layout.molduraH,
    listening: false as const,
    globalCompositeOperation: CAMERA_PUNCH_COMPOSITE,
  };
}

/** Sombra de contato usando o alpha real do módulo H5. */
export function cameraContactShadowProps(
  cameraImage: HTMLImageElement,
  layout: CameraPunchLayout,
) {
  return {
    image: cameraImage,
    x: layout.molduraX,
    y: layout.molduraY,
    width: layout.molduraW,
    height: layout.molduraH,
    listening: false as const,
    shadowColor: "#000000",
    shadowBlur: Math.max(3, layout.molduraW * 0.018),
    shadowOffsetX: 0,
    shadowOffsetY: Math.max(1, layout.molduraW * 0.006),
    shadowOpacity: 0.42,
  };
}

/** Reflexo fino da capa transparente em volta do módulo. */
export function cameraClearLipProps(
  cameraImage: HTMLImageElement,
  layout: CameraPunchLayout,
) {
  return {
    image: cameraImage,
    x: layout.molduraX,
    y: layout.molduraY,
    width: layout.molduraW,
    height: layout.molduraH,
    listening: false as const,
    shadowColor: "#ffffff",
    shadowBlur: Math.max(1.5, layout.molduraW * 0.007),
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowOpacity: 0.88,
  };
}
