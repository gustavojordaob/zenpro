/** Normaliza slug para URL e doc id de loja. */
export function normalizarSlugLoja(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function slugLojaValido(slug: string): boolean {
  return slug.length >= 2 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
