export class FocusNfeAguardandoAutorizacaoError extends Error {
  constructor(public referencia: string) {
    super(
      "NF enviada à Sefaz e ainda em processamento. Aguarde e use «Consultar status» no admin.",
    );
    this.name = "FocusNfeAguardandoAutorizacaoError";
  }
}

export function resolverFocusNfeBaseUrl(ambiente: string): string {
  return ambiente === "producao"
    ? "https://api.focusnfe.com.br"
    : "https://homologacao.focusnfe.com.br";
}

export function buildFocusNfeAuthHeader(token: string): string {
  return `Basic ${Buffer.from(`${token}:`).toString("base64")}`;
}

export async function consultarNotaFocusNfe(
  baseUrl: string,
  referencia: string,
  authHeader: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${baseUrl}/v2/nfe/${encodeURIComponent(referencia)}`, {
    headers: { Authorization: authHeader },
  });
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

export async function aguardarAutorizacaoFocusNfe(
  baseUrl: string,
  referencia: string,
  authHeader: string,
  opts?: { tentativas?: number; intervaloMs?: number },
): Promise<Record<string, unknown>> {
  const tentativas = opts?.tentativas ?? 60;
  const intervaloMs = opts?.intervaloMs ?? 3000;

  for (let i = 0; i < tentativas; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, intervaloMs));
    }

    const json = await consultarNotaFocusNfe(baseUrl, referencia, authHeader);
    const status = String(json.status ?? "");

    if (status === "autorizado") return json;
    if (status === "erro_autorizacao" || status === "denegado") {
      throw new Error(extrairMensagemErroFocus(json));
    }
  }

  const ultimo = await consultarNotaFocusNfe(baseUrl, referencia, authHeader);
  const ultimoStatus = String(ultimo.status ?? "");
  if (ultimoStatus === "autorizado") return ultimo;
  if (
    ultimoStatus === "processando_autorizacao" ||
    ultimoStatus === "processando" ||
    !ultimoStatus
  ) {
    throw new FocusNfeAguardandoAutorizacaoError(referencia);
  }
  if (ultimoStatus === "erro_autorizacao" || ultimoStatus === "denegado") {
    throw new Error(extrairMensagemErroFocus(ultimo));
  }

  throw new FocusNfeAguardandoAutorizacaoError(referencia);
}

export function mapearRespostaFocusNfe(
  json: Record<string, unknown>,
  referencia: string,
  emitidaEm?: unknown,
): Record<string, unknown> {
  return {
    status: "emitida",
    provedor: "focusnfe",
    numero: json.numero ?? null,
    serie: json.serie ?? null,
    chaveAcesso: json.chave_nfe ?? json.chave_acesso ?? null,
    pdfUrl: json.caminho_danfe ?? null,
    xmlUrl: json.caminho_xml_nota_fiscal ?? null,
    emitidaEm: emitidaEm ?? null,
    referencia,
    erro: null,
  };
}

export function extrairMensagemErroFocus(
  json: Record<string, unknown>,
): string {
  const erros = json.erros;
  if (Array.isArray(erros) && erros.length > 0) {
    const partes = erros.map((item) => {
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const campo = obj.campo ? String(obj.campo) : "";
        const mensagem = obj.mensagem ? String(obj.mensagem) : "";
        if (campo && mensagem) return `${campo}: ${mensagem}`;
        if (mensagem) return mensagem;
      }
      return JSON.stringify(item);
    });
    return partes.join(" · ");
  }

  if (typeof json.mensagem_sefaz === "string" && json.mensagem_sefaz) {
    return enriquecerErroCertificado292(json.mensagem_sefaz);
  }

  if (typeof json.mensagem === "string" && json.mensagem) {
    return enriquecerErroCertificado292(json.mensagem);
  }

  return "Erro ao emitir nota fiscal na Focus NFe.";
}

function enriquecerErroCertificado292(mensagem: string): string {
  if (!/292|certificado assinatura sem cnpj/i.test(mensagem)) {
    return mensagem;
  }
  return (
    `${mensagem} — Em São Paulo a Sefaz exige certificado e-CNPJ (não aceita e-CPF para NF-e). ` +
    "Cadastre o CNPJ da empresa/MEI na Focus, anexe e-CNPJ A1 e use FOCUS_NFE_CNPJ_EMITENTE. " +
    "Emitente só com CPF + e-CPF não funciona na Sefaz-SP."
  );
}

export async function buscarIbgePorCep(cep: string): Promise<string | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as { erro?: boolean; ibge?: string };
    if (data.erro || !data.ibge) return null;
    return String(data.ibge);
  } catch {
    return null;
  }
}

export type TributacaoItemNfe = {
  icmsOrigem: string;
  icmsSituacao: string;
  pisSituacao: string;
  cofinsSituacao: string;
};

export function montarItemNfe(
  item: {
    numero_item: string;
    codigo_produto: string;
    descricao: string;
    cfop: string;
    quantidade: number;
    valorUnitario: number;
    ncm: string;
  },
  trib: TributacaoItemNfe,
): Record<string, string> {
  const qtd = item.quantidade;
  const valorUnit = item.valorUnitario;
  const valorBruto = (valorUnit * qtd).toFixed(2);

  return {
    numero_item: item.numero_item,
    codigo_produto: item.codigo_produto,
    descricao: item.descricao.slice(0, 120),
    cfop: item.cfop,
    unidade_comercial: "UN",
    quantidade_comercial: String(qtd),
    valor_unitario_comercial: valorUnit.toFixed(2),
    valor_bruto: valorBruto,
    unidade_tributavel: "UN",
    quantidade_tributavel: String(qtd),
    valor_unitario_tributavel: valorUnit.toFixed(2),
    inclui_no_total: "1",
    codigo_ncm: item.ncm,
    icms_origem: trib.icmsOrigem,
    icms_situacao_tributaria: trib.icmsSituacao,
    pis_situacao_tributaria: trib.pisSituacao,
    cofins_situacao_tributaria: trib.cofinsSituacao,
  };
}
