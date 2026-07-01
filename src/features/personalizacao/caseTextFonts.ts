export type FonteCapinhaId =
  | "montserrat"
  | "playfair"
  | "bebas"
  | "pacifico"
  | "marker"
  | "emoji";

export type TextoCapinha = {
  id: string;
  conteudo: string;
  x: number;
  y: number;
  fontSize: number;
  fontId: FonteCapinhaId;
  fill: string;
  rotation: number;
  align: "left" | "center" | "right";
  fontStyle: "normal" | "bold" | "italic";
};

export const FONTES_CAPINHA: {
  id: FonteCapinhaId;
  rotulo: string;
  familia: string;
  amostra: string;
}[] = [
  {
    id: "montserrat",
    rotulo: "Moderna",
    familia: "Montserrat, sans-serif",
    amostra: "Aa",
  },
  {
    id: "playfair",
    rotulo: "Elegante",
    familia: '"Playfair Display", serif',
    amostra: "Aa",
  },
  {
    id: "bebas",
    rotulo: "Impacto",
    familia: '"Bebas Neue", sans-serif',
    amostra: "AA",
  },
  {
    id: "pacifico",
    rotulo: "Script",
    familia: "Pacifico, cursive",
    amostra: "Aa",
  },
  {
    id: "marker",
    rotulo: "Casual",
    familia: '"Permanent Marker", cursive',
    amostra: "Aa",
  },
  {
    id: "emoji",
    rotulo: "Emoji + texto",
    familia:
      'Montserrat, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
    amostra: "😊",
  },
];

export const CORES_TEXTO = [
  "#ffffff",
  "#000000",
  "#fbbf24",
  "#ef4444",
  "#ec4899",
  "#a855f7",
  "#3b82f6",
  "#22c55e",
] as const;

export const EMOJIS_RAPIDOS = [
  "❤️",
  "✨",
  "🔥",
  "😊",
  "🎉",
  "💜",
  "⭐",
  "🌸",
  "📸",
  "💫",
  "🎁",
  "👑",
] as const;

export function getFonteFamilia(fontId: FonteCapinhaId): string {
  return FONTES_CAPINHA.find((f) => f.id === fontId)?.familia ?? "Montserrat, sans-serif";
}

export function criarTextoPadrao(
  molduraX: number,
  molduraY: number,
  molduraW: number,
  molduraH: number,
): TextoCapinha {
  return {
    id: crypto.randomUUID(),
    conteudo: "Seu texto ✨",
    x: molduraX + molduraW / 2,
    y: molduraY + molduraH * 0.72,
    fontSize: 24,
    fontId: "montserrat",
    fill: "#ffffff",
    rotation: 0,
    align: "center",
    fontStyle: "bold",
  };
}
