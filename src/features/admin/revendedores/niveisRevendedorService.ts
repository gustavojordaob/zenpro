import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { MARCA_LOJA_ID } from "@/features/multitenant/marcaLoja";
import { COLECOES } from "@/features/multitenant/types";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

export type NivelRevendedor = "ouro" | "prata" | "bronze";

export type BeneficioNivel = {
  /** Desconto % nas compras B2B (0–100). */
  descontoPercentual: number;
  freteGratis: boolean;
  /** Elegível a sorteios / prêmios. */
  chanceSorteioPremios: boolean;
  /** Texto livre opcional (ex.: “kit exclusivo”). */
  descricaoExtra: string;
};

export type NiveisRevendedorConfig = {
  ouroMinCentavos: number;
  prataMinCentavos: number;
  /** E-mail da Zen Pro para frete / comunicação com o revendedor. */
  emailContatoZenPro: string;
  beneficios: Record<NivelRevendedor, BeneficioNivel>;
};

const BENEFICIO_VAZIO: BeneficioNivel = {
  descontoPercentual: 0,
  freteGratis: false,
  chanceSorteioPremios: false,
  descricaoExtra: "",
};

/** Defaults: Ouro R$ 10.000 · Prata R$ 5.000 · Bronze resto */
export const NIVEIS_REVENDEDOR_DEFAULT: NiveisRevendedorConfig = {
  ouroMinCentavos: 1_000_000,
  prataMinCentavos: 500_000,
  emailContatoZenPro: "",
  beneficios: {
    bronze: {
      ...BENEFICIO_VAZIO,
      descricaoExtra: "Acesso ao portal atacado",
    },
    prata: {
      descontoPercentual: 5,
      freteGratis: false,
      chanceSorteioPremios: true,
      descricaoExtra: "Prioridade no atendimento",
    },
    ouro: {
      descontoPercentual: 10,
      freteGratis: true,
      chanceSorteioPremios: true,
      descricaoExtra: "Frete grátis + melhor desconto",
    },
  },
};

const STATUS_FATURADO_LOJA = new Set([
  "pago",
  "producao",
  "enviado",
  "entregue",
]);

const STATUS_FATURADO_REPOSICAO = new Set([
  "pago",
  "aprovado",
  "enviado",
  "recebido",
]);

function requireDb() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }
  return getFirebaseDb();
}

function normalizarBeneficio(raw: unknown, fallback: BeneficioNivel): BeneficioNivel {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const o = raw as Record<string, unknown>;
  const desconto = Math.min(
    100,
    Math.max(0, Number(o.descontoPercentual ?? fallback.descontoPercentual)),
  );
  return {
    descontoPercentual: Number.isFinite(desconto) ? desconto : 0,
    freteGratis: Boolean(o.freteGratis ?? fallback.freteGratis),
    chanceSorteioPremios: Boolean(
      o.chanceSorteioPremios ?? fallback.chanceSorteioPremios,
    ),
    descricaoExtra: String(o.descricaoExtra ?? fallback.descricaoExtra ?? "").trim(),
  };
}

export function normalizarNiveisConfig(raw: unknown): NiveisRevendedorConfig {
  const d = NIVEIS_REVENDEDOR_DEFAULT;
  if (!raw || typeof raw !== "object") return structuredClone(d);
  const o = raw as Record<string, unknown>;
  let ouro = Math.max(0, Number(o.ouroMinCentavos ?? d.ouroMinCentavos));
  let prata = Math.max(0, Number(o.prataMinCentavos ?? d.prataMinCentavos));
  if (prata > ouro) {
    const t = prata;
    prata = ouro;
    ouro = t;
  }
  const benRaw =
    o.beneficios && typeof o.beneficios === "object"
      ? (o.beneficios as Record<string, unknown>)
      : {};
  return {
    ouroMinCentavos: ouro,
    prataMinCentavos: prata,
    emailContatoZenPro: String(o.emailContatoZenPro ?? d.emailContatoZenPro ?? "")
      .trim()
      .toLowerCase(),
    beneficios: {
      bronze: normalizarBeneficio(benRaw.bronze, d.beneficios.bronze),
      prata: normalizarBeneficio(benRaw.prata, d.beneficios.prata),
      ouro: normalizarBeneficio(benRaw.ouro, d.beneficios.ouro),
    },
  };
}

