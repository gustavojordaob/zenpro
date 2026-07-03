import type { CameraPresetId } from "@/features/personalizacao/cameraModules";

/**
 * Presets de aparelhos comuns para o assistente "Nova capinha".
 * Define proporção (larguraPx × alturaPx), layout de câmera e cor do chassi,
 * para o lojista não precisar saber dimensões nem enviar PNGs de máscara.
 */
export type DispositivoPreset = {
  id: string;
  rotulo: string;
  /** Sugestão de marca (id da coleção marcas, quando existir). */
  marcaSugerida?: "apple" | "samsung" | "google" | "motorola" | "xiaomi" | null;
  larguraPx: number;
  alturaPx: number;
  cameraPresetId: CameraPresetId;
  corAparelho: string;
};

export const DISPOSITIVOS_PRESETS: DispositivoPreset[] = [
  {
    id: "iphone-pro",
    rotulo: "iPhone 15/16 Pro",
    marcaSugerida: "apple",
    larguraPx: 1179,
    alturaPx: 2556,
    cameraPresetId: "iphone-pro",
    corAparelho: "#2b2b2e",
  },
  {
    id: "iphone-pro-max",
    rotulo: "iPhone 15/16 Pro Max",
    marcaSugerida: "apple",
    larguraPx: 1290,
    alturaPx: 2796,
    cameraPresetId: "iphone-pro",
    corAparelho: "#2b2b2e",
  },
  {
    id: "iphone-padrao",
    rotulo: "iPhone 15/16 (padrão)",
    marcaSugerida: "apple",
    larguraPx: 1179,
    alturaPx: 2556,
    cameraPresetId: "iphone-padrao",
    corAparelho: "#1a1a1a",
  },
  {
    id: "iphone-antigo",
    rotulo: "iPhone X/11/12/13",
    marcaSugerida: "apple",
    larguraPx: 1170,
    alturaPx: 2532,
    cameraPresetId: "iphone-dupla-vertical",
    corAparelho: "#1a1a1a",
  },
  {
    id: "galaxy-s",
    rotulo: "Samsung Galaxy S23 / S24",
    marcaSugerida: "samsung",
    larguraPx: 1080,
    alturaPx: 2340,
    cameraPresetId: "android-triplo",
    corAparelho: "#1a1a1a",
  },
  {
    id: "galaxy-ultra",
    rotulo: "Samsung Galaxy S23 / S24 Ultra",
    marcaSugerida: "samsung",
    larguraPx: 1440,
    alturaPx: 3088,
    cameraPresetId: "android-quadruplo",
    corAparelho: "#1a1a1a",
  },
  {
    id: "galaxy-a",
    rotulo: "Samsung Galaxy A (série A)",
    marcaSugerida: "samsung",
    larguraPx: 1080,
    alturaPx: 2400,
    cameraPresetId: "android-quadrado",
    corAparelho: "#1a1a1a",
  },
  {
    id: "pixel",
    rotulo: "Google Pixel",
    marcaSugerida: "google",
    larguraPx: 1080,
    alturaPx: 2400,
    cameraPresetId: "pixel-barra",
    corAparelho: "#1a1a1a",
  },
  {
    id: "motorola",
    rotulo: "Motorola (Moto G / Edge)",
    marcaSugerida: "motorola",
    larguraPx: 1080,
    alturaPx: 2400,
    cameraPresetId: "android-duplo",
    corAparelho: "#1a1a1a",
  },
  {
    id: "xiaomi",
    rotulo: "Xiaomi / Redmi",
    marcaSugerida: "xiaomi",
    larguraPx: 1080,
    alturaPx: 2400,
    cameraPresetId: "android-quadrado",
    corAparelho: "#1a1a1a",
  },
  {
    id: "android-generico",
    rotulo: "Outro Android",
    marcaSugerida: null,
    larguraPx: 1080,
    alturaPx: 2340,
    cameraPresetId: "android-triplo",
    corAparelho: "#1a1a1a",
  },
];

export function getDispositivoPreset(id: string): DispositivoPreset | undefined {
  return DISPOSITIVOS_PRESETS.find((d) => d.id === id);
}
