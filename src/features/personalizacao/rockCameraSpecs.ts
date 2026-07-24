import rockb2bCameraSpecs from "@/features/personalizacao/rockb2bCameraSpecs.json";
import type { CameraModuleSpec } from "@/features/personalizacao/cameraModules";

const SPECS = rockb2bCameraSpecs as Record<string, CameraModuleSpec>;

/**
 * Spec de câmera derivada do molde H5 RockB2B (ilha) + lentes do mock SVG.
 * Usar no preview polido — geometria do H5, visual do mock.
 */
export function getRockCameraSpec(
  modeloId: string,
): CameraModuleSpec | null {
  return SPECS[modeloId] ?? null;
}