export function resolverNivelRevendedor(
  volumeCentavos: number,
  config: NiveisRevendedorConfig = NIVEIS_REVENDEDOR_DEFAULT,
): NivelRevendedor {
  const cfg = normalizarNiveisConfig(config);
  if (volumeCentavos >= cfg.ouroMinCentavos) return "ouro";
  if (volumeCentavos >= cfg.prataMinCentavos) return "prata";
  return "bronze";
}

export function rotuloNivelRevendedor(nivel: NivelRevendedor): string {
  if (nivel === "ouro") return "Ouro";
  if (nivel === "prata") return "Prata";
  return "Bronze";
}

export function beneficiosDoNivel(
  nivel: NivelRevendedor,
  config: NiveisRevendedorConfig,
): BeneficioNivel {
  return normalizarNiveisConfig(config).beneficios[nivel];
}

export function listarBeneficiosTexto(b: BeneficioNivel): string[] {
  const itens: string[] = [];
  if (b.descontoPercentual > 0) {
    itens.push(`${b.descontoPercentual}% de desconto nas compras`);
  }
  if (b.freteGratis) itens.push("Frete grátis");
  if (b.chanceSorteioPremios) {
    itens.push("Chance de ser sorteado em prêmios");
  }
  if (b.descricaoExtra.trim()) itens.push(b.descricaoExtra.trim());
  if (itens.length === 0) itens.push("Benefícios em breve");
  return itens;
}

export async function obterNiveisRevendedorConfig(): Promise<NiveisRevendedorConfig> {
  const db = requireDb();
  const snap = await getDoc(doc(db, COLECOES.LOJAS, MARCA_LOJA_ID));
  if (!snap.exists()) return structuredClone(NIVEIS_REVENDEDOR_DEFAULT);
  const config = (snap.data() as DocumentData).config ?? {};
  return normalizarNiveisConfig(config.niveisRevendedor);
}

export async function salvarNiveisRevendedorConfig(
  input: NiveisRevendedorConfig,
): Promise<void> {
  const cfg = normalizarNiveisConfig(input);
  if (cfg.prataMinCentavos <= 0 && cfg.ouroMinCentavos <= 0) {
    throw new Error("Informe pelo menos o valor mínimo de Prata ou Ouro.");
  }
  if (cfg.prataMinCentavos >= cfg.ouroMinCentavos) {
    throw new Error(
      "Ouro deve ser maior que Prata (ex.: Prata 5.000 e Ouro 10.000).",
    );
  }
  if (cfg.emailContatoZenPro && !cfg.emailContatoZenPro.includes("@")) {
    throw new Error("E-mail da Zen Pro inválido.");
  }
  const db = requireDb();
  const ref = doc(db, COLECOES.LOJAS, MARCA_LOJA_ID);
  const snap = await getDoc(ref);
  const configAtual =
    snap.exists() && snap.data().config && typeof snap.data().config === "object"
      ? { ...(snap.data().config as object) }
      : {};
  await updateDoc(ref, {
    config: {
      ...configAtual,
      niveisRevendedor: cfg,
    },
  });
}

function dataDeCriadoEm(criadoEm: unknown): Date | null {
  if (!criadoEm) return null;
  if (
    typeof criadoEm === "object" &&
    criadoEm !== null &&
    "toDate" in criadoEm &&
    typeof (criadoEm as { toDate: unknown }).toDate === "function"
  ) {
    return (criadoEm as { toDate: () => Date }).toDate();
  }
  if (
    typeof criadoEm === "object" &&
    criadoEm !== null &&
    "seconds" in criadoEm
  ) {
    return new Date(Number((criadoEm as { seconds: number }).seconds) * 1000);
  }
  return null;
}

type LinhaVolume = { centavos: number; criadoEm: Date | null };

