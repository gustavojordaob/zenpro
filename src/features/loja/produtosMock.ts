export type TipoProduto = "personalizada" | "pronta";

export type CategoriaProduto =
  | "capinhas"
  | "acessorios"
  | "peliculas"
  | "carregadores";

export type ProdutoDestaque = {
  id: string;
  /** ID real em produtos/ (quando id do card é composto com modelo) */
  produtoBaseId?: string;
  nome: string;
  descricao: string;
  modeloId: string;
  /** Modelos compatíveis — página do produto (seletor estilo OBLI). */
  modelosCompativeis?: string[];
  marca: string;
  precoCentavos: number;
  tipo: TipoProduto;
  categoria: CategoriaProduto;
  material?: string;
  destaque?: string;
  imagemUrl?: string;
  /** Galeria completa quando disponível. */
  imagens?: string[];
  gradienteCapa?: string;
  controlaEstoque?: boolean;
  disponivelVenda?: number;
  esgotado?: boolean;
  /** B2B */
  quantidadeInicial?: number;
  faixasPrecoRevendedor?: import("@/features/multitenant/types").FaixaPrecoRevendedor[];
  pedidoMinimoRevendedorCentavos?: number;
  precoBaseCentavos?: number;
  precoRevendedorCentavos?: number;
};

export const CATEGORIAS_PRODUTO: {
  id: CategoriaProduto | "todos";
  rotulo: string;
}[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "capinhas", rotulo: "Capinhas" },
  { id: "acessorios", rotulo: "Acessórios" },
  { id: "peliculas", rotulo: "Películas" },
  { id: "carregadores", rotulo: "Carregadores" },
];

const ROTULO_CATEGORIA: Record<CategoriaProduto, string> = {
  capinhas: "Capinhas",
  acessorios: "Acessórios",
  peliculas: "Películas",
  carregadores: "Carregadores",
};

