import * as admin from "firebase-admin";
import { defineString } from "firebase-functions/params";
import {
  resolverOrigemExpedicaoPedido,
  type EnderecoExpedicao,
} from "./expedicaoOrigem";
import {
  DIMENSOES_PADRAO_CASE,
  meFetch,
  type MelhorEnvioProdutoDim,
} from "./melhorEnvioShared";
import { MARCA_LOJA_ID } from "./mercadoPagoShared";

/** CNPJ/IE/nome do remetente — reaproveitam Focus quando já cadastrados. */
const focusNfeCnpjEmitente = defineString("FOCUS_NFE_CNPJ_EMITENTE", {
  default: "",
});
const focusNfeIeEmitente = defineString("FOCUS_NFE_IE_EMITENTE", {
  default: "ISENTO",
});
const focusNfeNomeEmitente = defineString("FOCUS_NFE_NOME_EMITENTE", {
  default: "",
});
const focusNfeCpfEmitente = defineString("FOCUS_NFE_CPF_EMITENTE", {
  default: "",
});
/** CPF do responsável (remetente). Melhor Envio exige CPF válido em from.document. */
const meCpfRemetente = defineString("MELHOR_ENVIO_CPF_REMETENTE", {
  default: "",
});
const meTelefoneRemetente = defineString("MELHOR_ENVIO_TELEFONE_REMETENTE", {
  default: "",
});
const meEmailRemetente = defineString("MELHOR_ENVIO_EMAIL_REMETENTE", {
  default: "contato@usezenpro.com.br",
});

export type ResultadoEtiquetaMelhorEnvio = {
  orderId: string;
  protocol: string | null;
  tracking: string | null;
  selfTracking: string | null;
  etiquetaUrl: string | null;
  agencyId: number | null;
  agencyName: string | null;
  transportadora: string;
  servicoNome: string;
  /** Sempre postagem — nunca solicitamos coleta. */
  modoPostagem: "agencia";
};

type AgenciaMe = {
  id?: number;
  name?: string;
  company_name?: string;
  address?: {
    city?: { city?: string; state?: { state_abbr?: string } };
    postal_code?: string;
  };
};

type OrderMe = {
  id?: string;
  protocol?: string;
  tracking?: string | null;
  self_tracking?: string | null;
  status?: string;
  service?: { name?: string; company?: { name?: string } };
  company?: { name?: string };
};

