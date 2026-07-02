export function centavosParaReaisInput(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

export function reaisInputParaCentavos(valor: string): number | null {
  const limpo = valor.replace(/[^\d,.-]/g, "").trim();
  if (!limpo) return null;

  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;

  const numero = Number.parseFloat(normalizado);
  if (!Number.isFinite(numero) || numero < 0) return null;
  return Math.round(numero * 100);
}
