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

/** Grupo para exibir no seletor (optgroup). */
export type DispositivoGrupo = "Apple" | "Samsung" | "Xiaomi" | "Google" | "Outros";

export const DISPOSITIVOS_PRESETS: (DispositivoPreset & {
  grupo: DispositivoGrupo;
})[] = [
  // ——— Apple (iPhone 13 → 17) ———
  { id: "iphone-air", rotulo: "iPhone Air", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1260, alturaPx: 2736, cameraPresetId: "iphone-air", corAparelho: "#e7e0d3" },
  { id: "iphone-17-pro-max", rotulo: "iPhone 17 Pro Max", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1290, alturaPx: 2796, cameraPresetId: "iphone-17-pro", corAparelho: "#2b2b2e" },
  { id: "iphone-17-pro", rotulo: "iPhone 17 Pro", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1179, alturaPx: 2556, cameraPresetId: "iphone-17-pro", corAparelho: "#2b2b2e" },
  { id: "iphone-17", rotulo: "iPhone 17", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1179, alturaPx: 2556, cameraPresetId: "iphone-17", corAparelho: "#1a1a1a" },
  { id: "iphone-16-pro-max", rotulo: "iPhone 16 Pro Max", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1290, alturaPx: 2796, cameraPresetId: "iphone-16-pro", corAparelho: "#2b2b2e" },
  { id: "iphone-16-pro", rotulo: "iPhone 16 Pro", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1179, alturaPx: 2556, cameraPresetId: "iphone-16-pro", corAparelho: "#2b2b2e" },
  { id: "iphone-16-plus", rotulo: "iPhone 16 Plus", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1290, alturaPx: 2796, cameraPresetId: "iphone-16", corAparelho: "#1a1a1a" },
  { id: "iphone-16", rotulo: "iPhone 16", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1179, alturaPx: 2556, cameraPresetId: "iphone-16", corAparelho: "#1a1a1a" },
  { id: "iphone-16e", rotulo: "iPhone 16e", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1170, alturaPx: 2532, cameraPresetId: "iphone-16e", corAparelho: "#1a1a1a" },
  { id: "iphone-15-pro-max", rotulo: "iPhone 15 Pro Max", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1290, alturaPx: 2796, cameraPresetId: "iphone-15-pro", corAparelho: "#2b2b2e" },
  { id: "iphone-15-pro", rotulo: "iPhone 15 Pro", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1179, alturaPx: 2556, cameraPresetId: "iphone-15-pro", corAparelho: "#2b2b2e" },
  { id: "iphone-15-plus", rotulo: "iPhone 15 Plus", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1290, alturaPx: 2796, cameraPresetId: "iphone-15", corAparelho: "#e7e0d3" },
  { id: "iphone-15", rotulo: "iPhone 15", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1179, alturaPx: 2556, cameraPresetId: "iphone-15", corAparelho: "#e7e0d3" },
  { id: "iphone-14-pro-max", rotulo: "iPhone 14 Pro Max", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1290, alturaPx: 2796, cameraPresetId: "iphone-14-pro", corAparelho: "#2b2b2e" },
  { id: "iphone-14-pro", rotulo: "iPhone 14 Pro", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1179, alturaPx: 2556, cameraPresetId: "iphone-14-pro", corAparelho: "#2b2b2e" },
  { id: "iphone-14-plus", rotulo: "iPhone 14 Plus", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1284, alturaPx: 2778, cameraPresetId: "iphone-14", corAparelho: "#1a1a1a" },
  { id: "iphone-14", rotulo: "iPhone 14", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1170, alturaPx: 2532, cameraPresetId: "iphone-14", corAparelho: "#1a1a1a" },
  { id: "iphone-13-pro-max", rotulo: "iPhone 13 Pro Max", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1284, alturaPx: 2778, cameraPresetId: "iphone-13-pro", corAparelho: "#2b2b2e" },
  { id: "iphone-13-pro", rotulo: "iPhone 13 Pro", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1170, alturaPx: 2532, cameraPresetId: "iphone-13-pro", corAparelho: "#2b2b2e" },
  { id: "iphone-13", rotulo: "iPhone 13", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1170, alturaPx: 2532, cameraPresetId: "iphone-13", corAparelho: "#1a1a1a" },
  { id: "iphone-13-mini", rotulo: "iPhone 13 mini", grupo: "Apple", marcaSugerida: "apple", larguraPx: 1080, alturaPx: 2340, cameraPresetId: "iphone-13-mini", corAparelho: "#1a1a1a" },

  // ——— Samsung Galaxy ———
  { id: "galaxy-s25-ultra", rotulo: "Galaxy S25 Ultra", grupo: "Samsung", marcaSugerida: "samsung", larguraPx: 1440, alturaPx: 3120, cameraPresetId: "galaxy-s25-ultra", corAparelho: "#1a1a1a" },
  { id: "galaxy-s25", rotulo: "Galaxy S25 / S25+", grupo: "Samsung", marcaSugerida: "samsung", larguraPx: 1080, alturaPx: 2340, cameraPresetId: "galaxy-s25", corAparelho: "#1a1a1a" },
  { id: "galaxy-s24-ultra", rotulo: "Galaxy S24 Ultra", grupo: "Samsung", marcaSugerida: "samsung", larguraPx: 1440, alturaPx: 3120, cameraPresetId: "galaxy-s24-ultra", corAparelho: "#3a3f44" },
  { id: "galaxy-s24", rotulo: "Galaxy S24 / S24+", grupo: "Samsung", marcaSugerida: "samsung", larguraPx: 1080, alturaPx: 2340, cameraPresetId: "galaxy-s24", corAparelho: "#3a3f44" },
  { id: "galaxy-s23-ultra", rotulo: "Galaxy S23 Ultra", grupo: "Samsung", marcaSugerida: "samsung", larguraPx: 1440, alturaPx: 3088, cameraPresetId: "galaxy-s23-ultra", corAparelho: "#1a1a1a" },
  { id: "galaxy-s23", rotulo: "Galaxy S23 / S23+", grupo: "Samsung", marcaSugerida: "samsung", larguraPx: 1080, alturaPx: 2340, cameraPresetId: "galaxy-s23", corAparelho: "#1a1a1a" },
  { id: "galaxy-s22-ultra", rotulo: "Galaxy S22 Ultra", grupo: "Samsung", marcaSugerida: "samsung", larguraPx: 1440, alturaPx: 3088, cameraPresetId: "galaxy-s22-ultra", corAparelho: "#1a1a1a" },
  { id: "galaxy-s22", rotulo: "Galaxy S22 / S22+", grupo: "Samsung", marcaSugerida: "samsung", larguraPx: 1080, alturaPx: 2340, cameraPresetId: "galaxy-s22", corAparelho: "#1a1a1a" },
  { id: "galaxy-s21-ultra", rotulo: "Galaxy S21 Ultra", grupo: "Samsung", marcaSugerida: "samsung", larguraPx: 1440, alturaPx: 3200, cameraPresetId: "galaxy-s21-ultra", corAparelho: "#1a1a1a" },
  { id: "galaxy-s21", rotulo: "Galaxy S21 / S21+", grupo: "Samsung", marcaSugerida: "samsung", larguraPx: 1080, alturaPx: 2400, cameraPresetId: "galaxy-s21", corAparelho: "#1a1a1a" },
  { id: "galaxy-fe", rotulo: "Galaxy S FE", grupo: "Samsung", marcaSugerida: "samsung", larguraPx: 1080, alturaPx: 2340, cameraPresetId: "galaxy-fe", corAparelho: "#1a1a1a" },
  { id: "galaxy-a", rotulo: "Galaxy A (série A)", grupo: "Samsung", marcaSugerida: "samsung", larguraPx: 1080, alturaPx: 2400, cameraPresetId: "galaxy-a", corAparelho: "#1a1a1a" },
  { id: "galaxy-z-flip", rotulo: "Galaxy Z Flip", grupo: "Samsung", marcaSugerida: "samsung", larguraPx: 1080, alturaPx: 2640, cameraPresetId: "galaxy-z-flip", corAparelho: "#1a1a1a" },
  { id: "galaxy-z-fold", rotulo: "Galaxy Z Fold", grupo: "Samsung", marcaSugerida: "samsung", larguraPx: 1812, alturaPx: 2176, cameraPresetId: "galaxy-z-fold", corAparelho: "#1a1a1a" },

  // ——— Xiaomi ———
  { id: "xiaomi-15-ultra", rotulo: "Xiaomi 15 Ultra", grupo: "Xiaomi", marcaSugerida: "xiaomi", larguraPx: 1440, alturaPx: 3200, cameraPresetId: "xiaomi-15-ultra", corAparelho: "#1a1a1a" },
  { id: "xiaomi-15-pro", rotulo: "Xiaomi 15 Pro", grupo: "Xiaomi", marcaSugerida: "xiaomi", larguraPx: 1440, alturaPx: 3200, cameraPresetId: "xiaomi-15-pro", corAparelho: "#1a1a1a" },
  { id: "xiaomi-15", rotulo: "Xiaomi 15", grupo: "Xiaomi", marcaSugerida: "xiaomi", larguraPx: 1200, alturaPx: 2670, cameraPresetId: "xiaomi-15", corAparelho: "#1a1a1a" },
  { id: "xiaomi-14-ultra", rotulo: "Xiaomi 14 Ultra", grupo: "Xiaomi", marcaSugerida: "xiaomi", larguraPx: 1440, alturaPx: 3200, cameraPresetId: "xiaomi-14-ultra", corAparelho: "#1a1a1a" },
  { id: "xiaomi-14-pro", rotulo: "Xiaomi 14 Pro", grupo: "Xiaomi", marcaSugerida: "xiaomi", larguraPx: 1440, alturaPx: 3200, cameraPresetId: "xiaomi-14-pro", corAparelho: "#1a1a1a" },
  { id: "xiaomi-14", rotulo: "Xiaomi 14", grupo: "Xiaomi", marcaSugerida: "xiaomi", larguraPx: 1200, alturaPx: 2670, cameraPresetId: "xiaomi-14", corAparelho: "#1a1a1a" },
  { id: "xiaomi-13-ultra", rotulo: "Xiaomi 13 Ultra", grupo: "Xiaomi", marcaSugerida: "xiaomi", larguraPx: 1440, alturaPx: 3200, cameraPresetId: "xiaomi-13-ultra", corAparelho: "#1a1a1a" },
  { id: "xiaomi-13-pro", rotulo: "Xiaomi 13 Pro", grupo: "Xiaomi", marcaSugerida: "xiaomi", larguraPx: 1440, alturaPx: 3200, cameraPresetId: "xiaomi-13-pro", corAparelho: "#1a1a1a" },
  { id: "xiaomi-13", rotulo: "Xiaomi 13", grupo: "Xiaomi", marcaSugerida: "xiaomi", larguraPx: 1080, alturaPx: 2400, cameraPresetId: "xiaomi-13", corAparelho: "#1a1a1a" },
  { id: "redmi-note", rotulo: "Redmi Note", grupo: "Xiaomi", marcaSugerida: "xiaomi", larguraPx: 1080, alturaPx: 2400, cameraPresetId: "redmi-note", corAparelho: "#1a1a1a" },
  { id: "poco", rotulo: "POCO", grupo: "Xiaomi", marcaSugerida: "xiaomi", larguraPx: 1080, alturaPx: 2400, cameraPresetId: "poco", corAparelho: "#1a1a1a" },

  // ——— Google ———
  { id: "pixel-9", rotulo: "Google Pixel 9", grupo: "Google", marcaSugerida: "google", larguraPx: 1080, alturaPx: 2424, cameraPresetId: "pixel-9", corAparelho: "#1a1a1a" },
  { id: "pixel-8", rotulo: "Google Pixel 8", grupo: "Google", marcaSugerida: "google", larguraPx: 1080, alturaPx: 2400, cameraPresetId: "pixel-8", corAparelho: "#1a1a1a" },

  // ——— Outros ———
  { id: "motorola", rotulo: "Motorola (Moto G / Edge)", grupo: "Outros", marcaSugerida: "motorola", larguraPx: 1080, alturaPx: 2400, cameraPresetId: "android-duplo", corAparelho: "#1a1a1a" },
  { id: "android-generico", rotulo: "Outro Android", grupo: "Outros", marcaSugerida: null, larguraPx: 1080, alturaPx: 2340, cameraPresetId: "android-triplo", corAparelho: "#1a1a1a" },
];

export function getDispositivoPreset(id: string): DispositivoPreset | undefined {
  return DISPOSITIVOS_PRESETS.find((d) => d.id === id);
}
