import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineString } from "firebase-functions/params";
import { normalizarNomeMunicipio } from "./municipioNfe";
import {
  aguardarAutorizacaoFocusNfe,
  buildFocusNfeAuthHeader,
  FocusNfeAguardandoAutorizacaoError,
  buscarIbgePorCep,
  extrairMensagemErroFocus,
  mapearRespostaFocusNfe,
  montarItemNfe,
  resolverFocusNfeBaseUrl,
} from "./focusNfeHelpers";

const focusNfeToken = defineString("FOCUS_NFE_TOKEN", { default: "" });
const focusNfeAmbiente = defineString("FOCUS_NFE_AMBIENTE", { default: "homologacao" });
const focusNfeCnpjEmitente = defineString("FOCUS_NFE_CNPJ_EMITENTE", { default: "" });
const focusNfeCpfEmitente = defineString("FOCUS_NFE_CPF_EMITENTE", { default: "" });
const focusNfeNcmPadrao = defineString("FOCUS_NFE_NCM_PADRAO", { default: "39269090" });
const focusNfeIcmsCsosn = defineString("FOCUS_NFE_ICMS_CSOSN", { default: "102" });
const focusNfePisCst = defineString("FOCUS_NFE_PIS_CST", { default: "07" });
const focusNfeCofinsCst = defineString("FOCUS_NFE_COFINS_CST", { default: "07" });
const focusNfeIeEmitente = defineString("FOCUS_NFE_IE_EMITENTE", {
  default: "ISENTO",
});
const focusNfeRegimeTributario = defineString("FOCUS_NFE_REGIME_TRIBUTARIO", {
  default: "1",
});
const focusNfeNomeEmitente = defineString("FOCUS_NFE_NOME_EMITENTE", { default: "" });

function resolverDocumentoEmitente(): { cpf?: string; cnpj?: string } {
  const cpf = focusNfeCpfEmitente.value().replace(/\D/g, "");
  const cnpj = focusNfeCnpjEmitente.value().replace(/\D/g, "");
  // CNPJ tem prioridade (Simples Nacional / Sefaz-SP exige e-CNPJ).
  if (cnpj.length === 14) return { cnpj };
  if (cpf.length === 11) return { cpf };
  return {};
}

type NotaOutboxDoc = {
  tipo?: "loja" | "reposicao";
  lojaId?: string | null;
  pedidoId?: string;
  clienteUid?: string | null;
  totalCentavos?: number;
  status?: string;
};

/**
 * Enfileira emissão de NF-e/NFS-e.
 * Com FOCUS_NFE_TOKEN configurado, tenta emitir via Focus NFe.
 * Sem token, mantém pendente para emissão manual no admin.
 */