/** Produtos prontos para compra — catálogo da loja */
export const PRODUTOS_LOJA: ProdutoDestaque[] = [
  {
    id: "case-clear-orange",
    nome: "Capinha Clear Laranja",
    descricao:
      "Capinha transparente laranja com MagSafe, proteção reforçada e acabamento brilhante para iPhone 15.",
    modeloId: "iphone-15",
    marca: "Apple iPhone 15",
    precoCentavos: 4990,
    tipo: "pronta",
    categoria: "capinhas",
    imagemUrl: "/produtos/case_clear_orange.jpg",
    destaque: "MagSafe",
  },
  {
    id: "case-armor-defender",
    nome: "Armor Defender Cobre",
    descricao:
      "Capinha híbrida cobre com bordas transparentes e proteção extra no módulo de câmera.",
    modeloId: "iphone-15",
    marca: "Apple iPhone 15",
    precoCentavos: 5990,
    tipo: "pronta",
    categoria: "capinhas",
    imagemUrl: "/produtos/case_armor_defender.jpg",
  },
  {
    id: "case-armor-defender-steel",
    nome: "Armor Defender Steel",
    descricao:
      "Capinha fosca transparente com MagSafe e visual minimalista para uso diário.",
    modeloId: "iphone-15",
    marca: "Apple iPhone 15",
    precoCentavos: 5990,
    tipo: "pronta",
    categoria: "capinhas",
    imagemUrl: "/produtos/case_armor_defender_steel.jpg",
    destaque: "Novo",
  },
  {
    id: "cap-silicone-preta",
    nome: "Capinha Silicone Preta",
    descricao:
      "Capinha de silicone macio preta, antiderrapante e fácil de colocar no bolso.",
    modeloId: "iphone-15",
    marca: "Apple iPhone 15",
    precoCentavos: 3490,
    tipo: "pronta",
    categoria: "capinhas",
    gradienteCapa: "from-zinc-700 via-zinc-900 to-black",
  },
  {
    id: "cap-silicone-rosa-s24",
    nome: "Capinha Silicone Rosa",
    descricao:
      "Capinha silicone rosa para Galaxy S24, toque aveludado e proteção contra quedas leves.",
    modeloId: "samsung-s24",
    marca: "Samsung Galaxy S24",
    precoCentavos: 3490,
    tipo: "pronta",
    categoria: "capinhas",
    gradienteCapa: "from-pink-300 via-rose-400 to-fuchsia-500",
  },
  {
    id: "cap-wallet-couro",
    nome: "Capinha Wallet Couro",
    descricao:
      "Capinha carteira em couro sintético com compartimento para cartões e visual premium.",
    modeloId: "iphone-15",
    marca: "Apple iPhone 15",
    precoCentavos: 7990,
    tipo: "pronta",
    categoria: "capinhas",
    gradienteCapa: "from-amber-700 via-amber-900 to-stone-900",
    destaque: "Premium",
  },
  {
    id: "adaptador-usbc-fones",
    nome: "Adaptador USB-C para Fones",
    descricao:
      "Adaptador USB-C para entrada P2, ideal para usar fones com fio em celulares sem jack.",
    modeloId: "iphone-15",
    marca: "Universal",
    precoCentavos: 2990,
    tipo: "pronta",
    categoria: "acessorios",
    imagemUrl: "/produtos/adaptador_usbc_conector_fones.jpg",
    destaque: "Mais vendido",
  },
  {
    id: "cabo-usbc-1m",
    nome: "Cabo USB-C 1 metro",
    descricao:
      "Cabo USB-C reforçado de 1 metro para carga e transferência de dados.",
    modeloId: "iphone-15",
    marca: "Universal",
    precoCentavos: 3990,
    tipo: "pronta",
    categoria: "acessorios",
    gradienteCapa: "from-zinc-200 via-zinc-300 to-zinc-400",
  },
  {
    id: "anel-magsafe",
    nome: "Anel MagSafe",
    descricao:
      "Anel magnético MagSafe para segurança ao segurar o celular e rotação em mesa.",
    modeloId: "iphone-15",
    marca: "Apple iPhone",
    precoCentavos: 2490,
    tipo: "pronta",
    categoria: "acessorios",
    gradienteCapa: "from-slate-300 via-slate-400 to-slate-600",
  },
  {
    id: "pop-socket",
    nome: "Pop Socket Adesivo",
    descricao:
      "Suporte adesivo Pop Socket colorido para firmeza na mão e apoio na mesa.",
    modeloId: "iphone-15",
    marca: "Universal",
    precoCentavos: 1990,
    tipo: "pronta",
    categoria: "acessorios",
    gradienteCapa: "from-violet-400 via-purple-500 to-indigo-600",
  },
  {
    id: "pelicula-vidro-iphone15",
    nome: "Película Vidro Temperado",
    descricao:
      "Película de vidro temperado 9H para iPhone 15, alta transparência e anti-risco.",
    modeloId: "iphone-15",
    marca: "Apple iPhone 15",
    precoCentavos: 2990,
    tipo: "pronta",
    categoria: "peliculas",
    gradienteCapa: "from-sky-100 via-blue-200 to-sky-300",
  },
  {
    id: "pelicula-privacidade-s24",
    nome: "Película Privacidade",
    descricao:
      "Película privacidade para Galaxy S24 que limita a visualização lateral da tela.",
    modeloId: "samsung-s24",
    marca: "Samsung Galaxy S24",
    precoCentavos: 3490,
    tipo: "pronta",
    categoria: "peliculas",
    gradienteCapa: "from-zinc-500 via-zinc-700 to-zinc-900",
  },
  {
    id: "pelicula-matte",
    nome: "Película Matte Anti-reflexo",
    descricao:
      "Película fosca anti-reflexo que reduz marcas de dedo e brilho sob luz forte.",
    modeloId: "iphone-15",
    marca: "Universal",
    precoCentavos: 2790,
    tipo: "pronta",
    categoria: "peliculas",
    gradienteCapa: "from-stone-300 via-stone-400 to-stone-500",
  },
  {
    id: "carregador-20w",
    nome: "Carregador Turbo 20W",
    descricao:
      "Carregador de parede 20W USB-C com carga rápida para smartphones compatíveis.",
    modeloId: "iphone-15",
    marca: "Universal",
    precoCentavos: 5990,
    tipo: "pronta",
    categoria: "carregadores",
    gradienteCapa: "from-white via-zinc-100 to-zinc-200",
    destaque: "Rápido",
  },
  {
    id: "carregador-veicular",
    nome: "Carregador Veicular Dual",
    descricao:
      "Carregador veicular com duas portas USB para carregar celular e acessório no carro.",
    modeloId: "iphone-15",
    marca: "Universal",
    precoCentavos: 4490,
    tipo: "pronta",
    categoria: "carregadores",
    gradienteCapa: "from-zinc-800 via-zinc-900 to-black",
  },
  {
    id: "carregador-magsafe",
    nome: "Carregador MagSafe 15W",
    descricao:
      "Base MagSafe 15W para carga sem fio alinhada magneticamente ao iPhone.",
    modeloId: "iphone-15",
    marca: "Apple iPhone",
    precoCentavos: 8990,
    tipo: "pronta",
    categoria: "carregadores",
    gradienteCapa: "from-zinc-100 via-zinc-200 to-zinc-300",
  },
];