async function coletarLinhasVolume(donoUid: string): Promise<LinhaVolume[]> {
  if (!donoUid) return [];
  const db = requireDb();
  const [pedidosSnap, reposSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, COLECOES.LOJAS, MARCA_LOJA_ID, COLECOES.PEDIDOS),
        where("clienteUid", "==", donoUid),
      ),
    ),
    getDocs(
      query(
        collection(db, "pedidos_reposicao"),
        where("revendedorUid", "==", donoUid),
      ),
    ),
  ]);

  const linhas: LinhaVolume[] = [];
  for (const d of pedidosSnap.docs) {
    const data = d.data();
    if (!STATUS_FATURADO_LOJA.has(String(data.status ?? ""))) continue;
    linhas.push({
      centavos: Math.max(0, Number(data.totalCentavos ?? 0)),
      criadoEm: dataDeCriadoEm(data.criadoEm),
    });
  }
  for (const d of reposSnap.docs) {
    const data = d.data();
    if (!STATUS_FATURADO_REPOSICAO.has(String(data.status ?? ""))) continue;
    linhas.push({
      centavos: Math.max(0, Number(data.totalCentavos ?? 0)),
      criadoEm: dataDeCriadoEm(data.criadoEm),
    });
  }
  return linhas;
}

function somarPeriodo(
  linhas: LinhaVolume[],
  predicado: (d: Date) => boolean,
): { centavos: number; pedidos: number } {
  let centavos = 0;
  let pedidos = 0;
  for (const l of linhas) {
    if (!l.criadoEm || !predicado(l.criadoEm)) continue;
    centavos += l.centavos;
    pedidos += 1;
  }
  return { centavos, pedidos };
}

export async function volumeComprasZenProCentavos(
  donoUid: string,
): Promise<number> {
  const linhas = await coletarLinhasVolume(donoUid);
  return linhas.reduce((acc, l) => acc + l.centavos, 0);
}

export type MetricasRevendedorVolume = {
  volumeTotalCentavos: number;
  volumeMesCentavos: number;
  volumeAnoCentavos: number;
  pedidosMes: number;
  pedidosAno: number;
  pedidosTotal: number;
  nivel: NivelRevendedor;
  beneficios: BeneficioNivel;
};

export async function metricasVolumeRevendedor(
  donoUid: string,
  config?: NiveisRevendedorConfig,
): Promise<MetricasRevendedorVolume> {
  const cfg = config ?? (await obterNiveisRevendedorConfig());
  const linhas = await coletarLinhasVolume(donoUid);
  const agora = new Date();
  const mes = agora.getMonth();
  const ano = agora.getFullYear();

  const total = linhas.reduce((acc, l) => acc + l.centavos, 0);
  const noMes = somarPeriodo(
    linhas,
    (d) => d.getMonth() === mes && d.getFullYear() === ano,
  );
  const noAno = somarPeriodo(linhas, (d) => d.getFullYear() === ano);
  const nivel = resolverNivelRevendedor(total, cfg);

  return {
    volumeTotalCentavos: total,
    volumeMesCentavos: noMes.centavos,
    volumeAnoCentavos: noAno.centavos,
    pedidosMes: noMes.pedidos,
    pedidosAno: noAno.pedidos,
    pedidosTotal: linhas.length,
    nivel,
    beneficios: beneficiosDoNivel(nivel, cfg),
  };
}

export type RevendedorComNivel = {
  lojaId: string;
  nome: string;
  donoUid: string;
  volumeCentavos: number;
  volumeMesCentavos: number;
  volumeAnoCentavos: number;
  pedidosMes: number;
  pedidosAno: number;
  nivel: NivelRevendedor;
  beneficios: BeneficioNivel;
};

