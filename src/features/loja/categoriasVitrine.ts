/**
 * Categorias de vitrine (loja) — estilo Gocase, visual Zen Pro.
 * Atribuição no produto via `categoriaId`.
 *
 * - personalizadas = arte/tema já pronto (cliente não edita)
 * - personalizaveis = cliente envia foto / personaliza no editor
 */

export const CATEGORIA_VITRINE_IDS = [
  "capinhas",
  "termicos",
  "personalizadas",
  "personalizaveis",
  "acessorios",
] as const;

export type CategoriaVitrineId = (typeof CATEGORIA_VITRINE_IDS)[number];

export type CategoriaVitrine = {
  id: CategoriaVitrineId;
  slug: CategoriaVitrineId;
  nome: string;
  descricao: string;
  /** Se true, listagem usa cards/fluxo de personalização. */
  personalizavel: boolean;
};

/** Ordem do menu / home (Capinhas primeiro). */
export const CATEGORIAS_VITRINE: CategoriaVitrine[] = [
  {
    id: "capinhas",
    slug: "capinhas",
    nome: "Capinhas",
    descricao: "Cases prontas para o seu celular.",
    personalizavel: false,
  },
  {
    id: "personalizaveis",
    slug: "personalizaveis",
    nome: "Personalizáveis",
    descricao: "Capinhas com a sua foto, nome ou arte — personalize na hora.",
    personalizavel: true,
  },
  {
    id: "personalizadas",
    slug: "personalizadas",
    nome: "Personalizadas",
    descricao: "Cases com arte e temas prontos — já personalizadas.",
    personalizavel: false,
  },
  {
    id: "termicos",
    slug: "termicos",
    nome: "Térmicos",
    descricao: "Garrafas, copos e acessórios térmicos para o dia a dia.",
    personalizavel: false,
  },
  {
    id: "acessorios",
    slug: "acessorios",
    nome: "Acessórios",
    descricao: "Películas, chaveiros e outros acessórios para o dia a dia.",
    personalizavel: false,
  },
];

/** Subtipos do menu Térmicos (estilo Gocase) — filtro por query `sub`. */
export const TERMICOS_SUBTIPOS: {
  id: string;
  nome: string;
  /** Palavras para filtrar nome/descrição do produto (local). */
  keywords: string[];
}[] = [
  {
    id: "garrafas",
    nome: "Garrafas Térmicas",
    keywords: ["garrafa", "bottle"],
  },
  {
    id: "copos",
    nome: "Copos Térmicos",
    keywords: ["copo", "cup", "tumbler"],
  },
  {
    id: "tacas",
    nome: "Taça Térmica",
    keywords: ["taça", "taca", "drink"],
  },
  {
    id: "acessorios",
    nome: "Acessórios Térmicos",
    keywords: ["tampa", "base", "alça", "acessorio", "acessório"],
  },
];

export function obterTermicoSubtipo(id: string) {
  return TERMICOS_SUBTIPOS.find((s) => s.id === id);
}

export function isCategoriaVitrineId(v: unknown): v is CategoriaVitrineId {
  return (
    typeof v === "string" &&
    (CATEGORIA_VITRINE_IDS as readonly string[]).includes(v)
  );
}

export function obterCategoriaVitrine(
  slug: string,
): CategoriaVitrine | undefined {
  return CATEGORIAS_VITRINE.find((c) => c.slug === slug || c.id === slug);
}

/**
 * Migração leve:
 * - sem categoriaId → personalizaveis se personalizável, senão capinhas
 * - personalizadas + personalizavel (legado) → personalizaveis
 */
export function inferirCategoriaId(data: {
  categoriaId?: unknown;
  personalizavel?: unknown;
  categoria?: unknown;
}): CategoriaVitrineId {
  if (isCategoriaVitrineId(data.categoriaId)) {
    if (
      data.categoriaId === "personalizadas" &&
      data.personalizavel === true
    ) {
      return "personalizaveis";
    }
    return data.categoriaId;
  }
  if (data.personalizavel === true) return "personalizaveis";
  const cat = String(data.categoria ?? "");
  if (cat === "termicos" || cat === "térmicos") return "termicos";
  if (cat === "personalizaveis" || cat === "personalizáveis") {
    return "personalizaveis";
  }
  if (cat === "personalizadas") return "personalizadas";
  if (
    cat === "acessorios" ||
    cat === "acessórios" ||
    cat === "peliculas" ||
    cat === "películas" ||
    cat === "carregadores" ||
    cat === "chaveiros"
  ) {
    return "acessorios";
  }
  return "capinhas";
}

export function categoriaEhCapinhaCelular(categoriaId: CategoriaVitrineId) {
  return (
    categoriaId === "capinhas" ||
    categoriaId === "personalizadas" ||
    categoriaId === "personalizaveis"
  );
}

export function categoriaPermitePersonalizar(
  categoriaId: CategoriaVitrineId,
) {
  return categoriaId === "personalizaveis";
}