/** @deprecated use PRODUTOS_LOJA */
export const PRODUTOS_PRONTOS = PRODUTOS_LOJA;

/** Modelos para personalizar com sua foto */
export const PRODUTOS_PERSONALIZAR: ProdutoDestaque[] = [
  {
    id: "cap-iphone15-classic",
    nome: "Capinha Classic TPU",
    descricao: "Modelo classic personalizável com sua foto para iPhone 15.",
    modeloId: "iphone-15",
    marca: "Apple iPhone 15",
    precoCentavos: 4990,
    tipo: "personalizada",
    categoria: "capinhas",
    material: "tpu",
    destaque: "Mais vendida",
  },
  {
    id: "cap-iphone15-premium",
    nome: "Capinha Premium Matte",
    descricao: "Acabamento matte premium personalizável para iPhone 15.",
    modeloId: "iphone-15",
    marca: "Apple iPhone 15",
    precoCentavos: 5990,
    tipo: "personalizada",
    categoria: "capinhas",
    material: "silicone",
  },
  {
    id: "cap-iphone17-couro",
    nome: "Capinha Couro Premium",
    descricao:
      "Capinha personalizável em couro legítimo para iPhone 17 Pro Max — acabamento premium.",
    modeloId: "iphone-17-pro-max",
    marca: "Apple iPhone 17 Pro Max",
    precoCentavos: 8990,
    tipo: "personalizada",
    categoria: "capinhas",
    material: "couro",
    destaque: "Premium",
  },
  {
    id: "cap-iphone17-silicone",
    nome: "Capinha Silicone",
    descricao:
      "Capinha de silicone macio personalizável para iPhone 17 Pro Max.",
    modeloId: "iphone-17-pro-max",
    marca: "Apple iPhone 17 Pro Max",
    precoCentavos: 4990,
    tipo: "personalizada",
    categoria: "capinhas",
    material: "silicone",
  },
  {
    id: "cap-iphone17-acrilico",
    nome: "Capinha Acrílico",
    descricao:
      "Capinha acrílica transparente personalizável para iPhone 17 Pro Max.",
    modeloId: "iphone-17-pro-max",
    marca: "Apple iPhone 17 Pro Max",
    precoCentavos: 6490,
    tipo: "personalizada",
    categoria: "capinhas",
    material: "acrilico",
  },
  {
    id: "cap-s24-classic",
    nome: "Capinha Classic TPU",
    descricao: "Capinha classic personalizável com foto para Galaxy S24.",
    modeloId: "samsung-s24",
    marca: "Samsung Galaxy S24",
    precoCentavos: 4990,
    tipo: "personalizada",
    categoria: "capinhas",
    material: "tpu",
  },
  {
    id: "cap-s24-art",
    nome: "Capinha Art Print",
    descricao: "Capinha art print personalizável com alta definição para S24.",
    modeloId: "samsung-s24",
    marca: "Samsung Galaxy S24",
    precoCentavos: 6490,
    tipo: "personalizada",
    categoria: "capinhas",
    material: "policarbonato",
  },
];

export const PRODUTOS_DESTAQUE = [...PRODUTOS_LOJA, ...PRODUTOS_PERSONALIZAR];

export function formatarPreco(precoCentavos: number): string {
  return (precoCentavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function getProdutoById(id: string): ProdutoDestaque | undefined {
  return PRODUTOS_DESTAQUE.find((p) => p.id === id);
}

export function filtrarProdutosPorCategoria(
  produtos: ProdutoDestaque[],
  categoria: CategoriaProduto | "todos",
): ProdutoDestaque[] {
  if (categoria === "todos") return produtos;
  return produtos.filter((p) => p.categoria === categoria);
}

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function filtrarProdutosPorBusca(
  produtos: ProdutoDestaque[],
  termo: string,
): ProdutoDestaque[] {
  const consulta = normalizarTexto(termo.trim());
  if (!consulta) return produtos;

  const palavras = consulta.split(/\s+/).filter(Boolean);

  return produtos.filter((produto) => {
    const texto = normalizarTexto(
      [
        produto.nome,
        produto.descricao,
        produto.marca,
        ROTULO_CATEGORIA[produto.categoria],
      ].join(" "),
    );
    return palavras.every((palavra) => texto.includes(palavra));
  });
}

export function filtrarProdutos(
  produtos: ProdutoDestaque[],
  categoria: CategoriaProduto | "todos",
  busca: string,
): ProdutoDestaque[] {
  return filtrarProdutosPorBusca(
    filtrarProdutosPorCategoria(produtos, categoria),
    busca,
  );
}