export async function listarNiveisRevendedores(
  revendedores: { lojaId: string; donoUid: string; nome?: string }[],
  config?: NiveisRevendedorConfig,
): Promise<Record<string, RevendedorComNivel>> {
  const cfg = config ?? (await obterNiveisRevendedorConfig());
  const out: Record<string, RevendedorComNivel> = {};

  for (const r of revendedores) {
    const m = await metricasVolumeRevendedor(r.donoUid, cfg);
    out[r.lojaId] = {
      lojaId: r.lojaId,
      nome: r.nome ?? r.lojaId,
      donoUid: r.donoUid,
      volumeCentavos: m.volumeTotalCentavos,
      volumeMesCentavos: m.volumeMesCentavos,
      volumeAnoCentavos: m.volumeAnoCentavos,
      pedidosMes: m.pedidosMes,
      pedidosAno: m.pedidosAno,
      nivel: m.nivel,
      beneficios: m.beneficios,
    };
  }
  return out;
}

/** Ranking: quem mais comprou no mês / ano / total. */
export function rankingRevendedores(
  mapa: Record<string, RevendedorComNivel>,
  periodo: "mes" | "ano" | "total" = "mes",
): RevendedorComNivel[] {
  const lista = Object.values(mapa);
  const chave =
    periodo === "mes"
      ? "volumeMesCentavos"
      : periodo === "ano"
        ? "volumeAnoCentavos"
        : "volumeCentavos";
  return [...lista].sort((a, b) => b[chave] - a[chave]);
}

/** Volume faturado em um mês/ano específicos (0–11 / year). */
export async function volumeNoMesAno(
  donoUid: string,
  ano: number,
  mesIndex0: number,
): Promise<{ centavos: number; pedidos: number }> {
  const linhas = await coletarLinhasVolume(donoUid);
  return somarPeriodo(
    linhas,
    (d) => d.getFullYear() === ano && d.getMonth() === mesIndex0,
  );
}

/** Volume faturado entre inicio e fim (inclusivos). */
export async function volumeNoIntervalo(
  donoUid: string,
  inicio: Date,
  fim: Date,
): Promise<{ centavos: number; pedidos: number }> {
  const inicioMs = inicio.getTime();
  const fimMs = fim.getTime();
  const linhas = await coletarLinhasVolume(donoUid);
  return somarPeriodo(linhas, (d) => {
    const t = d.getTime();
    return t >= inicioMs && t <= fimMs;
  });
}

export type RankingItemMes = RevendedorComNivel & {
  volumePeriodoCentavos: number;
  pedidosPeriodo: number;
};

export async function rankingRevendedoresNoMes(
  revendedores: { lojaId: string; donoUid: string; nome?: string }[],
  ano: number,
  mesIndex0: number,
  config?: NiveisRevendedorConfig,
): Promise<RankingItemMes[]> {
  const inicio = new Date(ano, mesIndex0, 1, 0, 0, 0, 0);
  const fim = new Date(ano, mesIndex0 + 1, 0, 23, 59, 59, 999);
  return rankingRevendedoresNoIntervalo(revendedores, inicio, fim, config);
}

export async function rankingRevendedoresNoIntervalo(
  revendedores: { lojaId: string; donoUid: string; nome?: string }[],
  inicio: Date,
  fim: Date,
  config?: NiveisRevendedorConfig,
): Promise<RankingItemMes[]> {
  const cfg = config ?? (await obterNiveisRevendedorConfig());
  const mapa = await listarNiveisRevendedores(revendedores, cfg);
  const out: RankingItemMes[] = [];
  for (const r of revendedores) {
    const base = mapa[r.lojaId];
    if (!base) continue;
    const vol = await volumeNoIntervalo(r.donoUid, inicio, fim);
    out.push({
      ...base,
      volumePeriodoCentavos: vol.centavos,
      pedidosPeriodo: vol.pedidos,
    });
  }
  return out.sort((a, b) => b.volumePeriodoCentavos - a.volumePeriodoCentavos);
}

export function aplicarDescontoNivel(
  totalCentavos: number,
  descontoPercentual: number,
): { totalComDesconto: number; descontoCentavos: number } {
  const pct = Math.min(100, Math.max(0, descontoPercentual));
  const descontoCentavos = Math.round((totalCentavos * pct) / 100);
  return {
    descontoCentavos,
    totalComDesconto: Math.max(0, totalCentavos - descontoCentavos),
  };
}
