/**
 * Slides do carrossel da home — edite aqui (foto ou vídeo).
 * Fotos: public/banners/ · Vídeos: public/videos/
 */
export type HomeCarouselSlide = {
  id: string;
  /** imagem = foto; video = mp4. Omita imageUrl/mp4Url para slide só texto. */
  tipo?: "imagem" | "video";
  /** Caminho da foto (ou poster do vídeo) */
  imageUrl?: string;
  mp4Url?: string;
  titulo: string;
  subtitulo?: string;
  ctaLabel?: string;
  ctaHref?: string;
  /**
   * personalizacao = destaque case + preview (hero, sem mídia externa)
   * split | overlay = com foto/vídeo
   */
  layout?: "personalizacao" | "split" | "overlay" | "texto";
  painelGradiente?: string;
  parceiro?: string;
  /** Slot vazio reservado para mídia futura (parceiros) */
  slotVazio?: boolean;
};

/** Topo — carrossel sem foto/vídeo por enquanto; foco em personalização */
export const HOME_HERO_CARROSSEL: HomeCarouselSlide[] = [
  {
    id: "personalizar-case",
    titulo: "Cases personalizadas",
    subtitulo:
      "Sua foto, nome ou arte na case — personalize em tempo real no navegador",
    ctaLabel: "Personalizar agora",
    ctaHref: "#personalizar",
    layout: "personalizacao",
    painelGradiente:
      "linear-gradient(145deg, #1c1917 0%, #3d3422 50%, #1a1814 100%)",
  },
  {
    id: "temas-variedade",
    titulo: "Times, pets e momentos",
    subtitulo:
      "Vários modelos de celular — temas de viagem, personagens e muito mais",
    ctaLabel: "Ver produtos",
    ctaHref: "#produtos",
    layout: "texto",
    painelGradiente:
      "linear-gradient(145deg, #4a5234 0%, #6b5a3a 45%, #2c2618 100%)",
  },
  {
    id: "premium-apple",
    titulo: "Linha Premium Apple",
    subtitulo: "Cases exclusivas para iPhone com acabamento premium",
    ctaLabel: "Explorar",
    ctaHref: "#produtos",
    layout: "texto",
    painelGradiente:
      "linear-gradient(145deg, #292524 0%, #44403c 50%, #1c1917 100%)",
  },
];

/**
 * Embaixo — espaço menor para foto/vídeo dos parceiros (vazio por enquanto).
 * Quando tiver mídia: tipo + imageUrl ou mp4Url e remova slotVazio.
 */
export const HOME_PARCEIROS_CARROSSEL: HomeCarouselSlide[] = [
  {
    id: "parceiro-slot-1",
    titulo: "Parceiro em destaque",
    subtitulo: "Foto ou vídeo em breve",
    slotVazio: true,
    layout: "overlay",
  },
  {
    id: "parceiro-slot-2",
    titulo: "Conteúdo Zen Pro",
    subtitulo: "Foto ou vídeo em breve",
    slotVazio: true,
    layout: "overlay",
  },
];

export const HOME_CARROSSEL_INTERVAL_MS = 7_000;

export const CATEGORIAS_VENDA = [
  "Cases iPhone",
  "Cases de iPad",
  "Cases de Notebook",
  "Películas",
  "Películas de câmera",
  "Películas de iPad",
  "Películas de notebook",
  "Películas de Apple Watch",
  "Cases personalizadas — todos os modelos",
  "Premium — linha Apple (iPhone)",
] as const;
