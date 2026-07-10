/** Normaliza texto para comparar nomes de município (sem acento/apóstrofo). */
export function chaveMunicipio(cidade: string): string {
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

/**
 * Ajusta grafia oficial aceita pela Sefaz/Focus (IBGE).
 * ViaCEP costuma retornar certo; corrige digitação manual comum.
 */
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

export function municipiosConferem(
  cidadeA: string,
  ufA: string,
  cidadeB: string,
  ufB: string,
): boolean {
  return (
    chaveMunicipio(cidadeA) === chaveMunicipio(cidadeB) &&
    ufA.trim().toUpperCase() === ufB.trim().toUpperCase()
  );
}
