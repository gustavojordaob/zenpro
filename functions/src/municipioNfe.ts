/** Espelho de src/features/usuario/enderecoUtils.ts para Cloud Functions. */

function chaveMunicipio(cidade: string): string {
  return cidade
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`´]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const MUNICIPIOS_CANONICOS: Record<string, string> = {
  "santa barbara doeste": "Santa Bárbara d'Oeste",
  "santa barbara d oeste": "Santa Bárbara d'Oeste",
};

export function normalizarNomeMunicipio(cidade: string, uf?: string): string {
  const limpo = cidade.trim().replace(/\s+/g, " ");
  if (!limpo) return limpo;

  const canonico = MUNICIPIOS_CANONICOS[chaveMunicipio(limpo)];
  if (canonico) return canonico;

  if (uf?.toUpperCase() === "SP" && chaveMunicipio(limpo) === "santa barbara doeste") {
    return "Santa Bárbara d'Oeste";
  }

  return limpo;
}
