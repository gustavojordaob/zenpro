import { defineSecret, defineString } from "firebase-functions/params";

export const melhorEnvioToken = defineSecret("MELHOR_ENVIO_TOKEN");

/** Obrigatório pela API Melhor Envio. Formato: NomeApp (email@dominio.com) */
export const melhorEnvioUserAgent = defineString("MELHOR_ENVIO_USER_AGENT", {
  default: "Zen Pro (contato@zenpro-capinhas.web.app)",
});

export const melhorEnvioSandbox = defineString("MELHOR_ENVIO_SANDBOX", {
  default: "false",
});

export function melhorEnvioBaseUrl(): string {
  return melhorEnvioSandbox.value() === "true"
    ? "https://sandbox.melhorenvio.com.br"
    : "https://melhorenvio.com.br";
}

export type MelhorEnvioProdutoDim = {
  id: string;
  width: number;
  height: number;
  length: number;
  /** kg */
  weight: number;
  insurance_value: number;
  quantity: number;
};

export type MelhorEnvioCotacao = {
  id: number;
  name: string;
  price: string;
  custom_price?: string;
  discount?: string;
  currency?: string;
  delivery_time?: number;
  delivery_range?: { min?: number; max?: number };
  company?: { id?: number; name?: string; picture?: string };
  error?: string;
};

export async function meFetch<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${melhorEnvioBaseUrl()}/api/v2${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": melhorEnvioUserAgent.value(),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg =
      typeof json === "object" &&
      json &&
      "message" in json &&
      typeof (json as { message: unknown }).message === "string"
        ? (json as { message: string }).message
        : text.slice(0, 400);
    throw new Error(`Melhor Envio ${res.status}: ${msg}`);
  }
  return json as T;
}

/** Defaults razoáveis para case embalada se produto sem dimensões. */
export const DIMENSOES_PADRAO_CASE = {
  larguraCm: 12,
  alturaCm: 18,
  comprimentoCm: 4,
  pesoGramas: 150,
};

/**
 * Zen Pro libera só Correios SEDEX + Loggi no checkout.
 * Filtra por empresa/nome (IDs mudam entre sandbox/prod).
 */
export function isServicoFretePermitido(opts: {
  id?: number;
  name?: string;
  companyName?: string;
}): boolean {
  const empresa = String(opts.companyName ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const nome = String(opts.name ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

  if (empresa.includes("loggi")) return true;

  // Correios SEDEX (não PAC / Mini Envios etc.)
  if (empresa.includes("correios")) {
    if (nome.includes("pac")) return false;
    if (nome.includes("sedex")) return true;
    // ID clássico SEDEX no Melhor Envio
    if (opts.id === 2) return true;
  }

  return false;
}