export const processarNotaFiscalOutbox = onDocumentCreated(
  {
    document: "notas_fiscais_outbox/{docId}",
    region: "us-central1",
    timeoutSeconds: 300,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data() as NotaOutboxDoc;
    const ref = snap.ref;

    if (data.status && data.status !== "pendente") return;

    const pedidoId = String(data.pedidoId ?? "");
    const tipo = data.tipo ?? "loja";
    const lojaId = data.lojaId ?? null;

    if (!pedidoId) {
      await ref.update({
        status: "erro",
        erro: "pedidoId ausente",
        processadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    const token = focusNfeToken.value();
    if (!token) {
      await marcarNotaPendentePedido(tipo, lojaId, pedidoId);
      await ref.update({
        status: "aguardando_manual",
        mensagem: "FOCUS_NFE_TOKEN não configurado — emissão manual no admin.",
        processadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    try {
      const emitente = resolverDocumentoEmitente();
      const resultado = await tentarEmitirFocusNfe({
        token,
        ambiente: focusNfeAmbiente.value(),
        emitente,
        ncmPadrao: focusNfeNcmPadrao.value(),
        tipo,
        lojaId,
        pedidoId,
        totalCentavos: Number(data.totalCentavos ?? 0),
        clienteUid: data.clienteUid ?? null,
      });

      await aplicarNotaNoPedido(tipo, lojaId, pedidoId, resultado);
      await ref.update({
        status: "emitida",
        resultado,
        processadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      if (error instanceof FocusNfeAguardandoAutorizacaoError) {
        await aplicarNotaNoPedido(tipo, lojaId, pedidoId, {
          status: "processando",
          provedor: "focusnfe",
          referencia: error.referencia,
          erro: error.message,
        });
        await ref.update({
          status: "aguardando_autorizacao",
          referencia: error.referencia,
          mensagem: error.message,
          processadoEm: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      const message =
        error instanceof Error ? error.message : "Erro ao emitir nota fiscal";
      await marcarNotaErroPedido(tipo, lojaId, pedidoId, message);
      await ref.update({
        status: "erro",
        erro: message,
        processadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  },
);

async function marcarNotaPendentePedido(
  tipo: string,
  lojaId: string | null,
  pedidoId: string,
) {
  const nota = {
    status: "pendente",
    provedor: "manual",
  };
  await aplicarNotaNoPedido(tipo, lojaId, pedidoId, nota);
}

async function marcarNotaErroPedido(
  tipo: string,
  lojaId: string | null,
  pedidoId: string,
  erro: string,
) {
  await aplicarNotaNoPedido(tipo, lojaId, pedidoId, {
    status: "erro",
    erro,
    provedor: "focusnfe",
  });
}

async function aplicarNotaNoPedido(
  tipo: string,
  lojaId: string | null,
  pedidoId: string,
  nota: Record<string, unknown>,
) {
  const db = admin.firestore();
  if (tipo === "reposicao") {
    await db.doc(`pedidos_reposicao/${pedidoId}`).set(
      { notaFiscal: nota, atualizadoEm: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );
    return;
  }
  if (!lojaId) return;
  await db.doc(`lojas/${lojaId}/pedidos/${pedidoId}`).set(
    { notaFiscal: nota, atualizadoEm: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true },
  );
}

function resolverRegimeTributarioEmitente(emitente: {
  cpf?: string;
  cnpj?: string;
}): string {
  const env = focusNfeRegimeTributario.value().trim();
  if (emitente.cpf) {
    if (!env || env === "1" || env === "4") return "3";
    return env;
  }
  return env || "1";
}

function resolverIcmsSituacaoEmitente(
  emitente: { cpf?: string; cnpj?: string },
  regime: string,
): string {
  const env = focusNfeIcmsCsosn.value().trim();
  if (emitente.cpf && regime === "3") {
    if (/^\d{3}$/.test(env)) return "41";
    return env || "41";
  }
  return env || "102";
}

function resolverInscricaoEstadualEmitente(emitente: {
  cpf?: string;
  cnpj?: string;
}): string | undefined {
  const raw = focusNfeIeEmitente.value().trim();
  if (!raw) {
    return emitente.cpf ? undefined : "ISENTO";
  }
  if (raw.toUpperCase() === "ISENTO") {
    return emitente.cpf ? undefined : "ISENTO";
  }
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 2 ? digits : emitente.cpf ? undefined : "ISENTO";
}

function omitirCamposVazios(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out;
}

function resolverIndicadorIeDestinatario(destinatario: DestinatarioNfe): "1" | "2" | "9" {
  if (!destinatario.cnpj) return "9";
  const ie = destinatario.inscricaoEstadual.trim();
  if (ie.toUpperCase() === "ISENTO") return "2";
  if (ie.replace(/\D/g, "").length >= 2) return "1";
  return "9";
}

function resolverInscricaoEstadualDestinatario(
  destinatario: DestinatarioNfe,
  indicador: "1" | "2" | "9",
): string | undefined {
  if (indicador === "9") return undefined;
  if (indicador === "2") return "ISENTO";
  const digits = destinatario.inscricaoEstadual.replace(/\D/g, "");
  return digits.length >= 2 ? digits : undefined;
}

async function tentarEmitirFocusNfe(opts: {
  token: string;
  ambiente: string;
  emitente: { cpf?: string; cnpj?: string };
  ncmPadrao: string;
  tipo: string;
  lojaId: string | null;
  pedidoId: string;
  totalCentavos: number;
  clienteUid: string | null;
}): Promise<Record<string, unknown>> {
  const db = admin.firestore();
  const destinatario = await carregarDestinatario(db, opts);
  validarDestinatarioNfe(destinatario);

  const regimeEmitente = resolverRegimeTributarioEmitente(opts.emitente);
  const trib = {
    icmsOrigem: "0",
    icmsSituacao: resolverIcmsSituacaoEmitente(opts.emitente, regimeEmitente),
    pisSituacao: focusNfePisCst.value(),
    cofinsSituacao: focusNfeCofinsCst.value(),
  };
  const itens = await carregarItensPedido(db, opts, trib);

  const valorTotal = (opts.totalCentavos / 100).toFixed(2);
  const codigoMunicipio =
    (await buscarIbgePorCep(destinatario.cep)) ?? undefined;
  const homologacao = opts.ambiente !== "producao";

  if (!opts.emitente.cpf && !opts.emitente.cnpj) {
    throw new Error(
      "Configure FOCUS_NFE_CNPJ_EMITENTE (14 dígitos), FOCUS_NFE_TOKEN e certificado e-CNPJ A1 na Focus (homologação).",
    );
  }

  const referencia = `${opts.tipo}-${opts.pedidoId}`;
  const baseUrl = resolverFocusNfeBaseUrl(opts.ambiente);
  const authHeader = buildFocusNfeAuthHeader(opts.token);

  const indicadorIeDest = resolverIndicadorIeDestinatario(destinatario);
  const ieDest = resolverInscricaoEstadualDestinatario(destinatario, indicadorIeDest);

  const body: Record<string, unknown> = {
    natureza_operacao: "Venda de mercadoria",
    data_emissao: new Date().toISOString().slice(0, 19),
    tipo_documento: "1",
    local_destino: "1",
    finalidade_emissao: "1",
    consumidor_final: "1",
    presenca_comprador: "2",
    modalidade_frete: "9",
    valor_produtos: valorTotal,
    valor_frete: "0.00",
    valor_seguro: "0.00",
    valor_desconto: "0.00",
    valor_total: valorTotal,
    nome_destinatario: homologacao
      ? "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"
      : destinatario.nome,
    email_destinatario: destinatario.email || undefined,
    telefone_destinatario: destinatario.telefone || undefined,
    logradouro_destinatario: destinatario.logradouro,
    numero_destinatario: destinatario.numero,
    complemento_destinatario: destinatario.complemento || undefined,
    bairro_destinatario: destinatario.bairro,
    municipio_destinatario: destinatario.cidade,
    uf_destinatario: destinatario.uf,
    cep_destinatario: destinatario.cep,
    pais_destinatario: "Brasil",
    indicador_inscricao_estadual_destinatario: indicadorIeDest,
    itens,
    formas_pagamento: [
      {
        forma_pagamento: "99",
        valor_pagamento: valorTotal,
      },
    ],
  };

  if (codigoMunicipio) {
    body.codigo_municipio_destinatario = codigoMunicipio;
  }

  if (opts.emitente.cnpj) {
    body.cnpj_emitente = opts.emitente.cnpj;
  } else if (opts.emitente.cpf) {
    body.cpf_emitente = opts.emitente.cpf;
  }

  const nomeEmitente = focusNfeNomeEmitente.value().trim();
  if (nomeEmitente) {
    body.nome_emitente = nomeEmitente;
  }

  const ieEmitente = resolverInscricaoEstadualEmitente(opts.emitente);
  if (ieEmitente) {
    body.inscricao_estadual_emitente = ieEmitente;
  }
  body.regime_tributario_emitente = regimeEmitente;

  if (destinatario.cnpj) {
    body.cnpj_destinatario = destinatario.cnpj;
  } else if (destinatario.cpf) {
    body.cpf_destinatario = destinatario.cpf;
  }

  if (ieDest) {
    body.inscricao_estadual_destinatario = ieDest;
  }

  const payload = omitirCamposVazios(body);

  const res = await fetch(`${baseUrl}/v2/nfe?ref=${encodeURIComponent(referencia)}`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(extrairMensagemErroFocus(json));
  }

  const statusProc = String(json.status ?? "");
  if (statusProc === "processando_autorizacao") {
    const autorizado = await aguardarAutorizacaoFocusNfe(
      baseUrl,
      referencia,
      authHeader,
    );
    return mapearRespostaFocusNfe(
      autorizado,
      referencia,
      admin.firestore.FieldValue.serverTimestamp(),
    );
  }

  if (statusProc === "erro_autorizacao" || statusProc === "denegado") {
    throw new Error(extrairMensagemErroFocus(json));
  }

  return mapearRespostaFocusNfe(
    json,
    referencia,
    admin.firestore.FieldValue.serverTimestamp(),
  );
}

function validarDestinatarioNfe(dest: DestinatarioNfe): void {
  const faltando: string[] = [];
  if (!dest.cpf && !dest.cnpj) faltando.push("CPF/CNPJ");
  if (!dest.logradouro) faltando.push("logradouro");
  if (!dest.numero) faltando.push("número");
  if (!dest.bairro) faltando.push("bairro");
  if (!dest.cidade) faltando.push("cidade");
  if (!dest.uf || dest.uf.length !== 2) faltando.push("UF");
  if (dest.cep.replace(/\D/g, "").length !== 8) faltando.push("CEP");

  if (faltando.length > 0) {
    throw new Error(
      `Endereço do cliente incompleto para NF-e: ${faltando.join(", ")}. Peça para atualizar em /conta.`,
    );
  }
}

type DestinatarioNfe = {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  cnpj: string;
  inscricaoEstadual: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
};

async function carregarDestinatario(
  db: admin.firestore.Firestore,
  opts: {
    tipo: string;
    lojaId: string | null;
    pedidoId: string;
    clienteUid: string | null;
  },
): Promise<DestinatarioNfe> {
  const vazio: DestinatarioNfe = {
    nome: "Cliente Zen Pro",
    email: "",
    telefone: "",
    cpf: "",
    cnpj: "",
    inscricaoEstadual: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    cep: "",
  };

  if (opts.tipo === "reposicao") {
    const repSnap = await db.doc(`pedidos_reposicao/${opts.pedidoId}`).get();
    if (!repSnap.exists) return vazio;
    const rep = repSnap.data() ?? {};
    const lojaId = String(rep.lojaId ?? "");
    const revendedorUid = String(rep.revendedorUid ?? "");

    if (lojaId) {
      const lojaSnap = await db.doc(`lojas/${lojaId}`).get();
      const donoUid = lojaSnap.exists
        ? String(lojaSnap.data()?.donoUid ?? "")
        : "";
      if (donoUid) {
        const dono = await db.doc(`usuarios/${donoUid}`).get();
        if (dono.exists) {
          return mapUsuarioDestinatario(dono.data() ?? {}, true);
        }
      }
    }

    if (revendedorUid) {
      const userSnap = await db.doc(`usuarios/${revendedorUid}`).get();
      if (userSnap.exists) {
        return mapUsuarioDestinatario(userSnap.data() ?? {}, true);
      }
    }
    return vazio;
  }

  if (!opts.lojaId) return vazio;
  const pedSnap = await db
    .doc(`lojas/${opts.lojaId}/pedidos/${opts.pedidoId}`)
    .get();
  if (!pedSnap.exists) return vazio;

  const ped = pedSnap.data() ?? {};
  const cliente = (ped.cliente as Record<string, unknown> | undefined) ?? {};

  let dest = vazio;
  if (opts.clienteUid) {
    const userSnap = await db.doc(`usuarios/${opts.clienteUid}`).get();
    if (userSnap.exists) {
      dest = mapUsuarioDestinatario(userSnap.data() ?? {}, false);
    }
  }

  if (!dest.nome || dest.nome === "Cliente Zen Pro") {
    dest.nome = String(cliente.nome ?? dest.nome);
  }

  return dest;
}

function mapUsuarioDestinatario(
  u: Record<string, unknown>,
  preferirCnpj: boolean,
): DestinatarioNfe {
  const cnpj = String(u.cnpj ?? "").replace(/\D/g, "");
  const cpf = String(u.cpf ?? "").replace(/\D/g, "");
  return {
    nome: String(u.razaoSocial ?? u.nomeCompleto ?? "Cliente Zen Pro"),
    email: String(u.email ?? ""),
    telefone: String(u.telefone ?? "").replace(/\D/g, ""),
    cpf: preferirCnpj && cnpj ? "" : cpf,
    cnpj: preferirCnpj ? cnpj : "",
    inscricaoEstadual: String(u.inscricaoEstadual ?? u.ie ?? "").trim(),
    logradouro: String(u.logradouro ?? ""),
    numero: String(u.numero ?? ""),
    complemento: String(u.complemento ?? ""),
    bairro: String(u.bairro ?? ""),
    cidade: normalizarNomeMunicipio(
      String(u.cidade ?? ""),
      String(u.estado ?? u.uf ?? ""),
    ),
    uf: String(u.estado ?? u.uf ?? ""),
    cep: String(u.cep ?? "").replace(/\D/g, ""),
  };
}

async function carregarItensPedido(
  db: admin.firestore.Firestore,
  opts: {
    tipo: string;
    lojaId: string | null;
    pedidoId: string;
    totalCentavos: number;
    ncmPadrao: string;
  },
  trib: {
    icmsOrigem: string;
    icmsSituacao: string;
    pisSituacao: string;
    cofinsSituacao: string;
  },
) {
  const montar = (
    index: number,
    qtd: number,
    preco: number,
    nome: string,
    codigo: string,
  ) =>
    montarItemNfe(
      {
        numero_item: String(index + 1),
        codigo_produto: codigo,
        descricao: nome,
        cfop: "5102",
        quantidade: qtd,
        valorUnitario: preco,
        ncm: opts.ncmPadrao,
      },
      trib,
    );

  const fallback = [
    montar(
      0,
      1,
      opts.totalCentavos / 100,
      `Pedido Zen Pro ${opts.pedidoId.slice(-8)}`,
      opts.pedidoId.slice(-8),
    ),
  ];

  let itensRaw: Array<Record<string, unknown>> = [];
  if (opts.tipo === "reposicao") {
    const snap = await db.doc(`pedidos_reposicao/${opts.pedidoId}`).get();
    itensRaw = Array.isArray(snap.data()?.itens) ? snap.data()!.itens : [];
  } else if (opts.lojaId) {
    const snap = await db
      .doc(`lojas/${opts.lojaId}/pedidos/${opts.pedidoId}`)
      .get();
    itensRaw = Array.isArray(snap.data()?.itens) ? snap.data()!.itens : [];
  }

  if (itensRaw.length === 0) return fallback;

  return itensRaw.map((item, index) => {
    const qtd = Math.max(1, Number(item.quantidade ?? 1));
    const preco = Number(item.precoCentavos ?? 0) / 100;
    const nome = String(item.nomeProduto ?? item.nome ?? `Item ${index + 1}`);
    return montar(
      index,
      qtd,
      preco,
      nome,
      String(item.produtoId ?? opts.pedidoId.slice(-8)),
    );
  });
}