function soDigitos(v: string): string {
  return v.replace(/\D/g, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dimensoesProduto(data: Record<string, unknown> | undefined) {
  const largura = Number(data?.larguraCm ?? DIMENSOES_PADRAO_CASE.larguraCm);
  const altura = Number(data?.alturaCm ?? DIMENSOES_PADRAO_CASE.alturaCm);
  const comprimento = Number(
    data?.comprimentoCm ?? DIMENSOES_PADRAO_CASE.comprimentoCm,
  );
  const pesoG = Number(data?.pesoGramas ?? DIMENSOES_PADRAO_CASE.pesoGramas);
  return {
    width: Math.max(1, Math.round(largura)),
    height: Math.max(1, Math.round(altura)),
    length: Math.max(1, Math.round(comprimento)),
    weightKg: Math.max(0.01, pesoG / 1000),
  };
}

async function carregarExpedicaoLoja(
  lojaId: string,
): Promise<EnderecoExpedicao | null> {
  const snap = await admin.firestore().doc(`lojas/${lojaId}`).get();
  const config = (snap.data()?.config ?? {}) as {
    expedicao?: EnderecoExpedicao | null;
  };
  return config.expedicao ?? null;
}

type PessoaEndereco = {
  nome: string;
  email: string;
  telefone: string;
  document: string;
  companyDocument: string;
  stateRegister: string;
  address: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  stateAbbr: string;
  postalCode: string;
};

function mapUsuarioDestino(u: Record<string, unknown>): PessoaEndereco {
  return {
    nome: String(u.nomeCompleto ?? u.razaoSocial ?? "Cliente").trim(),
    email: String(u.email ?? ""),
    telefone: soDigitos(String(u.telefone ?? "")),
    document: soDigitos(String(u.cpf ?? "")),
    companyDocument: soDigitos(String(u.cnpj ?? "")),
    stateRegister: String(u.inscricaoEstadual ?? u.ie ?? "").trim(),
    address: String(u.logradouro ?? "").trim(),
    number: String(u.numero ?? "").trim() || "S/N",
    complement: String(u.complemento ?? "").trim(),
    district: String(u.bairro ?? "").trim(),
    city: String(u.cidade ?? "").trim(),
    stateAbbr: String(u.estado ?? u.uf ?? "")
      .trim()
      .toUpperCase()
      .slice(0, 2),
    postalCode: soDigitos(String(u.cep ?? "")),
  };
}

function mapExpedicaoRemetente(exp: EnderecoExpedicao): PessoaEndereco {
  const cnpj = soDigitos(focusNfeCnpjEmitente.value());
  // ME exige CPF em from.document — nunca usar CNPJ nesse campo.
  const cpf = soDigitos(
    meCpfRemetente.value() || focusNfeCpfEmitente.value(),
  );
  const nomeEnv = focusNfeNomeEmitente.value().trim();
  const tel = soDigitos(meTelefoneRemetente.value());
  return {
    nome: String(exp.nomeRemetente ?? (nomeEnv || "Zen Pro")).trim(),
    email: meEmailRemetente.value().trim(),
    telefone: tel,
    document: cpf,
    companyDocument: cnpj,
    stateRegister: focusNfeIeEmitente.value().trim() || "ISENTO",
    address: String(exp.logradouro ?? "").trim(),
    number: String(exp.numero ?? "").trim() || "S/N",
    complement: String(exp.complemento ?? "").trim(),
    district: String(exp.bairro ?? "").trim(),
    city: String(exp.cidade ?? "").trim(),
    stateAbbr: String(exp.uf ?? "").trim().toUpperCase().slice(0, 2),
    postalCode: soDigitos(String(exp.cep ?? "")),
  };
}

function pessoaParaMePayload(p: PessoaEndereco) {
  const payload: Record<string, string> = {
    name: p.nome.slice(0, 60),
    address: p.address.slice(0, 80),
    number: p.number.slice(0, 10),
    district: p.district.slice(0, 60),
    city: p.city.slice(0, 60),
    country_id: "BR",
    postal_code: p.postalCode,
    state_abbr: p.stateAbbr,
  };
  if (p.email.includes("@")) payload.email = p.email;
  if (p.telefone.length >= 10) payload.phone = p.telefone;
  if (p.complement) payload.complement = p.complement.slice(0, 60);
  if (p.companyDocument.length === 14) {
    payload.company_document = p.companyDocument;
    if (p.stateRegister) payload.state_register = p.stateRegister;
  }
  if (p.document.length === 11) {
    payload.document = p.document;
  }
  return payload;
}

async function escolherAgenciaPostagem(
  token: string,
  companyId: number | null,
  remetente: PessoaEndereco,
): Promise<{ id: number; name: string } | null> {
  if (!companyId || !remetente.stateAbbr) return null;

  const params = new URLSearchParams({
    company: String(companyId),
    country: "BR",
    state: remetente.stateAbbr,
  });
  if (remetente.city) params.set("city", remetente.city);

  let agencias: AgenciaMe[] = [];
  try {
    const raw = await meFetch<AgenciaMe[] | { data?: AgenciaMe[] }>(
      token,
      `/me/shipment/agencies?${params.toString()}`,
    );
    agencias = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
        ? raw.data
        : [];
  } catch {
    // Sem city — tenta só estado.
    try {
      const raw = await meFetch<AgenciaMe[] | { data?: AgenciaMe[] }>(
        token,
        `/me/shipment/agencies?company=${companyId}&country=BR&state=${encodeURIComponent(remetente.stateAbbr)}`,
      );
      agencias = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : [];
    } catch {
      return null;
    }
  }

  const comId = agencias.filter((a) => typeof a.id === "number");
  if (comId.length === 0) return null;

  const cidadeNorm = remetente.city
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const mesmaCidade = comId.find((a) => {
    const city = String(a.address?.city?.city ?? "")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase();
    return city && cidadeNorm && city.includes(cidadeNorm);
  });

  const escolhida = mesmaCidade ?? comId[0];
  return {
    id: Number(escolhida.id),
    name: String(escolhida.name ?? "Agência"),
  };
}

async function resolverCompanyId(
  token: string,
  frete: Record<string, unknown>,
): Promise<number | null> {
  const stored = Number(frete.companyId ?? 0);
  if (stored > 0) return stored;

  const empresa = String(frete.empresa ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (!empresa) return null;

  try {
    const companies = await meFetch<
      Array<{ id?: number; name?: string }>
    >(token, "/me/shipment/companies");
    const hit = (Array.isArray(companies) ? companies : []).find((c) => {
      const nome = String(c.name ?? "")
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase();
      return nome && (empresa.includes(nome) || nome.includes(empresa));
    });
    return hit?.id ? Number(hit.id) : null;
  } catch {
    return null;
  }
}

async function montarProdutosVolumes(
  db: admin.firestore.Firestore,
  itens: Array<Record<string, unknown>>,
): Promise<{
  productsDim: MelhorEnvioProdutoDim[];
  productsDecl: Array<{
    name: string;
    quantity: string;
    unitary_value: string;
  }>;
  volumes: Array<{
    height: number;
    width: number;
    length: number;
    weight: number;
  }>;
  insurance: number;
}> {
  const productsDim: MelhorEnvioProdutoDim[] = [];
  const productsDecl: Array<{
    name: string;
    quantity: string;
    unitary_value: string;
  }> = [];
  let insurance = 0;

  for (const item of itens) {
    const produtoId = String(item.produtoId ?? "");
    const qty = Math.max(1, Number(item.quantidade ?? 1));
    if (!produtoId) continue;

    const snap = await db.doc(`produtos/${produtoId}`).get();
    const data = (snap.data() ?? {}) as Record<string, unknown>;
    const dim = dimensoesProduto(data);
    const unit =
      Number(item.precoCentavos ?? data.precoBaseCentavos ?? 0) / 100;
    const unitSafe = Math.max(1, unit);
    insurance += unitSafe * qty;

    productsDim.push({
      id: produtoId,
      width: dim.width,
      height: dim.height,
      length: dim.length,
      weight: dim.weightKg,
      insurance_value: unitSafe,
      quantity: qty,
    });
    productsDecl.push({
      name: String(item.nomeProduto ?? data.nome ?? "Produto Zen Pro").slice(
        0,
        80,
      ),
      quantity: String(qty),
      unitary_value: unitSafe.toFixed(2),
    });
  }

  if (productsDim.length === 0) {
    throw new Error("Pedido sem produtos válidos para envio.");
  }

  // Um volume agregado (Correios/Loggi: 1 volume por etiqueta).
  const height = Math.max(...productsDim.map((p) => p.height));
  const width = Math.max(...productsDim.map((p) => p.width));
  const length = Math.max(...productsDim.map((p) => p.length));
  const weight = productsDim.reduce(
    (acc, p) => acc + p.weight * p.quantity,
    0,
  );

  return {
    productsDim,
    productsDecl,
    volumes: [
      {
        height,
        width,
        length,
        weight: Math.max(0.01, Math.round(weight * 1000) / 1000),
      },
    ],
    insurance: Math.max(1, Math.round(insurance * 100) / 100),
  };
}

async function obterTrackingComRetry(
  token: string,
  orderId: string,
): Promise<OrderMe> {
  let last: OrderMe = { id: orderId };
  for (let i = 0; i < 5; i++) {
    await sleep(2000 + i * 500);
    last = await meFetch<OrderMe>(token, `/me/orders/${orderId}`);
    if (last.tracking || last.self_tracking) return last;
  }
  return last;
}

/**
 * Compra etiqueta no Melhor Envio e gera PDF.
 * Nunca solicita coleta — postagem em agência pelo dono da Zen Pro.
 */
export async function comprarEGerarEtiquetaMelhorEnvio(opts: {
  token: string;
  tipo: "loja" | "reposicao";
  lojaId?: string | null;
  pedidoId: string;
}): Promise<ResultadoEtiquetaMelhorEnvio> {
  const db = admin.firestore();
  const { token, tipo, pedidoId } = opts;

  let pedidoRef: FirebaseFirestore.DocumentReference;
  let lojaIdPedido = opts.lojaId ?? MARCA_LOJA_ID;

  if (tipo === "reposicao") {
    pedidoRef = db.doc(`pedidos_reposicao/${pedidoId}`);
  } else {
    if (!opts.lojaId) throw new Error("lojaId obrigatório.");
    lojaIdPedido = opts.lojaId;
    pedidoRef = db.doc(`lojas/${lojaIdPedido}/pedidos/${pedidoId}`);
  }

  const pedSnap = await pedidoRef.get();
  if (!pedSnap.exists) throw new Error("Pedido não encontrado.");
  const ped = pedSnap.data() ?? {};

  const frete = (ped.frete as Record<string, unknown> | undefined) ?? {};
  const servicoId = Number(frete.servicoId ?? 0);
  if (!servicoId) {
    throw new Error("Pedido sem frete Melhor Envio (frete.servicoId).");
  }

  if (ped.envio && typeof ped.envio === "object") {
    const envio = ped.envio as Record<string, unknown>;
    if (envio.meOrderId) {
      throw new Error("Pedido já possui etiqueta Melhor Envio.");
    }
  }

  const itens = Array.isArray(ped.itens)
    ? (ped.itens as Array<Record<string, unknown>>)
    : [];

  const [expPedido, expZen] = await Promise.all([
    carregarExpedicaoLoja(lojaIdPedido),
    lojaIdPedido === MARCA_LOJA_ID
      ? Promise.resolve(null)
      : carregarExpedicaoLoja(MARCA_LOJA_ID),
  ]);

  const origem = resolverOrigemExpedicaoPedido(
    lojaIdPedido,
    itens.map((i) => ({
      personalizacaoId:
        i.personalizacaoId != null && String(i.personalizacaoId).length > 0
          ? String(i.personalizacaoId)
          : null,
    })),
    { expedicao: expPedido },
    { expedicao: expZen ?? expPedido },
  );

  if (!origem.endereco) {
    throw new Error(
      "Cadastre o endereço de expedição da loja de origem no admin.",
    );
  }

  const remetente = mapExpedicaoRemetente(origem.endereco);
  if (remetente.postalCode.length !== 8) {
    throw new Error("CEP de expedição inválido.");
  }
  if (remetente.document.length !== 11) {
    throw new Error(
      "Configure MELHOR_ENVIO_CPF_REMETENTE (CPF válido do responsável) — o Melhor Envio exige CPF em from.document.",
    );
  }
  if (remetente.companyDocument.length !== 14) {
    throw new Error(
      "Configure FOCUS_NFE_CNPJ_EMITENTE (CNPJ da empresa) para o remetente Melhor Envio.",
    );
  }
  if (remetente.telefone.length < 10) {
    throw new Error(
      "Configure MELHOR_ENVIO_TELEFONE_REMETENTE (DDI+DDD+número, só dígitos).",
    );
  }

  let destinatario: PessoaEndereco | null = null;
  const clienteUid = String(ped.clienteUid ?? ped.revendedorUid ?? "");
  if (clienteUid) {
    const uSnap = await db.doc(`usuarios/${clienteUid}`).get();
    if (uSnap.exists) destinatario = mapUsuarioDestino(uSnap.data() ?? {});
  }
  if (!destinatario || destinatario.postalCode.length !== 8) {
    throw new Error(
      "Destinatário sem endereço completo em /conta (CEP, logradouro, etc.).",
    );
  }
  if (
    destinatario.document.length !== 11 &&
    destinatario.companyDocument.length !== 14
  ) {
    throw new Error("Destinatário precisa de CPF ou CNPJ em /conta.");
  }

  const { productsDecl, volumes, insurance } = await montarProdutosVolumes(
    db,
    itens,
  );

  const companyId = await resolverCompanyId(token, frete);
  const agencia = await escolherAgenciaPostagem(token, companyId, remetente);

  const nota = (ped.notaFiscal as Record<string, unknown> | undefined) ?? {};
  const chaveNf = String(nota.chaveAcesso ?? "").replace(/\D/g, "");
  const temNf = chaveNf.length === 44;

  const cartBody: Record<string, unknown> = {
    service: servicoId,
    from: pessoaParaMePayload(remetente),
    to: pessoaParaMePayload(destinatario),
    products: productsDecl,
    volumes,
    options: {
      insurance_value: insurance,
      receipt: false,
      own_hand: false,
      reverse: false,
      non_commercial: !temNf,
      ...(temNf ? { invoice: { key: chaveNf } } : {}),
      // Nunca pedimos coleta — postagem manual na agência.
      tags: [
        {
          tag: `zenpro:${tipo}:${lojaIdPedido}:${pedidoId}`,
          Url: `https://usezenpro.com.br/admin/pedidos/detalhe?lojaId=${encodeURIComponent(lojaIdPedido)}&id=${encodeURIComponent(pedidoId)}`,
        },
      ],
    },
  };

  if (agencia) {
    cartBody.agency = agencia.id;
  }

  const cart = await meFetch<OrderMe>(token, "/me/cart", {
    method: "POST",
    body: JSON.stringify(cartBody),
  });

  const orderId = String(cart.id ?? "");
  if (!orderId) throw new Error("Melhor Envio não retornou id do carrinho.");

  await db.doc(`melhor_envio_orders/${orderId}`).set({
    tipo,
    lojaId: lojaIdPedido,
    pedidoId,
    modoPostagem: "agencia",
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });

  await meFetch(token, "/me/shipment/checkout", {
    method: "POST",
    body: JSON.stringify({ orders: [orderId] }),
  });

  await meFetch(token, "/me/shipment/generate", {
    method: "POST",
    body: JSON.stringify({ orders: [orderId] }),
  });

  const order = await obterTrackingComRetry(token, orderId);

  let etiquetaUrl: string | null = null;
  try {
    const print = await meFetch<{ url?: string }>(token, "/me/shipment/print", {
      method: "POST",
      body: JSON.stringify({ mode: "private", orders: [orderId] }),
    });
    etiquetaUrl = print.url ? String(print.url) : null;
  } catch {
    etiquetaUrl = null;
  }

  const tracking =
    String(order.tracking ?? order.self_tracking ?? "").trim() || null;
  const transportadora = String(
    frete.empresa ||
      order.company?.name ||
      order.service?.company?.name ||
      "Transportadora",
  );
  const servicoNome = String(frete.nome || order.service?.name || "Frete");

  const urlRastreio = tracking
    ? transportadora.toLowerCase().includes("correios")
      ? `https://www.linkcorreios.com.br/?id=${encodeURIComponent(tracking)}`
      : `https://melhorrastreio.com.br/rastreio/${encodeURIComponent(tracking)}`
    : null;

  await pedidoRef.set(
    {
      envio: {
        transportadora: `${transportadora} — ${servicoNome}`,
        codigoRastreio: tracking,
        urlRastreio,
        etiquetaUrl,
        meOrderId: orderId,
        meProtocol: order.protocol ?? cart.protocol ?? null,
        meAgencyId: agencia?.id ?? null,
        meAgencyName: agencia?.name ?? null,
        modoPostagem: "agencia",
        statusMelhorEnvio: order.status ?? "generated",
        // Limpa erro antigo (merge profundo do Firestore manteria o campo).
        erroMelhorEnvio: admin.firestore.FieldValue.delete(),
        enviadoEm: admin.firestore.FieldValue.serverTimestamp(),
      },
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    orderId,
    protocol: order.protocol ?? cart.protocol ?? null,
    tracking,
    selfTracking: order.self_tracking ?? null,
    etiquetaUrl,
    agencyId: agencia?.id ?? null,
    agencyName: agencia?.name ?? null,
    transportadora,
    servicoNome,
    modoPostagem: "agencia",
  };
}

export async function atualizarRastreioPedidoPorMeOrder(
  orderId: string,
  tracking: string | null,
  status?: string | null,
): Promise<boolean> {
  if (!orderId) return false;
  const db = admin.firestore();
  const mapSnap = await db.doc(`melhor_envio_orders/${orderId}`).get();
  if (!mapSnap.exists) return false;
  const map = mapSnap.data() ?? {};
  const tipo = String(map.tipo ?? "loja");
  const lojaId = String(map.lojaId ?? "");
  const pedidoId = String(map.pedidoId ?? "");
  if (!pedidoId) return false;

  const ref =
    tipo === "reposicao"
      ? db.doc(`pedidos_reposicao/${pedidoId}`)
      : db.doc(`lojas/${lojaId}/pedidos/${pedidoId}`);

  const pedSnap = await ref.get();
  if (!pedSnap.exists) return false;
  const prev = (pedSnap.data()?.envio as Record<string, unknown>) ?? {};
  const transportadora = String(prev.transportadora ?? "");
  await ref.set(
    {
      envio: {
        ...prev,
        codigoRastreio: tracking || prev.codigoRastreio || null,
        statusMelhorEnvio: status ?? prev.statusMelhorEnvio ?? null,
        urlRastreio:
          tracking && transportadora.toLowerCase().includes("correios")
            ? `https://www.linkcorreios.com.br/?id=${encodeURIComponent(tracking)}`
            : tracking
              ? `https://melhorrastreio.com.br/rastreio/${encodeURIComponent(tracking)}`
              : prev.urlRastreio ?? null,
      },
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return true;
}
