import type { PerfilUsuario } from "./perfilTypes";

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function formatarCpf(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatarTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatarCep(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function cpfValido(cpf: string): boolean {
  const d = apenasDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(d[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== Number(d[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(d[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === Number(d[10]);
}

export function perfilCompleto(
  perfil: Pick<
    PerfilUsuario,
    | "nomeCompleto"
    | "cpf"
    | "telefone"
    | "cep"
    | "logradouro"
    | "numero"
    | "bairro"
    | "cidade"
    | "estado"
  >,
): boolean {
  return (
    perfil.nomeCompleto.trim().length >= 3 &&
    cpfValido(perfil.cpf) &&
    apenasDigitos(perfil.telefone).length >= 10 &&
    apenasDigitos(perfil.cep).length === 8 &&
    perfil.logradouro.trim().length >= 3 &&
    perfil.numero.trim().length >= 1 &&
    perfil.bairro.trim().length >= 2 &&
    perfil.cidade.trim().length >= 2 &&
    perfil.estado.trim().length === 2
  );
}

export function formatarEnderecoCompleto(perfil: PerfilUsuario): string {
  const partes = [
    `${perfil.logradouro}, ${perfil.numero}`,
    perfil.complemento.trim() || null,
    perfil.bairro,
    `${perfil.cidade} — ${perfil.estado}`,
    `CEP ${formatarCep(perfil.cep)}`,
  ].filter(Boolean);
  return partes.join(" — ");
}

export type EnderecoViaCep = {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
};

export async function buscarEnderecoPorCep(
  cep: string,
): Promise<EnderecoViaCep | null> {
  const digits = apenasDigitos(cep);
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro || !data.localidade || !data.uf) return null;
    return {
      logradouro: data.logradouro ?? "",
      bairro: data.bairro ?? "",
      cidade: data.localidade,
      estado: data.uf,
    };
  } catch {
    return null;
  }
}
