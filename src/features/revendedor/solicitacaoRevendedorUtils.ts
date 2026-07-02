export function normalizarCnpj(input: string): string {
  return input.replace(/\D/g, "").slice(0, 14);
}

export function cnpjValido(cnpj: string): boolean {
  const digits = normalizarCnpj(cnpj);
  return digits.length === 14;
}

export function formatarCnpj(cnpj: string): string {
  const d = normalizarCnpj(cnpj);
  if (d.length !== 14) return cnpj;
  return d.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

export function normalizarCep(input: string): string {
  return input.replace(/\D/g, "").slice(0, 8);
}

export function cepValido(cep: string): boolean {
  return normalizarCep(cep).length === 8;
}
