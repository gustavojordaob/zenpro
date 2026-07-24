/**
 * Punch da câmera H5 — a foto não ocupa o módulo (mesmo asset do overlay).
 * Usar num Layer separado do fundo do studio para o composite não apagar o bg.
 *
 * Profundidade estilo GoCase (sombra / corpo): `useCameraMockDepth`.
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
